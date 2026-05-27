import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../screens/dashboard_screen.dart';
import '../../appointments/screens/appointments_screen.dart';
import '../../child_growth/screens/child_growth_screen.dart';
import '../../recommendations/screens/recommendations_screen.dart';
import '../../profile/screens/profile_screen.dart';

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key});

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    DashboardScreen(),
    AppointmentsScreen(),
    ChildGrowthScreen(),
    RecommendationsScreen(),
    ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 20,
              offset: const Offset(0, -4),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: BottomNavigationBar(
              currentIndex: _currentIndex,
              onTap: (index) {
                setState(() {
                  _currentIndex = index;
                });
              },
              type: BottomNavigationBarType.fixed,
              backgroundColor: Colors.transparent,
              elevation: 0,
              selectedItemColor: AppColors.primary,
              unselectedItemColor: Colors.grey.shade500,
              selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
              items: [
                BottomNavigationBarItem(
                  icon: const Icon(Icons.home_outlined),
                  activeIcon: const Icon(Icons.home_rounded),
                  label: lang.isAmharic ? 'መነሻ' : 'Home',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.calendar_month_outlined),
                  activeIcon: const Icon(Icons.calendar_month_rounded),
                  label: lang.isAmharic ? 'ቀጠሮዎች' : 'Appointments',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.child_care_outlined),
                  activeIcon: const Icon(Icons.child_care_rounded),
                  label: lang.isAmharic ? 'ዕድገት' : 'Growth',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.lightbulb_outlined),
                  activeIcon: const Icon(Icons.lightbulb_rounded),
                  label: lang.isAmharic ? 'ምከርዎች' : 'Recommendations',
                ),
                BottomNavigationBarItem(
                  icon: const Icon(Icons.person_outline_rounded),
                  activeIcon: const Icon(Icons.person_rounded),
                  label: lang.isAmharic ? 'መገለጫ' : 'Profile',
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
