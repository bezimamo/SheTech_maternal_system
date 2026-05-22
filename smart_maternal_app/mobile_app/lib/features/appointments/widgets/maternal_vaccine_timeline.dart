import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/schedule_model.dart';
import 'appointment_theme.dart';
import 'status_badge.dart';

class MaternalVaccineTimeline extends StatelessWidget {
  final List<TdScheduleSlot> slots;
  final List<MaternalVaccine> allVaccines;

  const MaternalVaccineTimeline({
    super.key,
    required this.slots,
    required this.allVaccines,
  });

  @override
  Widget build(BuildContext context) {
    final upcoming = allVaccines
        .where((v) => v.status == 'SCHEDULED')
        .toList()
      ..sort((a, b) => a.givenDate.compareTo(b.givenDate));

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (upcoming.isNotEmpty)
          ReminderStrip(
            message: upcoming.length == 1
                ? 'Reminder: ${upcoming.first.vaccineName} is scheduled for ${DateFormat('MMM d').format(upcoming.first.givenDate)}.'
                : 'You have ${upcoming.length} maternal vaccination appointments coming up.',
          ),
        const Text(
          'Tetanus Toxoid (TD) Schedule',
          style: TextStyle(
            fontSize: 15,
            fontWeight: FontWeight.bold,
            color: AppointmentTheme.brownDark,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'WHO-recommended TD1 through TD5 doses',
          style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
        ),
        const SizedBox(height: 16),
        ...slots.asMap().entries.map((entry) {
          final index = entry.key;
          final slot = entry.value;
          final isLast = index == slots.length - 1;
          return _TimelineItem(slot: slot, isLast: isLast);
        }),
        if (allVaccines.any((v) => v.vaccineName.toUpperCase().contains('INFLUENZA')))
          ...allVaccines
              .where((v) => v.vaccineName.toUpperCase().contains('INFLUENZA'))
              .map((v) => Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: MaternalVaccineCard(vaccine: v),
                  )),
      ],
    );
  }
}

class _TimelineItem extends StatelessWidget {
  final TdScheduleSlot slot;
  final bool isLast;

  const _TimelineItem({required this.slot, required this.isLast});

  @override
  Widget build(BuildContext context) {
    final record = slot.record;
    final status = record?.status ?? 'NOT_SCHEDULED';
    final color = AppointmentTheme.statusColor(status);
    final dateFmt = DateFormat('MMM d, yyyy');

    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 32,
            child: Column(
              children: [
                Container(
                  width: 14,
                  height: 14,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                    boxShadow: [
                      BoxShadow(
                        color: color.withOpacity(0.4),
                        blurRadius: 4,
                      ),
                    ],
                  ),
                ),
                if (!isLast)
                  Expanded(
                    child: Container(
                      width: 2,
                      color: AppointmentTheme.brownLight,
                    ),
                  ),
              ],
            ),
          ),
          Expanded(
            child: Container(
              margin: const EdgeInsets.only(bottom: 12, left: 4),
              padding: const EdgeInsets.all(14),
              decoration: AppointmentTheme.cardDecoration,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        slot.label,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 15,
                        ),
                      ),
                      StatusBadge(status: status),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    record?.vaccineName ?? 'Tetanus Toxoid dose ${slot.doseNumber}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade700),
                  ),
                  if (record != null) ...[
                    const SizedBox(height: 8),
                    _row(Icons.event, 'Appointment',
                        dateFmt.format(record.givenDate)),
                    if (record.nextDoseDate != null)
                      _row(Icons.arrow_forward, 'Next dose',
                          dateFmt.format(record.nextDoseDate!)),
                    if (record.notes != null && record.notes!.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 6),
                        child: Text(
                          record.notes!,
                          style: TextStyle(
                            fontSize: 11,
                            color: Colors.grey.shade600,
                            fontStyle: FontStyle.italic,
                          ),
                        ),
                      ),
                  ] else
                    Padding(
                      padding: const EdgeInsets.only(top: 6),
                      child: Text(
                        'Not yet scheduled — ask your health center.',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _row(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        children: [
          Icon(icon, size: 14, color: AppointmentTheme.brown),
          const SizedBox(width: 6),
          Text('$label: ', style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
          Text(value, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}

class MaternalVaccineCard extends StatelessWidget {
  final MaternalVaccine vaccine;

  const MaternalVaccineCard({super.key, required this.vaccine});

  @override
  Widget build(BuildContext context) {
    final dateFmt = DateFormat('MMM d, yyyy');
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: AppointmentTheme.cardDecoration,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: AppointmentTheme.brown.withOpacity(0.1),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.vaccines, color: AppointmentTheme.brown),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(vaccine.vaccineName,
                    style: const TextStyle(fontWeight: FontWeight.bold)),
                Text('Dose #${vaccine.doseNumber} · ${dateFmt.format(vaccine.givenDate)}',
                    style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
              ],
            ),
          ),
          StatusBadge(status: vaccine.status),
        ],
      ),
    );
  }
}

class ReminderStrip extends StatelessWidget {
  final String message;

  const ReminderStrip({super.key, required this.message});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: AppointmentTheme.scheduled.withOpacity(0.08),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppointmentTheme.scheduled.withOpacity(0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.notifications_active, color: AppointmentTheme.scheduled, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(message, style: const TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
