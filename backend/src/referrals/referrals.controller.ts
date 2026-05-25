import {
  Controller, Post, Patch, Delete, Body, Param,
  UseGuards, Req, BadRequestException, Get, ForbiddenException, Query,
} from '@nestjs/common';
import { ReferralsService } from './referrals.service';
import {
  CreateReferralDto,
  RespondReferralDto,
  UnlockReferralDto,
  GateCheckInDto,
  SubmitFeedbackDto,
} from './dto/referralDto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

/** Resolve the caller's facility ID — works for both hospital and health-center users. */
function getFacilityId(user: any): string | undefined {
  return user?.facilityId ?? user?.hospitalId;
}

@Controller('referrals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  // ── CREATE (Doctor / Nurse / Midwife / Admin at any facility) ──────────────
  @Post()
  @Roles(
    UserRole.DOCTOR, UserRole.LIAISON_OFFICER, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HEALTH_CENTER_ADMIN, UserRole.HOSPITAL_ADMIN,
  )
  async createReferral(@Body() dto: CreateReferralDto, @Req() req: any) {
    const userId = req.user._id ?? req.user.userId;
    const facilityId = getFacilityId(req.user);
    const actorName = req.user.name;
    const userRole = req.user.role;

    if (!userId || !facilityId) {
      throw new BadRequestException('User ID or facility ID missing from token');
    }

    return this.referralsService.createReferral(dto, userId, facilityId, actorName, userRole);
  }

  // ── SYSTEM AUTO-REFERRAL ───────────────────────────────────────────────────
  @Post('system')
  @Roles(UserRole.SYSTEM_ADMIN)
  async createSystemReferral(@Body() dto: any) {
    return this.referralsService.createSystemReferral(dto);
  }

  // ── SEND (Liaison / Doctor / Admin at any facility) ────────────────────────
  @Patch(':id/send')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HEALTH_CENTER_ADMIN, UserRole.HOSPITAL_ADMIN,
  )
  async finalizeAndSend(
    @Param('id') id: string,
    @Body('targetHospitalId') targetFacilityId: string,
    @Body('liaisonNote') liaisonNote: string,
    @Req() req: any,
  ) {
    const actorId = req.user._id ?? req.user.userId;
    const facilityId = getFacilityId(req.user);
    const actorName = req.user.name;

    return this.referralsService.finalizeAndSend(
      id, actorId, facilityId, targetFacilityId, actorName, liaisonNote,
    );
  }

  // ── INCOMING (referrals sent TO this facility) ─────────────────────────────
  @Get('incoming')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
    UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
  )
  async getIncoming(@Req() req: any) {
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new ForbiddenException('User is not assigned to a facility');
    return this.referralsService.getIncomingReferrals(facilityId);
  }

  // ── CHECKED-IN ─────────────────────────────────────────────────────────────
  @Get('checked-in')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
    UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
  )
  async getCheckedIn(@Req() req: any) {
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new ForbiddenException('User is not assigned to a facility');
    return this.referralsService.getCheckedInReferrals(facilityId);
  }

  // ── GENERATE QR (upload to Cloudinary + accept) ────────────────────────────
  @Post(':id/qr-code')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
  )
  async generateQrCode(@Param('id') id: string, @Req() req: any) {
    const actorId = req.user._id ?? req.user.userId;
    const facilityId = getFacilityId(req.user);
    if (!actorId || !facilityId) {
      throw new BadRequestException('User ID or facility ID missing from token');
    }
    return this.referralsService.generateAndStoreQrCode(id, actorId, facilityId);
  }

  // ── RESPOND (Accept / Reject) ──────────────────────────────────────────────
  @Patch(':id/respond')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
    UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
  )
  async respondToReferral(
    @Param('id') id: string,
    @Body() dto: RespondReferralDto,
    @Req() req: any,
  ) {
    const facilityId = getFacilityId(req.user);
    return this.referralsService.respondToReferral(
      id, dto, req.user._id ?? req.user.userId, facilityId,
    );
  }

  // ── GATE CHECK-IN ──────────────────────────────────────────────────────────
  @Patch('gate-check-in')
  @Roles(UserRole.LIAISON_OFFICER, UserRole.GATEKEEPER)
  async gateCheckIn(@Body() dto: GateCheckInDto, @Req() req: any) {
    return this.referralsService.gateCheckIn(
      dto, req.user._id ?? req.user.userId, getFacilityId(req.user),
    );
  }

  // ── UPDATE DRAFT ───────────────────────────────────────────────────────────
  @Patch(':id')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HEALTH_CENTER_ADMIN, UserRole.HOSPITAL_ADMIN,
  )
  async updateReferral(
    @Param('id') id: string,
    @Body() dto: CreateReferralDto,
    @Req() req: any,
  ) {
    return this.referralsService.updateReferral(id, dto, getFacilityId(req.user));
  }

  // ── DELETE DRAFT ───────────────────────────────────────────────────────────
  @Delete(':id')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HEALTH_CENTER_ADMIN, UserRole.HOSPITAL_ADMIN,
  )
  async deleteReferral(@Param('id') id: string, @Req() req: any) {
    return this.referralsService.deleteReferral(id, getFacilityId(req.user));
  }

  // ── UPDATE STATUS (Generic) ────────────────────────────────────────────────
  @Patch(':id/status')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN, UserRole.GATEKEEPER,
  )
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: any,
    @Body('note') note: string,
    @Req() req: any,
  ) {
    const actorId = req.user._id ?? req.user.userId;
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new ForbiddenException('User facility information missing');

    return this.referralsService.updateReferralStatus(
      id, status, actorId, facilityId, note,
    );
  }

  // ── UNLOCK CLINICAL DATA ───────────────────────────────────────────────────
  @Post('unlock')
  @Roles(UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE, UserRole.SPECIALIST)
  async unlockReferral(@Body() dto: UnlockReferralDto, @Req() req: any) {
    return this.referralsService.unlockReferral(
      dto, req.user._id ?? req.user.userId, getFacilityId(req.user),
    );
  }

  // ── SUBMIT FEEDBACK ────────────────────────────────────────────────────────
  @Patch(':id/complete')
  @Roles(
    UserRole.DOCTOR, UserRole.LIAISON_OFFICER, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.SPECIALIST,
  )
  async submitFeedback(
    @Param('id') id: string,
    @Body() dto: SubmitFeedbackDto,
    @Req() req: any,
  ) {
    return this.referralsService.submitFeedback(
      id, dto.feedbackNote, req.user._id ?? req.user.userId,
    );
  }

  // ── OUTBOX (all referrals FROM this facility) ──────────────────────────────
  @Get('liaison/outbox')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
  )
  async getLiaisonOutbox(@Req() req: any) {
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new ForbiddenException('User is not assigned to a facility');
    return this.referralsService.getOutgoingReferrals(facilityId);
  }

  // ── DRAFTS (waiting to be sent by liaison) ─────────────────────────────────
  @Get('drafts')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
  )
  async getDrafts(@Req() req: any) {
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new ForbiddenException('User is not assigned to a facility');
    return this.referralsService.getDraftReferrals(facilityId);
  }

  // ── SPECIALIST QUEUE ───────────────────────────────────────────────────────
  @Get('specialist/queue')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.SPECIALIST,
  )
  async getSpecialistQueue(@Req() req: any) {
    const facilityId = getFacilityId(req.user);
    if (!facilityId) throw new BadRequestException('User facility information missing');
    return this.referralsService.getSpecialistQueue(facilityId);
  }

  // ── DASHBOARD ──────────────────────────────────────────────────────────────
  @Get('dashboard/:type')
  async getDashboard(
    @Param('type') type: 'inbound' | 'outbound',
    @Req() req: any,
  ) {
    return this.referralsService.getHospitalDashboard(getFacilityId(req.user), type);
  }

  @Get()
  @Roles(
    UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
  )
  async getReferrals(
    @Req() req: any,
    @Query('type') type: 'inbound' | 'outbound' = 'outbound',
  ) {
    return this.referralsService.getHospitalDashboard(getFacilityId(req.user), type);
  }

  // ── ADMIN STATS ────────────────────────────────────────────────────────────
  @Get('admin/stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.SYSTEM_ADMIN, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN)
  async getAdminStats(@Req() req: any) {
    if (req.user.role === UserRole.SYSTEM_ADMIN && req.user.regionId) {
      return this.referralsService.getSystemAdminReferralStats(req.user.regionId);
    }
    return this.referralsService.getAdminReferralStats();
  }

  // ── MOTHER ENDPOINTS ─────────────────────────────────────────────────────
  @Get('mother/active')
  @Roles(UserRole.MOTHER)
  async getActiveForMother(@Req() req: any) {
    const userId = req.user._id ?? req.user.userId;
    return this.referralsService.findActiveByMotherFromUserId(userId.toString());
  }

  // ── GET ONE (must be last) ─────────────────────────────────────────────────
  @Get(':id')
  @Roles(
    UserRole.LIAISON_OFFICER, UserRole.DOCTOR, UserRole.NURSE, UserRole.MIDWIFE,
    UserRole.SPECIALIST, UserRole.HOSPITAL_ADMIN, UserRole.HEALTH_CENTER_ADMIN,
    UserRole.GATEKEEPER, UserRole.MOTHER,
  )
  async getOne(@Param('id') id: string, @Req() req: any) {
    return this.referralsService.getReferralById(
      id, getFacilityId(req.user), req.user.role,
    );
  }
}
