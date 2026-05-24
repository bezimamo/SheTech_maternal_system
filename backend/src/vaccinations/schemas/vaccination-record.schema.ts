import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type VaccinationRecordDocument = VaccinationRecord & Document;

@Schema({ timestamps: true })
export class VaccinationRecord {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Child' })
  childId: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Vaccine' })
  vaccineId: Types.ObjectId;

  @Prop({ required: true })
  doseNumber: number; // 1st dose, 2nd dose, etc.

  @Prop({ required: true, type: Date })
  scheduledDate: Date;

  @Prop({ type: Date })
  administeredDate?: Date;

  @Prop({ enum: ['SCHEDULED', 'ADMINISTERED', 'MISSED', 'DEFERRED', 'CONTRAINDICATED'], default: 'SCHEDULED' })
  status: 'SCHEDULED' | 'ADMINISTERED' | 'MISSED' | 'DEFERRED' | 'CONTRAINDICATED';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  administeredBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  administeredAt?: Types.ObjectId;

  @Prop()
  batchNumber?: string;

  @Prop()
  manufacturer?: string;

  @Prop()
  expiryDate?: Date;

  @Prop()
  lotNumber?: string;

  @Prop()
  injectionSite?: string; // e.g., "Left thigh", "Right arm"

  @Prop()
  route?: string; // e.g., "IM", "Oral"

  @Prop()
  adverseEvents?: string[];

  @Prop()
  notes?: string;

  @Prop({ type: Number })
  weightKg?: number;

  @Prop({ type: Number })
  ageDays?: number;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  createdAtHospital: Types.ObjectId;

  @Prop({ default: false })
  reminderSent: boolean;       // 1-day reminder

  @Prop({ type: Date })
  reminderSentDate?: Date;

  @Prop({ default: false })
  reminder3DaySent: boolean;   // 3-day reminder

  @Prop({ default: false })
  reminderSameDaySent: boolean; // same-day reminder

  @Prop({ default: false })
  followUpRequired: boolean;

  @Prop()
  followUpDate?: Date;

  @Prop()
  deferReason?: string;

  @Prop()
  contraindicationReason?: string;

  @Prop()
  missReason?: string;

  @Prop({ default: false })
  isCatchUp: boolean; // For catch-up vaccinations

  @Prop()
  originalScheduleDate?: Date; // Original date before rescheduling
}

export const VaccinationRecordSchema = SchemaFactory.createForClass(VaccinationRecord);
