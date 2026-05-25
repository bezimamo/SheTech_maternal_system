import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'appointment_theme.dart';
import 'status_badge.dart';

class ChildVaccineCard extends StatelessWidget {
  final Map<String, dynamic> record;
  final VoidCallback? onRemind;
  final VoidCallback? onViewDetails;

  const ChildVaccineCard({
    super.key,
    required this.record,
    this.onRemind,
    this.onViewDetails,
  });

  @override
  Widget build(BuildContext context) {
    final vaccine = record['vaccineId'];
    final name = vaccine is Map
        ? (vaccine['name'] ?? 'Vaccine')
        : 'Vaccine';
    final status = record['status']?.toString() ?? 'SCHEDULED';
    final dose = record['doseNumber'] ?? 1;
    final scheduled = record['scheduledDate'] != null
        ? DateTime.parse(record['scheduledDate'].toString())
        : null;
    final administered = record['administeredDate'] != null
        ? DateTime.parse(record['administeredDate'].toString())
        : null;
    final nextDose = record['followUpDate'] != null
        ? DateTime.parse(record['followUpDate'].toString())
        : null;
    final dateFmt = DateFormat('MMM d, yyyy');

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: AppointmentTheme.cardDecoration,
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppointmentTheme.brown.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.vaccines_outlined,
                      color: AppointmentTheme.brown, size: 20),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(name,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 15)),
                      Text('Dose #$dose',
                          style: TextStyle(
                              fontSize: 12, color: Colors.grey.shade600)),
                    ],
                  ),
                ),
                StatusBadge(status: status),
              ],
            ),
            const SizedBox(height: 12),
            _tableRow('Scheduled', scheduled != null ? dateFmt.format(scheduled) : '—'),
            _tableRow('Administered',
                administered != null ? dateFmt.format(administered) : '—'),
            _tableRow('Next Dose', nextDose != null ? dateFmt.format(nextDose) : '—'),
            if (status == 'SCHEDULED' && record['reminderSent'] == true)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Row(
                  children: [
                    Icon(Icons.notifications_active,
                        size: 14, color: AppointmentTheme.scheduled),
                    const SizedBox(width: 6),
                    Text(
                      'Reminder sent',
                      style: TextStyle(
                        fontSize: 11,
                        color: AppointmentTheme.scheduled,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 12),
            Row(
              children: [
                if (status == 'SCHEDULED') ...[
                  Flexible(
                    child: _actionButton(
                      context,
                      label: 'Administer',
                      icon: Icons.check_circle_outline,
                      color: AppointmentTheme.administered,
                      onTap: onViewDetails,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Flexible(
                    child: _actionButton(
                      context,
                      label: 'Mark Missed',
                      icon: Icons.cancel_outlined,
                      color: AppointmentTheme.missed,
                      onTap: onViewDetails,
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Flexible(
                  child: TextButton.icon(
                    onPressed: onRemind,
                    icon: const Icon(Icons.alarm, size: 16),
                    label: const Text('Remind Me'),
                    style: TextButton.styleFrom(
                      foregroundColor: AppointmentTheme.brown,
                      padding: EdgeInsets.zero,
                      minimumSize: Size.zero,
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _tableRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(label,
                style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
          ),
          Expanded(
            child: Text(value,
                style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
          ),
        ],
      ),
    );
  }

  Widget _actionButton(
    BuildContext context, {
    required String label,
    required IconData icon,
    required Color color,
    VoidCallback? onTap,
  }) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 16),
      label: Text(label, style: const TextStyle(fontSize: 11)),
      style: OutlinedButton.styleFrom(
        foregroundColor: color,
        side: BorderSide(color: color.withOpacity(0.5)),
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
    );
  }
}
