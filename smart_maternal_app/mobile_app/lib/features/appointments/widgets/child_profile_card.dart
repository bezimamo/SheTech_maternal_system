import 'package:flutter/material.dart';
import 'appointment_theme.dart';

class ChildProfileCard extends StatelessWidget {
  final Map<String, dynamic> child;
  final String motherName;
  final int administered;
  final int scheduled;
  final int missed;

  const ChildProfileCard({
    super.key,
    required this.child,
    required this.motherName,
    required this.administered,
    required this.scheduled,
    required this.missed,
  });

  String _ageLabel() {
    final birth = child['birthDate'];
    if (birth == null) return '—';
    final birthDate = DateTime.parse(birth.toString());
    final now = DateTime.now();
    final months =
        (now.year - birthDate.year) * 12 + now.month - birthDate.month;
    if (months < 12) return '$months mo';
    final years = now.year - birthDate.year;
    return '$years yr${years > 1 ? 's' : ''}';
  }

  @override
  Widget build(BuildContext context) {
    final gender = child['gender']?.toString() ?? '—';
    final health = child['healthStatus']?.toString() ?? 'HEALTHY';

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppointmentTheme.cardDecoration,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [
                  AppointmentTheme.brown.withOpacity(0.12),
                  AppointmentTheme.brownPale,
                ],
              ),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                CircleAvatar(
                  radius: 28,
                  backgroundColor: AppointmentTheme.brown.withOpacity(0.2),
                  child: Icon(
                    gender == 'MALE' ? Icons.boy : Icons.girl,
                    color: AppointmentTheme.brownDark,
                    size: 32,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        child['name'] ?? 'Child',
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '$gender · ${_ageLabel()}',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.grey.shade700,
                        ),
                      ),
                      Text(
                        'Mother: $motherName',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),
                    ],
                  ),
                ),
                _healthChip(health),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                _statBox('Administered', administered, AppointmentTheme.administered),
                const SizedBox(width: 10),
                _statBox('Scheduled', scheduled, AppointmentTheme.scheduled),
                const SizedBox(width: 10),
                _statBox('Missed', missed, AppointmentTheme.missed),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _healthChip(String status) {
    Color color = AppointmentTheme.administered;
    if (status == 'NEEDS_ATTENTION') color = const Color(0xFFFF9800);
    if (status == 'CRITICAL') color = AppointmentTheme.missed;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        status.replaceAll('_', ' '),
        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: color),
      ),
    );
  }

  Widget _statBox(String label, int count, Color color) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: BoxDecoration(
          color: color.withOpacity(0.08),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: color.withOpacity(0.2)),
        ),
        child: Column(
          children: [
            Text(
              '$count',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 10, color: Colors.grey.shade700),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }
}
