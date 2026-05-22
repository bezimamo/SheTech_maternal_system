import 'package:flutter/material.dart';

/// Warm brown healthcare palette for the appointments hub.
class AppointmentTheme {
  static const Color brown = Color(0xFF8D6E63);
  static const Color brownDark = Color(0xFF5D4037);
  static const Color brownLight = Color(0xFFD7CCC8);
  static const Color brownPale = Color(0xFFEFEBE9);
  static const Color background = Color(0xFFF8F6F4);

  static const Color administered = Color(0xFF4CAF50);
  static const Color scheduled = Color(0xFF2196F3);
  static const Color missed = Color(0xFFE53935);
  static const Color completed = Color(0xFF43A047);

  static BoxDecoration cardDecoration = BoxDecoration(
    color: Colors.white,
    borderRadius: BorderRadius.circular(16),
    boxShadow: [
      BoxShadow(
        color: Colors.black.withOpacity(0.06),
        blurRadius: 12,
        offset: const Offset(0, 4),
      ),
    ],
  );

  static Color statusColor(String status) {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
      case 'GIVEN':
      case 'ADMINISTERED':
        return administered;
      case 'SCHEDULED':
        return scheduled;
      case 'MISSED':
        return missed;
      case 'RESCHEDULED':
        return const Color(0xFFFF9800);
      default:
        return const Color(0xFF9E9E9E);
    }
  }

  static String statusLabel(String status) {
    switch (status.toUpperCase()) {
      case 'GIVEN':
        return 'Completed';
      case 'ADMINISTERED':
        return 'Administered';
      case 'COMPLETED':
        return 'Completed';
      case 'SCHEDULED':
        return 'Scheduled';
      case 'MISSED':
        return 'Missed';
      case 'NOT_SCHEDULED':
        return 'Pending';
      default:
        return status;
    }
  }
}
