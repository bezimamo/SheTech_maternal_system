import { Controller, Get, Post, Patch, Delete, Body, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { HospitalsService } from './hospitals.service';
import { WoredasService } from '../woredas/woredas.service';
import { CreateHospitalDto } from './dto/create-hospital.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Hospitals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hospitals')
export class HospitalsController {
  constructor(
    private readonly hospitalsService: HospitalsService,
    private readonly woredasService: WoredasService,
  ) {}

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new hospital' })
  @ApiResponse({ status: 201, description: 'Hospital successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only SUPER_ADMIN and WOREDA_ADMIN can create hospitals' })
  async create(@Body() createHospitalDto: CreateHospitalDto, @Request() req) {
    const user = req.user;
    if (user.role === 'SYSTEM_ADMIN') {
      const regionId = user.regionId?.toString();
      const woreda = await this.woredasService.findById(createHospitalDto.woredaId);
      const woredaRegion = woreda?.regionId && typeof woreda.regionId === 'object'
        ? woreda.regionId._id?.toString()
        : woreda?.regionId?.toString();
      if (!regionId || regionId !== woredaRegion) {
        throw new ForbiddenException('System Admin can only create hospitals in their own region');
      }
    }
    return this.hospitalsService.create(createHospitalDto);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'MOH_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'LIAISON_OFFICER')
  @Get()
  @ApiOperation({ summary: 'Get all hospitals' })
  @ApiResponse({ status: 200, description: 'Hospitals retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    const user = req.user;
    return this.hospitalsService.findAllWithRoleFilter(user.role, user.hospitalId?.toString(), user.regionId?.toString());
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'MOH_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'LIAISON_OFFICER')
  @Get(':id')
  @ApiOperation({ summary: 'Get hospital by ID' })
  @ApiResponse({ status: 200, description: 'Hospital retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Hospital not found' })
  async findOne(@Param('id') id: string) {
    return this.hospitalsService.findById(id);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a hospital' })
  @ApiResponse({ status: 200, description: 'Hospital updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async update(@Param('id') id: string, @Body() updateHospitalDto: any, @Request() req) {
    const user = req.user;
    if (user.role === 'SYSTEM_ADMIN') {
      const regionId = user.regionId?.toString();
      const hospital = await this.hospitalsService.findById(id);
      const hospitalWoreda: any = hospital?.woredaId;
      const hospitalRegion = hospitalWoreda?.regionId && typeof hospitalWoreda.regionId === 'object'
        ? hospitalWoreda.regionId._id?.toString()
        : hospitalWoreda?.regionId?.toString();
      if (!regionId || regionId !== hospitalRegion) {
        throw new ForbiddenException('System Admin can only update hospitals in their own region');
      }
      if (updateHospitalDto.woredaId) {
        const woreda = await this.woredasService.findById(updateHospitalDto.woredaId);
        const woredaRegion = woreda?.regionId && typeof woreda.regionId === 'object'
          ? woreda.regionId._id?.toString()
          : woreda?.regionId?.toString();
        if (!regionId || regionId !== woredaRegion) {
          throw new ForbiddenException('System Admin cannot move hospital to another region');
        }
      }
    }
    return this.hospitalsService.update(id, updateHospitalDto);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a hospital' })
  @ApiResponse({ status: 200, description: 'Hospital deleted successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string, @Request() req) {
    const user = req.user;
    if (user.role === 'SYSTEM_ADMIN') {
      const regionId = user.regionId?.toString();
      const hospital = await this.hospitalsService.findById(id);
      const hospitalWoreda: any = hospital?.woredaId;
      const hospitalRegion = hospitalWoreda?.regionId && typeof hospitalWoreda.regionId === 'object'
        ? hospitalWoreda.regionId._id?.toString()
        : hospitalWoreda?.regionId?.toString();
      if (!regionId || regionId !== hospitalRegion) {
        throw new ForbiddenException('System Admin can only delete hospitals in their own region');
      }
    }
    return this.hospitalsService.remove(id);
  }
}
