import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../../../core/constants/api_constants.dart';
import '../../../core/services/storage_service.dart';
import '../models/schedule_model.dart';

class AppointmentService {
  final StorageService _storageService = StorageService();

  Future<ScheduleData?> getMySchedule() async {
    try {
      final token = await _storageService.getToken();
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/pregnancy/my-schedule'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      debugPrint('my-schedule status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        return ScheduleData.fromJson(data);
      }
      return null;
    } catch (e) {
      print('Error fetching schedule: $e');
      return null;
    }
  }

  Future<MotherVaccinationScheduleData?> getMyMotherVaccinations() async {
    try {
      final token = await _storageService.getToken();
      if (token == null || token.isEmpty) return null;

      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/mothers/vaccinations/my-schedule'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      debugPrint('mother vaccinations status: ${response.statusCode}');
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as Map<String, dynamic>;
        return MotherVaccinationScheduleData.fromJson(data);
      }
      return null;
    } catch (e) {
      debugPrint('Error fetching mother vaccinations: $e');
      return null;
    }
  }

  Future<List<dynamic>> getChildVaccinations(String childId) async {
    try {
      final token = await _storageService.getToken();
      final response = await http.get(
        Uri.parse('${ApiConstants.baseUrl}/vaccinations/records/child/$childId'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      }
      return [];
    } catch (e) {
      print('Error fetching child vaccinations: $e');
      return [];
    }
  }
}
