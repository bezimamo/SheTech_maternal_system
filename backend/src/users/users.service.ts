import { Injectable, ConflictException, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserSchema, UserDocument } from './schemas/user.schema';
import { Mother, MotherDocument } from '../mothers/schemas/mother.schema';
import { Pregnancy, PregnancyDocument } from '../pregnancy/schemas/pregnancy.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HospitalsService } from '../hospitals/hospitals.service';
import { WoredasService } from '../woredas/woredas.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Mother.name) private motherModel: Model<MotherDocument>,
    @InjectModel(Pregnancy.name) private pregnancyModel: Model<PregnancyDocument>,
    private hospitalsService: HospitalsService,
    private woredasService: WoredasService,
  ) {}
  private readonly hospitalManagedRoles = [
    'HOSPITAL_ADMIN',
    'HEALTH_CENTER_ADMIN',
    'DOCTOR',
    'NURSE',
    'MIDWIFE',
    'DISPATCHER',
    'LIAISON_OFFICER',
    'HOSPITAL_APPROVER',
    'GATEKEEPER',
    'SPECIALIST',
    'SUPER_ADMIN',
    'SYSTEM_ADMIN',
    'WOREDA_ADMIN',
    'MOH_ADMIN',
    'MOTHER',
  ];

  private async normalizeEmptyReferenceFields(): Promise<void> {
    // Historical data may store relation ids as empty strings. This breaks Mongoose
    // population with CastError, so normalize them to "unset" on read paths.
    await Promise.all([
      this.userModel.updateMany({ hospitalId: '' as any }, { $unset: { hospitalId: 1 } }).exec(),
      this.userModel.updateMany({ woredaId: '' as any }, { $unset: { woredaId: 1 } }).exec(),
      this.userModel.updateMany({ regionId: '' as any }, { $unset: { regionId: 1 } }).exec(),
    ]);
  }

  private normalizeEmail(email: string): string {
    return email?.toString().trim().toLowerCase();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { email, password, role, hospitalId, healthCenterId, woredaId, regionId, ...userData } = createUserDto;
    const selectedHospitalId = hospitalId ?? healthCenterId;
    const normalizedEmail = this.normalizeEmail(email);

    // Check if user already exists
    const existingUser = await this.userModel.findOne({ email: normalizedEmail });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new this.userModel({
      ...userData,
      email: normalizedEmail,
      password: hashedPassword,
      role,
      hospitalId: selectedHospitalId && Types.ObjectId.isValid(selectedHospitalId) 
        ? new Types.ObjectId(selectedHospitalId) 
        : undefined,
      woredaId: woredaId && Types.ObjectId.isValid(woredaId) 
        ? new Types.ObjectId(woredaId) 
        : undefined,
      regionId: regionId && Types.ObjectId.isValid(regionId)
        ? new Types.ObjectId(regionId)
        : undefined,
    });

    return user.save();
  }

  private async ensureHospitalMatchesRegion(hospitalId: string, region: string) {
    console.log(`[ensureHospitalMatchesRegion] Checking hospitalId: ${hospitalId} against region: ${region}`);
    const hospital = await this.hospitalsService.findById(hospitalId);
    if (!hospital) {
      console.log(`[ensureHospitalMatchesRegion] Hospital not found: ${hospitalId}`);
      throw new BadRequestException(`Hospital not found: ${hospitalId}`);
    }
    
    console.log(`[ensureHospitalMatchesRegion] Hospital found: ${hospital.name}, woredaId: ${hospital.woredaId}`);
    
    // Get the woreda with populated region data
    let woredaId: string | undefined;
    if (hospital.woredaId) {
      if (typeof hospital.woredaId === 'string') {
        woredaId = hospital.woredaId;
      } else if (hospital.woredaId._id) {
        woredaId = hospital.woredaId._id.toString();
      }
    }
    
    if (!woredaId) {
      console.log(`[ensureHospitalMatchesRegion] No valid woredaId found for hospital: ${hospitalId}`);
      throw new BadRequestException(`Hospital has no valid woredaId: ${hospitalId}`);
    }
    
    console.log(`[ensureHospitalMatchesRegion] Fetching woreda: ${woredaId}`);
    const woreda = await this.woredasService.findById(woredaId);
    if (!woreda) {
      console.log(`[ensureHospitalMatchesRegion] Woreda not found: ${woredaId}`);
      throw new BadRequestException(`Woreda not found: ${woredaId}`);
    }
    
    console.log(`[ensureHospitalMatchesRegion] Woreda found: ${woreda.name}, regionId: ${woreda.regionId}`);
    
    const woredaRegionId = woreda.regionId ? (typeof woreda.regionId === 'string' ? woreda.regionId : woreda.regionId._id?.toString() || woreda.regionId.toString()) : null;
    
    if (!woredaRegionId || woredaRegionId !== region) {
      console.log(`[ensureHospitalMatchesRegion] Region mismatch! Woreda region: ${woredaRegionId}, Expected region: ${region}`);
      throw new BadRequestException(`Hospital does not belong to region ${region}`);
    }
    
    console.log(`[ensureHospitalMatchesRegion] Region validation passed`);
  }

  private async ensureWoredaMatchesRegion(woredaId: string, region: string) {
    console.log(`[ensureWoredaMatchesRegion] Checking woredaId: ${woredaId} against region: ${region}`);
    const woreda = await this.woredasService.findById(woredaId);
    if (!woreda) {
      console.log(`[ensureWoredaMatchesRegion] Woreda not found: ${woredaId}`);
      throw new BadRequestException(`Woreda not found: ${woredaId}`);
    }
    
    console.log(`[ensureWoredaMatchesRegion] Woreda found: ${woreda.name}, regionId: ${woreda.regionId}`);
    
    const woredaRegionId = woreda.regionId ? (typeof woreda.regionId === 'string' ? woreda.regionId : woreda.regionId._id?.toString() || woreda.regionId.toString()) : null;
    
    if (!woredaRegionId || woredaRegionId !== region) {
      console.log(`[ensureWoredaMatchesRegion] Region mismatch! Woreda region: ${woredaRegionId}, Expected region: ${region}`);
      throw new BadRequestException(`Woreda does not belong to region ${region}`);
    }
    
    console.log(`[ensureWoredaMatchesRegion] Region validation passed`);
  }

  async createWithRoleValidation(
    createUserDto: CreateUserDto,
    creatorRole: string,
    creatorHospitalId?: string,
    creatorWoredaId?: string,
    creatorAssignedRegion?: string,
  ): Promise<User> {
    const { role: newRole, hospitalId, woredaId, regionId } = createUserDto;

    if (creatorRole === 'HOSPITAL_ADMIN' || creatorRole === 'HEALTH_CENTER_ADMIN') {
      if (!creatorHospitalId) {
        throw new BadRequestException(`${creatorRole} must be assigned to a facility to create users`);
      }
      
      // Check for restricted roles first
      if (newRole === 'HOSPITAL_ADMIN') {
        throw new BadRequestException('Hospital Admin cannot create other Hospital Admins');
      } else if (['WOREDA_ADMIN', 'SYSTEM_ADMIN', 'SUPER_ADMIN'].includes(newRole)) {
        throw new BadRequestException('Hospital Admin cannot create admin users');
      }

      if (this.hospitalManagedRoles.includes(newRole)) {
        // Force hospital and woreda from the creator — ignore whatever the frontend sent
        const dto = {
          ...createUserDto,
          hospitalId: creatorHospitalId || undefined,
          woredaId: creatorWoredaId || createUserDto.woredaId || undefined,
        };
        
        // Remove empty strings to prevent Mongoose cast errors
        if (dto.hospitalId === '') delete dto.hospitalId;
        if (dto.woredaId === '') delete dto.woredaId;
        
        return this.create(dto);
      }
      
      // For non-managed roles, validate hospital ID matches
      if (['DOCTOR', 'NURSE', 'MIDWIFE', 'DISPATCHER', 'LIAISON_OFFICER', 'HOSPITAL_APPROVER', 'GATEKEEPER', 'SPECIALIST'].includes(newRole)) {
        if (!hospitalId || hospitalId?.toString() !== creatorHospitalId?.toString()) {
          throw new BadRequestException(`Hospital Admin can only create workers for their own hospital. Provided hospitalId: ${hospitalId}, Creator hospitalId: ${creatorHospitalId}`);
        }
      } else if (['HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'WOREDA_ADMIN', 'SYSTEM_ADMIN'].includes(newRole)) {
        throw new BadRequestException(`${creatorRole} cannot create admin users`);
      }
    } else if (creatorRole === 'SYSTEM_ADMIN') {
      if (!creatorAssignedRegion) {
        throw new BadRequestException('System Admin must have an assigned region');
      }
      if (newRole === 'SUPER_ADMIN') {
        throw new BadRequestException('System Admin cannot create SUPER_ADMIN');
      }

      const creatorRegion = creatorAssignedRegion;

      if (createUserDto.regionId && createUserDto.regionId !== creatorRegion) {
        throw new BadRequestException('System Admin can only create users in their own region');
      }

      if (woredaId) {
        await this.ensureWoredaMatchesRegion(woredaId, creatorRegion);
      }

      if (hospitalId) {
        await this.ensureHospitalMatchesRegion(hospitalId, creatorRegion);
      }

      const dto: any = { ...createUserDto, regionId: creatorRegion };
      delete dto.regionId;
      dto.regionId = creatorRegion;

      return this.create(dto);
    } else if (creatorRole === 'WOREDA_ADMIN') {
      throw new BadRequestException('Woreda Admin cannot create users');
    }

    return this.create(createUserDto);
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const normalizedEmail = this.normalizeEmail(email);
    let user = await this.userModel.findOne({ email: normalizedEmail }).exec();
    if (!user) {
      user = await this.userModel.findOne({
        email: { $regex: new RegExp(`^${this.escapeRegex(email.trim())}$`, 'i') },
      }).exec();
    }
    return user;
  }

  /**
   * Store a password reset token (hashed) and expiry for the given email.
   * The token should be a securely generated value that was hashed before saving.
   */
  async setPasswordResetTokenByEmail(email: string, hashedToken: string, expires: Date): Promise<void> {
    const normalizedEmail = this.normalizeEmail(email);
    await this.userModel.findOneAndUpdate(
      { email: normalizedEmail },
      { passwordResetToken: hashedToken, passwordResetExpires: expires },
      { new: true },
    ).exec();
  }

  /**
   * Find a user by the stored hashed password reset token.
   */
  async findByPasswordResetToken(hashedToken: string): Promise<UserDocument | null> {
    if (!hashedToken) return null;
    return this.userModel.findOne({ passwordResetToken: hashedToken }).exec();
  }

  /**
   * Clear password reset token and expiry for a user by id.
   */
  async clearPasswordResetToken(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }).exec();
  }

  /**
   * Reset a user's password by id. Hashes the provided password and clears reset fields.
   */
  async resetPasswordById(userId: string, newPlainPassword: string): Promise<void> {
    const hashed = await bcrypt.hash(newPlainPassword, 10);
    await this.userModel.findByIdAndUpdate(userId, { password: hashed, $unset: { passwordResetToken: 1, passwordResetExpires: 1 } }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<User[]> {
    await this.normalizeEmptyReferenceFields();
    return this.userModel
      .find()
      .select('-password')
      .populate('hospitalId')
      .populate('woredaId')
      .populate('regionId')
      .exec();
  }

  async findByRole(role: string): Promise<User[]> {
    await this.normalizeEmptyReferenceFields();
    return this.userModel
      .find({ role })
      .select('-password')
      .populate('hospitalId')
      .populate('woredaId')
      .populate('regionId')
      .exec();
  }

  private getIdString(value: any): string | null {
    if (!value) return null;
    if (typeof value === 'string') return value;
    const v = value as any;
    if (v._id) return (v._id as any).toString();
    if (typeof v.toString === 'function') {
      const str = v.toString();
      if (str !== '[object Object]') return str;
    }
    return null;
  }

  private filterUsersByRegion(users: User[], regionId: string): User[] {
    return users.filter((user) => {
      const userRegionId = this.getIdString(user.regionId);
      const userWoredaRegionId = user.woredaId && typeof user.woredaId === 'object' ? this.getIdString((user.woredaId as any).regionId) : null;
      let userHospitalRegionId: string | null = null;
      if (user.hospitalId && typeof user.hospitalId === 'object') {
        const hospital = user.hospitalId as any;
        if (hospital.woredaId && typeof hospital.woredaId === 'object') {
          userHospitalRegionId = this.getIdString(hospital.woredaId.regionId);
        }
      }
      const isMatch = userRegionId === regionId || userWoredaRegionId === regionId || userHospitalRegionId === regionId;
      if (!isMatch) {
        console.log(`[filterUsersByRegion] Excluded user ${(user as any)._id} (${user.role}): region=${userRegionId}, woredaRegion=${userWoredaRegionId}, hospitalRegion=${userHospitalRegionId}, target=${regionId}`);
      }
      return isMatch;
    });
  }

  async findAllWithRoleFilter(role: string, hospitalId?: string, woredaId?: string, regionId?: string): Promise<User[]> {
    await this.normalizeEmptyReferenceFields();
    if ((role === 'HOSPITAL_ADMIN' || role === 'HEALTH_CENTER_ADMIN') && hospitalId) {
      if (!Types.ObjectId.isValid(hospitalId)) return [];
      return this.userModel
        .find({ hospitalId: new Types.ObjectId(hospitalId) })
        .select('-password')
        .populate({ path: 'hospitalId', populate: { path: 'woredaId' } })
        .populate('woredaId')
        .exec();
    }

    if (role === 'WOREDA_ADMIN' && woredaId) {
      if (!Types.ObjectId.isValid(woredaId)) return [];
      return this.userModel
        .find({ woredaId: new Types.ObjectId(woredaId) })
        .select('-password')
        .populate({ path: 'hospitalId', populate: { path: 'woredaId' } })
        .populate('woredaId')
        .exec();
    }

    const users = await this.userModel
      .find()
      .select('-password')
      .populate({ path: 'hospitalId', populate: { path: 'woredaId', populate: { path: 'regionId' } } })
      .populate({ path: 'woredaId', populate: { path: 'regionId' } })
      .populate('regionId')
      .exec();

    if (role === 'SYSTEM_ADMIN') {
      if (!regionId) {
        return [];
      }
      console.log('[UsersService] Filtering users by regionId:', regionId, 'total users before filter:', users.length);
      const filtered = this.filterUsersByRegion(users, regionId);
      console.log('[UsersService] Users after region filter:', filtered.length);
      return filtered;
    }

    return users;
  }

  async findByRoleWithFilter(role: string, userRole: string, hospitalId?: string, regionId?: string): Promise<User[]> {
    await this.normalizeEmptyReferenceFields();
    const query: any = { role };
    if (userRole === 'HOSPITAL_ADMIN' && hospitalId) {
      query.hospitalId = new Types.ObjectId(hospitalId);
    }

    const users = await this.userModel
      .find(query)
      .select('-password')
      .populate({ path: 'hospitalId', populate: { path: 'woredaId', populate: { path: 'regionId' } } })
      .populate({ path: 'woredaId', populate: { path: 'regionId' } })
      .populate('regionId')
      .exec();

    if (userRole === 'SYSTEM_ADMIN') {
      if (!regionId) return [];
      return this.filterUsersByRegion(users, regionId);
    }

    return users;
  }

  async findByIdWithRoleFilter(id: string, userRole: string, hospitalId?: string, regionId?: string): Promise<User | null> {
    await this.normalizeEmptyReferenceFields();
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate({ path: 'hospitalId', populate: { path: 'woredaId', populate: { path: 'regionId' } } })
      .populate({ path: 'woredaId', populate: { path: 'regionId' } })
      .populate('regionId')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (userRole === 'HOSPITAL_ADMIN' && hospitalId) {
      if (user.hospitalId?.toString() !== hospitalId) {
        throw new ForbiddenException('Forbidden - Cannot access this user');
      }
    }

    if (userRole === 'SYSTEM_ADMIN') {
      if (!regionId) {
        throw new ForbiddenException('Forbidden - Cannot access this user');
      }
      const isInRegion = this.filterUsersByRegion([user], regionId).length > 0;
      if (!isInRegion) {
        throw new ForbiddenException('Forbidden - Cannot access this user');
      }
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const { email, password, role, hospitalId, woredaId, regionId, ...userData } = updateUserDto;

    // Check if user exists
    const existingUser = await this.userModel.findById(id);
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Check if email is taken by another user
    if (email && email !== existingUser.email) {
      const emailTaken = await this.userModel.findOne({ email });
      if (emailTaken) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    const updateData: any = { ...userData };
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    if (password) updateData.password = await bcrypt.hash(password, 10);
    if (hospitalId) updateData.hospitalId = new Types.ObjectId(hospitalId);
    if (woredaId) updateData.woredaId = new Types.ObjectId(woredaId);
    if (regionId) updateData.regionId = new Types.ObjectId(regionId);

    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password').exec();
  }

  async updateWithRoleValidation(id: string, updateUserDto: UpdateUserDto, creatorRole: string, creatorHospitalId?: string, creatorId?: string, creatorRegionId?: string): Promise<User> {
    const { role: newRole, hospitalId, woredaId, regionId } = updateUserDto;

    // Find the user to update
    const userToUpdate = await this.userModel.findById(id);
    if (!userToUpdate) {
      throw new NotFoundException('User not found');
    }

    // System admin can only manage users in their assigned region
    if (creatorRole === 'SYSTEM_ADMIN') {
      if (!creatorRegionId) {
        throw new ForbiddenException('System Admin has no assigned region');
      }
      await this.findByIdWithRoleFilter(id, 'SYSTEM_ADMIN', undefined, creatorRegionId);

      if (regionId && regionId !== creatorRegionId) {
        throw new BadRequestException('Cannot assign user to another region');
      }
      if (woredaId) {
        await this.ensureWoredaMatchesRegion(woredaId, creatorRegionId);
      }
      if (hospitalId) {
        await this.ensureHospitalMatchesRegion(hospitalId, creatorRegionId);
      }
    }

    if (creatorRole === 'HOSPITAL_ADMIN' || creatorRole === 'HEALTH_CENTER_ADMIN') {
      // Allow users to update their own profile regardless of other checks
      if (id === creatorId) {
        return this.update(id, updateUserDto);
      }

      // Hospital Admin can only update workers for his own hospital
      if (!this.hospitalManagedRoles.includes(userToUpdate.role)) {
        throw new BadRequestException(`${creatorRole} can only update hospital staff users`);
      }
      
      if (userToUpdate.hospitalId?.toString() !== creatorHospitalId) {
        // If they are not in the same hospital, they must be a super admin to override, 
        // but this block is only for HOSPITAL_ADMIN / HEALTH_CENTER_ADMIN.
        throw new BadRequestException(`${creatorRole} can only update workers in their own facility`);
      }
      
      // Ensure hospitalId in update matches (cannot move workers to another hospital)
      if (hospitalId && hospitalId !== creatorHospitalId) {
        throw new BadRequestException('Cannot change facility for workers');
      }
    }

    return this.update(id, updateUserDto);
  }

  async getOwnProfile(id: string): Promise<any> {
    const user = await this.userModel
      .findById(id)
      .select('-password')
      .populate({ path: 'hospitalId', populate: { path: 'woredaId' } })
      .populate('woredaId')
      .exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userObj: any = (user as any).toObject();

    // If woredaId is not directly set on the user but their hospital has one, derive it
    if (!userObj.woredaId && userObj.hospitalId?.woredaId) {
      userObj.woredaId = userObj.hospitalId.woredaId;
    }

    // If assignedRegion is not set but hospital's woreda has a region/city, derive it
    if (!userObj.assignedRegion && userObj.woredaId?.city) {
      userObj.assignedRegion = userObj.woredaId.city;
    }

    // Add pregnancy info for mothers
    if (userObj.role === 'MOTHER') {
      const mother = await this.motherModel.findOne({ userId: user._id }).exec();
      if (mother) {
        const nextVisit = await this.pregnancyModel.findOne({
          motherId: mother._id,
          visitStatus: 'SCHEDULED',
          visitDate: { $gte: new Date() }
        }).sort({ visitDate: 1 }).exec();

        const lastCompletedVisit = await this.pregnancyModel.findOne({
          motherId: mother._id,
          visitStatus: 'COMPLETED'
        }).sort({ visitDate: -1 }).exec();

        let currentWeek = lastCompletedVisit?.week ?? 0;
        if (currentWeek === 0 && mother.lmp) {
          const lmpDate = new Date(mother.lmp);
          const now = new Date();
          const diffInMs = now.getTime() - lmpDate.getTime();
          currentWeek = Math.floor(diffInMs / (7 * 24 * 60 * 60 * 1000));
          // Ensure week is within reasonable pregnancy range
          if (currentWeek < 0) currentWeek = 0;
          if (currentWeek > 42) currentWeek = 42;
        }

        userObj.pregnancyInfo = {
          currentWeek,
          nextAppointment: nextVisit?.visitDate ?? null,
          motherId: (mother as any)._id,
          dueDate: mother.expectedDeliveryDate ?? null
        };
      }
    }

    return userObj;
  }

  async updateSelf(
    id: string,
    data: { name?: string; email?: string; phoneNumber?: string; currentPassword?: string; newPassword?: string },
  ): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};

    if (data.name) updateData.name = data.name;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;

    if (data.email && data.email !== user.email) {
      const taken = await this.userModel.findOne({ email: data.email });
      if (taken) throw new ConflictException('Email already in use');
      updateData.email = data.email;
    }

    if (data.newPassword) {
      if (!data.currentPassword) {
        throw new BadRequestException('Current password is required to set a new password');
      }
      const isMatch = await bcrypt.compare(data.currentPassword, user.password);
      if (!isMatch) throw new BadRequestException('Current password is incorrect');
      updateData.password = await bcrypt.hash(data.newPassword, 10);
    }

    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).select('-password').populate('hospitalId').populate('woredaId').exec();
  }

  async delete(id: string): Promise<void> {
    const result = await this.userModel.findByIdAndDelete(id).exec();
    if (!result) {
      throw new NotFoundException('User not found');
    }
  }

  async deleteWithRoleValidation(id: string, creatorRole: string, creatorHospitalId?: string, creatorId?: string, creatorRegionId?: string): Promise<void> {
    // Find the user to delete
    const userToDelete = await this.userModel.findById(id);
    if (!userToDelete) {
      throw new NotFoundException('User not found');
    }

    // System admin can only delete users in their assigned region
    if (creatorRole === 'SYSTEM_ADMIN') {
      if (!creatorRegionId) {
        throw new ForbiddenException('System Admin has no assigned region');
      }
      await this.findByIdWithRoleFilter(id, 'SYSTEM_ADMIN', undefined, creatorRegionId);
    }

    // Role-based delete permissions
    if (creatorRole === 'HOSPITAL_ADMIN' || creatorRole === 'HEALTH_CENTER_ADMIN') {
      // Don't allow deleting self through this method (prevent accidental lockout)
      if (id === creatorId) {
        throw new BadRequestException('Cannot delete your own account from this dashboard');
      }

      // Hospital Admin can only delete workers for his own hospital
      if (!this.hospitalManagedRoles.includes(userToDelete.role)) {
        throw new BadRequestException(`${creatorRole} can only delete hospital staff users`);
      }
      if (userToDelete.hospitalId?.toString() !== creatorHospitalId) {
        throw new BadRequestException(`${creatorRole} can only delete workers in their own facility`);
      }
    }

    return this.delete(id);
  }

  async updateWithWoredaValidation(
    id: string,
    updateUserDto: UpdateUserDto,
    creatorRole: string,
    creatorWoredaId: string,
  ): Promise<User> {
    const userToUpdate = await this.userModel.findById(id);
    if (!userToUpdate) {
      throw new NotFoundException('User not found');
    }

    if (creatorRole === 'WOREDA_ADMIN') {
      if (userToUpdate.woredaId?.toString() !== creatorWoredaId) {
        throw new BadRequestException('Woreda Admin can only update users in their own woreda');
      }
    }

    return this.update(id, updateUserDto);
  }

  async deleteWithWoredaValidation(id: string, creatorRole: string, creatorWoredaId: string): Promise<void> {
    const userToDelete = await this.userModel.findById(id);
    if (!userToDelete) {
      throw new NotFoundException('User not found');
    }

    if (creatorRole === 'WOREDA_ADMIN') {
      if (userToDelete.woredaId?.toString() !== creatorWoredaId) {
        throw new BadRequestException('Woreda Admin can only delete users in their own woreda');
      }
    }

    return this.delete(id);
  }
}
