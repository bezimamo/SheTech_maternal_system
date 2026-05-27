import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../../core/utils/helpers.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/custom_button.dart';
import '../../../core/widgets/custom_textfield.dart';
import '../services/auth_api_service.dart';
import '../../../routes/app_routes.dart';

class LoginForm extends StatefulWidget {
  const LoginForm({super.key});

  @override
  State<LoginForm> createState() => _LoginFormScreenState();
}

class _LoginFormScreenState extends State<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authApiService = AuthApiService();
  
  bool _isLoading = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() {
      _isLoading = true;
    });

    final result = await _authApiService.login(
      _emailController.text.trim(),
      _passwordController.text,
    );

    setState(() {
      _isLoading = false;
    });

    if (result['success']) {
      Helpers.showSnackBar(context, AppTranslations.get('login_successful', context.read<LanguageService>().isAmharic));
      Navigator.pushReplacementNamed(context, AppRoutes.home);
    } else {
      Helpers.showSnackBar(
        context,
        result['message'] ?? AppTranslations.get('login_failed', context.read<LanguageService>().isAmharic),
        isError: true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Form(
      key: _formKey,
      child: Column(
        children: [
          CustomTextfield(
            label: AppTranslations.get('email', lang.isAmharic),
            hintText: AppTranslations.get('enter_your_email', lang.isAmharic),
            prefixIcon: Icons.email_outlined,
            controller: _emailController,
            validator: Validators.validateEmail,
            keyboardType: TextInputType.emailAddress,
          ),
          const SizedBox(height: 16),
          CustomTextfield(
            label: AppTranslations.get('password', lang.isAmharic),
            hintText: AppTranslations.get('enter_your_password', lang.isAmharic),
            prefixIcon: Icons.lock_outlined,
            suffixIcon: _obscurePassword ? Icons.visibility_outlined : Icons.visibility_off_outlined,
            onSuffixIconPressed: () {
              setState(() {
                _obscurePassword = !_obscurePassword;
              });
            },
            obscureText: _obscurePassword,
            controller: _passwordController,
            validator: Validators.validatePassword,
          ),
          const SizedBox(height: 24),
          CustomButton(
            text: AppTranslations.get('sign_in', lang.isAmharic),
            onPressed: _handleLogin,
            isLoading: _isLoading,
          ),
        ],
      ),
    );
  }
}
