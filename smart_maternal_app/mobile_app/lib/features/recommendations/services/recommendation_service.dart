import 'dart:convert';
import '../../../core/services/api_service.dart';
import '../../../models/recommendation_model.dart';
import '../../../core/services/storage_service.dart';

class RecommendationService {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  Future<RecommendationModel> getRecommendations({
    List<String> conditions = const [],
    List<String> babyConditions = const [],
    int? babyAgeMonths,
    List<String> deficiencies = const [],
  }) async {
    try {
      final token = await _storageService.getToken();

      final body = <String, dynamic>{};
      
      if (conditions.isNotEmpty) body['conditions'] = conditions;
      if (babyConditions.isNotEmpty) body['babyConditions'] = babyConditions;
      if (babyAgeMonths != null) body['babyAgeMonths'] = babyAgeMonths;
      if (deficiencies.isNotEmpty) body['deficiencies'] = deficiencies;

      final response = await _apiService.post(
        '/recommendations/evaluate',
        token: token,
        body: body,
      );

      print('[RecommendationService] Response status: ${response.statusCode}');
      print('[RecommendationService] Response body: ${response.body}');

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        return RecommendationModel.fromJson(data['data'] ?? data);
      } else {
        throw Exception('Failed to load recommendations');
      }
    } catch (e) {
      print('[RecommendationService] Error: $e');
      rethrow;
    }
  }
}
