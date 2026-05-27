class GrowthModel {
  final String id;
  final String childId;
  final DateTime measurementDate;
  final int ageMonths;
  final double weight;
  final double height;
  final double? headCircumference;
  final double? chestCircumference;
  final double? muac;
  final String growthStatus;   // SEVERE_UNDERWEIGHT | MODERATE_UNDERWEIGHT | NORMAL | OVERWEIGHT | OBESE
  final String heightStatus;   // SEVERE_STUNTING | MODERATE_STUNTING | NORMAL | TALL
  final String weightStatus;   // SEVERE_WASTING | MODERATE_WASTING | NORMAL | OVERWEIGHT
  final String muacStatus;     // RED | YELLOW | GREEN
  final String? notes;
  final String? recommendations;
  final bool needsFollowUp;
  final DateTime? followUpDate;
  final String? feedingPattern;
  final List<String> developmentalMilestones;
  final List<String> healthConcerns;
  final DateTime createdAt;

  GrowthModel({
    required this.id,
    required this.childId,
    required this.measurementDate,
    required this.ageMonths,
    required this.weight,
    required this.height,
    this.headCircumference,
    this.chestCircumference,
    this.muac,
    this.growthStatus = 'NORMAL',
    this.heightStatus = 'NORMAL',
    this.weightStatus = 'NORMAL',
    this.muacStatus = 'GREEN',
    this.notes,
    this.recommendations,
    this.needsFollowUp = false,
    this.followUpDate,
    this.feedingPattern,
    this.developmentalMilestones = const [],
    this.healthConcerns = const [],
    required this.createdAt,
  });

  factory GrowthModel.fromJson(Map<String, dynamic> json) {
    DateTime parseDate(dynamic v) {
      if (v == null) return DateTime.now();
      try { return DateTime.parse(v.toString()); } catch (_) { return DateTime.now(); }
    }

    // childId may be a populated object { _id, name, ... } or a plain string
    String resolveChildId(dynamic v) {
      if (v == null) return '';
      if (v is Map) return v['_id']?.toString() ?? '';
      return v.toString();
    }

    return GrowthModel(
      id: json['_id'] ?? json['id'] ?? '',
      childId: resolveChildId(json['childId']),
      // Backend stores measurementDate; fallback to createdAt
      measurementDate: parseDate(json['measurementDate'] ?? json['createdAt']),
      ageMonths: (json['ageMonths'] ?? 0).toInt(),
      weight: (json['weight'] ?? 0).toDouble(),
      height: (json['height'] ?? 0).toDouble(),
      headCircumference: json['headCircumference']?.toDouble(),
      chestCircumference: json['chestCircumference']?.toDouble(),
      muac: json['muac']?.toDouble(),
      growthStatus: json['growthStatus'] ?? 'NORMAL',
      heightStatus: json['heightStatus'] ?? 'NORMAL',
      weightStatus: json['weightStatus'] ?? 'NORMAL',
      muacStatus: json['muacStatus'] ?? 'GREEN',
      notes: json['notes'],
      recommendations: json['recommendations'],
      needsFollowUp: json['needsFollowUp'] ?? false,
      followUpDate: json['followUpDate'] != null ? parseDate(json['followUpDate']) : null,
      feedingPattern: json['feedingPattern'],
      developmentalMilestones: List<String>.from(json['developmentalMilestones'] ?? []),
      healthConcerns: List<String>.from(json['healthConcerns'] ?? []),
      createdAt: parseDate(json['createdAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'childId': childId,
    'measurementDate': measurementDate.toIso8601String(),
    'ageMonths': ageMonths,
    'weight': weight,
    'height': height,
    'headCircumference': headCircumference,
    'chestCircumference': chestCircumference,
    'muac': muac,
    'growthStatus': growthStatus,
    'heightStatus': heightStatus,
    'weightStatus': weightStatus,
    'muacStatus': muacStatus,
    'notes': notes,
    'recommendations': recommendations,
    'needsFollowUp': needsFollowUp,
    'followUpDate': followUpDate?.toIso8601String(),
    'feedingPattern': feedingPattern,
    'developmentalMilestones': developmentalMilestones,
    'healthConcerns': healthConcerns,
    'createdAt': createdAt.toIso8601String(),
  };
}
