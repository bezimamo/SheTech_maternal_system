import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/constants/app_translations.dart';
import '../../../core/services/language_service.dart';
import '../../../core/widgets/app_bar_widget.dart';
import '../widgets/danger_sign_card.dart';
import '../../profile/services/profile_service.dart';
import '../../../models/user_model.dart';

class DangerSignsScreen extends StatefulWidget {
  const DangerSignsScreen({super.key});

  @override
  State<DangerSignsScreen> createState() => _DangerSignsScreenState();
}

class _DangerSignsScreenState extends State<DangerSignsScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final ProfileService _profileService = ProfileService();
  UserModel? _user;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _isLoading = true);
    final user = await _profileService.getUserProfile();
    setState(() {
      _user = user;
      _isLoading = false;
    });
  }

  void _showEmergencyNumbers(bool isAmharic) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      isScrollControlled: true,
      builder: (context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(30)),
        ),
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey[300],
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                AppTranslations.get('emergency_contacts', isAmharic),
                style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: AppColors.text),
              ),
              const SizedBox(height: 8),
              Text(
                AppTranslations.get('ethiopian_national_emergency_services', isAmharic),
                style: TextStyle(color: AppColors.textSecondary.withOpacity(0.8), fontSize: 14),
              ),
              const SizedBox(height: 24),
              if (_user?.healthCenterName != null) ...[
                _buildEmergencyItem(
                  context,
                  AppTranslations.get('your_health_facility', isAmharic),
                  _user!.healthCenterName!,
                  Icons.local_hospital_rounded,
                  AppColors.primary,
                ),
                const Divider(height: 24),
              ],
              _buildEmergencyItem(
                context,
                AppTranslations.get('national_emergency', isAmharic),
                '939',
                Icons.emergency_rounded,
                Colors.red,
              ),
              _buildEmergencyItem(
                context,
                AppTranslations.get('ambulance_red_cross', isAmharic),
                '907',
                Icons.medical_services_rounded,
                Colors.red[700]!,
              ),
              _buildEmergencyItem(
                context,
                AppTranslations.get('health_info_line', isAmharic),
                '8335',
                Icons.contact_support_rounded,
                Colors.blue,
              ),
              _buildEmergencyItem(
                context,
                AppTranslations.get('police', isAmharic),
                '991',
                Icons.local_police_rounded,
                Colors.blue[900]!,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton(
                  onPressed: () => Navigator.pop(context),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primary,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: Text(
                    AppTranslations.get('close', isAmharic), 
                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildEmergencyItem(BuildContext context, String title, String number, IconData icon, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Icon(icon, color: color, size: 24),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontSize: 14, color: AppColors.textSecondary)),
                Text(number, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: AppColors.text)),
              ],
            ),
          ),
          IconButton(
            onPressed: () {
              // Call logic
            },
            icon: Icon(Icons.call_rounded, color: color),
            style: IconButton.styleFrom(backgroundColor: color.withOpacity(0.1)),
          ),
        ],
      ),
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();
    
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBarWidget(
        title: AppTranslations.get('danger_signs', lang.isAmharic),
        actions: [
          IconButton(
            icon: const Icon(Icons.call_rounded, color: Colors.white),
            onPressed: () => _showEmergencyNumbers(lang.isAmharic),
          ),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: AppColors.primary,
            child: TabBar(
              controller: _tabController,
              indicatorColor: Colors.white,
              indicatorWeight: 3,
              labelColor: Colors.white,
              unselectedLabelColor: Colors.white.withOpacity(0.7),
              labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15),
              tabs: [
                Tab(text: lang.isAmharic ? 'የእናት ምልክቶች' : 'Mother Signs'),
                Tab(text: lang.isAmharic ? 'የልጅ ምልክቶች' : 'Baby Signs'),
              ],
            ),
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildMotherDangerSigns(lang.isAmharic),
                _buildBabyDangerSigns(lang.isAmharic),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMotherDangerSigns(bool isAmharic) {
    final motherDangerSigns = isAmharic
        ? [
            DangerSignCard(
              title: 'ከባድ የወንበር እንቁላል',
              description: 'አንድ ሰዓት ወይም ቢያንስ የሚታወቅ ብርጭቆ በእንቁላል ላይ ይታያል። ይህ ሕይወትን የሚያስደንቅ አደጋ ነው።',
              icon: Icons.water_drop_rounded,
              severity: 'high',
              action: 'በዚሁ ጊዜ ወደ ጤና ተቋም ይሂዱ',
              imagePath: 'assets/images/danger_sign/danger_mother_bleeding.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ከባድ ጭንቅላት ህመም እና አልተገለጸው እይታ',
              description: 'ማይለወጥ ከባድ ጭንቅላት ህመም፣ በእንቆቅልሎች ወይም በእንቆቅልሎች እይታ ላይ ይታያል። ከፍተኛ የደም ግፊት ሊያመለክት ይችላል።',
              icon: Icons.visibility_off_rounded,
              severity: 'high',
              action: 'በዚሁ ጊዜ ለጤና እንክብካቤ ይሄዱ',
              imagePath: 'assets/images/danger_sign/danger_mother_headache.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ማስተኛተግ ወይም ስፍራንጅ',
              description: 'መንፈስን ማጣት ወይም ስፍራንጅ መያዝ። ይህ በዚሁ ጊዜ የአደጋ ጊዜ እንክብካቤ ያስፈልጋል።',
              icon: Icons.warning_rounded,
              severity: 'high',
              action: 'የአደጋ ጊዜ አገልግሎቶችን ይደውሉ ወይም ወደ ክሊኒክ ይሂዱ',
              imagePath: 'assets/images/danger_sign/danger_mother_fainting.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ከባድ መዓዛ ያለው ማስወጣት',
              description: 'በእንቁላል ላይ መዓዛ ያለው ወይም ያልተለመደ ማስወጣት። ከሌሎች ጋር ቀዝቃዛ ህመም እና ሆስፒታል ሊኖር ይችላል።',
              icon: Icons.sick_rounded,
              severity: 'medium',
              action: 'ለምርመራ ወደ ጤና ተቋም ይሂዱ',
              imagePath: 'assets/images/danger_sign/danger_mother_bad_smelling.png',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ከባድ የሆድ ህመም',
              description: 'በሆድ ውስጥ ስጋት ያለው ወይም ቀጣይ ህመም የማስተኛተግ ጋር የተያያዘ አለመሆን።',
              icon: Icons.emergency_rounded,
              severity: 'high',
              action: 'ለጤና አገልግሎትዎ ይማከሩ',
              imagePath: 'assets/images/danger_sign/mother-bed-emergency-clinic.jpg',
            ),
          ]
        : [
            DangerSignCard(
              title: 'Severe Vaginal Bleeding',
              description: 'Heavy bleeding that soaks through a pad in an hour or less. This is a life-threatening emergency.',
              icon: Icons.water_drop_rounded,
              severity: 'high',
              action: 'Go to the health facility immediately',
              imagePath: 'assets/images/danger_sign/danger_mother_bleeding.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Severe Headache & Blurry Vision',
              description: 'Intense headache that won\'t go away, combined with seeing spots or flashing lights. Could indicate high blood pressure.',
              icon: Icons.visibility_off_rounded,
              severity: 'high',
              action: 'Seek medical attention immediately',
              imagePath: 'assets/images/danger_sign/danger_mother_headache.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Fainting or Convulsions',
              description: 'Losing consciousness or having seizures. This requires immediate emergency care.',
              icon: Icons.warning_rounded,
              severity: 'high',
              action: 'Call emergency services or go to clinic',
              imagePath: 'assets/images/danger_sign/danger_mother_fainting.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Foul Smelling Discharge',
              description: 'Vaginal discharge that smells bad or unusual. May be accompanied by fever and abdominal pain.',
              icon: Icons.sick_rounded,
              severity: 'medium',
              action: 'Visit health center for checkup',
              imagePath: 'assets/images/danger_sign/danger_mother_bad_smelling.png',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Severe Abdominal Pain',
              description: 'Sharp or persistent pain in the stomach area that is not related to labor.',
              icon: Icons.emergency_rounded,
              severity: 'high',
              action: 'Consult your healthcare provider',
              imagePath: 'assets/images/danger_sign/mother-bed-emergency-clinic.jpg',
            ),
          ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: motherDangerSigns,
    );
  }

  Widget _buildBabyDangerSigns(bool isAmharic) {
    final babyDangerSigns = isAmharic
        ? [
            DangerSignCard(
              title: 'የመንፈስ መግባት ችግር',
              description: 'ልጁ በጣም በፍጥነት እየተነፋሰች ነው (ከ60 እንፈሳሴቶች/ደቂቃ በላይ)፣ እንቆቅልሎች ወይም ሆድ በጥልቅነት ይውሰዳል።',
              icon: Icons.air_rounded,
              severity: 'high',
              action: 'በዚሁ ጊዜ ለጤና እንክብካቤ ይሄዱ',
              imagePath: 'assets/images/danger_sign/baby-breathing-difficulty.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ቀዝቃዛ ወይም በጣም ቀዝቃዛ',
              description: 'የሰውነት ሙቀት በጣም ከፍተኛ ነው (ከ37.5°C በላይ) ወይም በጣም ዝቅተኛ ነው (ከ35.5°C በታች)።',
              icon: Icons.thermostat_rounded,
              severity: 'high',
              action: 'ለጤና አገልግሎትዎ በዚሁ ጊዜ ይግኙ',
              imagePath: 'assets/images/danger_sign/baby-fever-cold.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ስፍራንጅ ወይም አስተካከያ',
              description: 'የማይቀመጥ እንቅስቃሴዎች ወይም አስተካከያ። ይህ የበሽታ ከባድ ምልክት ነው።',
              icon: Icons.warning_amber_rounded,
              severity: 'high',
              action: 'በዚሁ ጊዜ ወደ ቅርብ ሆስፒታል ይሂዱ',
              imagePath: 'assets/images/danger_sign/baby-danger-shaking.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ማይነቃነቅ ወይም ማይታወቅ',
              description: 'ልጁ ለማንቃት አስቸጋሪ ነው፣ በጣም እንቅላቆ ነው ወይም ለንካት አይሠራም።',
              icon: Icons.hotel_rounded,
              severity: 'high',
              action: 'በዚሁ ጊዜ ለአደጋ ጊዜ ጤና እንክብካቤ ይሄዱ',
              imagePath: 'assets/images/danger_sign/baby-lethargic-fainting.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ማያመገብ ወይም ያልተነቀነቀ',
              description: 'ልጁ ለማጥመግ አይችልም ወይም ሙሉ በሙሉ አመገቡን አቋርጧል።',
              icon: Icons.child_care_rounded,
              severity: 'high',
              action: 'ለዶክተርዎ በዚሁ ጊዜ ይማከሩ',
              imagePath: 'assets/images/danger_sign/baby-not-active-sleepy.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'የጡንቆ አጠራር',
              description: 'በጡንቆው መሰረት ዙሪያ ቀይነት፣ መዓዛ ያለው ወይም የሽንኩርት ማስወጣት።',
              icon: Icons.health_and_safety_rounded,
              severity: 'medium',
              action: 'ለማከም ወደ ክሊኒክ ይሂዱ',
              imagePath: 'assets/images/danger_sign/baby-umbilical-cord-infection.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'ቀይ ቆዳ (ጃውንዲስ)',
              description: 'በሕይወቱ የመጀመሪያ 24 ሰዓታት ውስጥ በተለይም የቆዳው እና ዓይኖቹ ቀይነት።',
              icon: Icons.face_rounded,
              severity: 'medium',
              action: 'ለጤና አገልግሎትዎ ይማከሩ',
              imagePath: 'assets/images/danger_sign/danger_child_jaundice.jpg',
            ),
          ]
        : [
            DangerSignCard(
              title: 'Breathing Difficulty',
              description: 'Baby is breathing very fast (more than 60 breaths/min), grunting, or chest is pulling in deeply.',
              icon: Icons.air_rounded,
              severity: 'high',
              action: 'Seek immediate medical care',
              imagePath: 'assets/images/danger_sign/baby-breathing-difficulty.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Fever or Very Cold',
              description: 'Body temperature is too high (above 37.5°C) or too low (below 35.5°C).',
              icon: Icons.thermostat_rounded,
              severity: 'high',
              action: 'Contact health provider immediately',
              imagePath: 'assets/images/danger_sign/baby-fever-cold.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Convulsions or Shaking',
              description: 'Involuntary movements or stiffness. This is a serious sign of illness.',
              icon: Icons.warning_amber_rounded,
              severity: 'high',
              action: 'Go to the nearest hospital immediately',
              imagePath: 'assets/images/danger_sign/baby-danger-shaking.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Lethargic or Unconscious',
              description: 'Baby is difficult to wake up, very sleepy, or doesn\'t react to touch.',
              icon: Icons.hotel_rounded,
              severity: 'high',
              action: 'Seek emergency medical attention',
              imagePath: 'assets/images/danger_sign/baby-lethargic-fainting.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Not Feeding or Active',
              description: 'Baby is unable to suckle or has stopped feeding completely.',
              icon: Icons.child_care_rounded,
              severity: 'high',
              action: 'Consult your doctor immediately',
              imagePath: 'assets/images/danger_sign/baby-not-active-sleepy.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Umbilical Cord Infection',
              description: 'Redness around the cord base, foul smell, or pus discharge.',
              icon: Icons.health_and_safety_rounded,
              severity: 'medium',
              action: 'Visit the clinic for treatment',
              imagePath: 'assets/images/danger_sign/baby-umbilical-cord-infection.jpg',
            ),
            const SizedBox(height: 20),
            DangerSignCard(
              title: 'Yellow Skin (Jaundice)',
              description: 'Yellowing of the skin and eyes, especially within the first 24 hours of life.',
              icon: Icons.face_rounded,
              severity: 'medium',
              action: 'Consult your healthcare provider',
              imagePath: 'assets/images/danger_sign/danger_child_jaundice.jpg',
            ),
          ];

    return ListView(
      padding: const EdgeInsets.all(20),
      children: babyDangerSigns,
    );
  }
}
