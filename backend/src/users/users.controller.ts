import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN')
  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User successfully created' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    const user = req.user;

    // SUPER_ADMIN can create any user without restriction
    if (user.role === 'SUPER_ADMIN') {
      return this.usersService.create(createUserDto);
    }

    if (user.role === 'SYSTEM_ADMIN') {
      return this.usersService.createWithRoleValidation(
        createUserDto,
        user.role,
        undefined,
        undefined,
        user.regionId?.toString(),
      );
    }

    if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HEALTH_CENTER_ADMIN') {
      return this.usersService.createWithRoleValidation(
        createUserDto,
        user.role,
        user.hospitalId?.toString(),
        user.woredaId?.toString(),
      );
    }

    if (user.role === 'WOREDA_ADMIN') {
      throw new ForbiddenException('Woreda Admin cannot create users');
    }

    throw new ForbiddenException('Insufficient permissions to create users');
  }

  // ─── Self-profile endpoints (any authenticated user) ───────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Profile retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@Request() req) {
    // The JWT strategy spreads the full Mongoose user object into req.user,
    // so _id is a Mongoose ObjectId. userId is also set as the raw sub string.
    const id = req.user._id?.toString() ?? req.user.userId ?? req.user.sub;
    return this.usersService.getOwnProfile(id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile (name, email, phone, password)' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g. wrong current password)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateMe(@Request() req, @Body() body: UpdateSelfDto) {
    const id = req.user._id?.toString() ?? req.user.userId ?? req.user.sub;
    return this.usersService.updateSelf(id, body);
  }

  // ─── Admin endpoints ─────────────────────────────────────────────────────────

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN', 'MOH_ADMIN')
  @Get()
  @ApiOperation({ summary: 'Get all users' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(@Request() req) {
    const user = req.user;
    console.log('[UsersController] findAll - user role:', user.role, 'regionId:', user.regionId?.toString());
    return this.usersService.findAllWithRoleFilter(
      user.role,
      user.hospitalId?.toString(),
      user.woredaId?.toString(),
      user.regionId?.toString(),
    );
  }

  @Roles('SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN')
  @Get('role/:role')
  @ApiOperation({ summary: 'Get users by role' })
  @ApiParam({ name: 'role', description: 'User role' })
  @ApiResponse({ status: 200, description: 'Users retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findByRole(@Param('role') role: string, @Request() req) {
    const user = req.user;
    return this.usersService.findByRoleWithFilter(
      role,
      user.role,
      user.hospitalId?.toString(),
      user.regionId?.toString(),
    );
  }

  @Roles('SYSTEM_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN')
  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Cannot access this user' })
  async findById(@Param('id') id: string, @Request() req) {
    // 'me' is handled by GET /users/me — should never reach here
    if (id === 'me') {
      return this.usersService.findByIdWithRoleFilter(
        req.user.sub,
        req.user.role,
        req.user.hospitalId?.toString(),
        req.user.regionId?.toString(),
      );
    }
    const user = req.user;
    return this.usersService.findByIdWithRoleFilter(
      id,
      user.role,
      user.hospitalId?.toString(),
      user.regionId?.toString(),
    );
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN')
  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully updated' })
  @ApiResponse({ status: 400, description: 'Bad Request' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto, @Request() req) {
    const user = req.user;
    
    if (user.role === 'SUPER_ADMIN') {
      return this.usersService.update(id, updateUserDto);
    }
    if (user.role === 'SYSTEM_ADMIN') {
      return this.usersService.updateWithRoleValidation(
        id,
        updateUserDto,
        user.role,
        undefined,
        undefined,
        user.regionId?.toString(),
      );
    }
    if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HEALTH_CENTER_ADMIN') {
      return this.usersService.updateWithRoleValidation(
        id,
        updateUserDto, 
        user.role, 
        user.hospitalId?.toString(),
        user._id?.toString()
      );
    } else if (user.role === 'WOREDA_ADMIN') {
      return this.usersService.updateWithWoredaValidation(
        id,
        updateUserDto,
        user.role,
        user.woredaId?.toString()
      );
    }
  }

  @Roles('SUPER_ADMIN', 'SYSTEM_ADMIN', 'WOREDA_ADMIN', 'HOSPITAL_ADMIN', 'HEALTH_CENTER_ADMIN')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  @ApiResponse({ status: 200, description: 'User successfully deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async delete(@Param('id') id: string, @Request() req) {
    const user = req.user;
    
    if (user.role === 'SUPER_ADMIN') {
      return this.usersService.delete(id);
    }
    if (user.role === 'SYSTEM_ADMIN') {
      return this.usersService.deleteWithRoleValidation(
        id,
        user.role,
        undefined,
        undefined,
        user.regionId?.toString(),
      );
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HEALTH_CENTER_ADMIN') {
      return this.usersService.deleteWithRoleValidation(
        id,
        user.role, 
        user.hospitalId?.toString(),
        user._id?.toString()
      );
    } else if (user.role === 'WOREDA_ADMIN') {
      return this.usersService.deleteWithWoredaValidation(
        id,
        user.role,
        user.woredaId?.toString()
      );
    }
  }
}
