import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  MotherVaccinationRecord,
  MotherVaccinationRecordDocument,
} from './schemas/mother-vaccination-record.schema';
import { MothersService } from '../mothers/mothers.service';
import { Mother, MotherDocument } from '../mothers/schemas/mother.schema';
import {
  TD_VACCINE_NAME,
  buildTdScheduleGrid,
  calculateNextTdDoseDate,
  getTdDoseLabel,
} from './utils/td-vaccine-schedule';
import { RecordMotherVaccinationDto } from './dto/mother-vaccination.dto';

@Injectable()
export class MotherVaccinationsService {
  constructor(
    @InjectModel(MotherVaccinationRecord.name)
    private readonly recordModel: Model<MotherVaccinationRecordDocument>,
    @InjectModel(Mother.name)
    private readonly motherModel: Model<MotherDocument>,
    private readonly mothersService: MothersService,
  ) {}

  private async assertMotherExists(motherId: string) {
    const mother = await this.motherModel.findById(motherId).lean().exec();
    if (!mother) throw new NotFoundException('Mother not found');
    return mother;
  }

  async getMyVaccinationSchedule(userId: string) {
    const mother = await this.mothersService.findByUserId(userId);
    if (!mother) {
      throw new NotFoundException('Mother profile not found');
    }
    return this.getVaccinationSchedule((mother as any)._id.toString());
  }

  async getVaccinationSchedule(motherId: string) {
    await this.assertMotherExists(motherId);

    const records = await this.recordModel
      .find({ motherId: new Types.ObjectId(motherId) })
      .sort({ doseNumber: 1, administeredDate: 1 })
      .lean()
      .exec();

    const vaccineSchedule = buildTdScheduleGrid(records);
    const vaccines = records.map(r => this.serializeRecord(r));
    const nextAppointment = this.findNextAppointment(records);
    const warnings = this.buildWarnings(records, vaccineSchedule);

    return {
      motherId,
      vaccines,
      vaccineSchedule,
      nextAppointment,
      warnings,
    };
  }

  async getHistory(motherId: string) {
    const records = await this.recordModel
      .find({
        motherId: new Types.ObjectId(motherId),
        status: 'ADMINISTERED',
      })
      .sort({ administeredDate: -1 })
      .lean()
      .exec();

    return records.map(r => this.serializeRecord(r));
  }

  async recordMotherVaccination(
    dto: RecordMotherVaccinationDto,
    userId: string,
    hospitalId?: string,
  ) {
    await this.assertMotherExists(dto.motherId);

    const administeredDate = new Date(dto.administeredDate);
    if (isNaN(administeredDate.getTime())) {
      throw new BadRequestException('Invalid administered date');
    }

    // Require previous dose before TD2+
    if (dto.doseNumber > 1) {
      const prev = await this.recordModel.findOne({
        motherId: new Types.ObjectId(dto.motherId),
        doseNumber: dto.doseNumber - 1,
        status: 'ADMINISTERED',
      });
      if (!prev) {
        throw new BadRequestException(
          `TD${dto.doseNumber - 1} must be administered before TD${dto.doseNumber}`,
        );
      }
    }

    let record = await this.recordModel.findOne({
      motherId: new Types.ObjectId(dto.motherId),
      doseNumber: dto.doseNumber,
    });

    if (record?.status === 'ADMINISTERED') {
      throw new BadRequestException(`TD${dto.doseNumber} has already been administered`);
    }

    if (record) {
      record.status = 'ADMINISTERED';
      record.administeredDate = administeredDate;
      record.scheduledDate = record.scheduledDate ?? administeredDate;
      record.batchNumber = dto.batchNumber;
      record.notes = dto.notes;
      record.administeredBy = new Types.ObjectId(userId);
      if (hospitalId || dto.hospitalId) {
        record.hospitalId = new Types.ObjectId(hospitalId ?? dto.hospitalId!);
      }
      record.updatedBy = new Types.ObjectId(userId);
      await record.save();
    } else {
      record = await new this.recordModel({
        motherId: new Types.ObjectId(dto.motherId),
        vaccineName: TD_VACCINE_NAME,
        doseNumber: dto.doseNumber,
        status: 'ADMINISTERED',
        administeredDate,
        scheduledDate: administeredDate,
        batchNumber: dto.batchNumber,
        notes: dto.notes,
        administeredBy: new Types.ObjectId(userId),
        hospitalId: hospitalId || dto.hospitalId
          ? new Types.ObjectId(hospitalId ?? dto.hospitalId!)
          : undefined,
        createdBy: new Types.ObjectId(userId),
      }).save();
    }

    await this.autoScheduleNextDose(dto.motherId, dto.doseNumber, administeredDate, userId, hospitalId ?? dto.hospitalId);

    return {
      message: `${getTdDoseLabel(dto.doseNumber)} recorded successfully`,
      record: this.serializeRecord(record.toObject()),
      schedule: await this.getVaccinationSchedule(dto.motherId),
    };
  }

  private async autoScheduleNextDose(
    motherId: string,
    completedDose: number,
    administeredDate: Date,
    userId: string,
    hospitalId?: string,
  ) {
    const nextDoseNumber = completedDose + 1;
    if (nextDoseNumber > 5) return;

    const nextDate = calculateNextTdDoseDate(completedDose, administeredDate);
    if (!nextDate) return;

    const existing = await this.recordModel.findOne({
      motherId: new Types.ObjectId(motherId),
      doseNumber: nextDoseNumber,
    });

    if (existing) {
      if (existing.status !== 'ADMINISTERED') {
        existing.status = 'SCHEDULED';
        existing.scheduledDate = nextDate;
        existing.reminderSent = false;
        existing.reminder3DaySent = false;
        existing.updatedBy = new Types.ObjectId(userId);
        await existing.save();
      }
      return;
    }

    await new this.recordModel({
      motherId: new Types.ObjectId(motherId),
      vaccineName: TD_VACCINE_NAME,
      doseNumber: nextDoseNumber,
      status: 'SCHEDULED',
      scheduledDate: nextDate,
      hospitalId: hospitalId ? new Types.ObjectId(hospitalId) : undefined,
      createdBy: new Types.ObjectId(userId),
    }).save();
  }

  private findNextAppointment(records: any[]) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const next = records
      .filter(
        r =>
          r.status === 'SCHEDULED' &&
          r.scheduledDate &&
          new Date(r.scheduledDate) >= startOfToday,
      )
      .sort(
        (a, b) =>
          new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
      )[0];

    if (!next) return null;

    return {
      doseNumber: next.doseNumber,
      vaccineName: next.vaccineName,
      scheduledDate: next.scheduledDate,
      label: getTdDoseLabel(next.doseNumber),
    };
  }

  private buildWarnings(records: any[], grid: ReturnType<typeof buildTdScheduleGrid>) {
    const warnings: string[] = [];
    const missed = grid.filter(s => s.status === 'MISSED');
    if (missed.length > 0) {
      warnings.push(`${missed.length} TD dose(s) missed — please reschedule at your health center.`);
    }
    const overdue = records.filter(
      r =>
        r.status === 'SCHEDULED' &&
        r.scheduledDate &&
        new Date(r.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0)),
    );
    if (overdue.length > 0) {
      warnings.push(`${overdue.length} vaccination appointment(s) overdue.`);
    }
    return warnings;
  }

  private serializeRecord(record: any) {
    const date =
      record.status === 'ADMINISTERED' && record.administeredDate
        ? record.administeredDate
        : record.scheduledDate;

    let nextDoseDate: Date | null = null;
    if (record.status === 'ADMINISTERED' && record.administeredDate) {
      nextDoseDate = calculateNextTdDoseDate(
        record.doseNumber,
        new Date(record.administeredDate),
      );
    }

    return {
      _id: record._id,
      motherId: record.motherId,
      vaccineName: record.vaccineName ?? TD_VACCINE_NAME,
      doseNumber: record.doseNumber,
      givenDate: date,
      administeredDate: record.administeredDate,
      scheduledDate: record.scheduledDate,
      nextDoseDate,
      status: record.status === 'ADMINISTERED' ? 'GIVEN' : record.status,
      batchNumber: record.batchNumber,
      notes: record.notes,
    };
  }
}
