import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { VaccinationsController } from './vaccinations.controller';
import { VaccinationsService } from './vaccinations.service';
import { VaccinationReminderService } from './vaccination-reminder.service';
import { MotherVaccinationsController } from './mother-vaccinations.controller';
import { MotherVaccinationsService } from './mother-vaccinations.service';
import { MotherVaccinationReminderService } from './mother-vaccination-reminder.service';
import { Vaccine, VaccineSchema } from './schemas/vaccine.schema';
import { VaccinationRecord, VaccinationRecordSchema } from './schemas/vaccination-record.schema';
import {
  MotherVaccinationRecord,
  MotherVaccinationRecordSchema,
} from './schemas/mother-vaccination-record.schema';
import { Mother, MotherSchema } from '../mothers/schemas/mother.schema';
import { ChildrenModule } from '../children/children.module';
import { MothersModule } from '../mothers/mothers.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Vaccine.name, schema: VaccineSchema },
      { name: VaccinationRecord.name, schema: VaccinationRecordSchema },
      { name: MotherVaccinationRecord.name, schema: MotherVaccinationRecordSchema },
      { name: Mother.name, schema: MotherSchema },
    ]),
    ChildrenModule,
    MothersModule,
    NotificationsModule,
  ],
  controllers: [VaccinationsController, MotherVaccinationsController],
  providers: [
    VaccinationsService,
    VaccinationReminderService,
    MotherVaccinationsService,
    MotherVaccinationReminderService,
  ],
  exports: [
    VaccinationsService,
    VaccinationReminderService,
    MotherVaccinationsService,
    MotherVaccinationReminderService,
  ],
})
export class VaccinationsModule {}
