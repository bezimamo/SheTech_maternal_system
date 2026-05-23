import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron } from '@nestjs/schedule';
import {
  MotherVaccinationRecord,
  MotherVaccinationRecordDocument,
} from './schemas/mother-vaccination-record.schema';
import { EmailService } from '../notifications/email.service';
import { SmsService } from '../notifications/sms.service';
import { getTdDoseLabel } from './utils/td-vaccine-schedule';

@Injectable()
export class MotherVaccinationReminderService {
  private readonly logger = new Logger(MotherVaccinationReminderService.name);

  constructor(
    @InjectModel(MotherVaccinationRecord.name)
    private readonly recordModel: Model<MotherVaccinationRecordDocument>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  @Cron('0 8 * * *', { name: 'mother-td-vaccination-reminders' })
  async runDailyReminders(): Promise<void> {
    this.logger.log('Running mother TD vaccination reminder job...');
    await Promise.all([
      this.sendRemindersForDaysAhead(3, 'reminder3DaySent'),
      this.sendRemindersForDaysAhead(1, 'reminderSent'),
      this.sendRemindersForDaysAhead(0, 'reminderSent'),
    ]);
    this.logger.log('Mother TD vaccination reminder job complete.');
  }

  async triggerManually(): Promise<{
    message: string;
    reminders3DaysSent: number;
    reminders1DaySent: number;
    remindersSameDay: number;
  }> {
    const reminders3DaysSent = await this.sendRemindersForDaysAhead(3, 'reminder3DaySent');
    const reminders1DaySent = await this.sendRemindersForDaysAhead(1, 'reminderSent');
    const remindersSameDay = await this.sendRemindersForDaysAhead(0, 'reminderSent');
    return {
      message: 'Mother vaccination reminder job completed',
      reminders3DaysSent,
      reminders1DaySent,
      remindersSameDay,
    };
  }

  private async sendRemindersForDaysAhead(
    daysAhead: number,
    sentFlag: 'reminderSent' | 'reminder3DaySent',
  ): Promise<number> {
    const target = new Date();
    target.setDate(target.getDate() + daysAhead);
    const start = new Date(target);
    start.setHours(0, 0, 0, 0);
    const end = new Date(target);
    end.setHours(23, 59, 59, 999);

    const query: Record<string, unknown> = {
      status: 'SCHEDULED',
      scheduledDate: { $gte: start, $lte: end },
      [sentFlag]: false,
    };

    const records = await this.recordModel
      .find(query)
      .populate('motherId', 'name phone email')
      .exec();

    let sentCount = 0;

    for (const record of records) {
      try {
        const mother = record.motherId as any;
        if (!mother?.name) continue;

        const doseLabel = getTdDoseLabel(record.doseNumber);
        const scheduledDate = new Date(record.scheduledDate!);

        if (mother.email) {
          await this.emailService
            .sendMotherVaccinationReminder(
              mother.email,
              mother.name,
              record.doseNumber,
              scheduledDate,
            )
            .catch(() => {});
        }

        if (mother.phone) {
          if (daysAhead === 3) {
            await this.smsService
              .sendMaternalVaccineReminder(
                mother.phone,
                mother.name,
                doseLabel,
                record.doseNumber,
                scheduledDate,
              )
              .catch(() => {});
          } else {
            await this.smsService
              .sendMaternalVaccineReminder(
                mother.phone,
                mother.name,
                doseLabel,
                record.doseNumber,
                scheduledDate,
              )
              .catch(() => {});
          }
        }

        record[sentFlag] = true;
        if (sentFlag === 'reminderSent') {
          record.reminderSentDate = new Date();
        }
        await record.save();
        sentCount++;
      } catch (error) {
        this.logger.error(`Failed reminder for record ${record._id}:`, error);
      }
    }

    return sentCount;
  }
}
