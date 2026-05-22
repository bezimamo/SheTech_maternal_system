import 'package:flutter/material.dart';
import 'appointment_theme.dart';

class ReminderBanner extends StatelessWidget {
  final String message;
  final IconData icon;
  final Color? accentColor;

  const ReminderBanner({
    super.key,
    required this.message,
    this.icon = Icons.notifications_active_outlined,
    this.accentColor,
  });

  @override
  Widget build(BuildContext context) {
    final color = accentColor ?? AppointmentTheme.brown;
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [color.withOpacity(0.15), AppointmentTheme.brownPale],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 22),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                fontSize: 13,
                color: AppointmentTheme.brownDark,
                height: 1.4,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
