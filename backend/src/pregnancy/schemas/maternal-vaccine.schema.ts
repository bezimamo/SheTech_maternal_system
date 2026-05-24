import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MaternalVaccineDocument = MaternalVaccine & Document;

@Schema({ timestamps: true })
export class MaternalVaccine {
  // ── RELATIONAL LINKS ──────────────────────────────────────────────────────
  @Prop({ required: true, type: Types.ObjectId, ref: 'Mother' })
  motherId: Types.ObjectId;

  // ── VACCINE INFORMATION ───────────────────────────────────────────────────
  @Prop({ required: true })
  vaccineName: string; // e.g. 'TT1', 'TT2', 'Influenza'

  @Prop({ required: true })
  doseNumber: number;

  @Prop({ required: true, type: Date })
  givenDate: Date;

  @Prop({ type: Date })
  nextDoseDate?: Date;

  @Prop({ enum: ['GIVEN', 'SCHEDULED', 'MISSED', 'NOT_APPLICABLE'], default: 'GIVEN' })
  status: 'GIVEN' | 'SCHEDULED' | 'MISSED' | 'NOT_APPLICABLE';

  @Prop()
  batchNumber?: string;

  @Prop()
  notes?: string;

  // ── LOGISTICS & PROVIDER INFO ─────────────────────────────────────────────
  @Prop({ type: Types.ObjectId, ref: 'User' })
  givenBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  givenAt: Types.ObjectId;

  @Prop()
  clinicalProtection?: string;

  // ── REMINDERS & NOTIFICATIONS ─────────────────────────────────────────────
  @Prop({ default: false })
  reminderSent: boolean;

  @Prop({ type: Date })
  reminderSentDate?: Date;

  // ── AUDIT & MANUAL OVERRIDES ──────────────────────────────────────────────
  @Prop({ default: false })
  manualOverride: boolean;

  @Prop()
  overrideReason?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const MaternalVaccineSchema = SchemaFactory.createForClass(MaternalVaccine);

// ── CONSTANTS & METADATA CONFIGURATION ──────────────────────────────────────
// WHO-recommended maternal vaccines with intervals and protection durations
export const MATERNAL_VACCINE_SCHEDULE = {
  Td1: { name: 'Tetanus Diphtheria 1', nextDoseWeeks: 4, doseNumber: 1, protection: 'Baseline entry' },
  Td2: { name: 'Tetanus Diphtheria 2', nextDoseWeeks: 26, doseNumber: 2, protection: 'Up to 3 years' }, // 6 months after Td1
  Td3: { name: 'Tetanus Diphtheria 3', nextDoseWeeks: 52, doseNumber: 3, protection: 'Up to 5 years' }, // 1 year after Td2
  Td4: { name: 'Tetanus Diphtheria 4', nextDoseWeeks: 52, doseNumber: 4, protection: 'Up to 10 years' }, // 1 year after Td3
  Td5: { name: 'Tetanus Diphtheria 5', nextDoseWeeks: null, doseNumber: 5, protection: 'Lifelong maternal immunity' },
  // TT aliases for legacy compatibility
  TT1: { name: 'Tetanus Toxoid 1', nextDoseWeeks: 4, doseNumber: 1, protection: 'Baseline entry' },
  TT2: { name: 'Tetanus Toxoid 2', nextDoseWeeks: 26, doseNumber: 2, protection: 'Up to 3 years' },
  TT3: { name: 'Tetanus Toxoid 3', nextDoseWeeks: 52, doseNumber: 3, protection: 'Up to 5 years' },
  TT4: { name: 'Tetanus Toxoid 4', nextDoseWeeks: 52, doseNumber: 4, protection: 'Up to 10 years' },
  TT5: { name: 'Tetanus Toxoid 5', nextDoseWeeks: null, doseNumber: 5, protection: 'Lifelong maternal immunity' },
  INFLUENZA: { name: 'Influenza Vaccine', nextDoseWeeks: null, doseNumber: 1, protection: 'Seasonal protection' },
};