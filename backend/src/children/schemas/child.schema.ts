import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChildDocument = Child & Document;

@Schema({ timestamps: true })
export class Child {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true, type: Date })
  birthDate: Date;

  @Prop({ required: true, type: Types.ObjectId, ref: 'Mother' })
  motherId: Types.ObjectId;

  @Prop({ enum: ['MALE', 'FEMALE'], required: true })
  gender: 'MALE' | 'FEMALE';

  @Prop({ required: true, type: Types.ObjectId, ref: 'Hospital' })
  birthHospital: Types.ObjectId;

  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  deliveredBy: Types.ObjectId;

  @Prop()
  birthWeight?: number; // in grams

  @Prop()
  birthHeight?: number; // in cm

  @Prop()
  apgarScore?: number;

  @Prop()
  deliveryType?: string; // 'Vaginal', 'Cesarean', 'Assisted'

  @Prop()
  complications?: string[];

  @Prop({ default: 'HEALTHY' })
  healthStatus: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignedHealthWorker?: Types.ObjectId;

  @Prop({ default: Date.now })
  registrationDate: Date;

  @Prop()
  notes?: string;

  @Prop({ default: false })
  deceased: boolean;

  @Prop()
  deathDate?: Date;

  @Prop()
  deathCause?: string;

  // ── Birth Certificate fields ──────────────────────────────────────────────
  @Prop({ default: false })
  verified: boolean;

  @Prop({ type: Date })
  verifiedAt?: Date;

  @Prop()
  verifiedBy?: string;

  @Prop({ unique: true, sparse: true })
  certificateNumber?: string;

  @Prop({ type: Date })
  certificateIssuedDate?: Date;

  @Prop()
  fatherName?: string;

  @Prop()
  fatherPhone?: string;

  @Prop()
  birthLocation?: string; // specific room/ward within facility

  // ── Woreda notification ───────────────────────────────────────────────────
  @Prop({ default: false })
  sentToWoreda: boolean;

  @Prop({ type: Date })
  sentToWoredaAt?: Date;

  @Prop()
  sentToWoredaBy?: string; // name of the health worker who sent it

  // ── Newborn PNC and Protection fields ──────────────────────────────────────
  @Prop({ default: false })
  pncVisitDay1: boolean;

  @Prop({ default: false })
  pncVisitDay3: boolean;

  @Prop({ default: false })
  pncVisitDay7: boolean;

  @Prop({ default: false })
  protectedAtBirth: boolean;
}

export const ChildSchema = SchemaFactory.createForClass(Child);
