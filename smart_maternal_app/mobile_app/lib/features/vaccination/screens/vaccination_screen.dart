import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/widgets/app_bar_widget.dart';
import '../../appointments/services/appointment_service.dart';
import '../../appointments/models/schedule_model.dart';
import '../../appointments/widgets/appointment_theme.dart';
import '../../child_growth/services/child_service.dart';
import 'package:intl/intl.dart';

class VaccinationScreen extends StatefulWidget {
  const VaccinationScreen({super.key});

  @override
  State<VaccinationScreen> createState() => _VaccinationScreenState();
}

class _VaccinationScreenState extends State<VaccinationScreen>
    with TickerProviderStateMixin {
  final AppointmentService _appointmentService = AppointmentService();
  final ChildService _childService = ChildService();
  
  ScheduleData? _scheduleData;
  List<dynamic> _children = [];
  final Map<String, List<dynamic>> _childVaccines = {};
  bool _isLoading = true;

  late AnimationController _entryController;
  late Animation<double> _fadeAnim;
  late Animation<Offset> _slideAnim;

  @override
  void initState() {
    super.initState();
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
    _loadAllVaccinations();
  }

  @override
  void dispose() {
    _entryController.dispose();
    super.dispose();
  }

  Future<void> _loadAllVaccinations() async {
    setState(() => _isLoading = true);
    
    final scheduleFuture = _appointmentService.getMySchedule();
    final childrenFuture = _childService.getMyChildren();
    
    final results = await Future.wait([scheduleFuture, childrenFuture]);
    
    _scheduleData = results[0] as ScheduleData?;
    _children = results[1] as List<dynamic>;
    
    for (var child in _children) {
      final childId = child['_id'];
      final vaccines = await _appointmentService.getChildVaccinations(childId);
      _childVaccines[childId] = vaccines;
    }

    setState(() => _isLoading = false);
    _entryController.forward();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F5),
      body: _isLoading
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const CircularProgressIndicator(color: Color(0xFF6D4C41)),
                  const SizedBox(height: 16),
                  Text('Loading vaccinations...', style: TextStyle(color: Colors.grey.shade600)),
                ],
              ),
            )
          : FadeTransition(
              opacity: _fadeAnim,
              child: SlideTransition(
                position: _slideAnim,
                child: RefreshIndicator(
                  color: const Color(0xFF6D4C41),
                  onRefresh: _loadAllVaccinations,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildHeroCard(),
                        const SizedBox(height: 28),
                        _buildUpcomingSection(),
                        const SizedBox(height: 28),
                        _buildHistorySection(),
                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildHeroCard() {
    int upcomingCount = 0;
    if (_scheduleData != null) {
      upcomingCount += _scheduleData!.vaccines.where((v) => v.status == 'SCHEDULED').length;
    }
    _childVaccines.forEach((_, list) {
      upcomingCount += list.where((v) => v['status'] == 'SCHEDULED').length;
    });

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(28),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF6D4C41), Color(0xFF8D6E63)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(28),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF6D4C41).withOpacity(0.35),
            blurRadius: 24,
            offset: const Offset(0, 10),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.shield_outlined, color: Colors.white, size: 36),
          ),
          const SizedBox(height: 20),
          const Text(
            'Immunity Tracker',
            style: TextStyle(
              color: Colors.white,
              fontSize: 28,
              fontWeight: FontWeight.bold,
              letterSpacing: -0.5,
            ),
          ),
          const SizedBox(height: 10),
          Text(
            'You have $upcomingCount upcoming ${upcomingCount == 1 ? 'vaccination' : 'vaccinations'} for you and your family.',
            style: TextStyle(
              color: Colors.white.withOpacity(0.92),
              fontSize: 15,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildUpcomingSection() {
    final List<Widget> upcomingCards = [];
    final List<Widget> missedCards = [];

    // Maternal
    if (_scheduleData != null) {
      final maternalUpcoming = _scheduleData!.vaccines.where((v) => v.status == 'SCHEDULED').toList();
      for (var v in maternalUpcoming) {
        upcomingCards.add(_buildVaccineCard(
          v.vaccineName,
          'Maternal Care • Dose #${v.doseNumber}',
          v.givenDate,
          const Color(0xFF6D4C41),
          'YOU',
        ));
      }

      // Check for missed maternal vaccines (scheduled date in the past)
      final maternalMissed = _scheduleData!.vaccines.where((v) => v.status == 'SCHEDULED' && v.givenDate.isBefore(DateTime.now().subtract(const Duration(days: 1)))).toList();
       for (var v in maternalMissed) {
        missedCards.add(_buildVaccineCard(
          v.vaccineName,
          'Maternal Care • Dose #${v.doseNumber}',
          v.givenDate,
          const Color(0xFFEF5350),
          'MISSED',
        ));
      }
    }

    // Child
    for (var child in _children) {
      final vaccines = _childVaccines[child['_id']] ?? [];
      
      // Upcoming
      final childUpcoming = vaccines.where((v) => v['status'] == 'SCHEDULED').toList();
      for (var v in childUpcoming) {
        upcomingCards.add(_buildVaccineCard(
          v['vaccineId']?['name'] ?? 'Unknown Vaccine',
          '${child['name']} • Dose #${v['doseNumber'] ?? 1}',
          DateTime.parse(v['scheduledDate']),
          const Color(0xFF42A5F5),
          child['name'].toString().toUpperCase().substring(0, child['name'].toString().length > 5 ? 5 : child['name'].toString().length),
        ));
      }

      // Missed
      final childMissed = vaccines.where((v) => v['status'] == 'MISSED').toList();
      for (var v in childMissed) {
        missedCards.add(_buildVaccineCard(
          v['vaccineId']?['name'] ?? 'Unknown Vaccine',
          '${child['name']} • Dose #${v['doseNumber'] ?? 1}',
          DateTime.parse(v['scheduledDate']),
          const Color(0xFFEF5350),
          'MISSED',
        ));
      }
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (missedCards.isNotEmpty) ...[
          _buildSectionTitle('Missed Vaccinations'),
          const SizedBox(height: 16),
          ...missedCards,
          const SizedBox(height: 24),
        ],
        if (upcomingCards.isNotEmpty) ...[
          _buildSectionTitle('Upcoming Vaccinations'),
          const SizedBox(height: 16),
          ...upcomingCards,
        ],
        if (missedCards.isEmpty && upcomingCards.isEmpty)
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 40),
              child: Column(
                children: [
                  Icon(Icons.check_circle_outline, size: 80, color: Colors.grey.shade400),
                  const SizedBox(height: 16),
                  Text(
                    'No upcoming or missed vaccinations',
                    style: TextStyle(fontSize: 16, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildHistorySection() {
    final List<Widget> historyCards = [];

    // Maternal History
    if (_scheduleData != null) {
      final maternalHistory = _scheduleData!.vaccines.where((v) => v.status == 'GIVEN').toList();
      for (var v in maternalHistory) {
        historyCards.add(_buildHistoryItem(
          v.vaccineName,
          'Maternal Care • Dose #${v.doseNumber}',
          v.givenDate,
          Colors.green,
        ));
      }
    }

    // Child History
    for (var child in _children) {
      final vaccines = _childVaccines[child['_id']] ?? [];
      final childHistory = vaccines.where((v) => v['status'] == 'ADMINISTERED').toList();
      for (var v in childHistory) {
        historyCards.add(_buildHistoryItem(
          v['vaccineId']?['name'] ?? 'Unknown Vaccine',
          '${child['name']} • Dose #${v['doseNumber'] ?? 1}',
          DateTime.parse(v['scheduledDate']),
          Colors.green,
        ));
      }
    }

    if (historyCards.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSectionTitle('Completed Vaccinations'),
        const SizedBox(height: 16),
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.05),
                blurRadius: 16,
                offset: const Offset(0, 6),
              ),
            ],
          ),
          child: Column(
            children: historyCards,
          ),
        ),
      ],
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: Color(0xFF3E2723),
        letterSpacing: -0.3,
      ),
    );
  }

  Widget _buildVaccineCard(String name, String subtitle, DateTime date, Color color, String badgeText) {
    return _PressableCard(
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
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
          border: Border.all(color: color.withOpacity(0.12)),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: color.withOpacity(0.12),
                borderRadius: BorderRadius.circular(18),
              ),
              child: Icon(Icons.vaccines, color: color, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          name,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 17,
                            height: 1.2,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: color.withOpacity(0.1),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          badgeText,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: color,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    subtitle,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey.shade600,
                      height: 1.3,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 16, color: color),
                      const SizedBox(width: 6),
                      Text(
                        DateFormat('MMMM d, yyyy').format(date),
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: color,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryItem(String name, String subtitle, DateTime date, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(8),
            decoration: BoxDecoration(
              color: color.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(Icons.check_circle, color: color, size: 22),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 15,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 13,
                    color: Colors.grey.shade600,
                  ),
                ),
              ],
            ),
          ),
          Text(
            DateFormat('MMM d').format(date),
            style: TextStyle(
              fontSize: 13,
              color: Colors.grey.shade500,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
  
}

// ─────────────────────────────────────────────────────────────────────────────
// Pressable card with scale animation
// ─────────────────────────────────────────────────────────────────────────────
class _PressableCard extends StatefulWidget {
  final Widget child;
  const _PressableCard({required this.child});

  @override
  State<_PressableCard> createState() => _PressableCardState();
}

class _PressableCardState extends State<_PressableCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) => _controller.reverse(),
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(
          scale: _scale.value,
          child: child,
        ),
        child: widget.child,
      ),
    );
  }
}
