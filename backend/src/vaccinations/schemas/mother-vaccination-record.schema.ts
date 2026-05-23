import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MotherVaccinationRecordDocument = MotherVaccinationRecord & Document;

@Schema({ timestamps: true })
export class MotherVaccinationRecord {
  @Prop({ required: true, type: Types.ObjectId, ref: 'Mother' })
  motherId: Types.ObjectId;

  @Prop({ required: true, default: 'Tetanus Toxoid (TD)' })
  vaccineName: string;

  @Prop({ required: true, min: 1, max: 5 })
  doseNumber: number;

  @Prop({ type: Date })
  scheduledDate?: Date;

  @Prop({ type: Date })
  administeredDate?: Date;

  @Prop({
    enum: ['SCHEDULED', 'ADMINISTERED', 'MISSED'],
    default: 'SCHEDULED',
  })
  status: 'SCHEDULED' | 'ADMINISTERED' | 'MISSED';

  @Prop()
  batchNumber?: string;

  @Prop()
  notes?: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  administeredBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Hospital' })
  hospitalId?: Types.ObjectId;

  @Prop({ default: false })
  reminderSent: boolean;

  @Prop({ type: Date })
  reminderSentDate?: Date;

  @Prop({ default: false })
  reminder3DaySent: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  createdBy?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy?: Types.ObjectId;
}

export const MotherVaccinationRecordSchema =
  SchemaFactory.createForClass(MotherVaccinationRecord);

MotherVaccinationRecordSchema.index({ motherId: 1, doseNumber: 1 });
