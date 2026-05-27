import 'package:flutter/material.dart';
import '../features/auth/screens/splash_screen.dart';
import '../features/auth/screens/landing_screen.dart';
import '../features/auth/screens/login_screen.dart';
import '../features/dashboard/screens/main_navigation_screen.dart';
import '../features/dashboard/screens/dashboard_screen.dart';
import '../features/appointments/screens/appointments_screen.dart';
import '../features/vaccination/screens/vaccination_screen.dart';
import '../features/child_growth/screens/child_growth_screen.dart';
import '../features/danger_signs/screens/danger_signs_screen.dart';
import '../features/referrals/screens/referrals_screen.dart';
import '../features/recommendations/screens/recommendations_screen.dart';
import '../features/profile/screens/profile_screen.dart';
import '../features/profile/screens/edit_profile_screen.dart';

class AppRoutes {
  static const String splash           = '/';
  static const String landing          = '/landing';
  static const String login            = '/login';
  static const String home             = '/home';
  static const String dashboard        = '/dashboard';
  static const String motherDashboard  = '/mother-dashboard';
  static const String appointments     = '/appointments';
  static const String vaccination      = '/vaccination';
  static const String childGrowth      = '/child-growth';
  static const String dangerSigns      = '/danger-signs';
  static const String referrals        = '/referrals';
  static const String recommendations  = '/recommendations';
  static const String profile          = '/profile';
  static const String editProfile      = '/edit-profile';

  static Map<String, WidgetBuilder> routes = {
    splash:          (context) => const SplashScreen(),
    landing:         (context) => const LandingScreen(),
    login:           (context) => const LoginScreen(),
    home:            (context) => const MainNavigationScreen(),
    dashboard:       (context) => const DashboardScreen(),
    motherDashboard: (context) => const DashboardScreen(),
    appointments:    (context) => const AppointmentsScreen(),
    vaccination:     (context) => const VaccinationScreen(),
    childGrowth:     (context) => const ChildGrowthScreen(),
    dangerSigns:     (context) => const DangerSignsScreen(),
    referrals:       (context) => const ReferralsScreen(),
    recommendations: (context) => const RecommendationsScreen(),
    profile:         (context) => const ProfileScreen(),
    editProfile:     (context) => const EditProfileScreen(),
  };
}
