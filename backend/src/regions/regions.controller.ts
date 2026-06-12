import { Controller, Get, Post, Body, UseGuards, Request, Param, Patch, Delete } from '@nestjs/common';
import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Regions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('regions')
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Roles('SUPER_ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new region' })
  @ApiResponse({ status: 201, description: 'Region created successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() createRegionDto: CreateRegionDto) {
    return this.regionsService.create(createRegionDto);
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'MOH_ADMIN', 'DOCTOR', 'NURSE', 'MIDWIFE', 'DISPATCHER', 'LIAISON_OFFICER')
  @Get()
  @ApiOperation({ summary: 'Get all regions' })
  @ApiResponse({ status: 200, description: 'Regions retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    const user = req.user;
    if (user.role === 'SUPER_ADMIN') {
      return this.regionsService.findAll();
    }
    if (user.role === 'SYSTEM_ADMIN') {
      return this.regionsService.findByUserRegion(user.regionId?.toString());
    }
    return this.regionsService.findByUserRegion(user.regionId);
  }

  @Roles('SUPER_ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get a specific region' })
  @ApiResponse({ status: 200, description: 'Region retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async findOne(@Param('id') id: string) {
    return this.regionsService.findById(id);
  }

  @Roles('SUPER_ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a region' })
  @ApiResponse({ status: 200, description: 'Region updated successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async update(@Param('id') id: string, @Body() updateRegionDto: any) {
    return this.regionsService.update(id, updateRegionDto);
  }

  @Roles('SUPER_ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a region' })
  @ApiResponse({ status: 200, description: 'Region deleted successfully' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  async remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
