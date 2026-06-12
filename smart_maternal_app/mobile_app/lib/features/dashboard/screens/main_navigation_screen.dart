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
import '../../vaccination/screens/vaccination_screen.dart';
import '../../danger_signs/screens/danger_signs_screen.dart';
import '../../referrals/screens/referrals_screen.dart';

// Tab index constants for the 5 visible bottom nav tabs
const int kTabHome = 0;
const int kTabAppointments = 1;
const int kTabGrowth = 2;
const int kTabRecommendations = 3;
const int kTabProfile = 4;

// Hidden tabs (no bottom nav item, navigated to via changeTab)
const int kTabVaccination = 5;
const int kTabDangerSigns = 6;
const int kTabReferrals = 7;

class MainNavigationScreen extends StatefulWidget {
  const MainNavigationScreen({super.key, this.initialIndex = 0});

  final int initialIndex;

  /// Get the nearest [_MainNavigationScreenState] from the widget tree.
  static _MainNavigationScreenState? of(BuildContext context) {
    return context.findAncestorStateOfType<_MainNavigationScreenState>();
  }

  @override
  State<MainNavigationScreen> createState() => _MainNavigationScreenState();
}

class _MainNavigationScreenState extends State<MainNavigationScreen> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
  }

  /// Switch to any tab by index. Hidden tabs (5–7) hide the bottom nav.
  void changeTab(int index) {
    if (mounted) {
      setState(() {
        _currentIndex = index;
      });
    }
  }

  static const List<Widget> _screens = [
    DashboardScreen(),      // 0
    AppointmentsScreen(),   // 1
    ChildGrowthScreen(),    // 2
    RecommendationsScreen(), // 3
    ProfileScreen(),        // 4
    VaccinationScreen(),    // 5 – hidden from bottom nav
    DangerSignsScreen(),    // 6 – hidden from bottom nav
    ReferralsScreen(),      // 7 – hidden from bottom nav
  ];

  /// Whether the current tab is one of the 5 visible bottom nav tabs.
  bool get _showBottomNav => _currentIndex < 5;

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();

    return Scaffold(
      body: PopScope(
        // Allow pop only when on a visible tab (the OS back button should do nothing
        // meaningful inside the shell — just go back to home tab if on a hidden tab).
        canPop: false,
        onPopInvokedWithResult: (didPop, _) {
          if (_currentIndex >= 5) {
            // Hidden tab → go back to Home
            setState(() => _currentIndex = kTabHome);
          }
          // On visible tabs, do nothing (let the user use the nav bar)
        },
        child: IndexedStack(
          index: _currentIndex,
          children: _screens,
        ),
      ),
      bottomNavigationBar: _showBottomNav
          ? Container(
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
                    selectedLabelStyle:
                        const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                    unselectedLabelStyle:
                        const TextStyle(fontWeight: FontWeight.w500, fontSize: 11),
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
            )
          : null,
    );
  }
}
