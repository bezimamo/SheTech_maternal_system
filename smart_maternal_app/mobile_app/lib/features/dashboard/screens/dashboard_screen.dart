import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../../routes/app_routes.dart';
import '../../../models/user_model.dart';
import '../../profile/services/profile_service.dart';
import 'package:intl/intl.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final ProfileService _profileService = ProfileService();
  UserModel? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    final user = await _profileService.getUserProfile();
    setState(() {
      _user = user;
      _isLoading = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Scaffold(
      backgroundColor: const Color(0xFFFBFBFB),
      body: _isLoading
          ? Center(child: Text(AppTranslations.get('loading', lang.isAmharic)))
          : RefreshIndicator(
              onRefresh: _loadProfile,
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
            // Background Image (local Ethiopian mother-child illustration)
            Image.asset(
              'assets/images/ethiopian_mother_child.png',
              fit: BoxFit.cover,
              alignment: Alignment.topCenter,
            ),
            // Gradient Overlay
            Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [
                    AppColors.secondaryDark.withOpacity(0.85),
                    AppColors.primaryDark.withOpacity(0.4),
                    Colors.transparent,
                  ],
                  begin: Alignment.bottomCenter,
                  end: Alignment.topCenter,
                ),
              ),
            ),
            // Content
            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    AppTranslations.get('hello', isAmharic),
                    style: TextStyle(color: Colors.white.withOpacity(0.8), fontSize: 18, fontWeight: FontWeight.w400),
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
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.verified, color: Colors.white, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          AppTranslations.get('verified_mother_profile', isAmharic),
                          style: TextStyle(color: Colors.white.withOpacity(0.9), fontSize: 11, fontWeight: FontWeight.bold),
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
            fontSize: 22,
            fontWeight: FontWeight.bold,
            color: AppColors.text,
            letterSpacing: -0.5,
          ),
        ),
      ],
    );
  }

  Widget _buildProgressTrackingCard(bool isAmharic) {
    final week = _user?.pregnancyInfo?.currentWeek ?? 0;
    final nextVisit = _user?.pregnancyInfo?.nextAppointment;
    final dueDate = _user?.pregnancyInfo?.dueDate;
    final progress = week / 40.0;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: AppColors.shadow.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              _buildMetricItem(AppTranslations.get('week', isAmharic), '$week', Icons.pregnant_woman, AppColors.primary),
              const Spacer(),
              _buildMetricItem(
                AppTranslations.get('due_date', isAmharic), 
                dueDate != null ? DateFormat('MMM d').format(dueDate) : AppTranslations.get('tbd', isAmharic), 
                Icons.child_care, 
                AppColors.warning
              ),
            ],
          ),
          const SizedBox(height: 24),
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
                widthFactor: progress > 1.0 ? 1.0 : progress,
                child: Container(
                  height: 12,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                    borderRadius: BorderRadius.circular(6),
                    boxShadow: [
                      BoxShadow(color: AppColors.primary.withOpacity(0.3), blurRadius: 6, offset: const Offset(0, 2)),
                    ],
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 20),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: AppColors.info.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.event_available, color: AppColors.info, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      AppTranslations.get('next_appointment', isAmharic), 
                      style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)
                    ),
                    Text(
                      nextVisit != null ? DateFormat('EEEE, MMMM d').format(nextVisit) : AppTranslations.get('schedule_pending', isAmharic),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricItem(String label, String value, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
          child: Icon(icon, color: color, size: 20),
        ),
        const SizedBox(width: 12),
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11, fontWeight: FontWeight.bold)),
            Text(value, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.text)),
          ],
        ),
      ],
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
        _buildActionCard(Icons.calendar_month_rounded, AppTranslations.get('appointments', isAmharic), AppColors.info, AppRoutes.appointments),
        _buildActionCard(Icons.child_care_rounded, AppTranslations.get('child_growth', isAmharic), AppColors.success, AppRoutes.childGrowth),
        _buildActionCard(Icons.vaccines_rounded, AppTranslations.get('vaccinations', isAmharic), AppColors.warning, AppRoutes.vaccination),
        _buildActionCard(Icons.warning_amber_rounded, AppTranslations.get('danger_signs', isAmharic), AppColors.error, AppRoutes.dangerSigns),
        _buildActionCard(Icons.local_hospital_rounded, AppTranslations.get('referrals', isAmharic), AppColors.primary, AppRoutes.referrals),
        _buildActionCard(Icons.person_rounded, AppTranslations.get('my_profile', isAmharic), AppColors.primaryDark, AppRoutes.profile),
      ],
    );
  }

  Widget _buildActionCard(IconData icon, String title, Color color, String route) {
    return _PressableCard(
      child: GestureDetector(
        onTap: () => Navigator.pushNamed(context, route),
        child: Container(
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(color: AppColors.shadow.withOpacity(0.04), blurRadius: 12, offset: const Offset(0, 6)),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(15),
                ),
                child: Icon(icon, color: color, size: 24),
              ),
              const Spacer(),
              Flexible(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.text),
                  overflow: TextOverflow.ellipsis,
                  maxLines: 2,
                ),
              ),
            ],
          ),
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
          colors: [AppColors.primary.withOpacity(0.12), AppColors.primary.withOpacity(0.04)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppColors.primary.withOpacity(0.15)),
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
                style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 15)
              ),
            ],
          ),
          const SizedBox(height: 16),
          Text(
            AppTranslations.get('health_tip_default', isAmharic),
            style: const TextStyle(color: AppColors.textSecondary, fontSize: 15, height: 1.6),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pressable card with scale animation for dashboard cards
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
    _scale = Tween<double>(begin: 1.0, end: 0.95).animate(
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
