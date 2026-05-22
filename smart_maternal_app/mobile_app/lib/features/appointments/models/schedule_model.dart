class ScheduleData {
  final List<PregnancyVisit> visits;
  final List<MaternalVaccine> vaccines;
  final PregnancyVisit? nextVisit;
  final List<PregnancyVisit> overdueVisits;
  final List<String> warnings;

  ScheduleData({
    required this.visits,
    required this.vaccines,
    this.nextVisit,
    required this.overdueVisits,
    required this.warnings,
  });

  factory ScheduleData.fromJson(Map<String, dynamic> json) {
    return ScheduleData(
      visits: (json['visits'] as List? ?? [])
          .map((v) => PregnancyVisit.fromJson(v))
          .toList(),
      vaccines: (json['vaccines'] as List? ?? [])
          .map((v) => MaternalVaccine.fromJson(v))
          .toList(),
      nextVisit: json['nextVisit'] != null
          ? PregnancyVisit.fromJson(json['nextVisit'])
          : null,
      overdueVisits: (json['overdueVisits'] as List? ?? [])
          .map((v) => PregnancyVisit.fromJson(v))
          .toList(),
      warnings: List<String>.from(json['warnings'] ?? []),
    );
  }
}

class PregnancyVisit {
  final String id;
  final String motherId;
  final DateTime visitDate;
  final String visitType;
  final String visitStatus;
  final String? notes;
  final String? recommendations;
  final int gestationalAge;
  final int week;
  final int? visitNumber;
  final String riskLevel;
  final HealthWorker? healthWorker;
  final DateTime? nextVisitDate;
  final int? systolicBP;
  final int? diastolicBP;
  final double? weight;
  final double? fundalHeight;
  final int? fetalHeartRate;
  final String? presentation;

  PregnancyVisit({
    required this.id,
    required this.motherId,
    required this.visitDate,
    required this.visitType,
    required this.visitStatus,
    this.notes,
    this.recommendations,
    required this.gestationalAge,
    required this.week,
    this.visitNumber,
    required this.riskLevel,
    this.healthWorker,
    this.nextVisitDate,
    this.systolicBP,
    this.diastolicBP,
    this.weight,
    this.fundalHeight,
    this.fetalHeartRate,
    this.presentation,
  });

  String get bloodPressure {
    if (systolicBP != null && diastolicBP != null) {
      return '$systolicBP/$diastolicBP mmHg';
    }
    return '—';
  }

  factory PregnancyVisit.fromJson(Map<String, dynamic> json) {
    return PregnancyVisit(
      id: json['_id'] ?? '',
      motherId: json['motherId'] is Map
          ? json['motherId']['_id']
          : (json['motherId'] ?? ''),
      visitDate: DateTime.parse(json['visitDate']),
      visitType: json['visitType'] ?? 'ANC',
      visitStatus: json['visitStatus'] ?? 'SCHEDULED',
      notes: json['notes'],
      recommendations: json['recommendations'],
      gestationalAge: json['gestationalAge'] ?? 0,
      week: json['week'] ?? 0,
      visitNumber: json['visitNumber'],
      riskLevel: json['riskLevel'] ?? 'LOW',
      healthWorker: json['healthWorkerId'] != null
          ? HealthWorker.fromJson(json['healthWorkerId'])
          : null,
      nextVisitDate: json['nextVisitDate'] != null
          ? DateTime.parse(json['nextVisitDate'])
          : null,
      systolicBP: json['systolicBP'],
      diastolicBP: json['diastolicBP'],
      weight: json['weight'] != null
          ? (json['weight'] is int
              ? (json['weight'] as int).toDouble()
              : json['weight'] as double?)
          : null,
      fundalHeight: json['fundalHeight'] != null
          ? (json['fundalHeight'] is int
              ? (json['fundalHeight'] as int).toDouble()
              : json['fundalHeight'] as double?)
          : null,
      fetalHeartRate: json['fetalHeartRate'],
      presentation: json['presentation'],
    );
  }
}

class MaternalVaccine {
  final String id;
  final String vaccineName;
  final int doseNumber;
  final DateTime givenDate;
  final DateTime? nextDoseDate;
  final String status;
  final String? notes;

  MaternalVaccine({
    required this.id,
    required this.vaccineName,
    required this.doseNumber,
    required this.givenDate,
    this.nextDoseDate,
    required this.status,
    this.notes,
  });

  factory MaternalVaccine.fromJson(Map<String, dynamic> json) {
    return MaternalVaccine(
      id: json['_id'] ?? '',
      vaccineName: json['vaccineName'] ?? '',
      doseNumber: json['doseNumber'] ?? 1,
      givenDate: DateTime.parse(json['givenDate']),
      nextDoseDate: json['nextDoseDate'] != null
          ? DateTime.parse(json['nextDoseDate'])
          : null,
      status: json['status'] ?? 'GIVEN',
      notes: json['notes'],
    );
  }
}

class HealthWorker {
  final String name;
  final String role;

  HealthWorker({required this.name, required this.role});

  factory HealthWorker.fromJson(Map<String, dynamic> json) {
    return HealthWorker(
      name: json['name'] ?? '',
      role: json['role'] ?? '',
    );
  }
}

/// WHO TD schedule slots (TD1–TD5) for timeline display.
class TdScheduleSlot {
  final int doseNumber;
  final String label;
  final MaternalVaccine? record;

  TdScheduleSlot({
    required this.doseNumber,
    required this.label,
    this.record,
  });

  String get status => record?.status ?? 'NOT_SCHEDULED';

  static List<TdScheduleSlot> buildFromRecords(List<MaternalVaccine> vaccines) {
    return List.generate(5, (i) {
      final dose = i + 1;
      MaternalVaccine? match;
      for (final v in vaccines) {
        if (v.doseNumber == dose ||
            v.vaccineName.toUpperCase().contains('TT$dose') ||
            v.vaccineName == 'TT$dose') {
          match = v;
          break;
        }
      }
      return TdScheduleSlot(
        doseNumber: dose,
        label: 'TD$dose',
        record: match,
      );
    });
  }
}
