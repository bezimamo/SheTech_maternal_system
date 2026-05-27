import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../routes/app_routes.dart';
import '../../../core/services/language_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Color Palette (Psychologically warm, safe, and professional)
// ─────────────────────────────────────────────────────────────────────────────
class _P {
  static const bg          = Color(0xFFF8F5F2);   // warm light cream background
  static const brownDeep   = Color(0xFF4E342E);   // dark stable brown
  static const brownRich   = Color(0xFF6D4C41);   // rich brown
  static const brownWarm   = Color(0xFF8D6E63);   // primary brown
  static const brownLight  = Color(0xFFD7CCC8);   // soft beige
  static const gold        = Color(0xFFFFB74D);   // soft orange accent
  static const green       = Color(0xFF81C784);   // soft green accent
  static const blue        = Color(0xFF64B5F6);   // soft blue accent
  static const red         = Color(0xFFE57373);   // soft red accent
  static const textDark    = Color(0xFF3E2723);   // deep contrast text
  static const textMid     = Color(0xFF6D4C41);   // secondary text
  static const textSoft    = Color(0xFF8D6E63);   // caption/hint text
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature data structure
// ─────────────────────────────────────────────────────────────────────────────
class _Feat {
  final IconData icon;
  final String title;
  final String desc;
  final Color color;
  const _Feat(this.icon, this.title, this.desc, this.color);
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing Screen
// ─────────────────────────────────────────────────────────────────────────────
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});

  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen> with TickerProviderStateMixin {
  late final AnimationController _entryCtrl;
  late final AnimationController _pulseCtrl;
  late final AnimationController _shimmerCtrl;

  late final Animation<double> _fadeAnim;
  late final Animation<Offset> _slideAnim;
  late final Animation<double> _pulseAnim;
  late final Animation<double> _shimmerAnim;

  // ── Strings ─────────────────────────────────────────────────────────────────
  String _title(bool amharic) => amharic ? 'ብልህ የእናቶች ጤና ስርዓት' : 'Smart Maternal\nHealth System';
  String _subtitle(bool amharic) => amharic
      ? 'ደህንነቱ የተጠበቀ እርግዝና እና የሕፃናት ጤና አጠባበቅ ድጋፍ'
      : 'Supporting mothers & babies through safe pregnancy and child healthcare.';
  String _btnLabel(bool amharic) => amharic ? 'ወደ መለያዎ ይግቡ' : 'Sign In to Continue';
  String _footer(bool amharic) => amharic ? 'የጤና ጉዞዎ እዚህ ይጀምራል 💖' : 'Your health journey starts here 💖';

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.dark,
    ));

    _entryCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 1000));
    _pulseCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2000))..repeat(reverse: true);
    _shimmerCtrl = AnimationController(vsync: this, duration: const Duration(milliseconds: 2400))..repeat();

    _fadeAnim = CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.08), end: Offset.zero)
        .animate(CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOutCubic));
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.03)
        .animate(CurvedAnimation(parent: _pulseCtrl, curve: Curves.easeInOut));
    _shimmerAnim = Tween<double>(begin: -2.0, end: 3.0)
        .animate(CurvedAnimation(parent: _shimmerCtrl, curve: Curves.linear));

    _entryCtrl.forward();
  }

  @override
  void dispose() {
    _entryCtrl.dispose();
    _pulseCtrl.dispose();
    _shimmerCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final size = MediaQuery.of(context).size;
    final bottomPadding = MediaQuery.of(context).padding.bottom;
    final lang = context.watch<LanguageService>();
    final amharic = lang.isAmharic;

    return Scaffold(
      backgroundColor: _P.bg,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: FadeTransition(
            opacity: _fadeAnim,
            child: SlideTransition(
              position: _slideAnim,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // ── Header Bar ─────────────────────────────────────────────
                  _buildHeader(lang),
                  const SizedBox(height: 24),

                  // ── Framed Portrait Illustration ───────────────────────────
                  _buildIllustrationFrame(size),
                  const SizedBox(height: 28),

                  // ── Welcome & Copy text ────────────────────────────────────
                  _buildWelcomeText(amharic),
                  const SizedBox(height: 24),

                  // ── Trust Statistics Card ──────────────────────────────────
                  _buildStatsCard(amharic),
                  const SizedBox(height: 28),

                  // ── Section Title ──────────────────────────────────────────
                  Text(
                    amharic ? 'ዋና ባህሪያት' : 'Key Features',
                    style: const TextStyle(
                      color: _P.textDark,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 16),

                  // ── Feature Row Cards (Spacious, Zero-Overflow Layout) ────
                  _buildFeatureRows(amharic),
                  const SizedBox(height: 36),

                  // ── Primary Action Button ──────────────────────────────────
                  _buildSignInButton(amharic),
                  const SizedBox(height: 24),

                  // ── Psychological Reassurance Footer ───────────────────────
                  Center(
                    child: Text(
                      _footer(amharic),
                      style: const TextStyle(
                        color: _P.textSoft,
                        fontSize: 14,
                        fontStyle: FontStyle.italic,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                  SizedBox(height: 16 + bottomPadding),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  // ── Header Bar ─────────────────────────────────────────────────────────────
  Widget _buildHeader(LanguageService lang) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // App Identity Brand Logo
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: _P.brownLight.withOpacity(0.4)),
            boxShadow: const [
              BoxShadow(
                color: Color(0x063E2723),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: _P.brownWarm,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 12),
              ),
              const SizedBox(width: 8),
              const Text(
                'SMHS',
                style: TextStyle(
                  color: _P.textDark,
                  fontWeight: FontWeight.bold,
                  fontSize: 14,
                  letterSpacing: 2.0,
                ),
              ),
            ],
          ),
        ),

        // Language Toggle Chip
        GestureDetector(
          onTap: () => lang.toggleLanguage(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: _P.brownLight.withOpacity(0.4)),
              boxShadow: const [
                BoxShadow(
                  color: Color(0x063E2723),
                  blurRadius: 10,
                  offset: Offset(0, 4),
                ),
              ],
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _langChip('EN', !lang.isAmharic),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text('·', style: TextStyle(color: _P.textSoft, fontSize: 14)),
                ),
                _langChip('አማ', lang.isAmharic),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _langChip(String label, bool active) => Text(
        label,
        style: TextStyle(
          color: active ? _P.textDark : _P.textSoft.withOpacity(0.5),
          fontWeight: active ? FontWeight.bold : FontWeight.normal,
          fontSize: 13,
        ),
      );

  // ── Framed Portrait Illustration Card ──────────────────────────────────────
  Widget _buildIllustrationFrame(Size size) {
    return Container(
      height: 260,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.white, width: 8),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0C3E2723),
            blurRadius: 20,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(22),
        child: Stack(
          fit: StackFit.expand,
          children: [
            Image.asset(
              'assets/images/ethiopian_mother_child.png',
              fit: BoxFit.cover,
              alignment: Alignment.center,
            ),
            // Soft warm gradient bottom fade for smooth look
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              height: 60,
              child: DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.white.withOpacity(0.0),
                      Colors.white.withOpacity(0.4),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Welcome & Copy Text ────────────────────────────────────────────────────
  Widget _buildWelcomeText(bool amharic) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Official Badge Tag
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
          decoration: BoxDecoration(
            color: _P.brownWarm.withOpacity(0.12),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_rounded, color: _P.brownRich, size: 14),
              const SizedBox(width: 6),
              Text(
                amharic ? 'ኦፊሴላዊ የጤና ስርዓት' : 'Official MOH System',
                style: const TextStyle(
                  color: _P.brownRich,
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 14),
        Text(
          _title(amharic),
          style: const TextStyle(
            color: _P.textDark,
            fontSize: 32,
            fontWeight: FontWeight.bold,
            height: 1.2,
            letterSpacing: -0.8,
          ),
        ),
        const SizedBox(height: 10),
        Text(
          _subtitle(amharic),
          style: const TextStyle(
            color: _P.textMid,
            fontSize: 15,
            height: 1.5,
          ),
        ),
      ],
    );
  }

  // ── Trust Statistics Card (Unified Compact Style) ──────────────────────────
  Widget _buildStatsCard(bool amharic) {
    final String labelMothers = amharic ? 'እናቶች' : 'Mothers';
    final String labelBirths = amharic ? 'ደህንነት' : 'Safe Births';
    final String labelSupport = amharic ? 'ድጋፍ' : 'Support';

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x063E2723),
            blurRadius: 15,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(child: _buildSingleStat('10K+', labelMothers, _P.brownWarm)),
          _buildVerticalDivider(),
          Expanded(child: _buildSingleStat('98%', labelBirths, _P.green)),
          _buildVerticalDivider(),
          Expanded(child: _buildSingleStat('24/7', labelSupport, _P.blue)),
        ],
      ),
    );
  }

  Widget _buildSingleStat(String value, String label, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: TextStyle(
            color: color,
            fontSize: 22,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: const TextStyle(
            color: _P.textMid,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }

  Widget _buildVerticalDivider() {
    return Container(
      height: 32,
      width: 1,
      color: _P.brownLight.withOpacity(0.5),
    );
  }

  // ── Feature Row Cards (Horizontal spacious rows preventing clipping) ───────
  Widget _buildFeatureRows(bool amharic) {
    final List<_Feat> features = amharic
        ? [
            const _Feat(Icons.calendar_month_rounded, 'ANC ክትትል', 'ሁሉንም ቀጠሮዎችዎን ይከታተሉ', _P.blue),
            const _Feat(Icons.vaccines_rounded, 'ክትባት ማሳወቂያ', 'ለልጅዎ ክትባቶች ማሳወቂያ ያግኙ', _P.green),
            const _Feat(Icons.emergency_rounded, 'አደጋ ጊዜ ድጋፍ', 'ፈጣን የጤና ድጋፍ ያግኙ (SOS)', _P.red),
            const _Feat(Icons.child_care_rounded, 'የሕፃን ዕድገት', 'የልጅዎን የክብደትና ቁመት ዕድገት ይከታተሉ', _P.gold),
          ]
        : [
            const _Feat(Icons.calendar_month_rounded, 'ANC Tracking', 'Track and organize your prenatal visits', _P.blue),
            const _Feat(Icons.vaccines_rounded, 'Vaccine Reminders', 'Never miss baby\'s essential immunizations', _P.green),
            const _Feat(Icons.emergency_rounded, 'Emergency SOS', 'Immediate 1-tap connection to hospital support', _P.red),
            const _Feat(Icons.child_care_rounded, 'Child Growth', 'Monitor weight, height, and health milestones', _P.gold),
          ];

    return Column(
      children: features.map((f) => _PressableCard(
        child: Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(20),
            boxShadow: const [
              BoxShadow(
                color: Color(0x043E2723),
                blurRadius: 10,
                offset: Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: f.color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Icon(f.icon, color: f.color, size: 24),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      f.title,
                      style: const TextStyle(
                        color: _P.textDark,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      f.desc,
                      style: const TextStyle(
                        color: _P.textMid,
                        fontSize: 12,
                        height: 1.4,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.chevron_right_rounded, color: _P.brownLight, size: 22),
            ],
          ),
        ),
      )).toList(),
    );
  }

  // ── Primary Button ─────────────────────────────────────────────────────────
  Widget _buildSignInButton(bool amharic) {
    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (_, child) => Transform.scale(scale: _pulseAnim.value, child: child),
      child: GestureDetector(
        onTap: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
        child: Container(
          height: 60,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(30),
            gradient: const LinearGradient(
              colors: [_P.brownDeep, _P.brownRich, _P.brownWarm],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            boxShadow: [
              BoxShadow(
                color: _P.brownRich.withOpacity(0.4),
                blurRadius: 20,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Animated Shimmer Sweeper
              ClipRRect(
                borderRadius: BorderRadius.circular(30),
                child: AnimatedBuilder(
                  animation: _shimmerAnim,
                  builder: (_, __) => Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment(_shimmerAnim.value - 1, 0),
                        end: Alignment(_shimmerAnim.value, 0),
                        colors: [
                          Colors.transparent,
                          Colors.white.withOpacity(0.15),
                          Colors.transparent,
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              // Button Label Content
              Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      _btnLabel(amharic),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      padding: const EdgeInsets.all(6),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 16,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pressable Scale Animation Widget
// ─────────────────────────────────────────────────────────────────────────────
class _PressableCard extends StatefulWidget {
  final Widget child;
  const _PressableCard({required this.child});

  @override
  State<_PressableCard> createState() => _PressableCardState();
}

class _PressableCardState extends State<_PressableCard> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.97).animate(
      CurvedAnimation(parent: _controller, curve: Curves.easeInOut),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTapDown: (_) => _controller.forward(),
      onTapUp: (_) => _controller.reverse(),
      onTapCancel: () => _controller.reverse(),
      child: AnimatedBuilder(
        animation: _scale,
        builder: (_, child) => Transform.scale(
          scale: _scale.value,
          child: child,
        ),
        child: widget.child,
      ),
    );
  }
}
