import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../widgets/growth_chart.dart';
import '../services/child_service.dart';
import '../services/growth_service.dart';
import '../../../models/growth_model.dart';
import '../../../features/profile/services/profile_service.dart';
import 'package:intl/intl.dart';

class ChildGrowthScreen extends StatefulWidget {
  const ChildGrowthScreen({super.key});

  @override
  State<ChildGrowthScreen> createState() => _ChildGrowthScreenState();
}

class _ChildGrowthScreenState extends State<ChildGrowthScreen>
    with SingleTickerProviderStateMixin {
  final ChildService _childService = ChildService();
  final GrowthService _growthService = GrowthService();
  final ProfileService _profileService = ProfileService();

  List<dynamic> _children = [];
  dynamic _selectedChild;
  List<GrowthModel> _growthRecords = [];
  GrowthModel? _latest;
  bool _isLoading = true;
  bool _childLoading = false;
  String? _fetchError;

  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadChildren();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadChildren() async {
    setState(() { _isLoading = true; _fetchError = null; });
    try {
      // Get the mother's own ID from the profile so we can use the
      // /children/mother/:motherId fallback if /my-children returns empty.
      final profile = await _profileService.getUserProfile();
      final motherId = profile?.pregnancyInfo?.motherId ?? '';

      final children = await _childService.getMyChildren(
        fallbackMotherId: motherId,
      );

      if (children.isNotEmpty) {
        setState(() {
          _children = children;
          _selectedChild = children[0];
        });
        await _loadChildData(children[0]['_id']?.toString() ?? '');
      } else {
        setState(() => _fetchError = 'No children found for your account.');
      }
    } catch (e) {
      debugPrint('Error loading children: $e');
      setState(() => _fetchError = 'Failed to load children: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadChildData(String childId) async {
    if (childId.isEmpty) return;
    setState(() => _childLoading = true);
    try {
      // Fetch all records first — they are the source of truth
      final records = await _growthService.getGrowthRecords(childId);

      // Derive latest from the list (already sorted oldest→newest by service)
      // so last element is the most recent. Also try the dedicated endpoint
      // as a cross-check, but never block on it.
      GrowthModel? latest;
      if (records.isNotEmpty) {
        latest = records.last; // last = newest after oldest→newest sort
      } else {
        // No records in list — try the dedicated /latest endpoint
        latest = await _growthService.getLatestGrowthRecord(childId);
      }

      setState(() {
        _growthRecords = records;
        _latest = latest;
      });
    } catch (e) {
      debugPrint('Error loading child data: $e');
      setState(() {
        _latest = null;
        _growthRecords = [];
      });
    } finally {
      setState(() => _childLoading = false);
    }
  }

  String _calcAge(String birthDateStr) {
    final birth = DateTime.tryParse(birthDateStr) ?? DateTime.now();
    final diff = DateTime.now().difference(birth);
    final months = (diff.inDays / 30.44).floor();
    if (months < 1) return '${diff.inDays} days';
    if (months < 24) return '$months months';
    final y = (months / 12).floor();
    final m = months % 12;
    return m > 0 ? '${y}y ${m}m' : '${y}y';
  }

  // ── Status helpers ──────────────────────────────────────────────────────────
  Color _statusColor(String status) {
    switch (status) {
      case 'SEVERE_UNDERWEIGHT':
      case 'SEVERE_STUNTING':
      case 'SEVERE_WASTING':
      case 'RED':
        return Colors.red;
      case 'MODERATE_UNDERWEIGHT':
      case 'MODERATE_STUNTING':
      case 'MODERATE_WASTING':
      case 'YELLOW':
        return Colors.orange;
      case 'OVERWEIGHT':
      case 'OBESE':
        return Colors.amber;
      case 'NORMAL':
      case 'GREEN':
        return Colors.green;
      case 'TALL':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  Color _muacColor(String s) {
    switch (s) {
      case 'RED':    return Colors.red;
      case 'YELLOW': return Colors.orange;
      default:       return Colors.green; // GREEN
    }
  }

  String _muacLabel(String s) {
    switch (s) {
      case 'RED':    return 'Severe SAM';
      case 'YELLOW': return 'Moderate MAM';
      default:       return 'Normal';
    }
  }

  String _statusLabel(String status) =>
      status.replaceAll('_', ' ').toLowerCase().split(' ')
          .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
          .join(' ');

  // ── Build ───────────────────────────────────────────────────────────────────
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
          : _children.isEmpty
              ? _buildEmpty()
              : NestedScrollView(
                  headerSliverBuilder: (_, __) => [_buildSliverHeader()],
                  body: _childLoading
                      ? const Center(child: CircularProgressIndicator(color: AppColors.primary))
                      : TabBarView(
                          controller: _tabController,
                          children: [
                            _buildOverviewTab(),
                            _buildHistoryTab(),
                          ],
                        ),
                ),
    );
  }

  // ── Sliver header ───────────────────────────────────────────────────────────
  Widget _buildSliverHeader() {
    return SliverAppBar(
      expandedHeight: _children.length > 1 ? 280 : 240,
      pinned: true,
      floating: false,
      backgroundColor: AppColors.primary,
      elevation: 0,
      leading: IconButton(
        icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
        onPressed: () => Navigator.pop(context),
      ),
      actions: [
        IconButton(
          icon: const Icon(Icons.refresh, color: Colors.white),
          onPressed: _loadChildren,
        ),
      ],
      flexibleSpace: FlexibleSpaceBar(
        background: _buildHeaderBackground(),
      ),
      bottom: TabBar(
        controller: _tabController,
        indicatorColor: Colors.white,
        indicatorWeight: 3,
        labelColor: Colors.white,
        unselectedLabelColor: Colors.white60,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
        tabs: const [
          Tab(text: 'Overview'),
          Tab(text: 'History'),
        ],
      ),
    );
  }

  Widget _buildHeaderBackground() {
    final child = _selectedChild;
    if (child == null) return const SizedBox();
    final name = child['name'] ?? '';
    final gender = child['gender'] ?? '';
    final birthDate = child['birthDate'] ?? '';
    final age = birthDate.isNotEmpty ? _calcAge(birthDate) : '—';
    final isBoy = gender.toString().toUpperCase() == 'MALE';

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [
            Color(0xFF4E342E),
            Color(0xFF6D4C41),
            Color(0xFF8D6E63),
          ],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 56, 20, 60),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Child selector chips
              if (_children.length > 1) ...[
                SizedBox(
                  height: 36,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemCount: _children.length,
                    itemBuilder: (_, i) {
                      final c = _children[i];
                      final sel = _selectedChild?['_id']?.toString() == c['_id']?.toString();
                      return GestureDetector(
                        onTap: () {
                          setState(() => _selectedChild = c);
                          _loadChildData(c['_id']?.toString() ?? '');
                        },
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          margin: const EdgeInsets.only(right: 10),
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          decoration: BoxDecoration(
                            color: sel ? Colors.white : Colors.white24,
                            borderRadius: BorderRadius.circular(18),
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            c['name'],
                            style: TextStyle(
                              color: sel ? AppColors.primary : Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
              ],
              // Child info with baby image
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Baby image placeholder
                  Container(
                    width: 90,
                    height: 90,
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withOpacity(0.4), width: 2),
                    ),
                    child: ClipOval(
                      child: Image.asset(
                        'assets/images/9_month_baby.jpg',
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return Center(
                            child: Text(
                              name.isNotEmpty ? name[0].toUpperCase() : '?',
                              style: const TextStyle(
                                fontSize: 32,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Padding(
                      padding: const EdgeInsets.only(top: 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              _headerChip(isBoy ? '👦 Boy' : '👧 Girl'),
                              const SizedBox(width: 8),
                              _headerChip('🎂 $age'),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _headerChip(String text) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: Colors.white.withOpacity(0.2),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(text, style: const TextStyle(color: Colors.white, fontSize: 12)),
  );

  // ── Overview tab ────────────────────────────────────────────────────────────
  Widget _buildOverviewTab() {
    return RefreshIndicator(
      onRefresh: _loadChildren,
      color: AppColors.primary,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildLatestMeasurements(),
            const SizedBox(height: 24),
            _buildStatusBadges(),
            const SizedBox(height: 24),
            _buildChartSection(),
            if (_latest?.recommendations != null && _latest!.recommendations!.isNotEmpty) ...[
              const SizedBox(height: 24),
              _buildRecommendations(),
            ],
            if (_latest?.needsFollowUp == true) ...[
              const SizedBox(height: 16),
              _buildFollowUpBanner(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildLatestMeasurements() {
    final w = _latest?.weight;
    final h = _latest?.height;
    final hc = _latest?.headCircumference;
    final muac = _latest?.muac;
    final date = _latest?.measurementDate;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Latest Measurements',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF212121)),
            ),
            if (date != null)
              Text(
                DateFormat('MMM d, yyyy').format(date),
                style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
              ),
          ],
        ),
        const SizedBox(height: 16),
        Row(
          children: [
            Expanded(child: _measureCard('Weight', w != null ? '${w.toStringAsFixed(1)} kg' : '—', Icons.monitor_weight_outlined, AppColors.primary)),
            const SizedBox(width: 12),
            Expanded(child: _measureCard('Height', h != null ? '${h.toStringAsFixed(0)} cm' : '—', Icons.straighten, Colors.blue)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _measureCard('Head Circ.', hc != null ? '${hc.toStringAsFixed(1)} cm' : '—', Icons.circle_outlined, Colors.purple)),
            const SizedBox(width: 12),
            Expanded(child: _muacCard(muac, _latest?.muacStatus ?? 'GREEN')),
          ],
        ),
      ],
    );
  }

  Widget _measureCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: color.withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF212121))),
                Text(label, style: const TextStyle(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
        ],
      ),
    );
  }

  /// MUAC card — background, border, icon, value text and status pill all
  /// reflect the traffic-light colour: GREEN / YELLOW / RED.
  Widget _muacCard(double? muac, String muacStatus) {
    final color = _muacColor(muacStatus);
    final label = _muacLabel(muacStatus);
    final value = muac != null ? '${muac.toStringAsFixed(1)} cm' : '—';

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.06),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.35), width: 1.5),
        boxShadow: [
          BoxShadow(color: color.withOpacity(0.08), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(Icons.straighten, color: color, size: 18),
              ),
              const Spacer(),
              // Traffic-light dot
              Container(
                width: 10,
                height: 10,
                decoration: BoxDecoration(color: color, shape: BoxShape.circle),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            'MUAC',
            style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
          ),
          const SizedBox(height: 6),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadges() {
    if (_latest == null) return const SizedBox();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'WHO Growth Status',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF212121)),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            _statusBadge('Weight', _latest!.growthStatus),
            _statusBadge('Height', _latest!.heightStatus),
            _statusBadge('Wasting', _latest!.weightStatus),
            _statusBadge('MUAC', _latest!.muacStatus),
          ],
        ),
      ],
    );
  }

  Widget _statusBadge(String category, String status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(color: color, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text(
            '$category: ${_statusLabel(status)}',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  Widget _buildChartSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Growth Chart',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF212121)),
        ),
        const SizedBox(height: 12),
        GrowthChart(records: _growthRecords),
        const SizedBox(height: 8),
        Center(
          child: Text(
            '${_growthRecords.length} measurement${_growthRecords.length == 1 ? '' : 's'} recorded',
            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
          ),
        ),
      ],
    );
  }

  Widget _buildRecommendations() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.green.withOpacity(0.08), Colors.green.withOpacity(0.03)],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.green.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Row(
            children: [
              Icon(Icons.tips_and_updates, color: Colors.green, size: 18),
              SizedBox(width: 8),
              Text('Health Worker Recommendations',
                  style: TextStyle(fontWeight: FontWeight.bold, color: Colors.green, fontSize: 14)),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _latest!.recommendations!,
            style: const TextStyle(color: Color(0xFF424242), fontSize: 14, height: 1.6),
          ),
        ],
      ),
    );
  }

  Widget _buildFollowUpBanner() {
    final followUp = _latest?.followUpDate;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.orange.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.orange.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.event_note, color: Colors.orange, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Follow-up Required',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.orange, fontSize: 14)),
                if (followUp != null)
                  Text(
                    'Scheduled: ${DateFormat('EEEE, MMMM d, yyyy').format(followUp)}',
                    style: const TextStyle(fontSize: 12, color: Color(0xFF757575)),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── History tab ─────────────────────────────────────────────────────────────
  Widget _buildHistoryTab() {
    if (_growthRecords.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.history, size: 64, color: AppColors.textSecondary.withOpacity(0.3)),
            const SizedBox(height: 16),
            const Text('No growth records yet',
                style: TextStyle(fontSize: 16, color: AppColors.textSecondary)),
          ],
        ),
      );
    }

    // Show newest first
    final sorted = [..._growthRecords]
      ..sort((a, b) => b.measurementDate.compareTo(a.measurementDate));

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 40),
      itemCount: sorted.length,
      itemBuilder: (_, i) => _buildHistoryCard(sorted[i], i == 0),
    );
  }

  Widget _buildHistoryCard(GrowthModel r, bool isLatest) {
    final wColor = _statusColor(r.growthStatus);
    final hColor = _statusColor(r.heightStatus);

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: isLatest ? Border.all(color: AppColors.primary.withOpacity(0.3), width: 1.5) : null,
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
            decoration: BoxDecoration(
              color: isLatest ? AppColors.primary.withOpacity(0.05) : Colors.grey.withOpacity(0.03),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
            ),
            child: Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: isLatest ? AppColors.primary : AppColors.textSecondary),
                const SizedBox(width: 8),
                Text(
                  DateFormat('MMMM d, yyyy').format(r.measurementDate),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: isLatest ? AppColors.primary : const Color(0xFF424242),
                  ),
                ),
                const Spacer(),
                if (isLatest)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Text('Latest', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                  ),
                Text(
                  '${r.ageMonths} months',
                  style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                ),
              ],
            ),
          ),
          // Measurements
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    _historyMetric('Weight', '${r.weight.toStringAsFixed(1)} kg', wColor),
                    const SizedBox(width: 12),
                    _historyMetric('Height', '${r.height.toStringAsFixed(0)} cm', hColor),
                    if (r.headCircumference != null) ...[
                      const SizedBox(width: 12),
                      _historyMetric('Head', '${r.headCircumference!.toStringAsFixed(1)} cm', Colors.purple),
                    ],
                  ],
                ),
                if (r.muac != null) ...[
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      _historyMetric('MUAC', '${r.muac!.toStringAsFixed(1)} cm', _muacColor(r.muacStatus)),
                      const Spacer(),
                      _miniStatusBadge(r.growthStatus),
                    ],
                  ),
                ],
                if (r.notes != null && r.notes!.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.withOpacity(0.05),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Icon(Icons.notes, size: 14, color: AppColors.textSecondary),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(r.notes!, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.5)),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _historyMetric(String label, String value, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: color.withOpacity(0.07),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
            Text(label, style: const TextStyle(fontSize: 10, color: AppColors.textSecondary)),
          ],
        ),
      ),
    );
  }

  Widget _miniStatusBadge(String status) {
    final color = _statusColor(status);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(
        _statusLabel(status),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  Widget _buildEmpty() {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: AppColors.primary,
        title: const Text('Child Growth', style: TextStyle(color: Colors.white)),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Colors.white, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.08),
                  shape: BoxShape.circle,
                ),
                child: Icon(Icons.child_care, size: 64, color: AppColors.primary.withOpacity(0.5)),
              ),
              const SizedBox(height: 24),
              const Text(
                'No Children Registered',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF212121)),
              ),
              const SizedBox(height: 12),
              const Text(
                'Your children will appear here once your health worker registers them in the system.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 14, color: AppColors.textSecondary, height: 1.6),
              ),
              if (_fetchError != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.withOpacity(0.2)),
                  ),
                  child: Text(
                    _fetchError!,
                    textAlign: TextAlign.center,
                    style: const TextStyle(fontSize: 12, color: Colors.red),
                  ),
                ),
              ],
              const SizedBox(height: 32),
              ElevatedButton.icon(
                onPressed: _loadChildren,
                icon: const Icon(Icons.refresh),
                label: const Text('Refresh'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
