import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../../core/widgets/app_bar_widget.dart';
import '../widgets/profile_header.dart';
import '../services/profile_service.dart';
import '../../../models/user_model.dart';
import '../../../routes/app_routes.dart';
import '../../auth/services/auth_api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final ProfileService _profileService = ProfileService();
  final AuthApiService _authApiService = AuthApiService();
  UserModel? _user;
  bool _isLoading = true;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() {
      _isLoading = true;
    });
    final user = await _profileService.getUserProfile();
    setState(() {
      _user = user;
      _isLoading = false;
      _errorMessage = user == null ? 'Unable to load profile.' : null;
    });
  }

  Future<void> _handleLogout() async {
    await _authApiService.logout();
    if (mounted) {
      Navigator.pushNamedAndRemoveUntil(context, AppRoutes.login, (route) => false);
    }
  }

  Future<void> _navigateToEditProfile() async {
    final result = await Navigator.pushNamed(context, '/edit-profile', arguments: _user);
    if (result == true) {
      _loadProfile();
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FA),
      appBar: AppBarWidget(
        title: AppTranslations.get('my_profile', lang.isAmharic),
        actions: [
          Container(
            margin: const EdgeInsets.only(right: 8),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.2),
              shape: BoxShape.circle,
            ),
            child: IconButton(
              icon: const Icon(Icons.edit_outlined, color: AppColors.textLight),
              onPressed: _navigateToEditProfile,
            ),
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: Text(AppTranslations.get('loading', lang.isAmharic)))
          : RefreshIndicator(
              onRefresh: _loadProfile,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(20),
                child: Column(
                  children: [
                    ProfileHeader(
                      user: _user,
                      onEdit: _navigateToEditProfile,
                    ),
                    const SizedBox(height: 32),
                    _buildProfileSection(
                      context,
                      lang.isAmharic ? 'የግል ዝርዝሮች' : 'Personal Details',
                      [
                        _buildProfileItem(Icons.person_outline, lang.isAmharic ? 'ሙሉ ስም' : 'Full Name', _user?.name ?? 'N/A'),
                        _buildProfileItem(Icons.email_outlined, lang.isAmharic ? 'ኢሜይል አድራሻ' : 'Email Address', _user?.email ?? 'N/A'),
                        _buildProfileItem(Icons.phone_outlined, lang.isAmharic ? 'ስልክ ቁጥር' : 'Phone Number', _user?.phoneNumber ?? 'N/A'),
                        _buildProfileItem(Icons.badge_outlined, lang.isAmharic ? 'የተጠቃሚ ሚና' : 'User Role', _user?.role ?? 'N/A'),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _buildProfileSection(
                      context,
                      lang.isAmharic ? 'የቦታ መረጃ' : 'Location Information',
                      [
                        _buildProfileItem(Icons.map_outlined, lang.isAmharic ? 'ክልል' : 'Region', _user?.regionId ?? 'N/A'),
                        _buildProfileItem(Icons.location_city_outlined, lang.isAmharic ? 'ወረዳ' : 'Wereda', _user?.woredaId ?? 'N/A'),
                      ],
                    ),
                    const SizedBox(height: 20),
                    _buildProfileSection(
                      context,
                      lang.isAmharic ? 'የመለያ ታሪክ' : 'Account History',
                      [
                        _buildProfileItem(Icons.update, lang.isAmharic ? 'በመጨረሻ የተሻሻለ' : 'Last Updated', _formatDate(_user?.updatedAt)),
                        _buildProfileItem(Icons.calendar_today_outlined, lang.isAmharic ? 'የተቀላቀለበት ቀን' : 'Joined Date', _formatDate(_user?.createdAt)),
                      ],
                    ),
                    const SizedBox(height: 40),
                    _buildLogoutButton(lang.isAmharic),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),
    );
  }

  static String _formatDate(DateTime? date) {
    if (date == null) return 'N/A';
    final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${date.day} ${months[date.month - 1]}, ${date.year}';
  }

  Widget _buildProfileSection(BuildContext context, String title, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 12),
          child: Text(
            title,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: AppColors.textSecondary.withOpacity(0.7),
              letterSpacing: 1.2,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.03),
                blurRadius: 15,
                offset: const Offset(0, 5),
              ),
            ],
          ),
          child: Column(
            children: List.generate(items.length, (index) {
              return Column(
                children: [
                  items[index],
                  if (index < items.length - 1)
                    Divider(height: 1, color: Colors.grey.withOpacity(0.1), indent: 56),
                ],
              );
            }),
          ),
        ),
      ],
    );
  }

  Widget _buildProfileItem(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppColors.primary.withOpacity(0.05),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 22, color: AppColors.primary),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: AppColors.text,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLogoutButton(bool isAmharic) {
    return Container(
      width: double.infinity,
      height: 56,
      child: OutlinedButton.icon(
        onPressed: _handleLogout,
        icon: const Icon(Icons.logout_rounded, size: 20),
        label: Text(
          isAmharic ? 'መለያውን ውጣ' : 'Logout Account',
          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
        style: OutlinedButton.styleFrom(
          foregroundColor: AppColors.error,
          side: const BorderSide(color: AppColors.error, width: 1.5),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}
