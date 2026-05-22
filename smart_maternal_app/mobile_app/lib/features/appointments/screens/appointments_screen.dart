import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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
    with SingleTickerProviderStateMixin {
  final AppointmentService _appointmentService = AppointmentService();
  final ChildService _childService = ChildService();
  final ProfileService _profileService = ProfileService();

  late TabController _tabController;
  ScheduleData? _scheduleData;
  List<dynamic> _children = [];
  final Map<String, List<dynamic>> _childVaccines = {};
  String _motherName = '';
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadAllData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAllData() async {
    setState(() => _isLoading = true);

    try {
      final user = await _profileService.getUserProfile();
      _motherName = user?.name ?? 'Mother';

      final scheduleFuture = _appointmentService.getMySchedule();
      final childrenFuture = _childService.getMyChildren();
      final results = await Future.wait([scheduleFuture, childrenFuture]);

      _scheduleData = results[0] as ScheduleData?;
      _children = results[1] as List<dynamic>;

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

    if (mounted) setState(() => _isLoading = false);
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
    return Scaffold(
      backgroundColor: AppointmentTheme.background,
      body: NestedScrollView(
        headerSliverBuilder: (context, innerBoxIsScrolled) => [
          const SliverToBoxAdapter(child: AppointmentsHeader()),
          SliverPersistentHeader(
            pinned: true,
            delegate: _TabBarDelegate(
              TabBar(
                controller: _tabController,
                labelColor: AppointmentTheme.brownDark,
                unselectedLabelColor: Colors.grey.shade600,
                indicatorColor: AppointmentTheme.brown,
                indicatorWeight: 3,
                labelStyle: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
                isScrollable: true,
                tabs: const [
                  Tab(text: 'Pregnancy Visits'),
                  Tab(text: 'Maternal Vaccination'),
                  Tab(text: 'Child Vaccination'),
                ],
              ),
            ),
          ),
        ],
        body: _isLoading
            ? const Center(
                child: CircularProgressIndicator(color: AppointmentTheme.brown),
              )
            : TabBarView(
                controller: _tabController,
                children: [
                  _buildVisitsTab(),
                  _buildMaternalVaccinesTab(),
                  _buildChildVaccinesTab(),
                ],
              ),
      ),
    );
  }

  Widget _buildVisitsTab() {
    if (_scheduleData == null || _scheduleData!.visits.isEmpty) {
      return _buildEmptyState(
        Icons.pregnant_woman_outlined,
        'No pregnancy visits scheduled yet.',
        'Your ANC follow-ups will appear here once registered by your health center.',
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
        padding: const EdgeInsets.all(16),
        children: [
          if (next != null)
            ReminderBanner(
              message:
                  'Your next ANC visit is on ${DateFormat('EEEE, MMM d').format(next.visitDate)} (Week ${next.week}).',
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
            _sectionTitle('Next Visit'),
            VisitCard(visit: next, isNext: true),
          ],
          if (upcoming.isNotEmpty) ...[
            _sectionTitle('Upcoming Visits'),
            ...upcoming
                .where((v) => next == null || v.id != next.id)
                .map((v) => VisitCard(visit: v)),
          ],
          if (missed.isNotEmpty) ...[
            _sectionTitle('Missed / Overdue'),
            ...missed.map((v) => VisitCard(visit: v)),
          ],
          if (completed.isNotEmpty) ...[
            _sectionTitle('Previous Visits'),
            ...completed.map((v) => VisitCard(visit: v)),
          ],
        ],
      ),
    );
  }

  Widget _buildMaternalVaccinesTab() {
    final vaccines = _scheduleData?.vaccines ?? [];
    final slots = TdScheduleSlot.buildFromRecords(vaccines);

    if (vaccines.isEmpty && slots.every((s) => s.record == null)) {
      return _buildEmptyState(
        Icons.vaccines_outlined,
        'No maternal vaccinations recorded yet.',
        'TD1–TD5 tetanus doses will appear here when scheduled by your health worker.',
      );
    }

    final given = vaccines.where((v) => v.status == 'GIVEN').length;
    final scheduled = vaccines.where((v) => v.status == 'SCHEDULED').length;
    final missed = vaccines.where((v) => v.status == 'MISSED').length;

    return RefreshIndicator(
      color: AppointmentTheme.brown,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: AppointmentTheme.cardDecoration,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _miniStat('Completed', given, AppointmentTheme.administered),
                _miniStat('Scheduled', scheduled, AppointmentTheme.scheduled),
                _miniStat('Missed', missed, AppointmentTheme.missed),
              ],
            ),
          ),
          const SizedBox(height: 20),
          MaternalVaccineTimeline(
            slots: slots,
            allVaccines: vaccines,
          ),
        ],
      ),
    );
  }

  Widget _buildChildVaccinesTab() {
    if (_children.isEmpty) {
      return _buildEmptyState(
        Icons.child_care_outlined,
        'No children registered yet.',
        'Child vaccination schedules appear after your baby is registered at a health facility.',
      );
    }

    return RefreshIndicator(
      color: AppointmentTheme.brown,
      onRefresh: _loadAllData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          ..._children.map((child) => _buildChildSection(child)),
        ],
      ),
    );
  }

  Widget _buildChildSection(dynamic child) {
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
              message:
                  'Upcoming: $vName for ${child['name']} on ${DateFormat('MMM d').format(DateTime.parse(next['scheduledDate'].toString()))}.',
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
          _emptyChildVaccines()
        else ...[
          _sectionTitle('Vaccination Records'),
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
        const SizedBox(height: 24),
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
                fontSize: 22, fontWeight: FontWeight.bold, color: color)),
        Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
      ],
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 12, top: 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.bold,
          color: AppointmentTheme.brownDark,
          letterSpacing: 1.0,
        ),
      ),
    );
  }

  Widget _emptyChildVaccines() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Text(
        'No vaccination records yet for this child.',
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
            Icon(icon, size: 72, color: AppointmentTheme.brownLight),
            const SizedBox(height: 16),
            Text(title,
                textAlign: TextAlign.center,
                style: const TextStyle(
                    fontWeight: FontWeight.bold, fontSize: 16)),
            const SizedBox(height: 8),
            Text(subtitle,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
          ],
        ),
      ),
    );
  }
}

class _TabBarDelegate extends SliverPersistentHeaderDelegate {
  final TabBar tabBar;

  _TabBarDelegate(this.tabBar);

  @override
  double get minExtent => tabBar.preferredSize.height;

  @override
  double get maxExtent => tabBar.preferredSize.height;

  @override
  Widget build(
      BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Material(
      color: Colors.white,
      elevation: overlapsContent ? 2 : 0,
      child: tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarDelegate oldDelegate) => false;
}
