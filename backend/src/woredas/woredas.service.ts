import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Woreda, WoredaDocument } from './schemas/woreda.schema';
import { CreateWoredaDto } from './dto/create-woreda.dto';

@Injectable()
export class WoredasService {
  constructor(@InjectModel(Woreda.name) private woredaModel: Model<WoredaDocument>) {}

  async create(createWoredaDto: CreateWoredaDto): Promise<Woreda> {
    // Allow same woreda name in different regions — only block exact duplicates within the same region
    const existingWoreda = await this.woredaModel.findOne({
      name: createWoredaDto.name,
      regionId: createWoredaDto.regionId,
    });
    if (existingWoreda) {
      throw new ConflictException('A woreda with this name already exists in the selected region');
    }

    const createdWoreda = new this.woredaModel(createWoredaDto);
    return createdWoreda.save();
  }

  async findAll(): Promise<Woreda[]> {
    await this.woredaModel.updateMany(
      { regionId: { $in: ['', null] } },
      { $unset: { regionId: 1 } },
    ).exec();
    return this.woredaModel.find().populate('regionId').exec();
  }

  async findById(id: string): Promise<Woreda | null> {
    return this.woredaModel.findById(id).populate('regionId').exec();
  }

  async findAllWithRoleFilter(role: string, woredaId?: string, regionId?: string): Promise<Woreda[]> {
    // Clean up any empty regionId values that would cause CastError on populate
    await this.woredaModel.updateMany(
      { regionId: { $in: ['', null] } },
      { $unset: { regionId: 1 } },
    ).exec();
    // SYSTEM_ADMIN / MOH_ADMIN / SUPER_ADMIN — return all, optionally filtered by region
    if (role === 'SYSTEM_ADMIN' || role === 'MOH_ADMIN' || role === 'SUPER_ADMIN') {
      if (role === 'SYSTEM_ADMIN' && !regionId) {
        return [];
      }
      if (regionId) {
        const woredas = await this.woredaModel.find().populate('regionId').exec();
        return woredas.filter((w: any) => {
          const wRegion = w.regionId && typeof w.regionId === 'object'
            ? (w.regionId as any)._id?.toString()
            : w.regionId?.toString();
          return wRegion === regionId;
        });
      }
      return this.woredaModel.find().populate('regionId').exec();
    }

    // WOREDA_ADMIN — only their own woreda
    if (role === 'WOREDA_ADMIN' && woredaId && /^[0-9a-fA-F]{24}$/.test(woredaId)) {
      return this.woredaModel.find({ _id: woredaId }).populate('regionId').exec();
    }

    // HOSPITAL_ADMIN / HEALTH_CENTER_ADMIN — only the woreda their hospital belongs to
    if (role === 'HOSPITAL_ADMIN' || role === 'HEALTH_CENTER_ADMIN') {
      if (woredaId && /^[0-9a-fA-F]{24}$/.test(woredaId)) {
        return this.woredaModel.find({ _id: woredaId }).populate('regionId').exec();
      }
      return [];
    }

    // All other roles (DOCTOR, NURSE, MIDWIFE, DISPATCHER, etc.) — return all
    return this.woredaModel.find().populate('regionId').exec();
  }

  async update(id: string, updateWoredaDto: any): Promise<Woreda> {
    const woreda = await this.woredaModel.findById(id);
    if (!woreda) {
      throw new ConflictException('Woreda not found');
    }
    Object.assign(woreda, updateWoredaDto);
    return woreda.save();
  }

  async remove(id: string): Promise<void> {
    const result = await this.woredaModel.findByIdAndDelete(id);
    if (!result) {
      throw new ConflictException('Woreda not found');
    }
  }
}
