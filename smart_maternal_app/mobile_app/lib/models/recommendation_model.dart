class DailyRecommendation {
  final String category;
  final String title;
  final String description;
  final String? icon;

  DailyRecommendation({
    required this.category,
    required this.title,
    required this.description,
    this.icon,
  });

  factory DailyRecommendation.fromJson(dynamic json) {
    if (json is String) {
      return DailyRecommendation(
        category: '',
        title: '',
        description: json,
      );
    }
    final map = json as Map<String, dynamic>;
    return DailyRecommendation(
      category: map['category'] ?? map['type'] ?? '',
      title: map['title'] ?? map['name'] ?? '',
      description: map['description'] ?? map['advice'] ?? '',
      icon: map['icon'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'category': category,
      'title': title,
      'description': description,
      'icon': icon,
    };
  }
}

class FoodWarning {
  final String name;
  final String reason;
  final String? localName;

  FoodWarning({
    required this.name,
    required this.reason,
    this.localName,
  });

  factory FoodWarning.fromJson(Map<String, dynamic> json) {
    return FoodWarning(
      name: json['food'] ?? json['name'] ?? '',
      reason: json['reason'] ?? '',
      localName: json['localName'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'food': name,
      'reason': reason,
      'localName': localName,
    };
  }
}

class BabyCareTip {
  final String topic;
  final String advice;
  final String? ageGroup;

  BabyCareTip({
    required this.topic,
    required this.advice,
    this.ageGroup,
  });

  factory BabyCareTip.fromJson(dynamic json) {
    if (json is String) {
      return BabyCareTip(
        topic: '',
        advice: json,
      );
    }
    final map = json as Map<String, dynamic>;
    return BabyCareTip(
      topic: map['topic'] ?? map['title'] ?? map['name'] ?? '',
      advice: map['advice'] ?? map['description'] ?? '',
      ageGroup: map['ageGroup'] ?? map['age'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'topic': topic,
      'advice': advice,
      'ageGroup': ageGroup,
    };
  }
}

class RecommendationModel {
  final List<DailyRecommendation> dailyRecommendations;
  final List<FoodWarning> foodsToAvoid;
  final List<BabyCareTip> babyCareTips;
  final String? lastUpdated;

  RecommendationModel({
    required this.dailyRecommendations,
    required this.foodsToAvoid,
    required this.babyCareTips,
    this.lastUpdated,
  });

  factory RecommendationModel.fromJson(Map<String, dynamic> json) {
    List<dynamic> allRecommendations = [];
    // Combine all possible recommendation lists from backend
    if (json['recommendations'] is List) allRecommendations.addAll(json['recommendations']);
    if (json['nutritionRecommendations'] is List) allRecommendations.addAll(json['nutritionRecommendations']);
    if (json['sleepAdvice'] is List) allRecommendations.addAll(json['sleepAdvice']);
    if (json['sunlightAdvice'] is List) allRecommendations.addAll(json['sunlightAdvice']);
    if (json['deficiencyAdvice'] is List) allRecommendations.addAll(json['deficiencyAdvice']);
    
    return RecommendationModel(
      dailyRecommendations: allRecommendations
          .map((e) => DailyRecommendation.fromJson(e))
          .toList(),
      foodsToAvoid: (json['foodsToAvoid'] as List<dynamic>?)
              ?.map((e) => FoodWarning.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      babyCareTips: (json['feedingAdvice'] as List<dynamic>?)
              ?.map((e) => BabyCareTip.fromJson(e))
              .toList() ??
          [],
      lastUpdated: json['lastUpdated'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'dailyRecommendations': dailyRecommendations.map((e) => e.toJson()).toList(),
      'foodsToAvoid': foodsToAvoid.map((e) => e.toJson()).toList(),
      'babyCareTips': babyCareTips.map((e) => e.toJson()).toList(),
      'lastUpdated': lastUpdated,
    };
  }
}
