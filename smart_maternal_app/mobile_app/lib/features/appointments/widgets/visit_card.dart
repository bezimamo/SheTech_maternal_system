import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/schedule_model.dart';
import 'appointment_theme.dart';
import 'status_badge.dart';

class VisitCard extends StatelessWidget {
  final PregnancyVisit visit;
  final bool isNext;

  const VisitCard({super.key, required this.visit, this.isNext = false});

  @override
  Widget build(BuildContext context) {
    final statusColor = AppointmentTheme.statusColor(visit.visitStatus);
    final dateFmt = DateFormat('EEEE, MMM d, yyyy');

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: AppointmentTheme.cardDecoration.copyWith(
        border: isNext
            ? Border.all(color: AppointmentTheme.brown.withOpacity(0.5), width: 1.5)
            : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.06),
              borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: AppointmentTheme.brown.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Icon(Icons.pregnant_woman, color: AppointmentTheme.brown),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        visit.visitType +
                            (visit.visitNumber != null
                                ? ' · Visit #${visit.visitNumber}'
                                : ''),
                        style: const TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      if (isNext)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            'Next scheduled visit',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppointmentTheme.brown,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                StatusBadge(status: visit.visitStatus),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _infoRow(Icons.calendar_today_outlined, 'Visit Date',
                    dateFmt.format(visit.visitDate)),
                _infoRow(Icons.timeline_outlined, 'Pregnancy Week',
                    'Week ${visit.week}'),
                _infoRow(Icons.access_time_outlined, 'Gestational Age',
                    '${visit.gestationalAge} weeks'),
                _infoRow(
                  Icons.warning_amber_rounded,
                  'Risk Level',
                  visit.riskLevel,
                  valueColor: _riskColor(visit.riskLevel),
                ),
                if (visit.healthWorker != null)
                  _infoRow(Icons.person_outline, 'Recorded By',
                      '${visit.healthWorker!.name} (${visit.healthWorker!.role})'),
                if (visit.nextVisitDate != null)
                  _infoRow(Icons.event_available_outlined, 'Next Visit',
                      dateFmt.format(visit.nextVisitDate!)),
                const SizedBox(height: 16),
                const Text(
                  'Vital Signs',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.bold,
                    color: AppointmentTheme.brownDark,
                  ),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _vitalChip(Icons.favorite_outline, 'BP', visit.bloodPressure),
                    _vitalChip(Icons.monitor_weight_outlined, 'Weight',
                        visit.weight != null ? '${visit.weight} kg' : '—'),
                    _vitalChip(Icons.straighten, 'Fundal Ht',
                        visit.fundalHeight != null
                            ? '${visit.fundalHeight} cm'
                            : '—'),
                    _vitalChip(Icons.favorite, 'FHR',
                        visit.fetalHeartRate != null
                            ? '${visit.fetalHeartRate} bpm'
                            : '—'),
                    _vitalChip(Icons.child_care, 'Presentation',
                        visit.presentation ?? '—'),
                  ],
                ),
                if ((visit.notes != null && visit.notes!.isNotEmpty) ||
                    (visit.recommendations != null &&
                        visit.recommendations!.isNotEmpty)) ...[
                  const SizedBox(height: 16),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppointmentTheme.brownPale,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.medical_services_outlined,
                                size: 18, color: AppointmentTheme.brown),
                            SizedBox(width: 8),
                            Text(
                              'Clinical Assessment',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 13,
                                color: AppointmentTheme.brownDark,
                              ),
                            ),
                          ],
                        ),
                        if (visit.notes != null && visit.notes!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            visit.notes!,
                            style: const TextStyle(fontSize: 13, height: 1.45),
                          ),
                        ],
                        if (visit.recommendations != null &&
                            visit.recommendations!.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Recommendations: ${visit.recommendations}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey.shade700,
                              fontStyle: FontStyle.italic,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _riskColor(String risk) {
    switch (risk.toUpperCase()) {
      case 'HIGH':
        return AppointmentTheme.missed;
      case 'MODERATE':
        return const Color(0xFFFF9800);
      default:
        return AppointmentTheme.administered;
    }
  }

  Widget _infoRow(IconData icon, String label, String value,
      {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: AppointmentTheme.brown),
          const SizedBox(width: 8),
          SizedBox(
            width: 110,
            child: Text(
              label,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w600,
                color: valueColor ?? const Color(0xFF424242),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _vitalChip(IconData icon, String label, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppointmentTheme.brownLight.withOpacity(0.8)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: AppointmentTheme.brown),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label,
                  style: TextStyle(fontSize: 9, color: Colors.grey.shade600)),
              Text(value,
                  style: const TextStyle(
                      fontSize: 11, fontWeight: FontWeight.w600)),
            ],
          ),
        ],
      ),
    );
  }
}
