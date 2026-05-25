import 'package:flutter/material.dart';
import 'dart:ui';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/constants/app_text_styles.dart';
import '../../../core/services/language_service.dart';
import '../widgets/quick_action_card.dart';
import '../../../routes/app_routes.dart';
import '../../../models/user_model.dart';
import '../../../models/growth_model.dart';
import '../../profile/services/profile_service.dart';
import '../../child_growth/services/child_service.dart';
import '../../child_growth/services/growth_service.dart';
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
            // Background Image
            Image.network(
              'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1453&auto=format&fit=crop',
              fit: BoxFit.cover,
            ),
            // Gradient Overlay
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
        borderRadius: BorderRadius.circular(30),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 10)),
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              _buildMetricItem(AppTranslations.get('week', isAmharic), '$week', Icons.pregnant_woman, Colors.purple),
              const Spacer(),
              _buildMetricItem(
                AppTranslations.get('due_date', isAmharic), 
                dueDate != null ? DateFormat('MMM d').format(dueDate) : AppTranslations.get('tbd', isAmharic), 
                Icons.child_care, 
                Colors.orange
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
                    gradient: const LinearGradient(colors: [AppColors.primary, Color(0xFFFFA0B4)]),
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
                decoration: BoxDecoration(color: Colors.blue.withOpacity(0.1), shape: BoxShape.circle),
                child: const Icon(Icons.event_available, color: Colors.blue, size: 20),
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
        _buildActionCard(Icons.calendar_month_rounded, AppTranslations.get('appointments', isAmharic), Colors.blue, AppRoutes.appointments),
        _buildActionCard(Icons.child_care_rounded, AppTranslations.get('child_growth', isAmharic), Colors.green, AppRoutes.childGrowth),
        _buildActionCard(Icons.vaccines_rounded, AppTranslations.get('vaccinations', isAmharic), Colors.orange, AppRoutes.vaccination),
        _buildActionCard(Icons.warning_amber_rounded, AppTranslations.get('danger_signs', isAmharic), Colors.red, AppRoutes.dangerSigns),
        _buildActionCard(Icons.local_hospital_rounded, AppTranslations.get('referrals', isAmharic), Colors.purple, AppRoutes.referrals),
        _buildActionCard(Icons.person_rounded, AppTranslations.get('my_profile', isAmharic), Colors.brown, AppRoutes.profile),
      ],
    );
  }

  Widget _buildActionCard(IconData icon, String title, Color color, String route) {
    return GestureDetector(
      onTap: () => Navigator.pushNamed(context, route),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: [
            BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4)),
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
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.text),
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
          colors: [AppColors.primary.withOpacity(0.1), AppColors.primary.withOpacity(0.05)],
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
