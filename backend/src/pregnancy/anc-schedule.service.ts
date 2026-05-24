import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import { Pregnancy, PregnancyDocument } from './schemas/pregnancy.schema';
import { MaternalVaccine, MaternalVaccineDocument, MATERNAL_VACCINE_SCHEDULE } from './schemas/maternal-vaccine.schema';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';

/**
 * WHO ANC schedule: visit number → gestational week target
 * Used to calculate the next visit date from LMP or current gestational age.
 */
export const WHO_ANC_SCHEDULE = [
  { visitNumber: 1, targetWeek: 12,  label: '1st Visit (before 12 weeks)' },
  { visitNumber: 2, targetWeek: 20,  label: '2nd Visit (20 weeks)' },
  { visitNumber: 3, targetWeek: 26,  label: '3rd Visit (26 weeks)' },
  { visitNumber: 4, targetWeek: 30,  label: '4th Visit (30 weeks)' },
  { visitNumber: 5, targetWeek: 34,  label: '5th Visit (34 weeks)' },
  { visitNumber: 6, targetWeek: 36,  label: '6th Visit (36 weeks)' },
  { visitNumber: 7, targetWeek: 38,  label: '7th Visit (38 weeks)' },
  { visitNumber: 8, targetWeek: 40,  label: '8th Visit (40 weeks)' },
];

@Injectable()
export class AncScheduleService {
  private readonly logger = new Logger(AncScheduleService.name);

  constructor(
    @InjectModel(Pregnancy.name)
    private readonly pregnancyModel: Model<PregnancyDocument>,
    @InjectModel(MaternalVaccine.name)
    private readonly maternalVaccineModel: Model<MaternalVaccineDocument>,
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
  ) {}

  // ─────────────────────────────────────────────────────────────────────────
  // SCHEDULE CALCULATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calculate the next ANC visit date based on current gestational age and LMP.
   * Returns the date and visit number for the next scheduled visit.
   */
  calculateNextVisit(
    currentGestationalWeek: number,
    lmpDate: Date,
    isHighRisk: boolean = false,
  ): { visitNumber: number; targetWeek: number; scheduledDate: Date; label: string } | null {
    // For high-risk pregnancies, add extra visits every 2 weeks after week 28
    const schedule = isHighRisk
      ? this.getHighRiskSchedule(currentGestationalWeek)
      : WHO_ANC_SCHEDULE;

    const next = schedule.find(v => v.targetWeek > currentGestationalWeek);
    if (!next) return null; // Past 40 weeks — no more scheduled visits

    const scheduledDate = new Date(lmpDate);
    scheduledDate.setDate(scheduledDate.getDate() + next.targetWeek * 7);

    return { ...next, scheduledDate };
  }

  private getHighRiskSchedule(currentWeek: number) {
    const base = [...WHO_ANC_SCHEDULE];
    // Add extra visits every 2 weeks from week 28 onwards for high-risk
    if (currentWeek >= 28) {
      for (let w = 28; w <= 40; w += 2) {
        if (!base.find(v => v.targetWeek === w)) {
          base.push({ visitNumber: 99, targetWeek: w, label: `High-Risk Visit (${w} weeks)` });
        }
      }
      base.sort((a, b) => a.targetWeek - b.targetWeek);
    }
    return base;
  }

  /**
   * After a visit is recorded, auto-generate the next scheduled visit record.
   */
  async autoScheduleNextVisit(
    completedVisitId: string,
    lmpDate: Date,
    isHighRisk: boolean,
  ): Promise<Pregnancy | null> {
    const completed = await this.pregnancyModel
      .findById(completedVisitId)
      .populate('motherId', 'name phone email')
      .populate('hospitalId', 'name')
      .exec();

    if (!completed) throw new NotFoundException('Pregnancy visit not found');

    const next = this.calculateNextVisit(completed.gestationalAge, lmpDate, isHighRisk);
    if (!next) {
      this.logger.log(`No next visit needed — mother at ${completed.gestationalAge} weeks`);
      return null;
    }

    // Check if a scheduled visit already exists for this mother at this target week
    const existing = await this.pregnancyModel.findOne({
      motherId: completed.motherId,
      visitNumber: next.visitNumber,
      visitStatus: 'SCHEDULED',
    });
    if (existing) return existing;

    const nextVisit = await new this.pregnancyModel({
      motherId: completed.motherId,
      gestationalAge: next.targetWeek,
      week: next.targetWeek,
      riskLevel: completed.riskLevel,
      hospitalId: completed.hospitalId,
      healthWorkerId: completed.healthWorkerId,
      visitDate: next.scheduledDate,
      nextVisitDate: next.scheduledDate,
      visitStatus: 'SCHEDULED',
      visitNumber: next.visitNumber,
      visitReminderSent: false,
      reminder3DaySent: false,
      reminderSameDaySent: false,
    }).save();

    this.logger.log(
      `Auto-scheduled visit #${next.visitNumber} for mother ${(completed.motherId as any)._id} on ${next.scheduledDate.toDateString()}`,
    );

    return nextVisit;
  }

  /**
   * Get the full ANC schedule for a mother (all 8 visits with status).
   */
  async getAncSchedule(motherId: string): Promise<any[]> {
    const visits = await this.pregnancyModel
      .find({ motherId: new Types.ObjectId(motherId) })
      .sort({ gestationalAge: 1 })
      .lean()
      .exec();

    return WHO_ANC_SCHEDULE.map(slot => {
      const visit = visits.find(
        v => v.visitNumber === slot.visitNumber ||
          Math.abs((v.gestationalAge ?? 0) - slot.targetWeek) <= 1,
      );
      return {
        ...slot,
        status: visit?.visitStatus ?? 'NOT_SCHEDULED',
        visitDate: visit?.visitDate ?? null,
        nextVisitDate: visit?.nextVisitDate ?? null,
        visitId: visit?._id ?? null,
        riskLevel: visit?.riskLevel ?? null,
      };
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MISSED VISIT DETECTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Daily cron at 9 AM — mark overdue scheduled visits as MISSED and reschedule.
   */
  @Cron('0 9 * * *', { name: 'missed-visit-detection' })
  async detectMissedVisits(): Promise<void> {
    this.logger.log('Running missed visit detection...');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(23, 59, 59, 999);

    const overdueVisits = await this.pregnancyModel
      .find({
        visitStatus: 'SCHEDULED',
        visitDate: { $lt: yesterday },
        manualOverride: { $ne: true }, // NEVER auto-modify manually overridden records
      })
      .populate('motherId', 'name phone email lmp expectedDeliveryDate highRisk')
      .lean()
      .exec();

    this.logger.log(`Found ${overdueVisits.length} missed visit(s)`);

    for (const visit of overdueVisits) {
      const mother = visit.motherId as any;

      // Mark as missed
      await this.pregnancyModel.findByIdAndUpdate(visit._id, {
        visitStatus: 'MISSED',
      });

      // Reschedule — push 1 week from today
      const rescheduleDate = new Date();
      rescheduleDate.setDate(rescheduleDate.getDate() + 7);

      const lmp = mother?.lmp ? new Date(mother.lmp) : null;
      if (lmp) {
        await this.autoScheduleNextVisit(
          visit._id.toString(),
          lmp,
          mother?.highRisk ?? false,
        ).catch(err =>
          this.logger.error(`Failed to reschedule for ${visit._id}: ${err.message}`),
        );
      }

      // Notify health worker (SMS to mother about missed visit)
      if (mother?.phone) {
        await this.smsService.sendAncMissedVisitAlert(
          mother.phone,
          mother.name,
          new Date(visit.visitDate),
          rescheduleDate,
        ).catch(() => {});
      }
    }

    this.logger.log('Missed visit detection complete.');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MULTI-DAY REMINDERS (3 days, 1 day, same day)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Daily cron at 8 AM — send reminders for visits in 3 days, 1 day, and today.
   */
  @Cron('0 8 * * *', { name: 'anc-multi-day-reminders' })
  async sendMultiDayReminders(): Promise<void> {
    this.logger.log('Running ANC multi-day reminder job...');

    await Promise.all([
      this.sendRemindersForDaysAhead(3, 'reminder3DaySent'),
      this.sendRemindersForDaysAhead(1, 'visitReminderSent'),
      this.sendRemindersForDaysAhead(0, 'reminderSameDaySent'),
    ]);

    this.logger.log('ANC multi-day reminder job complete.');
  }

  private async sendRemindersForDaysAhead(
    daysAhead: number,
    sentFlag: 'reminder3DaySent' | 'visitReminderSent' | 'reminderSameDaySent',
  ): Promise<void> {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const start = new Date(target); start.setHours(0, 0, 0, 0);
    const end = new Date(target); end.setHours(23, 59, 59, 999);

    const records = await this.pregnancyModel
      .find({
        visitStatus: 'SCHEDULED',
        visitDate: { $gte: start, $lte: end },
        [sentFlag]: false,
      })
      .populate('motherId', 'name phone email')
      .populate('hospitalId', 'name')
      .lean()
      .exec();

    const label = daysAhead === 0 ? 'today' : `in ${daysAhead} day(s)`;
    this.logger.log(`Found ${records.length} visit(s) due ${label}`);

    for (const record of records) {
      const mother = record.motherId as any;
      const facility = record.hospitalId as any;
      if (!mother) continue;

      const visitDate = new Date(record.visitDate);
      const gestationalAge = record.gestationalAge ?? record.week ?? 0;
      const facilityName = facility?.name ?? 'your health center';

      if (mother.phone) {
        await this.smsService.sendPregnancyVisitReminder(
          mother.phone, mother.name, visitDate, gestationalAge,
        ).catch(() => {});
      }
      if (mother.email) {
        await this.emailService.sendPregnancyVisitReminder(
          mother.email, mother.name, visitDate, gestationalAge, facilityName,
        ).catch(() => {});
      }

      await this.pregnancyModel.findByIdAndUpdate(record._id, {
        [sentFlag]: true,
        visitReminderSentDate: new Date(),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MATERNAL VACCINES
  // ─────────────────────────────────────────────────────────────────────────

  async recordMaternalVaccine(data: {
    motherId: string;
    vaccineName: string;
    doseNumber: number;
    givenDate: Date;
    givenBy: string;
    givenAt: string;
    batchNumber?: string;
    notes?: string;
  }): Promise<MaternalVaccine> {
    const isTdOrTT = data.vaccineName.startsWith('Td') || data.vaccineName.startsWith('TT');
    
    if (isTdOrTT && data.doseNumber > 1) {
      // Find the previous dose for this mother
      const seriesPrefix = data.vaccineName.slice(0, 2); // 'Td' or 'TT'
      const prevDoseName = `${seriesPrefix}${data.doseNumber - 1}`;
      
      const prevDose = await this.maternalVaccineModel.findOne({
        motherId: new Types.ObjectId(data.motherId),
        vaccineName: prevDoseName,
        status: 'GIVEN',
      }).exec();
      
      if (!prevDose) {
        throw new BadRequestException(`Previous dose (${prevDoseName}) must be administered before ${data.vaccineName}.`);
      }
      
      // Calculate interval in weeks/days
      const diffMs = new Date(data.givenDate).getTime() - new Date(prevDose.givenDate).getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      
      if (data.doseNumber === 2) {
        // At least 4 weeks (28 days)
        if (diffDays < 28) {
          throw new BadRequestException(`${data.vaccineName} must be administered at least 4 weeks after ${prevDoseName}. Current interval: ${Math.floor(diffDays)} days.`);
        }
      } else if (data.doseNumber === 3) {
        // At least 6 months (180 days)
        if (diffDays < 180) {
          throw new BadRequestException(`${data.vaccineName} must be administered at least 6 months after ${prevDoseName}. Current interval: ${Math.floor(diffDays)} days.`);
        }
      } else if (data.doseNumber >= 4) {
        // At least 1 year (365 days)
        if (diffDays < 365) {
          throw new BadRequestException(`${data.vaccineName} must be administered at least 1 year after ${prevDoseName}. Current interval: ${Math.floor(diffDays)} days.`);
        }
      }
    }

    const schedule = MATERNAL_VACCINE_SCHEDULE[data.vaccineName];
    let nextDoseDate: Date | undefined;

    if (schedule?.nextDoseWeeks) {
      nextDoseDate = new Date(data.givenDate);
      nextDoseDate.setDate(nextDoseDate.getDate() + schedule.nextDoseWeeks * 7);
    }

    const record = await new this.maternalVaccineModel({
      motherId: new Types.ObjectId(data.motherId),
      vaccineName: data.vaccineName,
      doseNumber: data.doseNumber,
      givenDate: data.givenDate,
      nextDoseDate,
      status: 'GIVEN',
      givenBy: new Types.ObjectId(data.givenBy),
      givenAt: new Types.ObjectId(data.givenAt),
      batchNumber: data.batchNumber,
      notes: data.notes,
      clinicalProtection: schedule?.protection || 'Unknown protection duration',
    }).save();

    return record;
  }

  async getMaternalVaccineHistory(motherId: string): Promise<MaternalVaccine[]> {
    return this.maternalVaccineModel
      .find({ motherId: new Types.ObjectId(motherId) })
      .sort({ givenDate: 1 })
      .exec();
  }

  /**
   * Daily cron at 8 AM — send reminders for maternal vaccine doses due in 3 days, 1 day, today.
   */
  @Cron('0 8 * * *', { name: 'maternal-vaccine-reminders' })
  async sendMaternalVaccineReminders(): Promise<void> {
    this.logger.log('Running maternal vaccine reminder job...');

    for (const daysAhead of [3, 1, 0]) {
      const target = new Date();
      target.setDate(target.getDate() + daysAhead);
      const start = new Date(target); start.setHours(0, 0, 0, 0);
      const end = new Date(target); end.setHours(23, 59, 59, 999);

      const records = await this.maternalVaccineModel
        .find({
          status: 'SCHEDULED',
          nextDoseDate: { $gte: start, $lte: end },
          reminderSent: false,
        })
        .populate('motherId', 'name phone email')
        .lean()
        .exec();

      for (const record of records) {
        const mother = record.motherId as any;
        if (!mother?.phone) continue;

        await this.smsService.sendMaternalVaccineReminder(
          mother.phone,
          mother.name,
          record.vaccineName,
          record.doseNumber,
          new Date(record.nextDoseDate),
        ).catch(() => {});

        await this.maternalVaccineModel.findByIdAndUpdate(record._id, {
          reminderSent: true,
          reminderSentDate: new Date(),
        });
      }
    }

    this.logger.log('Maternal vaccine reminder job complete.');
  }

  /** Manual trigger for testing */
  async triggerManually(): Promise<{ message: string }> {
    await this.sendMultiDayReminders();
    await this.detectMissedVisits();
    await this.sendMaternalVaccineReminders();
    return { message: 'ANC schedule jobs triggered. Check server logs.' };
  }
}
