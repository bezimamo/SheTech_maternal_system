import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Child, ChildDocument } from './schemas/child.schema';
import { GrowthRecord, GrowthRecordDocument } from './schemas/growth-record.schema';
import { Hospital, HospitalDocument } from '../hospitals/schemas/hospital.schema';
import { CreateChildDto } from './dto/create-child.dto';
import { CreateGrowthRecordDto } from './dto/create-growth-record.dto';
import { MothersService } from '../mothers/mothers.service';

@Injectable()
export class ChildrenService {
  constructor(
    @InjectModel(Child.name) private childModel: Model<ChildDocument>,
    @InjectModel(GrowthRecord.name) private growthRecordModel: Model<GrowthRecordDocument>,
    @InjectModel(Hospital.name) private hospitalModel: Model<HospitalDocument>,
    private readonly mothersService: MothersService,
  ) {}

  async findByWoreda(woredaId: string): Promise<Child[]> {
    if (!woredaId) return [];

    // Cast to ObjectId so Mongoose matches the stored ObjectId field correctly.
    // If the value is not a valid ObjectId (e.g. a woreda name string), fall back
    // to a string comparison so the query still runs without throwing.
    let woredaObjectId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(woredaId)) {
      woredaObjectId = new Types.ObjectId(woredaId);
    }

    // 1. Find all hospitals belonging to this woreda (match by ObjectId OR string)
    const hospitalQuery = woredaObjectId
      ? { $or: [{ woredaId: woredaObjectId }, { woredaId: woredaId }] }
      : { woredaId: woredaId };

    const hospitals = await this.hospitalModel.find(hospitalQuery).select('_id').exec();
    const hospitalIds = hospitals.map(h => h._id);

    // 2. Find children born in these hospitals OR whose mother belongs to this woreda
    //    (covers cases where hospital.woredaId is not set but mother.woredaId is)
    const motherWoredaQuery = woredaObjectId
      ? { $or: [{ woredaId: woredaObjectId }, { woredaId: woredaId }] }
      : { woredaId: woredaId };

    const mothers = await this.childModel.db
      .collection('mothers')
      .find(motherWoredaQuery, { projection: { _id: 1 } })
      .toArray();
    const motherIds = mothers.map((m: any) => m._id);

    const childQuery: any =
      hospitalIds.length > 0 || motherIds.length > 0
        ? {
            $or: [
              ...(hospitalIds.length > 0 ? [{ birthHospital: { $in: hospitalIds } }] : []),
              ...(motherIds.length > 0 ? [{ motherId: { $in: motherIds } }] : []),
            ],
          }
        : { _id: null }; // return nothing if no hospitals or mothers found

    return this.childModel
      .find(childQuery)
      .populate('birthHospital', 'name type address woredaId')
      .populate('motherId', 'name phone age address')
      .populate('deliveredBy', 'name email role')
      .sort({ registrationDate: -1 })
      .exec();
  }

  async issueBirthCertificate(
    id: string,
    userRole: string,
    userWoredaId?: string,
    extraData?: { fatherName?: string; fatherPhone?: string; birthLocation?: string },
  ): Promise<Child> {
    const child = await this.childModel
      .findById(id)
      .populate({ path: 'birthHospital', select: 'name type woredaId' })
      .populate('motherId', 'name phone age address woredaId')
      .exec();

    if (!child) throw new NotFoundException('Child not found');

    if (child.verified) {
      throw new BadRequestException('Birth certificate has already been issued for this child');
    }

    // Generate a unique certificate number: BC-YYYY-WOREDA-XXXXXX
    const year = new Date().getFullYear();
    const random = Math.floor(100000 + Math.random() * 900000);
    
    // Robust woreda code generation
    let woredaCode = 'XXXX';
    if (userWoredaId) {
      const idStr = userWoredaId.toString();
      woredaCode = idStr.length >= 4 ? idStr.slice(-4).toUpperCase() : idStr.toUpperCase();
    }
    
    const certificateNumber = `BC-${year}-${woredaCode}-${random}`;

    const updateData: any = {
      verified: true,
      verifiedAt: new Date(),
      verifiedBy: userRole,
      certificateNumber,
      certificateIssuedDate: new Date(),
      ...extraData,
    };

    return this.childModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .exec();
  }

  async create(createChildDto: CreateChildDto, userRole: string, userHospitalId?: string, userId?: string): Promise<Child> {
    try {
      console.log('Child creation attempt:', { createChildDto, userRole, userHospitalId, userId });
      
      // Validate access to child
      // await this.findById(createChildDto.motherId, userRole, userHospitalId);
      
      // Validate hospital assignment based on user role
      if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
        if (createChildDto.birthHospital !== userHospitalId) {
          throw new BadRequestException('You can only register children for your hospital');
        }
      }

      const childData = {
        ...createChildDto,
        birthDate: new Date(createChildDto.birthDate),
        birthHospital: new Types.ObjectId(createChildDto.birthHospital),
        motherId: new Types.ObjectId(createChildDto.motherId),
        deliveredBy: createChildDto.deliveredBy ? 
          new Types.ObjectId(createChildDto.deliveredBy) : undefined,
        assignedHealthWorker: createChildDto.assignedHealthWorker ? 
          new Types.ObjectId(createChildDto.assignedHealthWorker) : undefined,
      };

      console.log('Creating child with data:', childData);

      const child = new this.childModel(childData);
      const result = await child.save();
      console.log('Child created successfully:', result);
      return result;
    } catch (error) {
      console.error('Child creation error:', error);
      throw error;
    }
  }

  async findAll(userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<Child[]> {
    let query: any = {};

    // Filter based on user role
    if ((userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') && userHospitalId) {
      query.birthHospital = new Types.ObjectId(userHospitalId);
    } else if (userRole === 'WOREDA_ADMIN') {
      // Need to join with mothers to filter by woreda
      const children = await this.childModel.find(query)
        .populate('motherId')
        .populate('birthHospital', 'name type address')
        .populate('deliveredBy', 'name email role')
        .populate('assignedHealthWorker', 'name email role')
        .sort({ registrationDate: -1 })
        .exec();

      return children.filter(child => 
        child.motherId && (child.motherId as any).woredaId?.toString() === userWoredaId
      );
    } else if (userRole === 'MOTHER' && userWoredaId) {
      const mother = await this.mothersService.findByUserId(userWoredaId);
      if (!mother) return [];
      query.motherId = (mother as any)._id;
    }

    return this.childModel.find(query)
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .sort({ registrationDate: -1 })
      .exec();
  }

  async findById(id: string, userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<Child> {
    const child = await this.childModel.findById(id)
      .populate('motherId', 'name phone age address healthCenter')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role phone')
      .populate('assignedHealthWorker', 'name email role phone')
      .exec();

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Check access permissions
    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      if (child.birthHospital._id.toString() !== userHospitalId) {
        throw new NotFoundException('Child not found or access denied');
      }
    } else if (userRole === 'WOREDA_ADMIN') {
      if (child.motherId && (child.motherId as any).woredaId?.toString() !== userWoredaId) {
        throw new NotFoundException('Child not found or access denied');
      }
    } else if (userRole === 'MOTHER' && userWoredaId) { // userWoredaId is used as userId in this context if coming from controller req.user._id
      const mother = await this.mothersService.findByUserId(userWoredaId);
      
      const motherIdStr = (mother as any)?._id?.toString();
      const childMotherIdStr = child.motherId?._id?.toString() ?? child.motherId?.toString();
      
      if (!mother || childMotherIdStr !== motherIdStr) {
        throw new NotFoundException('Child not found or access denied');
      }
    }

    return child;
  }

  async findByMotherId(motherId: string, userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<Child[]> {
    const query: any = { motherId: new Types.ObjectId(motherId) };

    const children = await this.childModel.find(query)
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .sort({ birthDate: -1 })
      .exec();

    // Apply role-based access control
    return this.filterChildrenByRole(children, userRole, userHospitalId, userWoredaId);
  }

  async update(id: string, updateChildDto: any, userRole: string, userHospitalId?: string): Promise<Child> {
    await this.findById(id, userRole, userHospitalId);

    const updateData: any = { ...updateChildDto };
    if (updateChildDto.birthHospital) {
      updateData.birthHospital = new Types.ObjectId(updateChildDto.birthHospital);
    }
    if (updateChildDto.motherId) {
      updateData.motherId = new Types.ObjectId(updateChildDto.motherId);
    }
    if (updateChildDto.assignedHealthWorker) {
      updateData.assignedHealthWorker = new Types.ObjectId(updateChildDto.assignedHealthWorker);
    }
    if (updateChildDto.birthDate) {
      updateData.birthDate = new Date(updateChildDto.birthDate);
    }
    if (updateChildDto.deathDate) {
      updateData.deathDate = new Date(updateChildDto.deathDate);
    }

    return this.childModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .exec();
  }

  async notifyWoreda(id: string, userRole: string, userHospitalId?: string, senderName?: string): Promise<Child> {
    const child = await this.childModel.findById(id)
      .populate({ path: 'birthHospital', select: 'name type woredaId' })
      .exec();

    if (!child) throw new NotFoundException('Child not found');

    // Only hospital staff can send to woreda
    if (userHospitalId && child.birthHospital) {
      const hospitalId = (child.birthHospital as any)._id?.toString() ?? child.birthHospital.toString();
      if (hospitalId !== userHospitalId) {
        throw new BadRequestException('You can only notify the woreda for children registered at your facility');
      }
    }

    return this.childModel.findByIdAndUpdate(
      id,
      {
        sentToWoreda: true,
        sentToWoredaAt: new Date(),
        sentToWoredaBy: senderName ?? userRole,
      },
      { new: true },
    )
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .exec();
  }

  async verifyChild(id: string, userRole: string, userWoredaId?: string): Promise<Child> {
    const child = await this.childModel.findById(id)
      .populate('motherId', 'name phone age address woredaId')
      .populate('birthHospital', 'name type address woredaId')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .exec();

    if (!child) {
      throw new NotFoundException('Child not found');
    }

    // Check if user has permission to verify this child
    if (userRole === 'WOREDA_ADMIN') {
      // For woreda admin, check if the child belongs to their woreda
      const motherWoredaId = (child.motherId as any)?.woredaId?.toString();
      const hospitalWoredaId = (child.birthHospital as any)?.woredaId?.toString();
      
      if (motherWoredaId !== userWoredaId && hospitalWoredaId !== userWoredaId) {
        throw new BadRequestException('You can only verify children in your woreda');
      }
    }

    // Update verification status
    return this.childModel.findByIdAndUpdate(id, { 
      verified: true, 
      verifiedAt: new Date(),
      verifiedBy: userRole 
    }, { new: true })
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .exec();
  }

  async delete(id: string, userRole: string, userHospitalId?: string): Promise<void> {
    await this.findById(id, userRole, userHospitalId);
    await this.childModel.findByIdAndDelete(id);
  }

  async search(query: string, userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<Child[]> {
    let searchQuery: any = {
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { 'motherId.name': { $regex: query, $options: 'i' } },
        { 'motherId.phone': { $regex: query, $options: 'i' } }
      ]
    };

    // Apply role-based filtering
    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      searchQuery.birthHospital = new Types.ObjectId(userHospitalId);
    }

    const children = await this.childModel.find(searchQuery)
      .populate('motherId', 'name phone age address')
      .populate('birthHospital', 'name type address')
      .populate('deliveredBy', 'name email role')
      .populate('assignedHealthWorker', 'name email role')
      .sort({ registrationDate: -1 })
      .exec();

    return this.filterChildrenByRole(children, userRole, userHospitalId, userWoredaId);
  }

  async getChildrenStats(userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<any> {
    const children = await this.findAll(userRole, userHospitalId, userWoredaId);
    
    const total = children.length;
    const healthy = children.filter(c => c.healthStatus === 'HEALTHY').length;
    const needsAttention = children.filter(c => c.healthStatus === 'NEEDS_ATTENTION').length;
    const critical = children.filter(c => c.healthStatus === 'CRITICAL').length;
    const deceased = children.filter(c => c.deceased).length;

    // Age distribution
    const now = new Date();
    const ageGroups = {
      newborn: children.filter(c => {
        const age = now.getTime() - c.birthDate.getTime();
        return age < 28 * 24 * 60 * 60 * 1000; // < 28 days
      }).length,
      infant: children.filter(c => {
        const age = now.getTime() - c.birthDate.getTime();
        return age >= 28 * 24 * 60 * 60 * 1000 && age < 365 * 24 * 60 * 60 * 1000; // 28 days - 1 year
      }).length,
      toddler: children.filter(c => {
        const age = now.getTime() - c.birthDate.getTime();
        return age >= 365 * 24 * 60 * 60 * 1000 && age < 5 * 365 * 24 * 60 * 60 * 1000; // 1-5 years
      }).length,
    };

    return {
      total,
      healthy,
      needsAttention,
      critical,
      deceased,
      ageGroups,
      healthStatusDistribution: {
        healthy,
        needsAttention,
        critical
      }
    };
  }

  // Growth Record Methods
  async createGrowthRecord(createGrowthRecordDto: CreateGrowthRecordDto, userRole: string, userHospitalId?: string, userId?: string): Promise<GrowthRecord> {
    // Validate access to child
    const child = await this.findById(createGrowthRecordDto.childId, userRole, userHospitalId);
    
    const growthData = {
      ...createGrowthRecordDto,
      childId: new Types.ObjectId(createGrowthRecordDto.childId),
      measuredBy: new Types.ObjectId(userId),
      hospitalId: new Types.ObjectId(userHospitalId),
      measurementDate: new Date(),
      followUpDate: createGrowthRecordDto.followUpDate ? new Date(createGrowthRecordDto.followUpDate) : undefined,
    };

    const growthRecord = new this.growthRecordModel(growthData);
    return growthRecord.save();
  }

  async getGrowthRecordsByChildId(childId: string, userRole: string, userHospitalId?: string): Promise<GrowthRecord[]> {
    await this.findById(childId, userRole, userHospitalId);

    return this.growthRecordModel.find({ childId: new Types.ObjectId(childId) })
      .populate('childId', 'name birthDate gender')
      .populate('measuredBy', 'name email role')
      .populate('hospitalId', 'name type')
      .sort({ measurementDate: -1 })
      .exec();
  }

  async getLatestGrowthRecord(childId: string, userRole: string, userHospitalId?: string): Promise<GrowthRecord | null> {
    await this.findById(childId, userRole, userHospitalId);

    return this.growthRecordModel.findOne({ childId: new Types.ObjectId(childId) })
      .populate('childId', 'name birthDate gender')
      .populate('measuredBy', 'name email role')
      .sort({ measurementDate: -1 })
      .exec();
  }

  async updateGrowthRecord(id: string, updateGrowthRecordDto: any, userRole: string, userHospitalId?: string): Promise<GrowthRecord> {
    const record = await this.growthRecordModel.findById(id)
      .populate('childId')
      .exec();

    if (!record) {
      throw new NotFoundException('Growth record not found');
    }

    // Check access through child
    await this.findById((record.childId as any)._id.toString(), userRole, userHospitalId);

    const updateData: any = { ...updateGrowthRecordDto };
    if (updateGrowthRecordDto.childId) {
      updateData.childId = new Types.ObjectId(updateGrowthRecordDto.childId);
    }
    if (updateGrowthRecordDto.followUpDate) {
      updateData.followUpDate = new Date(updateGrowthRecordDto.followUpDate);
    }

    return this.growthRecordModel.findByIdAndUpdate(id, updateData, { new: true })
      .populate('childId', 'name birthDate gender')
      .populate('measuredBy', 'name email role')
      .populate('hospitalId', 'name type')
      .exec();
  }

  async deleteGrowthRecord(id: string, userRole: string, userHospitalId?: string): Promise<void> {
    const record = await this.growthRecordModel.findById(id)
      .populate('childId')
      .exec();

    if (!record) {
      throw new NotFoundException('Growth record not found');
    }

    // Check access through child
    await this.findById((record.childId as any)._id.toString(), userRole, userHospitalId);
    
    await this.growthRecordModel.findByIdAndDelete(id);
  }

  async getChildrenNeedingFollowUp(userRole: string, userHospitalId?: string, userWoredaId?: string): Promise<any[]> {
    const children = await this.findAll(userRole, userHospitalId, userWoredaId);
    const result = [];

    for (const child of children) {
      const latestRecord = await this.getLatestGrowthRecord((child as any)._id.toString(), userRole, userHospitalId);
      
      if (latestRecord && latestRecord.needsFollowUp && latestRecord.followUpDate) {
        const today = new Date();
        const followUpDate = new Date(latestRecord.followUpDate);
        
        if (followUpDate <= today) {
          result.push({
            child,
            latestRecord,
            overdueDays: Math.floor((today.getTime() - followUpDate.getTime()) / (1000 * 60 * 60 * 24))
          });
        }
      }
    }

    return result.sort((a, b) => b.overdueDays - a.overdueDays);
  }

  private async filterChildrenByRole(
    children: Child[], 
    userRole: string, 
    userHospitalId?: string, 
    userWoredaId?: string
  ): Promise<Child[]> {
    if (userRole === 'SYSTEM_ADMIN') {
      return children;
    }

    if (userRole === 'HOSPITAL_ADMIN' || userRole === 'DOCTOR' || userRole === 'NURSE' || userRole === 'MIDWIFE') {
      return children.filter(c => c.birthHospital.toString() === userHospitalId);
    }

    if (userRole === 'WOREDA_ADMIN') {
      return children.filter(c => 
        c.motherId && (c.motherId as any).woredaId?.toString() === userWoredaId
      );
    }

    if (userRole === 'MOTHER' && userWoredaId) {
      const mother = await this.mothersService.findByUserId(userWoredaId);
      if (!mother) return [];
      return children.filter(c => c.motherId._id.toString() === (mother as any)._id.toString());
    }

    return [];
  }
}
