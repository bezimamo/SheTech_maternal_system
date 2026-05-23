import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { MotherVaccinationsService } from './mother-vaccinations.service';
import { MotherVaccinationReminderService } from './mother-vaccination-reminder.service';
import { RecordMotherVaccinationDto } from './dto/mother-vaccination.dto';
import { TD_DOSE_SCHEDULE } from './utils/td-vaccine-schedule';

@ApiTags('Mother Vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mothers/vaccinations')
export class MotherVaccinationsController {
  constructor(
    private readonly motherVaccinationsService: MotherVaccinationsService,
    private readonly reminderService: MotherVaccinationReminderService,
  ) {}

  @Roles('MOTHER')
  @Get('my-schedule')
  @ApiOperation({ summary: 'Get TD vaccination schedule for the logged-in mother' })
  @ApiResponse({ status: 200, description: 'Schedule retrieved' })
  async getMySchedule(@Request() req) {
    return this.motherVaccinationsService.getMyVaccinationSchedule(req.user.userId);
  }

  @Roles(
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'WOREDA_ADMIN',
    'HOSPITAL_ADMIN',
    'HEALTH_CENTER_ADMIN',
    'DOCTOR',
    'NURSE',
    'MIDWIFE',
    'MOTHER',
  )
  @Get('schedule/:motherId')
  @ApiOperation({ summary: 'Get TD vaccination schedule for a mother (staff)' })
  @ApiParam({ name: 'motherId', description: 'Mother ID' })
  async getSchedule(@Param('motherId') motherId: string) {
    return this.motherVaccinationsService.getVaccinationSchedule(motherId);
  }

  @Roles(
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'WOREDA_ADMIN',
    'HOSPITAL_ADMIN',
    'HEALTH_CENTER_ADMIN',
    'DOCTOR',
    'NURSE',
    'MIDWIFE',
  )
  @Get('history/:motherId')
  @ApiOperation({ summary: 'Get administered TD doses for a mother' })
  @ApiParam({ name: 'motherId', description: 'Mother ID' })
  async getHistory(@Param('motherId') motherId: string) {
    return this.motherVaccinationsService.getHistory(motherId);
  }

  @Roles(
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'HOSPITAL_ADMIN',
    'HEALTH_CENTER_ADMIN',
    'DOCTOR',
    'NURSE',
    'MIDWIFE',
  )
  @Post('record')
  @ApiOperation({ summary: 'Record a TD dose and auto-schedule the next dose' })
  async recordVaccination(
    @Body() dto: RecordMotherVaccinationDto,
    @Request() req,
  ) {
    return this.motherVaccinationsService.recordMotherVaccination(
      dto,
      req.user.userId,
      req.user.hospitalId,
    );
  }

  @Roles(
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'WOREDA_ADMIN',
    'HOSPITAL_ADMIN',
    'HEALTH_CENTER_ADMIN',
    'DOCTOR',
    'NURSE',
    'MIDWIFE',
    'MOTHER',
  )
  @Get('schedule/td-doses')
  @ApiOperation({ summary: 'WHO TD dose interval reference' })
  getTdReference() {
    return TD_DOSE_SCHEDULE;
  }

  @Roles('SYSTEM_ADMIN', 'SUPER_ADMIN')
  @Post('reminders/trigger')
  @ApiOperation({ summary: 'Manually trigger mother vaccination reminders (testing)' })
  async triggerReminders() {
    return this.reminderService.triggerManually();
  }
}
