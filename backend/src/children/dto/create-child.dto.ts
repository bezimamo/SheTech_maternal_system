import { IsString, IsEnum, IsOptional, IsMongoId, IsDateString, IsNumber, Min, Max, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ example: 'Baby Abeba', description: 'Child name' })
  @IsString()
  name: string;

  @ApiProperty({ example: '2024-03-15', description: 'Birth date' })
  @IsDateString()
  birthDate: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'Mother ID' })
  @IsMongoId()
  motherId: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'], example: 'FEMALE', description: 'Child gender' })
  @IsEnum(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @ApiProperty({ example: '507f1f77bcf86cd799439012', description: 'Birth hospital ID' })
  @IsMongoId()
  birthHospital: string;

  @ApiProperty({ example: '507f1f77bcf86cd799439013', description: 'Delivery staff ID' })
  @IsMongoId()
  deliveredBy: string;

  @ApiProperty({ example: 3200, description: 'Birth weight in grams' })
  @IsNumber()
  @Min(500)
  @Max(6000)
  birthWeight: number;

  @ApiProperty({ example: 50, description: 'Birth height in cm' })
  @IsNumber()
  @Min(30)
  @Max(80)
  birthHeight: number;

  @ApiPropertyOptional({ example: 9, description: 'APGAR score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  apgarScore?: number;

  @ApiPropertyOptional({ example: 'Vaginal', description: 'Delivery type' })
  @IsOptional()
  @IsString()
  deliveryType?: string;

  @ApiPropertyOptional({ example: ['Mild jaundice'], description: 'Birth complications' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  complications?: string[];

  @ApiPropertyOptional({ enum: ['HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL'], example: 'HEALTHY', description: 'Health status' })
  @IsOptional()
  @IsEnum(['HEALTHY', 'NEEDS_ATTENTION', 'CRITICAL'])
  healthStatus?: 'HEALTHY' | 'NEEDS_ATTENTION' | 'CRITICAL';

  @ApiPropertyOptional({ example: '507f1f77bcf86cd799439014', description: 'Assigned health worker ID' })
  @IsOptional()
  @IsMongoId()
  assignedHealthWorker?: string;

  @ApiPropertyOptional({ example: 'Healthy newborn, no complications', description: 'Additional notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: false, description: 'Postnatal Care Day 1 visit status' })
  @IsOptional()
  @IsBoolean()
  pncVisitDay1?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Postnatal Care Day 3 visit status' })
  @IsOptional()
  @IsBoolean()
  pncVisitDay3?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Postnatal Care Day 7 visit status' })
  @IsOptional()
  @IsBoolean()
  pncVisitDay7?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Infant protected at birth status' })
  @IsOptional()
  @IsBoolean()
  protectedAtBirth?: boolean;
}
