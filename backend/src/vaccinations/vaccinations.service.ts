import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Vaccine, VaccineDocument } from './schemas/vaccine.schema';
import { VaccinationRecord, VaccinationRecordDocument } from './schemas/vaccination-record.schema';
import { ChildrenService } from '../children/children.service';

@Injectable()
export class VaccinationsService {
  constructor(
    @InjectModel(Vaccine.name) private vaccineModel: Model<VaccineDocument>,
    @InjectModel(VaccinationRecord.name) private vaccinationRecordModel: Model<VaccinationRecordDocument>,
    private readonly childrenService: ChildrenService
  ) {}

  // Vaccine Management
  async createVaccine(createVaccineDto: any): Promise<Vaccine> {
    const vaccine = new this.vaccineModel(createVaccineDto);
    return vaccine.save();
  }

  async findAllVaccines(): Promise<Vaccine[]> {
    return this.vaccineModel.find({ isActive: true }).sort({ category: 1, recommendedAgeWeeks: 1 }).exec();
  }

  async findVaccineById(id: string): Promise<Vaccine> {
    const vaccine = await this.vaccineModel.findById(id).exec();
    if (!vaccine) {
      throw new NotFoundException('Vaccine not found');
    }
    return vaccine;
  }

  async updateVaccine(id: string, updateVaccineDto: any): Promise<Vaccine> {
    await this.findVaccineById(id);
    return this.vaccineModel.findByIdAndUpdate(id, updateVaccineDto, { new: true }).exec();
  }

  async deleteVaccine(id: string): Promise<void> {
    await this.findVaccineById(id);
    await this.vaccineModel.findByIdAndUpdate(id, { isActive: false }).exec();
  }

  async getVaccinesByCategory(category: string): Promise<Vaccine[]> {
    return this.vaccineModel.find({ category, isActive: true }).sort({ recommendedAgeWeeks: 1 }).exec();
  }

  // Vaccination Records Management
  async createVaccinationRecord(createVaccinationRecordDto: any, userRole: string, userHospitalId?: string, userId?: string): Promise<VaccinationRecord> {
    // Validate access to child
    await this.childrenService.findById(createVaccinationRecordDto.childId, userRole, userHospitalId);
    
    // Validate vaccine exists
    const vaccine = await this.findVaccineById(createVaccinationRecordDto.vaccineId);

    if (createVaccinationRecordDto.status === 'ADMINISTERED') {
      await this.checkBlockDependency(createVaccinationRecordDto.childId, vaccine.code, createVaccinationRecordDto.doseNumber || 1);
    }

    const recordData = {
      ...createVaccinationRecordDto,
      childId: new Types.ObjectId(createVaccinationRecordDto.childId),
      vaccineId: new Types.ObjectId(createVaccinationRecordDto.vaccineId),
      createdBy: userId ? new Types.ObjectId(userId) : undefined,
      createdAtHospital: userHospitalId ? new Types.ObjectId(userHospitalId) : undefined,
      scheduledDate: new Date(createVaccinationRecordDto.scheduledDate),
      administeredDate: createVaccinationRecordDto.administeredDate ? new Date(createVaccinationRecordDto.administeredDate) : undefined,
      expiryDate: createVaccinationRecordDto.expiryDate ? new Date(createVaccinationRecordDto.expiryDate) : undefined,
      followUpDate: createVaccinationRecordDto.followUpDate ? new Date(createVaccinationRecordDto.followUpDate) : undefined,
      originalScheduleDate: createVaccinationRecordDto.originalScheduleDate ? new Date(createVaccinationRecordDto.originalScheduleDate) : undefined,
      weightKg: createVaccinationRecordDto.weightKg ? Number(createVaccinationRecordDto.weightKg) : undefined,
      ageDays: createVaccinationRecordDto.ageDays ? Number(createVaccinationRecordDto.ageDays) : undefined,
      // Ensure all reminder flags start as false so the cron picks this record up
      reminderSent: false,
      reminder3DaySent: false,
      reminderSameDaySent: false,
    };

    const record = new this.vaccinationRecordModel(recordData);
    return record.save();
  }

  async getVaccinationRecordsByChildId(childId: string, userRole: string, userHospitalId?: string, userId?: string): Promise<VaccinationRecord[]> {
    await this.childrenService.findById(childId, userRole, userHospitalId, userId);

    return this.vaccinationRecordModel.find({ childId: new Types.ObjectId(childId) })
      .populate('vaccineId', 'name code description category recommendedAge')
      .populate('administeredBy', 'name email role')
      .populate('administeredAt', 'name type address')
      .sort({ scheduledDate: 1 })
      .exec();
  }

  async getVaccinationRecordsByStatus(status: string, userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<VaccinationRecord[]> {
    let query: any = { status };

    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      if (userHospitalId) query.createdAtHospital = new Types.ObjectId(userHospitalId);
    }

    const records = await this.vaccinationRecordModel.find(query)
      .populate('childId', 'name birthDate gender')
      .populate('vaccineId', 'name code category recommendedAge')
      .populate('administeredBy', 'name email role')
      .populate('administeredAt', 'name type')
      .sort({ scheduledDate: 1 })
      .exec();

    // Additional filtering for Woreda Admin
    if (userRole === 'WOREDA_ADMIN') {
      const filteredRecords = [];
      for (const record of records) {
        try {
          await this.childrenService.findById(record.childId._id.toString(), userRole, undefined, userWoredaId);
          filteredRecords.push(record);
        } catch (error) {
          // Skip records for children not in this woreda
        }
      }
      return filteredRecords;
    }

    return records;
  }

  async getUpcomingVaccinations(userRole: string, userHospitalId?: string, userWoredaId?: string, daysAhead: number = 30): Promise<VaccinationRecord[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    let query: any = {
      scheduledDate: { $gte: today, $lte: futureDate },
      status: { $in: ['SCHEDULED', 'DEFERRED'] }
    };

    // Apply role-based filtering
    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      if (userHospitalId) query.createdAtHospital = new Types.ObjectId(userHospitalId);
    }

    const records = await this.vaccinationRecordModel.find(query)
      .populate('childId', 'name birthDate gender')
      .populate('vaccineId', 'name code category recommendedAge')
      .populate('administeredBy', 'name email role')
      .sort({ scheduledDate: 1 })
      .exec();

    // Additional filtering for Woreda Admin
    if (userRole === 'WOREDA_ADMIN') {
      const filteredRecords = [];
      for (const record of records) {
        try {
          await this.childrenService.findById(record.childId._id.toString(), userRole, undefined, userWoredaId);
          filteredRecords.push(record);
        } catch (error) {
          // Skip records for children not in this woreda
        }
      }
      return filteredRecords;
    }

    return records;
  }

  async getOverdueVaccinations(userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<VaccinationRecord[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    let query: any = {
      scheduledDate: { $lt: today },
      status: { $in: ['SCHEDULED', 'DEFERRED'] }
    };

    // Apply role-based filtering
    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      if (userHospitalId) query.createdAtHospital = new Types.ObjectId(userHospitalId);
    }

    const records = await this.vaccinationRecordModel.find(query)
      .populate('childId', 'name birthDate gender')
      .populate('vaccineId', 'name code category recommendedAge')
      .populate('administeredBy', 'name email role')
      .sort({ scheduledDate: 1 })
      .exec();

    // Additional filtering for Woreda Admin
    if (userRole === 'WOREDA_ADMIN') {
      const filteredRecords = [];
      for (const record of records) {
        try {
          await this.childrenService.findById(record.childId._id.toString(), userRole, undefined, userWoredaId);
          filteredRecords.push(record);
        } catch (error) {
          // Skip records for children not in this woreda
        }
      }
      return filteredRecords;
    }

    return records;
  }

  async updateVaccinationRecord(id: string, updateVaccinationRecordDto: any, userRole: string, userHospitalId?: string): Promise<VaccinationRecord> {
    const record = await this.vaccinationRecordModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException('Vaccination record not found');
    }

    // Check access through child
    await this.childrenService.findById(record.childId.toString(), userRole, userHospitalId);

    const updateData: any = { ...updateVaccinationRecordDto };
    if (updateVaccinationRecordDto.childId) {
      updateData.childId = new Types.ObjectId(updateVaccinationRecordDto.childId);
    }
    if (updateVaccinationRecordDto.vaccineId) {
      updateData.vaccineId = new Types.ObjectId(updateVaccinationRecordDto.vaccineId);
    }
    if (updateVaccinationRecordDto.scheduledDate) {
      updateData.scheduledDate = new Date(updateVaccinationRecordDto.scheduledDate);
    }
    if (updateVaccinationRecordDto.administeredDate) {
      updateData.administeredDate = new Date(updateVaccinationRecordDto.administeredDate);
    }
    if (updateVaccinationRecordDto.expiryDate) {
      updateData.expiryDate = new Date(updateVaccinationRecordDto.expiryDate);
    }
    if (updateVaccinationRecordDto.followUpDate) {
      updateData.followUpDate = new Date(updateVaccinationRecordDto.followUpDate);
    }
    if (updateVaccinationRecordDto.weightKg !== undefined) {
      updateData.weightKg = Number(updateVaccinationRecordDto.weightKg);
    }
    if (updateVaccinationRecordDto.ageDays !== undefined) {
      updateData.ageDays = Number(updateVaccinationRecordDto.ageDays);
    }

    if (updateData.status === 'ADMINISTERED') {
      const vaccine = await this.vaccineModel.findById(record.vaccineId).exec();
      if (vaccine) {
        await this.checkBlockDependency(record.childId.toString(), vaccine.code, record.doseNumber);
      }
    }

    return this.vaccinationRecordModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('vaccineId', 'name code description category recommendedAge')
      .populate('administeredBy', 'name email role')
      .populate('administeredAt', 'name type')
      .exec();
  }

  async deleteVaccinationRecord(id: string, userRole: string, userHospitalId?: string): Promise<void> {
    const record = await this.vaccinationRecordModel.findById(id).exec();
    if (!record) {
      throw new NotFoundException('Vaccination record not found');
    }

    // Check access through child
    await this.childrenService.findById(record.childId.toString(), userRole, userHospitalId);
    
    await this.vaccinationRecordModel.findByIdAndDelete(id);
  }

  // Vaccination Schedule Generation
  async generateVaccinationSchedule(childId: string, userRole: string, userHospitalId?: string, userId?: string): Promise<VaccinationRecord[]> {
    const child = await this.childrenService.findById(childId, userRole, userHospitalId);
    const vaccines = await this.findAllVaccines();
    const schedule: VaccinationRecord[] = [];

    if (vaccines.length === 0) {
      throw new BadRequestException(
        'No vaccines found in the system. Please ask a System Admin to add vaccines before generating a schedule.'
      );
    }

    for (const vaccine of vaccines) {
      for (let dose = 1; dose <= vaccine.dosesRequired; dose++) {
        const ageWeeks = vaccine.recommendedAgeWeeks + ((dose - 1) * vaccine.intervalWeeks);
        const scheduledDate = new Date(child.birthDate);
        scheduledDate.setDate(scheduledDate.getDate() + (ageWeeks * 7));

        // Check if this schedule already exists
        const existing = await this.vaccinationRecordModel.findOne({
          childId: new Types.ObjectId(childId),
          vaccineId: (vaccine as any)._id,
          doseNumber: dose,
        }).exec();

        if (!existing) {
          try {
            const recordData: any = {
              childId: new Types.ObjectId(childId),
              vaccineId: (vaccine as any)._id,
              doseNumber: dose,
              scheduledDate,
              status: 'SCHEDULED',
            };

            // Only set these if we have valid ObjectIds
            if (userHospitalId && /^[0-9a-fA-F]{24}$/.test(userHospitalId)) {
              recordData.createdAtHospital = new Types.ObjectId(userHospitalId);
            }
            if (userId && /^[0-9a-fA-F]{24}$/.test(userId)) {
              recordData.createdBy = new Types.ObjectId(userId);
            }

            const record = new this.vaccinationRecordModel(recordData);
            schedule.push(await record.save());
          } catch (saveErr) {
            // Log but don't fail the whole schedule for one record
            console.error(`Failed to save vaccination record for vaccine ${vaccine.code} dose ${dose}:`, saveErr.message);
          }
        }
      }
    }

    if (schedule.length === 0 && vaccines.length > 0) {
      // All records already exist — return existing ones
      const existing = await this.vaccinationRecordModel
        .find({ childId: new Types.ObjectId(childId) })
        .populate('vaccineId', 'name code category recommendedAge')
        .sort({ scheduledDate: 1 })
        .exec();
      return existing as any;
    }

    return schedule;
  }

  async getVaccinationStats(userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<any> {
    const scheduled = await this.getVaccinationRecordsByStatus('SCHEDULED', userRole, userHospitalId, userWoredaId);
    const administered = await this.getVaccinationRecordsByStatus('ADMINISTERED', userRole, userHospitalId, userWoredaId);
    const missed = await this.getVaccinationRecordsByStatus('MISSED', userRole, userHospitalId, userWoredaId);
    const deferred = await this.getVaccinationRecordsByStatus('DEFERRED', userRole, userHospitalId, userWoredaId);

    const upcoming = await this.getUpcomingVaccinations(userRole, userHospitalId, userWoredaId);
    const overdue = await this.getOverdueVaccinations(userRole, userHospitalId, userWoredaId);

    return {
      total: scheduled.length + administered.length + missed.length + deferred.length,
      scheduled: scheduled.length,
      administered: administered.length,
      missed: missed.length,
      deferred: deferred.length,
      upcoming: upcoming.length,
      overdue: overdue.length,
      coverageRate: administered.length / (administered.length + scheduled.length + missed.length) * 100
    };
  }

  async markVaccinationAdministered(id: string, administrationData: any, userRole: string, userHospitalId?: string, userId?: string): Promise<VaccinationRecord> {
    const record = await this.vaccinationRecordModel.findById(id).populate('vaccineId').exec();
    if (!record) {
      throw new NotFoundException('Vaccination record not found');
    }

    // Check block dependency before administering
    const vaccineCode = (record.vaccineId as any)?.code;
    const doseNumber = record.doseNumber;
    await this.checkBlockDependency(record.childId.toString(), vaccineCode, doseNumber);

    const updateData = {
      ...administrationData,
      status: 'ADMINISTERED',
      administeredDate: administrationData.administeredDate ? new Date(administrationData.administeredDate) : new Date(),
      administeredBy: userId ? new Types.ObjectId(userId) : undefined,
      administeredAt: userHospitalId ? new Types.ObjectId(userHospitalId) : undefined,
      weightKg: administrationData.weightKg ? Number(administrationData.weightKg) : undefined,
      ageDays: administrationData.ageDays ? Number(administrationData.ageDays) : undefined,
    };

    return this.updateVaccinationRecord(id, updateData, userRole, userHospitalId);
  }

  async markVaccinationMissed(
    id: string,
    missReason: string,
    userRole: string,
    userHospitalId?: string,
    userId?: string,
  ): Promise<VaccinationRecord> {
    const record = await this.vaccinationRecordModel.findById(id).populate('vaccineId').exec();
    if (!record) {
      throw new NotFoundException('Vaccination record not found');
    }

    const updated = await this.updateVaccinationRecord(
      id,
      { status: 'MISSED', missReason },
      userRole,
      userHospitalId,
    );

    // Add catch-up appointment on the vaccination card (same dose, does not block next block)
    const existingCatchUp = await this.vaccinationRecordModel.findOne({
      childId: record.childId,
      vaccineId: record.vaccineId,
      doseNumber: record.doseNumber,
      isCatchUp: true,
      status: 'SCHEDULED',
    });

    if (!existingCatchUp) {
      const catchUpDate = new Date();
      catchUpDate.setDate(catchUpDate.getDate() + 14);

      await this.vaccinationRecordModel.create({
        childId: record.childId,
        vaccineId: record.vaccineId,
        doseNumber: record.doseNumber,
        scheduledDate: catchUpDate,
        status: 'SCHEDULED',
        isCatchUp: true,
        missReason: `Catch-up for missed dose: ${missReason}`,
        originalScheduleDate: record.scheduledDate,
        createdBy: userId ? new Types.ObjectId(userId) : record.createdBy,
        createdAtHospital: userHospitalId
          ? new Types.ObjectId(userHospitalId)
          : record.createdAtHospital,
        reminderSent: false,
        reminder3DaySent: false,
        reminderSameDaySent: false,
      });
    }

    // Open the next round: reschedule any overdue next-block records for this child
    const vaccineCode = (record.vaccineId as any)?.code;
    if (vaccineCode) {
      await this.openNextRoundAfterMiss(
        record.childId.toString(),
        vaccineCode,
        record.doseNumber,
        userHospitalId,
        userId,
      );
    }

    return updated;
  }

  /**
   * After a dose is marked MISSED, find all vaccination records for the same child
   * that belong to the immediately next block and are overdue (scheduledDate in the past,
   * status still SCHEDULED, not a catch-up). Reschedule them starting from today + 7 days
   * so they become actionable again instead of sitting as silent overdue records.
   */
  private async openNextRoundAfterMiss(
    childId: string,
    missedVaccineCode: string,
    missedDoseNumber: number,
    userHospitalId?: string,
    userId?: string,
  ): Promise<void> {
    const missedBlock = this.getVaccineBlock(missedVaccineCode, missedDoseNumber);
    const nextBlock = missedBlock + 1;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all SCHEDULED, non-catch-up records for this child in the next block that are overdue
    const allChildRecords = await this.vaccinationRecordModel
      .find({
        childId: new Types.ObjectId(childId),
        status: 'SCHEDULED',
        isCatchUp: { $ne: true },
        scheduledDate: { $lt: today },
      })
      .populate('vaccineId')
      .exec();

    const nextBlockOverdue = allChildRecords.filter((r) => {
      const vCode = (r.vaccineId as any)?.code;
      const block = this.getVaccineBlock(vCode, r.doseNumber);
      return block === nextBlock;
    });

    if (nextBlockOverdue.length === 0) return;

    // Reschedule each overdue next-block record to today + 7 days,
    // preserving the original scheduled date for audit purposes.
    const rescheduleDate = new Date();
    rescheduleDate.setDate(rescheduleDate.getDate() + 7);

    for (const r of nextBlockOverdue) {
      await this.vaccinationRecordModel.findByIdAndUpdate((r as any)._id, {
        scheduledDate: rescheduleDate,
        originalScheduleDate: r.originalScheduleDate ?? r.scheduledDate,
        // Reset reminder flags so the cron picks up the new date
        reminderSent: false,
        reminder3DaySent: false,
        reminderSameDaySent: false,
      });
    }
  }

  async deferVaccination(id: string, deferReason: string, newScheduledDate: string, userRole: string, userHospitalId?: string): Promise<VaccinationRecord> {
    return this.updateVaccinationRecord(id, {
      status: 'DEFERRED',
      deferReason,
      scheduledDate: new Date(newScheduledDate),
      originalScheduleDate: new Date() // Store the original date
    }, userRole, userHospitalId);
  }

  getVaccineBlock(code: string, doseNumber: number): number {
    const normalizedCode = (code || '').toUpperCase().trim();
    if (normalizedCode === 'BCG' || normalizedCode === 'OPV0' || normalizedCode === 'HEPB') {
      return 1;
    }
    if (normalizedCode === 'OPV' || normalizedCode === 'PENTA' || normalizedCode === 'PCV' || normalizedCode === 'ROTA') {
      if (doseNumber === 1) return 2;
      if (doseNumber === 2) return 3;
      if (doseNumber === 3) return 4;
    }
    if (normalizedCode === 'IPV') {
      return 4;
    }
    if (normalizedCode === 'VIT_A' || normalizedCode === 'VITA' || normalizedCode === 'MALARIA1') {
      return 5;
    }
    if (normalizedCode === 'MALARIA2') {
      return 6;
    }
    return 1; // Default fallback
  }

  async checkBlockDependency(childId: string, vaccineCode: string, doseNumber: number): Promise<void> {
    const targetBlock = this.getVaccineBlock(vaccineCode, doseNumber);
    if (targetBlock <= 1) {
      return; // Block 1 has no predecessor blocks
    }

    // Get all vaccination records for this child
    const allRecords = await this.vaccinationRecordModel
      .find({ childId: new Types.ObjectId(childId) })
      .populate('vaccineId')
      .exec();

    const incompletePredecessors = [];

    for (const record of allRecords) {
      const vCode = (record.vaccineId as any)?.code;
      const dNum = record.doseNumber;
      const blockNum = this.getVaccineBlock(vCode, dNum);

      // Only active SCHEDULED doses block the next round.
      // MISSED / DEFERRED are recorded on the child's vaccination card and allow catch-up progression.
      if (blockNum < targetBlock && record.status === 'SCHEDULED') {
        incompletePredecessors.push({
          name: (record.vaccineId as any)?.name || vCode,
          dose: dNum,
          block: blockNum,
          status: record.status,
        });
      }
    }

    if (incompletePredecessors.length > 0) {
      const listStr = incompletePredecessors
        .map(p => `${p.name} (Dose ${p.dose}) [Block ${p.block}]`)
        .join(', ');
      throw new BadRequestException(
        `Complete or mark as missed the previous scheduled vaccines before this dose: ${listStr}. ` +
          `Use "Miss" to record a missed dose on the vaccination card and continue with the next round.`,
      );
    }
  }
}
