import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Hospital, HospitalDocument } from './schemas/hospital.schema';
import { CreateHospitalDto } from './dto/create-hospital.dto';

@Injectable()
export class HospitalsService {
  constructor(@InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>) {}

  async create(createHospitalDto: CreateHospitalDto): Promise<Hospital> {
    const existingHospital = await this.hospitalModel.findOne({ name: createHospitalDto.name });
    if (existingHospital) {
      throw new ConflictException('Hospital with this name already exists');
    }

    const createdHospital = new this.hospitalModel(createHospitalDto);
    return createdHospital.save();
  }

  async findAll(): Promise<Hospital[]> {
    return this.hospitalModel.find().populate({ path: 'woredaId', populate: { path: 'regionId' } }).exec();
  }

  async findById(id: string): Promise<Hospital | null> {
    return this.hospitalModel.findById(id).populate({ path: 'woredaId', populate: { path: 'regionId' } }).exec();
  }

  async findAllWithRoleFilter(role: string, hospitalId?: string, regionId?: string): Promise<Hospital[]> {
    const validId = (id?: string) => !!id && /^[0-9a-fA-F]{24}$/.test(id);

    if ((role === 'HOSPITAL_ADMIN' || role === 'HEALTH_CENTER_ADMIN') && validId(hospitalId)) {
      return this.hospitalModel.find({ _id: hospitalId }).populate({ path: 'woredaId', populate: { path: 'regionId' } }).exec();
    }
    if (role === 'SYSTEM_ADMIN') {
      if (!validId(regionId)) return [];
      const hospitals = await this.hospitalModel.find().populate({ path: 'woredaId', populate: { path: 'regionId' } }).exec();
      return hospitals.filter((h: any) => {
        const woredaRegion = h.woredaId && typeof h.woredaId === 'object' ? (h.woredaId as any).regionId : null;
        const region = woredaRegion && typeof woredaRegion === 'object' ? woredaRegion._id?.toString() : woredaRegion?.toString();
        return region === regionId;
      });
    }
    return this.hospitalModel.find().populate({ path: 'woredaId', populate: { path: 'regionId' } }).exec();
  }

  async update(id: string, updateHospitalDto: any): Promise<Hospital> {
    const hospital = await this.hospitalModel.findById(id);
    if (!hospital) {
      throw new ConflictException('Hospital not found');
    }
    Object.assign(hospital, updateHospitalDto);
    return hospital.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.hospitalModel.findByIdAndDelete(id);
    if (!result) {
      throw new ConflictException('Hospital not found');
    }
  }
}
