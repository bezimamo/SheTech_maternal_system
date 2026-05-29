import 'dart:convert';
import '../../../core/constants/api_constants.dart';
import '../../../core/services/api_service.dart';
import '../../../core/services/storage_service.dart';

class AuthApiService {
  final ApiService _apiService = ApiService();
  final StorageService _storageService = StorageService();

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await _apiService.post(
        ApiConstants.loginEndpoint,
        body: {
          'email': email,
          'password': password,
        },
      );

      final decoded = _parseResponse(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300 && decoded['token'] != null) {
        await _storageService.saveToken(decoded['token']);
        if (decoded['userId'] != null) {
          await _storageService.saveUserId(decoded['userId']);
        }
        if (decoded['role'] != null) {
          await _storageService.saveUserRole(decoded['role']);
        }
        if (decoded['name'] != null) {
          await _storageService.saveUserName(decoded['name']);
        }

        return {'success': true, 'data': decoded};
      }

      return {
        'success': false,
        'message': decoded['message'] ?? decoded['error'] ?? 'Login failed',
      };
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> register(Map<String, dynamic> userData) async {
    try {
      final response = await _apiService.post(
        ApiConstants.registerEndpoint,
        body: userData,
      );

      final decoded = _parseResponse(response.body);
      if (response.statusCode >= 200 && response.statusCode < 300 && decoded['token'] != null) {
        await _storageService.saveToken(decoded['token']);
        if (decoded['userId'] != null) {
          await _storageService.saveUserId(decoded['userId']);
        }
        if (decoded['role'] != null) {
          await _storageService.saveUserRole(decoded['role']);
        }
        if (decoded['name'] != null) {
          await _storageService.saveUserName(decoded['name']);
        }

        return {'success': true, 'data': decoded};
      }

      return {
        'success': false,
        'message': decoded['message'] ?? decoded['error'] ?? 'Registration failed',
      };
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> logout() async {
    try {
      final token = await _storageService.getToken();
      await _apiService.post(
        ApiConstants.logoutEndpoint,
        token: token,
      );

      await _storageService.clearAll();
      return {'success': true};
    } catch (e) {
      await _storageService.clearAll();
      return {'success': true};
    }
  }

  Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await _apiService.post(
        ApiConstants.forgotPasswordEndpoint,
        body: {'email': email},
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'success': true};
      }

      final decoded = _parseResponse(response.body);
      return {
        'success': false,
        'message': decoded['message'] ?? decoded['error'] ?? 'Failed to send reset link',
      };
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Future<Map<String, dynamic>> resetPassword(String token, String newPassword) async {
    try {
      final response = await _apiService.post(
        ApiConstants.resetPasswordEndpoint,
        body: {'token': token, 'newPassword': newPassword},
      );

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'success': true};
      }

      final decoded = _parseResponse(response.body);
      return {
        'success': false,
        'message': decoded['message'] ?? decoded['error'] ?? 'Failed to reset password',
      };
    } catch (e) {
      return {'success': false, 'message': e.toString()};
    }
  }

  Map<String, dynamic> _parseResponse(String responseBody) {
    try {
      final decoded = jsonDecode(responseBody);
      return {
        'token': decoded['access_token'],
        'userId': decoded['user']?['id'],
        'role': decoded['user']?['role'],
        'name': decoded['user']?['name'],
        'user': decoded['user'],
        'message': decoded['message'],
        'error': decoded['error'],
      };
    } catch (e) {
      return {
        'message': responseBody,
      };
    }
  }
}
