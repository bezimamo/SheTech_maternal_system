import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema, Types } from 'mongoose';
import { ReferralStatus, UrgencyLevel } from 'src/common/enums/referral-status.enum';

export type ReferralDocument = HydratedDocument<Referral>;

@Schema({ timestamps: true })
export class Referral {
  // ─────────────────────────────────────────
  // IDENTIFICATION
  // ─────────────────────────────────────────
  @Prop({ unique: true, required: true })
  referralCode: string;

  // ─────────────────────────────────────────
  // PARTICIPANTS
  // ─────────────────────────────────────────
  // fromHospital / toHospital ref the Hospital collection which stores
  // BOTH hospitals and health centers (type: 'HOSPITAL' | 'HEALTH_CENTER').
  // facilityType fields record what kind of facility it was at creation time.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hospital', required: true })
  fromHospital: string;

  @Prop({ type: String, enum: ['HOSPITAL', 'HEALTH_CENTER'], default: 'HOSPITAL' })
  fromFacilityType: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Hospital', required: false })
  toHospital: string;

  @Prop({ type: String, enum: ['HOSPITAL', 'HEALTH_CENTER'] })
  toFacilityType?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  createdBy: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  assignedSpecialist?: string;

  // ─────────────────────────────────────────
  // MOTHER INTEGRATION (MATERNAL SYSTEM)
  // ─────────────────────────────────────────
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Pregnancy' })
  pregnancyId?: string;

  // ─────────────────────────────────────────
  // PATIENT (PUBLIC DATA) - Kept for compatibility
  // ─────────────────────────────────────────
  @Prop({ required: true })
  patientName: string;

  @Prop({ required: true })
  patientPhone: string;

  @Prop({ enum: UrgencyLevel, required: true })
  urgency: UrgencyLevel;

  // ─────────────────────────────────────────
  // CLINICAL DATA (PROTECTED)
  // ─────────────────────────────────────────
  @Prop({ required: true })
  reasonForReferral: string;

  @Prop()
  clinicalNotes?: string;

  @Prop({ type: [String], default: [] })
  attachments: string[];

  // ─────────────────────────────────────────
  // MATERNAL CLINICAL DATA
  // ─────────────────────────────────────────
  @Prop()
  gestationalAge?: number;

  @Prop()
  expectedDeliveryDate?: Date;

  @Prop()
  gravida?: number;

  @Prop()
  para?: number;

  @Prop()
  clinicalCondition?: string;

  @Prop({ type: String, enum: ['LOW', 'HIGH'], default: 'LOW' })
  riskLevel: string;

  // ─────────────────────────────────────────
  // MOTHER SNAPSHOT (TRANSFERRED / LOCKABLE)
  // A point-in-time copy of key mother fields so the referral
  // carries the necessary information even if the Mother record changes.
  // This can be selectively exposed based on status/isUnlocked.
  // ─────────────────────────────────────────
  @Prop({
    type: {
      name: String,
      phone: String,
      age: Number,
      address: String,
      emergencyContact: String,
      medicalHistory: String,
      expectedDeliveryDate: Date,
      highRisk: Boolean,
      gravida: Number,
      para: Number,
      lmp: Date,
      bloodType: String,
      rhFactor: String,
      hivStatus: String,
      hepatitisB: String,
      hypertension: Boolean,
      diabetes: Boolean,
      anemia: Boolean,
      previousCSection: Boolean,
    },
  })
  motherSnapshot?: {
    name?: string;
    phone?: string;
    age?: number;
    address?: string;
    emergencyContact?: string;
    medicalHistory?: string;
    expectedDeliveryDate?: Date;
    highRisk?: boolean;
    gravida?: number;
    para?: number;
    lmp?: Date;
    bloodType?: string;
    rhFactor?: string;
    hivStatus?: string;
    hepatitisB?: string;
    hypertension?: boolean;
    diabetes?: boolean;
    anemia?: boolean;
    previousCSection?: boolean;
  };

  // ─────────────────────────────────────────
  // LIAISON NOTES (SENDER -> RECEIVER)
  // Allows the liaison officer to add context on top of the original notes.
  // ─────────────────────────────────────────
  @Prop()
  liaisonNote?: string;

  // ─────────────────────────────────────────
  // SECURITY & ACCESS CONTROL
  // ─────────────────────────────────────────
  @Prop({ required: false }) // optional so it can be nullified
  otpHash?: string;

  @Prop({ type: Date })
  otpExpiresAt?: Date;

  @Prop({ default: 0 })
  otpAttempts: number;

  @Prop({ default: false })
  isUnlocked: boolean;

  // ─────────────────────────────────────────
  // EXPIRY & GATEKEEPER
  // ─────────────────────────────────────────
  @Prop()
  expiresAt?: Date;

  @Prop()
  expiredAt?: Date;

  @Prop()
  gateCheckedInAt?: Date;

  @Prop()
  qrCodeUrl?: string;

  // ─────────────────────────────────────────
  // LIFECYCLE
  // ─────────────────────────────────────────
  @Prop({ enum: ReferralStatus, default: ReferralStatus.DRAFT })
  status: ReferralStatus;

  @Prop()
  acceptedAt?: Date;

  @Prop()
  completedAt?: Date;
@Prop({ type: String }) // or use an Enum if departments are fixed
targetDepartment: string;
  // ─────────────────────────────────────────
  // DECISION METADATA (Receiving Hospital)
  // ─────────────────────────────────────────
  @Prop({
    type: {
      responderId: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
      justification: String,
      appointmentDate: Date,
    },
  })
  decisionMeta?: {
    responderId?: string;
    justification?: string;
    appointmentDate?: Date;
  };

  // ─────────────────────────────────────────
  // AUDIT LOG (LEGAL TRACEABILITY)
  // ─────────────────────────────────────────
  @Prop({
    type: [
      {
        status: { type: String, enum: ReferralStatus },
        actor: { type: MongooseSchema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        note: String,
      },
    ],
    default: [],
  })
  activityLog: {
    status: ReferralStatus;
    actor: string | Types.ObjectId | null;
    timestamp: Date;
    note?: string;
  }[];
 @Prop({ type: Types.ObjectId, ref: 'Mother', required: true })
motherId: Types.ObjectId; // Rename from patientId to motherId
}

export const ReferralSchema = SchemaFactory.createForClass(Referral);

// Optional index for fast expiry checks
ReferralSchema.index({ expiresAt: 1 });
