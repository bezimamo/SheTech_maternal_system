import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/app_bar_widget.dart';
import '../../../models/referral_model.dart';
import '../services/referral_service.dart';
import 'referral_detail_screen.dart';
import '../../dashboard/screens/main_navigation_screen.dart';

class ReferralsScreen extends StatefulWidget {
  const ReferralsScreen({super.key});

  @override
  State<ReferralsScreen> createState() => _ReferralsScreenState();
}

class _ReferralsScreenState extends State<ReferralsScreen> {
  final ReferralService _referralService = ReferralService();
  bool _isLoading = true;
  List<ReferralModel> _activeReferrals = [];

  @override
  void initState() {
    super.initState();
    _loadActiveReferrals();
  }

  Future<void> _loadActiveReferrals() async {
    final referrals = await _referralService.getActiveReferralsForMother();
    if (mounted) {
      setState(() {
        _activeReferrals = referrals;
        _isLoading = false;
      });
    }
  }

  void _viewReferralDetail(ReferralModel referral) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ReferralDetailScreen(referral: referral),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F5),
      appBar: AppBarWidget(
        title: 'Referrals',
        onBackPressed: () {
          final mainNav = MainNavigationScreen.of(context);
          if (mainNav != null) {
            mainNav.changeTab(kTabHome);
          } else {
            Navigator.of(context).maybePop();
          }
        },
      ),
      body: _isLoading
          ? const Center(
              child: CircularProgressIndicator(color: AppColors.primary),
            )
          : RefreshIndicator(
              onRefresh: _loadActiveReferrals,
              child: _activeReferrals.isNotEmpty
                  ? ListView.separated(
                      padding: const EdgeInsets.all(20),
                      itemCount: _activeReferrals.length,
                      separatorBuilder: (context, index) => const SizedBox(height: 16),
                      itemBuilder: (context, index) {
                        return _buildActiveReferralCard(_activeReferrals[index]);
                      },
                    )
                  : ListView(
                      padding: const EdgeInsets.all(20),
                      children: [
                        Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                              Icon(
                                Icons.event_available_outlined,
                                size: 80,
                                color: AppColors.textSecondary.withOpacity(0.5),
                              ),
                              const SizedBox(height: 24),
                              Text(
                                'No Active Referrals',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'You don\'t have any active referrals at the moment',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 14,
                                  color: AppColors.textSecondary.withOpacity(0.7),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
            ),
    );
  }

  Widget _buildActiveReferralCard(ReferralModel referral) {
    final fromHospitalName = referral.fromHospital is Map
        ? referral.fromHospital['name'] ?? 'Unknown Facility'
        : 'Unknown Facility';
    
    return GestureDetector(
      onTap: () => _viewReferralDetail(referral),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: [
            BoxShadow(
              color: AppColors.primary.withOpacity(0.1),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        referral.referralCode,
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        fromHospitalName,
                        style: TextStyle(
                          fontSize: 13,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  decoration: BoxDecoration(
                    color: _getStatusColor(referral.status).withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    referral.status,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: _getStatusColor(referral.status),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              'Reason',
              style: TextStyle(
                fontSize: 12,
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              referral.reasonForReferral,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w500,
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Icon(
                  Icons.calendar_today_outlined,
                  size: 16,
                  color: AppColors.textSecondary,
                ),
                const SizedBox(width: 6),
                Text(
                  'Created: ${_formatDate(referral.createdAt)}',
                  style: TextStyle(
                    fontSize: 13,
                    color: AppColors.textSecondary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 14),
              decoration: BoxDecoration(
                color: AppColors.primary.withOpacity(0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.qr_code_outlined,
                    size: 20,
                    color: AppColors.primary,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    'View QR Code & Details',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  Color _getStatusColor(String status) {
    switch (status.toUpperCase()) {
      case 'DRAFT':
        return Colors.grey;
      case 'PENDING':
        return AppColors.warning;
      case 'ACCEPTED':
        return AppColors.success;
      case 'CHECKED_IN':
      case 'ARRIVED':
        return AppColors.primary;
      case 'COMPLETED':
        return AppColors.success;
      case 'REJECTED':
      case 'EXPIRED':
        return AppColors.error;
      default:
        return Colors.grey;
    }
  }
}
