import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ClientSession, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';

import { Referral, ReferralDocument } from './schemas/referral.schema';
import {
  CreateReferralDto,
  RespondReferralDto,
  UnlockReferralDto,
  GateCheckInDto,
} from './dto/referralDto.dto';

import { ReferralStatus } from '../common/enums/referral-status.enum';
import { NotificationService } from './notification.service';
import { MothersService } from '../mothers/mothers.service';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as QRCode from 'qrcode';

@Injectable()
export class ReferralsService {
  constructor(
    @InjectModel(Referral.name)
    private readonly referralModel: Model<ReferralDocument>,

    @InjectModel(Hospital.name)
    private readonly hospitalModel: Model<HospitalDocument>,

    private readonly notificationService: NotificationService,
    private readonly motherService: MothersService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // 1. CREATE REFERRAL (Doctor → DRAFT)
  async createReferral(
    dto: CreateReferralDto,
    doctorId: string,
    facilityId: string,   // works for both hospital and health-center
    doctorName: string,
    userRole: string = 'DOCTOR',
  ): Promise<Referral> {

    const { mother: motherData, ...referralData } = dto;
    let mother: any;

    if (dto.motherId) {
      mother = await this.motherService.findById(dto.motherId, userRole, facilityId);
      if (!mother) throw new BadRequestException('Invalid mother');
    } else if (motherData) {
      const existingMother = await this.motherService.findByPhoneOrEmail(
        motherData.phone, motherData.email,
      );
      mother = existingMother ?? await this.motherService.create({ ...motherData }, userRole, facilityId);
      if (!mother) throw new BadRequestException('Failed to create mother');
    } else {
      throw new BadRequestException('Mother information is required');
    }

    // Resolve facility type for display
    const facility = await this.hospitalModel.findById(facilityId).select('type').lean();
    const fromFacilityType = (facility as any)?.type ?? 'HOSPITAL';

    const actorLabel = ['NURSE', 'MIDWIFE'].includes(userRole) ? 'Nurse/Midwife' : 'Doctor';

    const referral = await this.referralModel.create({
      ...referralData,
      fromHospital: facilityId,
      fromFacilityType,
      motherId: new Types.ObjectId(mother._id),
      motherSnapshot: {
        name: mother?.name,
        phone: mother?.phone,
        age: mother?.age,
        address: mother?.address,
        emergencyContact: mother?.emergencyContact,
        medicalHistory: mother?.medicalHistory,
        expectedDeliveryDate: mother?.expectedDeliveryDate,
        highRisk: mother?.highRisk,
        gravida: mother?.gravida,
        para: mother?.para,
        lmp: mother?.lmp,
        bloodType: mother?.bloodType,
        rhFactor: mother?.rhFactor,
        hivStatus: mother?.hivStatus,
        hepatitisB: mother?.hepatitisB,
        hypertension: mother?.hypertension,
        diabetes: mother?.diabetes,
        anemia: mother?.anemia,
        previousCSection: mother?.previousCSection,
      },
      referralCode: `REF-${Date.now()}`,
      createdBy: doctorId,
      status: ReferralStatus.DRAFT,
      activityLog: [{
        status: ReferralStatus.DRAFT,
        actor: doctorId,
        note: `Referral drafted by ${actorLabel} ${doctorName}`,
        timestamp: new Date(),
      }],
    });

    await this.notificationService.notifyReferralCreated(
      referral._id.toString(), doctorName, [doctorId],
    );

    return referral;
  }
  async attachFile(referralId: string, filePath: string, uploaderFacilityId: string) {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');
    const fromHospitalId = typeof referral.fromHospital === 'string' 
      ? referral.fromHospital 
      : (referral.fromHospital as any)._id.toString();

    if (fromHospitalId !== uploaderFacilityId?.toString()) {
      throw new ForbiddenException('Only the sending facility can attach referral files');
    }
    return this.referralModel.findByIdAndUpdate(
      referralId, { $push: { attachments: filePath } }, { new: true },
    );
  }

  async updateReferral(
    referralId: string,
    dto: Partial<CreateReferralDto>,
    updaterFacilityId: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');
    const fromHospitalId = typeof referral.fromHospital === 'string' 
      ? referral.fromHospital 
      : (referral.fromHospital as any)._id.toString();

    if (fromHospitalId !== updaterFacilityId?.toString()) {
      throw new ForbiddenException('Only the sending facility can edit this referral');
    }
    if (referral.status !== ReferralStatus.DRAFT) {
      throw new BadRequestException('Only draft referrals can be edited');
    }

    if (dto.patientName !== undefined) referral.patientName = dto.patientName;
    if (dto.patientPhone !== undefined) referral.patientPhone = dto.patientPhone;
    if (dto.urgency !== undefined) referral.urgency = dto.urgency;
    if (dto.reasonForReferral !== undefined) referral.reasonForReferral = dto.reasonForReferral;
    if (dto.clinicalNotes !== undefined) referral.clinicalNotes = dto.clinicalNotes;
    if (dto.liaisonNote !== undefined) referral.liaisonNote = dto.liaisonNote;
    if (dto.motherId !== undefined) referral.motherId = new Types.ObjectId(dto.motherId) as any;

    return referral.save();
  }

  async deleteReferral(referralId: string, requesterFacilityId: string): Promise<void> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');
    if (referral.fromHospital?.toString() !== requesterFacilityId?.toString()) {
      throw new ForbiddenException('Only the sending facility can delete this referral');
    }
    if (referral.status !== ReferralStatus.DRAFT) {
      throw new BadRequestException('Only draft referrals can be deleted');
    }
    await referral.deleteOne();
  }

  async findActiveByMother(motherId: string): Promise<Referral | null> {
  return this.referralModel.findOne({
    motherId: new Types.ObjectId(motherId),
    status: {
      $in: [
        ReferralStatus.DRAFT,
        ReferralStatus.PENDING,
        ReferralStatus.ACCEPTED,
        ReferralStatus.CHECKED_IN,
      ],
    },
  });
}
async createSystemReferral(data: {
  motherId: string;
  fromHospital: string;
  reason: string;
}): Promise<Referral> {
  const referral = await this.referralModel.create({
    motherId: new Types.ObjectId(data.motherId),
    fromHospital: new Types.ObjectId(data.fromHospital),
    referralCode: `SYS-${Date.now()}`,
    createdBy: null,
    status: ReferralStatus.PENDING,
    reason: data.reason,

    activityLog: [
      {
        status: ReferralStatus.PENDING,
        actor: null, // Use null for SYSTEM actions
        note: `Auto referral triggered: ${data.reason}`,
        timestamp: new Date(),
      },
    ],
  });

  return referral;
}

  // 2. FINALIZE & SEND (Liaison Officer — any facility type)
  async finalizeAndSend(
    referralId: string,
    liaisonId: string,
    liaisonFacilityId: string,   // health center OR hospital
    targetFacilityId: string,
    liaisonName: string,
    liaisonNote?: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

    if (referral.fromHospital.toString() !== liaisonFacilityId.toString()) {
      throw new ForbiddenException('You are not allowed to send referrals from another facility');
    }

    if (referral.status !== ReferralStatus.DRAFT) {
      throw new BadRequestException('Referral already finalized');
    }

    const resolvedTargetId =
      targetFacilityId?.trim() ||
      (referral.toHospital
        ? (typeof referral.toHospital === 'object'
            ? (referral.toHospital as any)._id?.toString()
            : referral.toHospital.toString())
        : undefined);

    if (!resolvedTargetId) {
      throw new BadRequestException(
        'This draft has no destination facility. The referral creator must set a destination before sending.',
      );
    }

    if (liaisonFacilityId === resolvedTargetId) {
      throw new BadRequestException('Target facility cannot be the same as the originating facility');
    }

    const targetFacility = await this.hospitalModel.findById(resolvedTargetId);
    if (!targetFacility) throw new NotFoundException('Target facility does not exist');

    referral.toHospital = new Types.ObjectId(resolvedTargetId) as any;
    referral.toFacilityType = targetFacility.type ?? 'HOSPITAL';
    referral.status = ReferralStatus.PENDING;
    referral.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
    if (liaisonNote?.trim()) referral.liaisonNote = liaisonNote.trim();

    referral.activityLog.push({
      status: ReferralStatus.PENDING,
      actor: liaisonId,
      note: `Referral dispatched to ${targetFacility.name} (${targetFacility.type ?? 'HOSPITAL'}) by ${liaisonName}`,
      timestamp: new Date(),
    });

    const saved = await referral.save();

    try {
      await this.notificationService.notifyReferralSent(
        saved._id.toString(), targetFacility.name, [resolvedTargetId],
      );
    } catch (err) {
      console.error('Notification failed but referral was saved:', err);
    }

    return saved;
  }

  // 3. RESPOND TO REFERRAL
  async respondToReferral(
    referralId: string,
    dto: RespondReferralDto,
    responderId: string,
    responderFacilityId: string,
  ): Promise<Referral> {
    const session: ClientSession = await this.referralModel.db.startSession();
    session.startTransaction();

    try {
      const referral = await this.referralModel.findById(referralId).session(session);
      if (!referral) throw new NotFoundException('Referral not found');
      
      console.log('DEBUG:', { 
        toHospital: referral.toHospital, 
        responderFacilityId,
      });
      
      if (!referral.toHospital) {
        throw new BadRequestException('This referral does not have a destination facility assigned.');
      }
      
      if (referral.toHospital.toString() !== responderFacilityId.toString()) {
        throw new ForbiddenException('Your facility is not authorized to respond to this referral');
      }

      if (referral.status !== ReferralStatus.PENDING)
        throw new BadRequestException('Referral must be pending before a decision can be made');

      if (dto.status !== ReferralStatus.ACCEPTED && !dto.justification)
        throw new BadRequestException('Justification is required for rejections/holds');

      if (dto.status === ReferralStatus.ACCEPTED) {
        referral.acceptedAt = new Date();
      }

      referral.status = dto.status;
      referral.decisionMeta = {
        responderId,
        justification: dto.justification,
        appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : undefined,
      };

      referral.activityLog.push({
        status: dto.status,
        actor: responderId,
        note: `Decision (${dto.status}) recorded by receiving hospital`,
        timestamp: new Date(),
      });

      const saved = await referral.save({ session });
      await session.commitTransaction();

      await this.notificationService.notifyReferralResponded(
        saved._id.toString(),
        dto.status,
        [referral.createdBy.toString(), referral.fromHospital.toString()],
        dto.justification,
      );

      return saved;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      session.endSession();
    }
  }

  /**
   * Build a PNG buffer encoding the real referral _id and motherId for gate check-in.
   */
  private async buildReferralQrBuffer(referral: ReferralDocument): Promise<Buffer> {
    const payload = JSON.stringify({
      referralId: referral._id.toString(),
      motherId: referral.motherId.toString(),
    });

    return QRCode.toBuffer(payload, {
      type: 'png',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 512,
    });
  }

  /**
   * After the QR buffer exists: upload to Cloudinary, persist qrCodeUrl, set ACCEPTED.
   */
  async generateAndStoreQrCode(
    referralId: string,
    actorId: string,
    facilityId: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

    const fromHospitalId =
      typeof referral.fromHospital === 'string'
        ? referral.fromHospital
        : (referral as any).fromHospital?._id?.toString();

    if (!fromHospitalId || fromHospitalId !== facilityId?.toString()) {
      throw new ForbiddenException('Only the sending facility can generate the referral QR code');
    }

    if (!referral.motherId) {
      throw new BadRequestException('Referral is missing motherId');
    }

    const allowedStatuses = [
      ReferralStatus.PENDING,
      ReferralStatus.ACCEPTED,
      ReferralStatus.DRAFT,
    ];
    if (!allowedStatuses.includes(referral.status)) {
      throw new BadRequestException(
        `Cannot generate QR for referral in status ${referral.status}`,
      );
    }

    const qrCodeBuffer = await this.buildReferralQrBuffer(referral);

    const upload = await this.cloudinaryService.uploadBuffer(qrCodeBuffer, {
      folder: 'pregnancy_qr_codes',
      format: 'png',
      publicId: `referral-${referral._id}`,
    });

    referral.qrCodeUrl = upload.secure_url;
    referral.status = ReferralStatus.ACCEPTED;
    if (!referral.acceptedAt) {
      referral.acceptedAt = new Date();
    }

    referral.activityLog.push({
      status: ReferralStatus.ACCEPTED,
      actor: actorId,
      note: 'QR code generated, uploaded to Cloudinary, and referral accepted',
      timestamp: new Date(),
    });

    const saved = await referral.save();

    const populated = await this.referralModel
      .findById(saved._id)
      .populate('fromHospital', 'name type location')
      .populate('toHospital', 'name type location')
      .populate('motherId', 'name phone age')
      .populate('createdBy', 'name email role')
      .exec();

    if (!populated) throw new NotFoundException('Referral not found after QR update');
    return populated;
  }

  async getIncomingReferrals(facilityId: string): Promise<Referral[]> {
    return this.referralModel.find({
      toHospital: facilityId,
      status: { $in: [ReferralStatus.PENDING, ReferralStatus.CHECKED_IN, ReferralStatus.ARRIVED] },
    })
    .populate('fromHospital', 'name type')
    .populate('createdBy', 'name email')
    .populate('motherId', 'name phone age')
    .sort({ createdAt: -1 });
  }

  async getCheckedInReferrals(facilityId: string): Promise<Referral[]> {
    return this.referralModel.find({
      toHospital: facilityId,
      status: { $in: [ReferralStatus.CHECKED_IN, ReferralStatus.ARRIVED] },
    })
    .populate('fromHospital', 'name type')
    .populate('toHospital', 'name type')
    .populate('createdBy', 'name email')
    .populate('motherId', 'name phone age')
    .sort({ gateCheckedInAt: -1, createdAt: -1 });
  }

  /** Resolve referral from legacy referralCode or JSON QR payload `{ referralId, motherId }`. */
  private async resolveReferralFromScanInput(scanInput: string): Promise<ReferralDocument | null> {
    const trimmed = scanInput.trim();
    try {
      const parsed = JSON.parse(trimmed) as { referralId?: string; motherId?: string };
      if (parsed?.referralId) {
        return this.referralModel.findById(parsed.referralId);
      }
    } catch {
      // Not JSON — fall through to referralCode lookup
    }
    return this.referralModel.findOne({ referralCode: trimmed });
  }

  // 4. GATE CHECK-IN
  async gateCheckIn(dto: GateCheckInDto, gateOfficerId: string, userHospitalId?: string): Promise<Referral> {
    try {
      const referral = await this.resolveReferralFromScanInput(dto.referralCode);
      if (!referral) {
        throw new NotFoundException('Referral not found');
      }

      if (referral.gateCheckedInAt) {
        return referral;
      }

      if (![ReferralStatus.PENDING, ReferralStatus.ACCEPTED].includes(referral.status)) {
        throw new BadRequestException('Referral not valid for entry');
      }

      referral.gateCheckedInAt = new Date();
      referral.status = ReferralStatus.CHECKED_IN;

      referral.activityLog.push({
        status: ReferralStatus.CHECKED_IN,
        actor: gateOfficerId,
        note: 'Patient arrived at hospital gate',
        timestamp: new Date(),
      });

      return await referral.save();
    } catch (error) {
      throw error;
    }
  }

  // 5. UNLOCK CLINICAL DATA
  async unlockReferral(
    dto: UnlockReferralDto,
    specialistId: string,
    specialistFacilityId: string,
  ): Promise<Referral> {
    const referral = await this.referralModel
      .findOne({ referralCode: dto.referralCode })
      .populate('motherId')
      .populate('fromHospital', 'name type')
      .populate('toHospital', 'name type');

    if (!referral) throw new NotFoundException('Referral not found');

    const toFacilityId = (referral.toHospital as any)?._id?.toString?.() ?? referral.toHospital?.toString?.();
    if (!specialistFacilityId) {
      throw new BadRequestException('User facility ID missing from token');
    }
    if (!referral.toHospital || toFacilityId !== specialistFacilityId.toString()) {
      throw new ForbiddenException('Your facility is not authorized to unlock this referral');
    }

    const now = new Date();

    if (referral.isUnlocked && referral.status === ReferralStatus.COMPLETED) {
      return referral; // already fully completed
    }

    if (referral.status !== ReferralStatus.CHECKED_IN) {
      throw new BadRequestException('Referral must be checked-in before unlock');
    }

    // Unlock clinical data and mark the referral as completed at the receiving hospital
    referral.isUnlocked = true;
    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = now;

    referral.activityLog.push({
      status: ReferralStatus.COMPLETED,
      actor: specialistId,
      note: 'Clinical data unlocked and referral completed by specialist',
      timestamp: now,
    });

    const saved = await referral.save();

    await this.notificationService.notifyClinicalDataUnlocked(
      saved._id.toString(),
      [referral.createdBy],
    );

    return saved;
  }

  // 6. SUBMIT FEEDBACK
  async submitFeedback(
    referralId: string,
    feedbackNote: string,
    specialistId: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

    if (!referral.isUnlocked)
      throw new BadRequestException('Clinical data not unlocked');

    if (referral.status === ReferralStatus.COMPLETED)
      throw new BadRequestException('Feedback already submitted');

    referral.status = ReferralStatus.COMPLETED;
    referral.completedAt = new Date();

    referral.activityLog.push({
      status: ReferralStatus.COMPLETED,
      actor: specialistId,
      note: `Backward referral: ${feedbackNote}`,
      timestamp: new Date(),
    });

    const saved = await referral.save();

    await this.notificationService.notifyFeedbackSubmitted(
      saved._id.toString(),
      [referral.createdBy],
    );

    return saved;
  }

  // 7. AUTO-EXPIRE REFERRALS
  @Cron(CronExpression.EVERY_30_MINUTES)
  async expireReferrals(): Promise<void> {
    const now = new Date();

    await this.referralModel.updateMany(
      {
        status: { $in: [ReferralStatus.PENDING, ReferralStatus.ACCEPTED] },
        expiresAt: { $lt: now },
      },
      {
        $set: {
          status: ReferralStatus.EXPIRED,
          expiredAt: now,
        },
        $push: {
          activityLog: {
            status: ReferralStatus.EXPIRED,
            actor: null, // Use null for SYSTEM actions
            note: 'Referral expired automatically',
            timestamp: now,
          },
        },
      },
    );
  }

  // 8. GATE KEEPER VIEW
  async getGatePassInfo(referralCode: string): Promise<any> {
    const referral = await this.referralModel.findOne({ referralCode })
      .select('motherId status toHospital')
      .populate('motherId', 'name phone')
      .lean();

    if (!referral) throw new NotFoundException('Invalid Referral Code');

    return referral;
  }

  // 9. LIAISON OUTBOX — all referrals originating from this facility (any status)
  async getOutgoingReferrals(facilityId: string): Promise<Referral[]> {
    return this.referralModel
      .find({ fromHospital: facilityId })
      .populate('motherId', 'name phone')
      .populate('createdBy', 'name email')
      .populate('toHospital', 'name type')
      .populate('fromHospital', 'name type')
      .sort({ createdAt: -1 });
  }

  // DRAFT referrals from this facility waiting to be sent by liaison
  async getDraftReferrals(facilityId: string): Promise<Referral[]> {
    return this.referralModel
      .find({ fromHospital: facilityId, status: ReferralStatus.DRAFT })
      .populate('motherId', 'name phone age')
      .populate('createdBy', 'name email')
      .populate('toHospital', 'name type')
      .sort({ createdAt: -1 });
  }

  // 10. SPECIALIST WORKLIST
  async getSpecialistQueue(facilityId: string): Promise<Referral[]> {
    return this.referralModel.find({
      toHospital: facilityId,
      status: { $in: [ReferralStatus.ACCEPTED, ReferralStatus.CHECKED_IN, ReferralStatus.ARRIVED] },
    })
    .populate('motherId', 'name phone age')
    .populate('fromHospital', 'name type')
    .sort({ gateCheckedInAt: -1, createdAt: -1 });
  }

  async getHospitalDashboard(facilityId: string, type: 'inbound' | 'outbound'): Promise<Referral[]> {
    const query = type === 'inbound'
      ? { toHospital: facilityId }
      : { fromHospital: facilityId };

    return this.referralModel.find(query)
      .populate('motherId', 'name phone')
      .populate('fromHospital', 'name type')
      .populate('toHospital', 'name type')
      .sort({ createdAt: -1 });
  }

  async getReferralById(referralId: string, facilityId: string | undefined, requesterRole?: string): Promise<Referral> {
    // SYSTEM_ADMIN and MOH_ADMIN can see any referral
    const isAdmin = requesterRole === 'SYSTEM_ADMIN' || requesterRole === 'MOH_ADMIN' || requesterRole === 'SUPER_ADMIN';

    // Build the access filter — admins bypass facility check
    const filter: any = { _id: referralId };
    if (!isAdmin) {
      if (!facilityId) throw new NotFoundException('Referral not found or access denied.');
      filter.$or = [
        { fromHospital: facilityId },
        { toHospital: facilityId },
      ];
    }

    const referral = await this.referralModel.findOne(filter)
      .populate('fromHospital', 'name type location')
      .populate('toHospital', 'name type location')
      .populate('motherId', 'name phone age address medicalHistory emergencyContact expectedDeliveryDate highRisk gravida para lmp bloodType')
      .populate('createdBy', 'name email role')
      .populate('activityLog.actor', 'name email')
      .populate('decisionMeta.responderId', 'name email');

    if (!referral) {
      throw new NotFoundException('Referral not found or access denied.');
    }

    const isReceiver = referral.toHospital &&
      facilityId &&
      (typeof referral.toHospital === 'string' 
        ? referral.toHospital === facilityId.toString()
        : (referral.toHospital as any)._id.toString() === facilityId.toString());

    const nonClinicalReceiverRoles = new Set([
      'LIAISON_OFFICER',
      'HOSPITAL_APPROVER',
      'HOSPITAL_ADMIN',
      'HEALTH_CENTER_ADMIN',
      'GATEKEEPER',
    ]);
    const alwaysRedactForReceiver = requesterRole ? nonClinicalReceiverRoles.has(requesterRole) : false;

    if (isReceiver && (alwaysRedactForReceiver || !referral.isUnlocked)) {
      // Strip sensitive clinical fields for receiving non-clinical roles
      (referral as any).clinicalNotes = undefined;
      (referral as any).attachments = [];
      if ((referral as any).motherId && typeof (referral as any).motherId === 'object') {
        const m = (referral as any).motherId as any;
        (referral as any).motherId = { _id: m._id, name: m.name, age: m.age, phone: m.phone };
      }
      if (referral.motherSnapshot) {
        referral.motherSnapshot = {
          name: referral.motherSnapshot.name,
          age: referral.motherSnapshot.age,
          phone: referral.motherSnapshot.phone,
          highRisk: referral.motherSnapshot.highRisk,
          bloodType: referral.motherSnapshot.bloodType,
          rhFactor: referral.motherSnapshot.rhFactor,
          hivStatus: referral.motherSnapshot.hivStatus,
          hepatitisB: referral.motherSnapshot.hepatitisB,
          // Risk factors are clinical context the liaison officer needs to do their job
          hypertension: referral.motherSnapshot.hypertension,
          diabetes: referral.motherSnapshot.diabetes,
          anemia: referral.motherSnapshot.anemia,
          previousCSection: referral.motherSnapshot.previousCSection,
        } as any;
      }
    }

    return referral;
  }

  async getAdminReferralStats() {
    const [total, draft, pending, accepted, arrived, completed, rejected, expired] =
      await Promise.all([
        this.referralModel.countDocuments({}),
        this.referralModel.countDocuments({ status: ReferralStatus.DRAFT }),
        this.referralModel.countDocuments({ status: ReferralStatus.PENDING }),
        this.referralModel.countDocuments({ status: ReferralStatus.ACCEPTED }),
        this.referralModel.countDocuments({ status: ReferralStatus.ARRIVED }),
        this.referralModel.countDocuments({ status: ReferralStatus.COMPLETED }),
        this.referralModel.countDocuments({ status: ReferralStatus.REJECTED }),
        this.referralModel.countDocuments({ status: ReferralStatus.EXPIRED }),
      ]);

    return {
      total,
      draft,
      pending,
      accepted,
      arrived,
      completed,
      rejected,
      expired,
      active: draft + pending + accepted + arrived,
    };
  }

  async getSystemAdminReferralStats(regionId: string) {
    const regionHospitals = await this.hospitalModel.find({ 
      regionId: new Types.ObjectId(regionId) 
    }).select('_id');
    
    const hospitalIds = regionHospitals.map(h => h._id);
    
    const regionFilter = {
      $or: [
        { fromHospital: { $in: hospitalIds } },
        { toHospital: { $in: hospitalIds } }
      ]
    };

    const [total, draft, pending, accepted, arrived, completed, rejected, expired] =
      await Promise.all([
        this.referralModel.countDocuments(regionFilter),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.DRAFT }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.PENDING }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.ACCEPTED }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.ARRIVED }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.COMPLETED }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.REJECTED }),
        this.referralModel.countDocuments({ ...regionFilter, status: ReferralStatus.EXPIRED }),
      ]);

    return {
      total,
      draft,
      pending,
      accepted,
      arrived,
      completed,
      rejected,
      expired,
      active: draft + pending + accepted + arrived,
    };
  }

  async updateReferralStatus(
    referralId: string,
    status: ReferralStatus,
    actorId: string,
    facilityId: string,
    note?: string,
  ): Promise<Referral> {
    const referral = await this.referralModel.findById(referralId);
    if (!referral) throw new NotFoundException('Referral not found');

    const isFrom = referral.fromHospital.toString() === facilityId.toString();
    const isTo = referral.toHospital?.toString() === facilityId.toString();

    if (!isFrom && !isTo) {
      throw new ForbiddenException('Your facility is not authorized to update this referral');
    }

    referral.status = status;
    
    if (status === ReferralStatus.ARRIVED || status === ReferralStatus.CHECKED_IN) {
      referral.gateCheckedInAt = new Date();
    } else if (status === ReferralStatus.COMPLETED) {
      referral.completedAt = new Date();
    }

    referral.activityLog.push({
      status,
      actor: actorId,
      note: note || `Status updated to ${status}`,
      timestamp: new Date(),
    });

    return referral.save();
  }
}