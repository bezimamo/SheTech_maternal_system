import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../child_growth/services/child_service.dart';
import '../../profile/services/profile_service.dart';
import '../models/schedule_model.dart';
import '../services/appointment_service.dart';
import '../widgets/appointments_header.dart';
import '../widgets/appointment_theme.dart';
import '../widgets/child_profile_card.dart';
import '../widgets/child_vaccine_card.dart';
import '../widgets/maternal_vaccine_timeline.dart';
import '../widgets/reminder_banner.dart';
import '../widgets/visit_card.dart';

class AppointmentsScreen extends StatefulWidget {
  const AppointmentsScreen({super.key});

  @override
  State<AppointmentsScreen> createState() => _AppointmentsScreenState();
}

class _AppointmentsScreenState extends State<AppointmentsScreen>
    with TickerProviderStateMixin {
  final AppointmentService _appointmentService = AppointmentService();
  final ChildService _childService = ChildService();
  final ProfileService _profileService = ProfileService();

  late TabController _tabController;
  late AnimationController _entryController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;
  
  ScheduleData? _scheduleData;
  MotherVaccinationScheduleData? _motherVaccinationSchedule;
  List<dynamic> _children = [];
  final Map<String, List<dynamic>> _childVaccines = {};
  String _motherName = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    
    _entryController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1000),
    );
    _fadeAnim = CurvedAnimation(
      parent: _entryController,
      curve: Curves.easeOut,
    );
    _slideAnim = Tween<Offset>(
      begin: const Offset(0, 0.1),
      end: Offset.zero,
    ).animate(
      CurvedAnimation(
        parent: _entryController,
        curve: Curves.easeOutCubic,
      ),
    );
    
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _entryController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);

    try {
      final user = await _profileService.getUserProfile();
      _motherName = user?.name ?? 'Mother';

      final scheduleFuture = _appointmentService.getMySchedule();
      final motherVaccinesFuture = _appointmentService.getMyMotherVaccinations();
      final childrenFuture = _childService.getMyChildren();
      final results = await Future.wait([
        scheduleFuture,
        motherVaccinesFuture,
        childrenFuture,
      ]);

      _scheduleData = results[0] as ScheduleData?;
      _motherVaccinationSchedule = results[1] as MotherVaccinationScheduleData?;
      _children = results[2] as List<dynamic>;

      _childVaccines.clear();
      for (final child in _children) {
        final childId = child['_id']?.toString();
        if (childId != null) {
          _childVaccines[childId] =
              await _appointmentService.getChildVaccinations(childId);
        }
      }
    } catch (e) {
      debugPrint('Error loading appointment data: $e');
    }

    if (mounted) {
      setState(() => _isLoading = false);
      _entryController.forward();
    }
  }

  void _showClinicNotice(String action) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$action must be done at your health center. Please contact your clinic.',
        ),
        behavior: SnackBarBehavior.floating,
        backgroundColor: AppointmentTheme.brownDark,
      ),
    );
  }

  void _showReminderSnack(String item) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Reminder noted for $item. You will be notified before the appointment.'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F5),
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          const SliverToBoxAdapter(child: AppointmentsHeader()),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              Container(
                color: const Color(0xFFFFF8F5),
                child: TabBar(
                  controller: _tabController,
                  labelColor: AppointmentTheme.brownDark,
                  unselectedLabelColor: Colors.grey.shade600,
                  indicatorColor: AppointmentTheme.brown,
                  indicatorWeight: 3,
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                  ),
                  isScrollable: true,
                  tabs: [
                    Tab(text: lang.isAmharic ? 'የእርግዝና ግብይቶች' : 'Pregnancy Visits'),
                    Tab(text: AppTranslations.get('maternal_vaccination', lang.isAmharic)),
                    Tab(text: AppTranslations.get('child_vaccination', lang.isAmharic)),
                  ],
                ),
              ),
            ),
          ),
        ],
        body: _isLoading
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(color: AppointmentTheme.brown),
                    const SizedBox(height: 16),
                    Text(
                      AppTranslations.get('loading', lang.isAmharic), 
                      style: TextStyle(color: Colors.grey.shade600)
                    ),
                  ],
                ),
              )
            : FadeTransition(
                opacity: _fadeAnim,
                child: SlideTransition(
                  position: _slideAnim,
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildVisitsTab(lang.isAmharic),
                      _buildMaternalVaccinesTab(lang.isAmharic),
                      _buildChildVaccinesTab(lang.isAmharic),
                    ],
                  ),
                ),
              ),
      ),
    );
  }

  Widget _buildVisitsTab(bool isAmharic) {
    if (_scheduleData == null || _scheduleData!.visits.isEmpty) {
      return _buildEmptyState(
        Icons.pregnant_woman_outlined,
        isAmharic ? 'ምንም የእርግዝና ግብይቶች አልተዘጋጁምንም' : 'No pregnancy visits scheduled yet.',
        isAmharic ? 'የእርስዎ ANC ተከታታዮች በጤና ተቋምዎ ከተመዘገቡ በኋላ እዚህ ይታያሉ' : 'Your ANC follow-ups will appear here once registered by your health center.',
      );
    }

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final next = _scheduleData!.nextVisit;
    final warnings = _scheduleData!.warnings;

    final upcoming = _scheduleData!.visits.where((v) {
      return v.visitStatus == 'SCHEDULED' &&
          !v.visitDate.isBefore(today);
    }).toList();

    final completed = _scheduleData!.visits
        .where((v) => v.visitStatus == 'COMPLETED')
        .toList()
      ..sort((a, b) => b.visitDate.compareTo(a.visitDate));

    final missed = _scheduleData!.visits.where((v) {
      return v.visitStatus == 'MISSED' ||
          (v.visitStatus == 'SCHEDULED' && v.visitDate.isBefore(today));
    }).toList();

    return RefreshIndicator(
      color: AppointmentTheme.brown,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (next != null)
            ReminderBanner(
              message:
                  isAmharic ? 'ቀጣይ ANC ግብይትዎ ${DateFormat('EEEE, MMM d').format(next.visitDate)} (ሳምንት ${next.week}) ነው' : 'Your next ANC visit is on ${DateFormat('EEEE, MMM d').format(next.visitDate)} (Week ${next.week}).',
              icon: Icons.event_available,
            ),
          ...warnings.map(
            (w) => ReminderBanner(
              message: w,
              icon: Icons.info_outline,
              accentColor: const Color(0xFFFF9800),
            ),
          ),
          if (next != null) ...[
            _sectionTitle(isAmharic ? 'ቀጣይ ግብይት' : 'Next Visit'),
            VisitCard(visit: next, isNext: true),
          ],
          if (upcoming.isNotEmpty) ...[
            _sectionTitle(isAmharic ? 'የሚመጡ ግብይቶች' : 'Upcoming Visits'),
            ...upcoming
                .where((v) => next == null || v.id != next.id)
                .map((v) => VisitCard(visit: v)),
          ],
          if (missed.isNotEmpty) ...[
            _sectionTitle(isAmharic ? 'የተለፈው / በጊዜው በላይ' : 'Missed / Overdue'),
            ...missed.map((v) => VisitCard(visit: v)),
          ],
          if (completed.isNotEmpty) ...[
            _sectionTitle(isAmharic ? 'የቀደሙ ግብይቶች' : 'Previous Visits'),
            ...completed.map((v) => VisitCard(visit: v)),
          ],
        ],
      ),
    );
  }

  Widget _buildMaternalVaccinesTab(bool isAmharic) {
    final vaccines = _motherVaccinationSchedule?.vaccines.isNotEmpty == true
        ? _motherVaccinationSchedule!.vaccines
        : (_scheduleData?.vaccines ?? []);
    final apiSlots = _motherVaccinationSchedule?.vaccineSchedule ?? [];
    final slots = apiSlots.isNotEmpty
        ? TdScheduleSlot.buildFromApiSchedule(apiSlots)
        : TdScheduleSlot.buildFromRecords(vaccines);
    final warnings = _motherVaccinationSchedule?.warnings ?? [];
    final nextAppt = _motherVaccinationSchedule?.nextAppointment;

    if (vaccines.isEmpty && slots.every((s) => s.record == null)) {
      return _buildEmptyState(
        Icons.vaccines_outlined,
        isAmharic ? 'ምንም የእናት ክትባቶች አልተመዘገቡም' : 'No maternal vaccinations recorded yet.',
        isAmharic ? 'TD1–TD5 የቴታነስ ክትባቶች በጤና ሰራተኛዎ ከተዘጋጁ በኋላ እዚህ ይታያሉ' : 'TD1–TD5 tetanus doses will appear here when scheduled by your health worker.',
      );
    }

    final given = vaccines.where((v) => v.status == 'GIVEN').length;
    final scheduled = vaccines.where((v) => v.status == 'SCHEDULED').length;
    final missed = vaccines.where((v) => v.status == 'MISSED').length;

    return RefreshIndicator(
      color: AppointmentTheme.brown,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          if (nextAppt != null && nextAppt['scheduledDate'] != null)
            ReminderBanner(
              message: () {
                final date = DateTime.parse(nextAppt['scheduledDate'].toString());
                final days = date.difference(DateTime(
                  DateTime.now().year,
                  DateTime.now().month,
                  DateTime.now().day,
                )).inDays;
                final countdown = days == 0
                    ? (isAmharic ? 'ዛሬ' : 'today')
                    : days == 1
                        ? (isAmharic ? 'ነገ' : 'tomorrow')
                        : (isAmharic ? 'በ$days ቀናት' : 'in $days days');
                final label = nextAppt['label'] ?? (isAmharic ? 'TD ክትባት' : 'TD dose');
                return isAmharic 
                  ? 'የሚመጡ: $label በ${DateFormat('dd/MM/yyyy').format(date)} ($countdown) ነው' 
                  : 'Upcoming: $label on ${DateFormat('dd/MM/yyyy').format(date)} ($countdown).';
              }(),
              icon: Icons.vaccines,
            ),
          ...warnings.map(
            (w) => ReminderBanner(
              message: w,
              icon: Icons.warning_amber_rounded,
              accentColor: const Color(0xFFFF9800),
            ),
          ),
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.06),
                  blurRadius: 16,
                  offset: const Offset(0, 6),
                ),
              ],
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _miniStat(isAmharic ? 'ተከናውኗል' : 'Completed', given, AppointmentTheme.administered),
                _miniStat(isAmharic ? 'ተዘጋጅቷል' : 'Scheduled', scheduled, AppointmentTheme.scheduled),
                _miniStat(isAmharic ? 'ተለፈው' : 'Missed', missed, AppointmentTheme.missed),
              ],
            ),
          ),
          const SizedBox(height: 24),
          MaternalVaccineTimeline(
            slots: slots,
            allVaccines: vaccines,
          ),
        ],
      ),
    );
  }

  Widget _buildChildVaccinesTab(bool isAmharic) {
    if (_children.isEmpty) {
      return _buildEmptyState(
        Icons.child_care_outlined,
        isAmharic ? 'ምንም ልጆች አልተመዘገቡም' : 'No children registered yet.',
        isAmharic ? 'የልጅ ክትባት መርሃግብሮች ልጅዎ በጤና ተቋም ከተመዘገበ በኋላ ይታያሉ' : 'Child vaccination schedules appear after your baby is registered at a health facility.',
      );
    }

    return RefreshIndicator(
      color: AppointmentTheme.brown,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          ..._children.map((child) => _buildChildSection(child, isAmharic)),
        ],
      ),
    );
  }

  Widget _buildChildSection(dynamic child, bool isAmharic) {
    final childId = child['_id']?.toString() ?? '';
    final vaccines = _childVaccines[childId] ?? [];
    final administered =
        vaccines.where((v) => v['status'] == 'ADMINISTERED').length;
    final scheduled = vaccines.where((v) => v['status'] == 'SCHEDULED').length;
    final missed = vaccines.where((v) => v['status'] == 'MISSED').length;

    final upcoming = vaccines.where((v) => v['status'] == 'SCHEDULED').toList()
      ..sort((a, b) => DateTime.parse(a['scheduledDate'].toString())
          .compareTo(DateTime.parse(b['scheduledDate'].toString())));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (upcoming.isNotEmpty) ...[
          Builder(builder: (_) {
            final next = upcoming.first;
            final vName = next['vaccineId'] is Map
                ? next['vaccineId']['name']
                : 'vaccination';
            return ReminderBanner(
              message: isAmharic 
                ? 'የሚመጡ: ${child['name']} ለ $vName በ${DateFormat('MMM d').format(DateTime.parse(next['scheduledDate'].toString()))} ነው' 
                : 'Upcoming: $vName for ${child['name']} on ${DateFormat('MMM d').format(DateTime.parse(next['scheduledDate'].toString()))}.',
              icon: Icons.child_care,
            );
          }),
        ],
        ChildProfileCard(
          child: child,
          motherName: _motherName,
          administered: administered,
          scheduled: scheduled,
          missed: missed,
        ),
        if (vaccines.isEmpty)
          _emptyChildVaccines(isAmharic)
        else ...[
          _sectionTitle(isAmharic ? 'የክትባት መዝገቦች' : 'Vaccination Records'),
          ..._sortedVaccines(vaccines).map((record) {
            final name = record['vaccineId'] is Map
                ? record['vaccineId']['name']?.toString() ?? 'vaccine'
                : 'vaccine';
            return ChildVaccineCard(
              record: record,
              onRemind: () => _showReminderSnack(name),
              onViewDetails: () => _showClinicNotice('Vaccination'),
            );
          }),
        ],
        const SizedBox(height: 32),
      ],
    );
  }

  List<dynamic> _sortedVaccines(List<dynamic> vaccines) {
    final copy = List<dynamic>.from(vaccines);
    copy.sort((a, b) {
      const order = {'SCHEDULED': 0, 'MISSED': 1, 'ADMINISTERED': 2};
      final sa = order[a['status']] ?? 3;
      final sb = order[b['status']] ?? 3;
      if (sa != sb) return sa.compareTo(sb);
      return DateTime.parse(a['scheduledDate'].toString())
          .compareTo(DateTime.parse(b['scheduledDate'].toString()));
    });
    return copy;
  }

  Widget _miniStat(String label, int count, Color color) {
    return Column(
      children: [
        Text('$count',
            style: TextStyle(
                fontSize: 26, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 16, top: 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 13,
          fontWeight: FontWeight.bold,
          color: AppointmentTheme.brownDark,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _emptyChildVaccines(bool isAmharic) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        isAmharic ? 'ለዚህ ልጅ ምንም የክትባት መዝገቦች የሉም' : 'No vaccination records yet for this child.',
        style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon, size: 80, color: AppointmentTheme.brownLight),
            const SizedBox(height: 20),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 17)),
            const SizedBox(height: 12),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 14)),
          ],
        ),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final Widget child;

  _TabBarDelegate(this.child);

  @override
  double get minExtent => 48;

  @override
  double get maxExtent => 48;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Material(
      color: const Color(0xFFFFF8F5),
      elevation: overlapsContent ? 2 : 0,
      child: child,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}
