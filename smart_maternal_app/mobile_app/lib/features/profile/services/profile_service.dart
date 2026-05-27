import 'dart:convert';
import '../../../core/services/api_service.dart';
import '../../../core/services/storage_service.dart';
import '../../../models/user_model.dart';

class ProfileService {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  Future<UserModel?> getUserProfile() async {
    try {
      final token = await _storageService.getToken();
      if (token == null) return null;

      final response = await _apiService.get(
        '/users/me',
        token: token,
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        final decoded = jsonDecode(response.body);
        return UserModel.fromJson(decoded);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<bool> updateProfile(Map<String, dynamic> profileData) async {
    try {
      final token = await _storageService.getToken();
      if (token == null) return false;

      final response = await _apiService.patch(
        '/users/me',
        body: profileData,
        token: token,
      );

      return response.statusCode >= 200 && response.statusCode < 300;
    } catch (e) {
      return false;
    }
  }

  // Note: Mother specific profile endpoints are merged into /users/me
}
