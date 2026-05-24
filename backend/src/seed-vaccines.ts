import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getModelToken } from '@nestjs/mongoose';
import { Vaccine } from './vaccinations/schemas/vaccine.schema';
import { Model } from 'mongoose';

// Standard Ethiopian Expanded Programme on Immunization (EPI) schedule
const VACCINES = [
  {
    name: 'BCG',
    code: 'BCG',
    description: 'Bacillus Calmette-Guérin vaccine — protects against tuberculosis',
    category: 'BCG',
    recommendedAge: 'At birth',
    recommendedAgeWeeks: 0,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'ID',
    targetPopulation: 'All newborns',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'OPV 0 (Birth Dose)',
    code: 'OPV0',
    description: 'Oral Polio Vaccine — birth dose',
    category: 'OPV',
    recommendedAge: 'At birth',
    recommendedAgeWeeks: 0,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'ORAL',
    targetPopulation: 'All newborns',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Hepatitis B (Birth Dose)',
    code: 'HEPB',
    description: 'Hepatitis B vaccine — birth dose',
    category: 'OTHER',
    recommendedAge: 'At birth',
    recommendedAgeWeeks: 0,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'IM',
    targetPopulation: 'All newborns',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Pentavalent (DTP-HepB-Hib)',
    code: 'PENTA',
    description: 'Protects against Diphtheria, Tetanus, Pertussis, Hepatitis B, and Hib',
    category: 'PENTAVALENT',
    recommendedAge: '6, 10, 14 weeks',
    recommendedAgeWeeks: 6,
    dosesRequired: 3,
    intervalWeeks: 4,
    administrationRoute: 'IM',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'OPV (Oral Polio Vaccine)',
    code: 'OPV',
    description: 'Oral Polio Vaccine — routine doses',
    category: 'OPV',
    recommendedAge: '6, 10, 14 weeks',
    recommendedAgeWeeks: 6,
    dosesRequired: 3,
    intervalWeeks: 4,
    administrationRoute: 'ORAL',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'PCV (Pneumococcal Conjugate Vaccine)',
    code: 'PCV',
    description: 'Protects against pneumococcal disease (pneumonia, meningitis)',
    category: 'PCV',
    recommendedAge: '6, 10, 14 weeks',
    recommendedAgeWeeks: 6,
    dosesRequired: 3,
    intervalWeeks: 4,
    administrationRoute: 'IM',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Rotavirus Vaccine',
    code: 'ROTA',
    description: 'Protects against rotavirus diarrhea',
    category: 'ROTA',
    recommendedAge: '6, 10, 14 weeks',
    recommendedAgeWeeks: 6,
    dosesRequired: 3,
    intervalWeeks: 4,
    administrationRoute: 'ORAL',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'IPV (Inactivated Polio Vaccine)',
    code: 'IPV',
    description: 'Inactivated Polio Vaccine — injectable',
    category: 'OPV',
    recommendedAge: '14 weeks',
    recommendedAgeWeeks: 14,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'IM',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Vitamin A Supplementation',
    code: 'VITA',
    description: 'Vitamin A micronutrient supplementation',
    category: 'OTHER',
    recommendedAge: '6 months',
    recommendedAgeWeeks: 24,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'ORAL',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Malaria 1',
    code: 'MALARIA1',
    description: 'Malaria vaccine — dose 1',
    category: 'OTHER',
    recommendedAge: '6 months',
    recommendedAgeWeeks: 24,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'IM',
    targetPopulation: 'All infants in endemic regions',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Malaria 2',
    code: 'MALARIA2',
    description: 'Malaria vaccine — dose 2',
    category: 'OTHER',
    recommendedAge: '9 months',
    recommendedAgeWeeks: 36,
    dosesRequired: 1,
    intervalWeeks: 0,
    administrationRoute: 'IM',
    targetPopulation: 'All infants in endemic regions',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
  {
    name: 'Measles-Rubella (MR)',
    code: 'MR',
    description: 'Protects against measles and rubella',
    category: 'MEASLES',
    recommendedAge: '9 months and 15 months',
    recommendedAgeWeeks: 39,
    dosesRequired: 2,
    intervalWeeks: 26,
    administrationRoute: 'SC',
    targetPopulation: 'All infants',
    isActive: true,
    scheduleType: 'ROUTINE',
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const vaccineModel = app.get<Model<any>>(getModelToken(Vaccine.name));

    let created = 0;
    let skipped = 0;

    for (const vaccine of VACCINES) {
      const existing = await vaccineModel.findOne({ code: vaccine.code });
      if (existing) {
        console.log(`⏭  Skipped (already exists): ${vaccine.name}`);
        skipped++;
      } else {
        await vaccineModel.create(vaccine);
        console.log(`✅ Created: ${vaccine.name}`);
        created++;
      }
    }

    console.log(`\nDone! Created: ${created}, Skipped: ${skipped}`);
    console.log('You can now generate vaccination schedules for children.');
  } catch (error) {
    console.error('Error seeding vaccines:', error.message);
  } finally {
    await app.close();
  }
}

bootstrap();
