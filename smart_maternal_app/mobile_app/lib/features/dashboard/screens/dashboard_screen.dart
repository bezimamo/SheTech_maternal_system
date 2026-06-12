import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../../models/user_model.dart';
import '../../profile/services/profile_service.dart';
import '../../appointments/services/appointment_service.dart';
import '../../appointments/models/schedule_model.dart';
import '../screens/main_navigation_screen.dart';
import 'package:intl/intl.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ProfileService _profileService = ProfileService();
  final AppointmentService _appointmentService = AppointmentService();

  UserModel? _user;
  ScheduleData? _scheduleData;
  MotherVaccinationScheduleData? _vaccineSchedule;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    final results = await Future.wait([
      _profileService.getUserProfile(),
      _appointmentService.getMySchedule(),
      _appointmentService.getMyMotherVaccinations(),
    ]);
    setState(() {
      _user = results[0] as UserModel?;
      _scheduleData = results[1] as ScheduleData?;
      _vaccineSchedule = results[2] as MotherVaccinationScheduleData?;
      _isLoading = false;
    });
  }

  // ── Pregnancy helpers ──────────────────────────────────────────────────────

  int get _currentWeek {
    // Prefer the live pregnancy info from the user profile
    final w = _user?.pregnancyInfo?.currentWeek ?? 0;
    if (w > 0) return w;
    // Fall back: derive from the most recent completed/scheduled visit week
    if (_scheduleData != null) {
      final visits = _scheduleData!.visits;
      if (visits.isNotEmpty) {
        final sorted = List<PregnancyVisit>.from(visits)
          ..sort((a, b) => b.visitDate.compareTo(a.visitDate));
        final latest = sorted.first;
        if (latest.week > 0) return latest.week;
        if (latest.gestationalAge > 0) return latest.gestationalAge;
      }
    }
    return 0;
  }

  String _trimesterLabel(int week, bool isAmharic) {
    if (week <= 0) return isAmharic ? 'ያልታወቀ' : 'Unknown';
    if (week <= 12) return isAmharic ? '1ኛ ሶስት ወር' : '1st Trimester';
    if (week <= 27) return isAmharic ? '2ኛ ሶስት ወር' : '2nd Trimester';
    return isAmharic ? '3ኛ ሶስት ወር' : '3rd Trimester';
  }

  /// Progress fraction 0.0 – 1.0 over 40 weeks
  double get _progressFraction {
    final w = _currentWeek;
    if (w <= 0) return 0.0;
    return (w / 40.0).clamp(0.0, 1.0);
  }

  /// Returns the soonest upcoming appointment date across:
  ///   1. pregnancyInfo.nextAppointment (from user profile)
  ///   2. scheduleData.nextVisit.visitDate (from pregnancy visit schedule)
  ///   3. vaccineSchedule.nextAppointment['scheduledDate'] (from vaccination schedule)
  /// Returns null if none found. Also returns a label indicating the type.
  ({DateTime date, String label, String labelAm})? get _nextAppointmentInfo {
    final now = DateTime.now();
    final candidates = <({DateTime date, String label, String labelAm})>[];

    // Source 1: pregnancyInfo.nextAppointment
    final piDate = _user?.pregnancyInfo?.nextAppointment;
    if (piDate != null && piDate.isAfter(now)) {
      candidates.add((
        date: piDate,
        label: 'Pregnancy Visit',
        labelAm: 'የእርግዝና ቅድመ ምርመራ',
      ));
    }

    // Source 2: next scheduled pregnancy visit from schedule
    final nextVisit = _scheduleData?.nextVisit;
    if (nextVisit != null && nextVisit.visitDate.isAfter(now)) {
      candidates.add((
        date: nextVisit.visitDate,
        label: 'ANC Visit · Week ${nextVisit.week}',
        labelAm: 'ANC ቅድመ ምርመራ · ሳምንት ${nextVisit.week}',
      ));
    }

    // Source 3: next vaccination appointment
    final vaccNextAppt = _vaccineSchedule?.nextAppointment;
    if (vaccNextAppt != null && vaccNextAppt['scheduledDate'] != null) {
      final vaccDate =
          DateTime.tryParse(vaccNextAppt['scheduledDate'].toString());
      if (vaccDate != null && vaccDate.isAfter(now)) {
        final vaccLabel =
            vaccNextAppt['label']?.toString() ?? 'Vaccination';
        candidates.add((
          date: vaccDate,
          label: vaccLabel,
          labelAm: vaccLabel,
        ));
      }
    }

    if (candidates.isEmpty) return null;

    // Pick the soonest
    candidates.sort((a, b) => a.date.compareTo(b.date));
    return candidates.first;
  }

  String _formatRelativeDate(DateTime date, bool isAmharic) {
    final today = DateTime(
        DateTime.now().year, DateTime.now().month, DateTime.now().day);
    final visitDay = DateTime(date.year, date.month, date.day);
    final diff = visitDay.difference(today).inDays;

    if (diff == 0) return isAmharic ? 'ዛሬ' : 'Today';
    if (diff == 1) return isAmharic ? 'ነገ' : 'Tomorrow';
    if (diff > 1 && diff <= 7) {
      return isAmharic ? 'በ$diff ቀናት' : 'In $diff days';
    }
    return DateFormat('MMM d, yyyy').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFB),
      body: _isLoading
          ? Center(child: Text(AppTranslations.get('loading', lang.isAmharic)))
          : RefreshIndicator(
              onRefresh: _loadData,
              displacement: 60,
              child: CustomScrollView(
                slivers: [
                  _buildSliverHero(lang.isAmharic),
                  SliverPadding(
                    padding: const EdgeInsets.fromLTRB(24, 32, 24, 40),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        _buildSectionHeader(AppTranslations.get('your_journey', lang.isAmharic)),
                        const SizedBox(height: 20),
                        _buildProgressTrackingCard(lang.isAmharic),
                        const SizedBox(height: 32),
                        _buildSectionHeader(AppTranslations.get('quick_actions', lang.isAmharic)),
                        const SizedBox(height: 20),
                        _buildQuickActionsGrid(lang.isAmharic),
                        const SizedBox(height: 32),
                        _buildHealthTipCard(lang.isAmharic),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSliverHero(bool isAmharic) {
    final name = _user?.name ?? 'Mama';

    return SliverAppBar(
      expandedHeight: 340,
      floating: false,
      pinned: true,
      backgroundColor: AppColors.primary,
      elevation: 0,
      flexibleSpace: FlexibleSpaceBar(
        background: Stack(
          fit: StackFit.expand,
          children: [
            Image.network(
              'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1453&auto=format&fit=crop',
              fit: BoxFit.cover,
            ),
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    Colors.black.withOpacity(0.7),
                    Colors.black.withOpacity(0.3),
                    Colors.transparent,
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppTranslations.get('hello', isAmharic),
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.8),
                        fontSize: 18,
                        fontWeight: FontWeight.w400),
                  ),
                  Text(
                    name,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 40,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -1.0,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border:
                          Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          AppTranslations.get('verified_mother_profile', isAmharic),
                          style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 11,
                              fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: const TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.text,
          ),
        ),
      ],
    );
  }

  Widget _buildProgressTrackingCard(bool isAmharic) {
    final week = _currentWeek;
    final hasData = week > 0;
    final weekLabel = hasData
        ? (isAmharic ? '$week ሳምንት' : '$week Weeks')
        : (isAmharic ? 'ያልተመዘገበ' : 'Not registered');
    final trimester = _trimesterLabel(week, isAmharic);
    final progress = _progressFraction;

    // Next appointment — soonest across pregnancy visit + vaccination
    final apptInfo = _nextAppointmentInfo;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.health_and_safety_rounded,
                    color: AppColors.primary, size: 28),
              ),
              if (hasData)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.success.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    isAmharic ? 'በሂደት ላይ' : 'On Track',
                    style: TextStyle(
                        color: AppColors.success,
                        fontWeight: FontWeight.bold,
                        fontSize: 12),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 20),
          Text(
            isAmharic ? 'የእርግዝና ሂደት' : 'Pregnancy Progress',
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
          ),
          const SizedBox(height: 8),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                weekLabel,
                style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    color: AppColors.text),
              ),
              Text(
                trimester,
                style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w500,
                    color: AppColors.primary),
              ),
            ],
          ),
          const SizedBox(height: 24),
          // Progress bar
          Stack(
            children: [
              Container(
                height: 12,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              FractionallySizedBox(
                widthFactor: hasData ? progress : 0.0,
                child: Container(
                  height: 12,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                        colors: [AppColors.primary, Color(0xFFFFA0B4)]),
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: [
                      BoxShadow(
                          color: AppColors.primary.withOpacity(0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          if (hasData)
            Padding(
              padding: const EdgeInsets.only(top: 6),
              child: Text(
                isAmharic
                    ? '${(progress * 100).toStringAsFixed(0)}% (${40 - week} ሳምንት ቀረ)'
                    : '${(progress * 100).toStringAsFixed(0)}% complete · ${40 - week} weeks to go',
                style: const TextStyle(
                    fontSize: 12, color: AppColors.textSecondary),
              ),
            ),
          const SizedBox(height: 20),
          const Divider(height: 1),
          const SizedBox(height: 20),
          // Next appointment row
          GestureDetector(
            onTap: () => MainNavigationScreen.of(context)?.changeTab(kTabAppointments),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                      color: Colors.blue.withOpacity(0.1),
                      shape: BoxShape.circle),
                  child: const Icon(Icons.event_available,
                      color: Colors.blue, size: 20),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        AppTranslations.get('next_appointment', isAmharic),
                        style: const TextStyle(
                            color: AppColors.textSecondary, fontSize: 12),
                      ),
                      Text(
                        apptInfo != null
                            ? _formatRelativeDate(apptInfo.date, isAmharic)
                            : (isAmharic ? 'ቀጠሮ የለም' : 'No upcoming appointment'),
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      if (apptInfo != null) ...[
                        Text(
                          DateFormat('EEEE, MMM d, yyyy').format(apptInfo.date),
                          style: const TextStyle(
                              fontSize: 12, color: AppColors.textSecondary),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          isAmharic ? apptInfo.labelAm : apptInfo.label,
                          style: TextStyle(
                              fontSize: 11,
                              color: AppColors.primary.withOpacity(0.8),
                              fontWeight: FontWeight.w600),
                        ),
                      ],
                    ],
                  ),
                ),
                const Icon(Icons.chevron_right,
                    color: AppColors.textSecondary),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsGrid(bool isAmharic) {
    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      mainAxisSpacing: 16,
      crossAxisSpacing: 16,
      childAspectRatio: 1.1,
      children: [
        _buildActionCard(Icons.calendar_month_rounded,
            AppTranslations.get('appointments', isAmharic), Colors.blue,
            tabIndex: kTabAppointments),
        _buildActionCard(Icons.child_care_rounded,
            AppTranslations.get('child_growth', isAmharic), Colors.green,
            tabIndex: kTabGrowth),
        _buildActionCard(Icons.vaccines_rounded,
            AppTranslations.get('vaccinations', isAmharic), Colors.orange,
            tabIndex: kTabVaccination),
        _buildActionCard(Icons.warning_amber_rounded,
            AppTranslations.get('danger_signs', isAmharic), Colors.red,
            tabIndex: kTabDangerSigns),
        _buildActionCard(Icons.local_hospital_rounded,
            AppTranslations.get('referrals', isAmharic), Colors.purple,
            tabIndex: kTabReferrals),
        _buildActionCard(Icons.person_rounded,
            AppTranslations.get('my_profile', isAmharic), Colors.brown,
            tabIndex: kTabProfile),
      ],
    );
  }

  Widget _buildActionCard(IconData icon, String title, Color color,
      {int? tabIndex}) {
    return GestureDetector(
      onTap: () {
        if (tabIndex != null) {
          MainNavigationScreen.of(context)?.changeTab(tabIndex);
        }
      },
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(
                color: Colors.black.withOpacity(0.02),
                blurRadius: 10,
                offset: const Offset(0, 4)),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.1),
                borderRadius: BorderRadius.circular(15),
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const Spacer(),
            Flexible(
              child: Text(
                title,
                style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                    color: AppColors.text),
                overflow: TextOverflow.ellipsis,
                maxLines: 2,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHealthTipCard(bool isAmharic) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [
            AppColors.primary.withOpacity(0.1),
            AppColors.primary.withOpacity(0.05)
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: AppColors.primary.withOpacity(0.1)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.primary, size: 20),
              const SizedBox(width: 8),
              Text(
                AppTranslations.get('mama_insight', isAmharic),
                style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.bold,
                    fontSize: 15),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            AppTranslations.get('health_tip_default', isAmharic),
            style: const TextStyle(
                color: AppColors.textSecondary, fontSize: 15, height: 1.6),
          ),
        ],
      ),
    );
  }
}
