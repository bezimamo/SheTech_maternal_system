import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { VaccinationsService } from './vaccinations.service';
import { VaccinationReminderService } from './vaccination-reminder.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Vaccinations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('vaccinations')
export class VaccinationsController {
  constructor(
    private readonly vaccinationsService: VaccinationsService,
    private readonly vaccinationReminderService: VaccinationReminderService,
  ) {}

  // ── Manual reminder trigger (dev/testing only) ──────────────────────────────
  @Roles('SYSTEM_ADMIN')
  @Post('reminders/trigger')
  @ApiOperation({ summary: 'Manually trigger vaccination reminder job (dev/testing)' })
  @ApiResponse({ status: 200, description: 'Reminder job triggered' })
  async triggerReminders() {
    return this.vaccinationReminderService.triggerManually();
  }

  // Vaccine Management Endpoints
  @Roles('SYSTEM_ADMIN')
  @Post('vaccines')
  @ApiOperation({ summary: 'Create a new vaccine' })
  @ApiResponse({ status: 201, description: 'Vaccine created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createVaccine(@Body() createVaccineDto: any) {
    return this.vaccinationsService.createVaccine(createVaccineDto);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Get('vaccines')
  @ApiOperation({ summary: 'Get all vaccines' })
  @ApiResponse({ status: 200, description: 'Vaccines retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAllVaccines() {
    return this.vaccinationsService.findAllVaccines();
  }

  @Roles('SYSTEM_ADMIN')
  @Get('vaccines/:id')
  @ApiOperation({ summary: 'Get vaccine by ID' })
  @ApiParam({ name: 'id', description: 'Vaccine ID' })
  @ApiResponse({ status: 200, description: 'Vaccine retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Vaccine not found' })
  async findVaccineById(@Param('id') id: string) {
    return this.vaccinationsService.findVaccineById(id);
  }

  @Roles('SYSTEM_ADMIN')
  @Patch('vaccines/:id')
  @ApiOperation({ summary: 'Update vaccine' })
  @ApiParam({ name: 'id', description: 'Vaccine ID' })
  @ApiResponse({ status: 200, description: 'Vaccine updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccine not found' })
  async updateVaccine(@Param('id') id: string, @Body() updateVaccineDto: any) {
    return this.vaccinationsService.updateVaccine(id, updateVaccineDto);
  }

  @Roles('SYSTEM_ADMIN')
  @Delete('vaccines/:id')
  @ApiOperation({ summary: 'Delete vaccine' })
  @ApiParam({ name: 'id', description: 'Vaccine ID' })
  @ApiResponse({ status: 200, description: 'Vaccine deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccine not found' })
  async deleteVaccine(@Param('id') id: string) {
    return this.vaccinationsService.deleteVaccine(id);
  }

  // Vaccination Record Management
  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Post('records')
  @ApiOperation({ summary: 'Create vaccination record' })
  @ApiResponse({ status: 201, description: 'Vaccination record created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async createVaccinationRecord(@Body() createVaccinationRecordDto: any, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.createVaccinationRecord(
      createVaccinationRecordDto,
      user.role,
      user.hospitalId?.toString(),
      user._id.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'MOTHER')
  @Get('records/child/:childId')
  @ApiOperation({ summary: 'Get vaccination records for a child' })
  @ApiParam({ name: 'childId', description: 'Child ID' })
  @ApiResponse({ status: 200, description: 'Vaccination records retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  async getVaccinationRecordsByChildId(@Param('childId') childId: string, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.getVaccinationRecordsByChildId(
      childId,
      user.role,
      user.hospitalId?.toString(),
      user._id?.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Get('records/status/:status')
  @ApiOperation({ summary: 'Get vaccination records by status' })
  @ApiParam({ name: 'status', description: 'Vaccination status' })
  @ApiResponse({ status: 200, description: 'Vaccination records retrieved successfully' })
  async getVaccinationRecordsByStatus(@Param('status') status: string, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.getVaccinationRecordsByStatus(
      status,
      user.role,
      user.hospitalId?.toString(),
      user.woredaId?.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Get('records/upcoming')
  @ApiOperation({ summary: 'Get upcoming vaccinations' })
  @ApiQuery({ name: 'days', required: false, description: 'Days ahead to look', example: 30 })
  @ApiResponse({ status: 200, description: 'Upcoming vaccinations retrieved successfully' })
  async getUpcomingVaccinations(@Query('days') days?: number, @Request() req?: any) {
    const user = req.user;
    return this.vaccinationsService.getUpcomingVaccinations(
      user.role,
      user.hospitalId?.toString(),
      user.woredaId?.toString(),
      days
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Get('records/overdue')
  @ApiOperation({ summary: 'Get overdue vaccinations' })
  @ApiResponse({ status: 200, description: 'Overdue vaccinations retrieved successfully' })
  async getOverdueVaccinations(@Request() req) {
    const user = req.user;
    return this.vaccinationsService.getOverdueVaccinations(
      user.role,
      user.hospitalId?.toString(),
      user.woredaId?.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Patch('records/:id')
  @ApiOperation({ summary: 'Update vaccination record' })
  @ApiParam({ name: 'id', description: 'Vaccination record ID' })
  @ApiResponse({ status: 200, description: 'Vaccination record updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccination record not found' })
  async updateVaccinationRecord(@Param('id') id: string, @Body() updateVaccinationRecordDto: any, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.updateVaccinationRecord(
      id,
      updateVaccinationRecordDto,
      user.role,
      user.hospitalId?.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Delete('records/:id')
  @ApiOperation({ summary: 'Delete vaccination record' })
  @ApiParam({ name: 'id', description: 'Vaccination record ID' })
  @ApiResponse({ status: 200, description: 'Vaccination record deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccination record not found' })
  async deleteVaccinationRecord(@Param('id') id: string, @Request() req) {
    const user = req.user;
    await this.vaccinationsService.deleteVaccinationRecord(
      id,
      user.role,
      user.hospitalId?.toString()
    );
  }

  // Schedule Management
  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Post('schedule/:childId')
  @ApiOperation({ summary: 'Generate vaccination schedule for a child' })
  @ApiParam({ name: 'childId', description: 'Child ID' })
  @ApiResponse({ status: 201, description: 'Vaccination schedule generated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Child not found' })
  async generateVaccinationSchedule(@Param('childId') childId: string, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.generateVaccinationSchedule(
      childId,
      user.role,
      user.hospitalId?.toString(),
      user._id?.toString(),
    );
  }

  // Statistics
  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'MOTHER')
  @Get('counseling-guidance')
  @ApiOperation({ summary: 'Get pediatric health education and counseling prompts' })
  @ApiResponse({ status: 200, description: 'Prompts retrieved successfully' })
  async getCounselingGuidance() {
    return {
      exclusiveBreastfeeding: {
        title: "Exclusive Breastfeeding Guidance",
        text: "Exclusive breastfeeding is medically sufficient for an infant up to 6 months of age. Breast milk provides vital, bioavailable nutrients required for optimal initial growth and immune system development."
      },
      nutritionalTransition: {
        title: "Nutritional Transition Guidance",
        text: "Upon reaching 6 months of age, the infant should be introduced to appropriate solid, semi-solid, or soft complementary foods alongside continued breastfeeding. Additional nutrition can be prepared from varied groups including cereals, meats, eggs, vegetables, and fruits. Breastfeeding should ideally continue up to 2 years of age and beyond."
      },
      heliotherapy: {
        title: "Heliotherapy (Sunlight) Guidance",
        text: "Infants require daily exposure to direct, safe sunlight for approximately 20 to 30 minutes. Natural sunlight exposure is critical for synthesizing Vitamin D, promoting bone density, and maintaining overall skin health."
      },
      polioPrevention: {
        title: "Polio Prevention Awareness",
        text: "Compliance with the oral and inactivated polio vaccine series directly prevents poliomyelitis, protecting children against permanent acute flaccid paralysis and lifelong physical disability."
      },
      clinicalCareSeeking: {
        title: "Clinical Care Seeking Directive",
        text: "Caregivers are advised that if an infant displays any sign of systemic illness, lethargy, poor feeding, or persistent adverse events following immunization (AEFI), they must seek immediate medical evaluation at the nearest designated health care facility."
      }
    };
  }

  // Statistics
  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Get('stats')
  @ApiOperation({ summary: 'Get vaccination statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Request() req) {
    const user = req.user;
    return this.vaccinationsService.getVaccinationStats(
      user.role,
      user.hospitalId?.toString(),
      user.woredaId?.toString()
    );
  }

  // Action Endpoints
  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Patch('records/:id/administer')
  @ApiOperation({ summary: 'Mark vaccination as administered' })
  @ApiParam({ name: 'id', description: 'Vaccination record ID' })
  @ApiResponse({ status: 200, description: 'Vaccination marked as administered' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccination record not found' })
  async markVaccinationAdministered(@Param('id') id: string, @Body() administrationData: any, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.markVaccinationAdministered(
      id,
      administrationData,
      user.role,
      user.hospitalId?.toString(),
      user._id.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Patch('records/:id/miss')
  @ApiOperation({ summary: 'Mark vaccination as missed' })
  @ApiParam({ name: 'id', description: 'Vaccination record ID' })
  @ApiResponse({ status: 200, description: 'Vaccination marked as missed' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccination record not found' })
  async markVaccinationMissed(@Param('id') id: string, @Body() missData: { missReason: string }, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.markVaccinationMissed(
      id,
      missData.missReason,
      user.role,
      user.hospitalId?.toString()
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE')
  @Patch('records/:id/defer')
  @ApiOperation({ summary: 'Defer vaccination' })
  @ApiParam({ name: 'id', description: 'Vaccination record ID' })
  @ApiResponse({ status: 200, description: 'Vaccination deferred successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Vaccination record not found' })
  async deferVaccination(@Param('id') id: string, @Body() deferData: { deferReason: string; newScheduledDate: string }, @Request() req) {
    const user = req.user;
    return this.vaccinationsService.deferVaccination(
      id,
      deferData.deferReason,
      deferData.newScheduledDate,
      user.role,
      user.hospitalId?.toString()
    );
  }
}
