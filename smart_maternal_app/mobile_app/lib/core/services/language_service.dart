import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LanguageService extends ChangeNotifier {
  static const String _keyLang = 'language';
  bool _isAmharic = false;

  bool get isAmharic => _isAmharic;

  LanguageService() {
    _loadLanguage();
  }

  Future<void> _loadLanguage() async {
    final prefs = await SharedPreferences.getInstance();
    _isAmharic = prefs.getBool(_keyLang) ?? false;
    notifyListeners();
  }

  Future<void> toggleLanguage() async {
    _isAmharic = !_isAmharic;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLang, _isAmharic);
    notifyListeners();
  }

  Future<void> setLanguage(bool isAmharic) async {
    _isAmharic = isAmharic;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyLang, _isAmharic);
    notifyListeners();
  }
}
