import 'package:flutter/foundation.dart';

class ApiConstants {
  // Use localhost for web, 10.0.2.2 for emulator, or your computer's IP for physical device
  static const String computerIp = '10.161.125.249'; // Your computer's actual IP!

  static const String baseUrl = kIsWeb 
      ? 'http://localhost:3001/api'
      : 'http://$computerIp:3001/api';
  
  static const String authEndpoint = '/auth';
  static const String loginEndpoint = '/auth/login';
  static const String registerEndpoint = '/auth/register';
  static const String logoutEndpoint = '/auth/logout';
  
  static const String appointmentsEndpoint = '/appointments';
  static const String vaccinationsEndpoint = '/vaccinations';
  static const String growthEndpoint = '/growth';
  static const String referralsEndpoint = '/referrals';
  static const String profileEndpoint = '/profile';
  
  static const int connectionTimeout = 30000;
  static const int receiveTimeout = 30000;
}
