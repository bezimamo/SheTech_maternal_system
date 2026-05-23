import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class RecordMotherVaccinationDto {
  @ApiProperty({ description: 'Mother ID' })
  @IsMongoId()
  motherId: string;

  @ApiProperty({ description: 'TD dose number (1–5)', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  doseNumber: number;

  @ApiProperty({ description: 'Date the dose was administered' })
  @IsDateString()
  administeredDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsMongoId()
  hospitalId?: string;
}

export class ScheduleMotherVaccinationDto {
  @ApiProperty()
  @IsMongoId()
  motherId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  doseNumber: number;

  @ApiProperty()
  @IsDateString()
  scheduledDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
