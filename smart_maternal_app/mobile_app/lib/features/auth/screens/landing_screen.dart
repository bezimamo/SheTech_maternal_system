import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../../routes/app_routes.dart';
import '../../../core/services/language_service.dart';

// ─────────────────────────────────────────────────────────────────────────────
// Palette
// ─────────────────────────────────────────────────────────────────────────────
class _P {
  static const bg          = Color(0xFFFFF8F5);   // warm cream background
  static const brownDeep   = Color(0xFF4E342E);
  static const brownRich   = Color(0xFF6D4C41);
  static const brownWarm   = Color(0xFF8D6E63);
  static const brownLight  = Color(0xFFD7CCC8);
  static const gold        = Color(0xFFFFB74D);
  static const green       = Color(0xFF66BB6A);
  static const blue        = Color(0xFF42A5F5);
  static const red         = Color(0xFFEF5350);
  static const pink        = Color(0xFFE91E63);
  static const textDark    = Color(0xFF3E2723);
  static const textMid     = Color(0xFF6D4C41);
  static const textSoft    = Color(0xFF8D6E63);
}

// ─────────────────────────────────────────────────────────────────────────────
// Stats data class
// ─────────────────────────────────────────────────────────────────────────────
class _Stat {
  final String value;
  final String label;
  final Color color;
  const _Stat(this.value, this.label, this.color);
}

// ─────────────────────────────────────────────────────────────────────────────
// Feature data
// ─────────────────────────────────────────────────────────────────────────────
class _Feat {
  final IconData icon;
  final String   title;
  final String   desc;
  final Color    color;
  const _Feat(this.icon, this.title, this.desc, this.color);
}

// ─────────────────────────────────────────────────────────────────────────────
// Landing screen
// ─────────────────────────────────────────────────────────────────────────────
class LandingScreen extends StatefulWidget {
  const LandingScreen({super.key});
  @override
  State<LandingScreen> createState() => _LandingScreenState();
}

class _LandingScreenState extends State<LandingScreen>
    with TickerProviderStateMixin {

  late final AnimationController _entryCtrl;
  late final AnimationController _pulseCtrl;
  late final AnimationController _shimmerCtrl;

  late final Animation<double>  _fadeAnim;
  late final Animation<Offset>  _slideAnim;
  late final Animation<double>  _imgScaleAnim;
  late final Animation<double>  _pulseAnim;
  late final Animation<double>  _shimmerAnim;

  // ── Strings ─────────────────────────────────────────────────────────────────
  String _title(bool amharic) => amharic ? 'ብልህ የእናቶች ጤና ስርዓት'  : 'Smart Maternal\nHealth System';
  String _subtitle(bool amharic) => amharic
      ? 'ደህንነቱ የተጠበቀ እርግዝና እና የሕፃናት ጤና አጠባበቅ ድጋፍ'
      : 'Supporting mothers & babies through\nsafe pregnancy and child healthcare.';
  String _btnLabel(bool amharic) => amharic ? 'ወደ መለያዎ ይግቡ' : 'Sign In';
  String _footer(bool amharic) => amharic ? 'የጤና ጉዞዎ እዚህ ይጀምራል 💖' : 'Your health journey starts here 💖';

  @override
  void initState() {
    super.initState();
    SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ));

    _entryCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 1200));
    _pulseCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 2200))
      ..repeat(reverse: true);
    _shimmerCtrl = AnimationController(
        vsync: this, duration: const Duration(milliseconds: 2600))
      ..repeat();

    _fadeAnim = CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOut);
    _slideAnim = Tween<Offset>(begin: const Offset(0, 0.15), end: Offset.zero)
        .animate(CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOutCubic));
    _imgScaleAnim = Tween<double>(begin: 1.1, end: 1.0)
        .animate(CurvedAnimation(parent: _entryCtrl, curve: Curves.easeOutCubic));
    _pulseAnim = Tween<double>(begin: 1.0, end: 1.04)
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
    final size   = MediaQuery.of(context).size;
    final top    = MediaQuery.of(context).padding.top;
    final bottom = MediaQuery.of(context).padding.bottom;
    final lang = context.watch<LanguageService>();

    return Scaffold(
      backgroundColor: _P.bg,
      body: Stack(
        children: [
          // ── Full screen hero image ───────────────────────────────────────
          SizedBox(
            height: size.height,
            width: size.width,
            child: Stack(
              fit: StackFit.expand,
              children: [
                ScaleTransition(
                  scale: _imgScaleAnim,
                  child: Image.asset(
                    'assets/images/pregnant_mother2.jpg',
                    fit: BoxFit.cover,
                    alignment: Alignment.center,
                  ),
                ),
                // Gradient overlay for readability
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      stops: const [0.0, 0.25, 0.55, 0.75, 0.95],
                      colors: [
                        Colors.black.withOpacity(0.15),
                        Colors.black.withOpacity(0.25),
                        Colors.black.withOpacity(0.45),
                        Colors.black.withOpacity(0.75),
                        _P.bg,
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // ── Content layer ─────────────────────────────────────────────────
          SafeArea(
            child: Column(
              children: [
                // ── Header bar ───────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: _buildHeader(lang),
                  ),
                ),
                
                // ── Spacer ───────────────────────────────────────────────────
                const Spacer(flex: 2),
                
                // ── Title section ────────────────────────────────────────────
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: SlideTransition(
                      position: _slideAnim,
                      child: _buildImageTitle(lang.isAmharic),
                    ),
                  ),
                ),
                
                const SizedBox(height: 32),
                
                // ── Bottom panel with stats and features ─────────────────────
                Expanded(
                  flex: 5,
                  child: FadeTransition(
                    opacity: _fadeAnim,
                    child: SlideTransition(
                      position: _slideAnim,
                      child: _buildBottomContent(bottom, lang.isAmharic),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ── Header bar ───────────────────────────────────────────────────────────────
  Widget _buildHeader(LanguageService lang) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        // Logo
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.18),
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withOpacity(0.35)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                padding: const EdgeInsets.all(6),
                decoration: const BoxDecoration(
                  color: _P.pink,
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.favorite_rounded, color: Colors.white, size: 14),
              ),
              const SizedBox(width: 10),
              const Text(
                'SMHS',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  letterSpacing: 2.2,
                ),
              ),
            ],
          ),
        ),

        // Language toggle
        GestureDetector(
          onTap: () => lang.toggleLanguage(),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.18),
              borderRadius: BorderRadius.circular(30),
              border: Border.all(color: Colors.white.withOpacity(0.35)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _langChip('EN',  !lang.isAmharic),
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 6),
                  child: Text('·', style: TextStyle(color: Colors.white54, fontSize: 14)),
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
      color: active ? Colors.white : Colors.white54,
      fontWeight: active ? FontWeight.bold : FontWeight.normal,
      fontSize: 13,
    ),
  );

  // ── Title over image ─────────────────────────────────────────────────────────
  Widget _buildImageTitle(bool amharic) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        // Pill tag
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
          decoration: BoxDecoration(
            color: _P.pink.withOpacity(0.95),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.verified_rounded, color: Colors.white, size: 14),
              const SizedBox(width: 6),
              Text(
                amharic ? 'ኦፊሴላዊ ስርዓት' : 'Official Health System',
                style: const TextStyle(
                  color: Colors.white,
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
            color: Colors.white,
            fontSize: 36,
            fontWeight: FontWeight.bold,
            height: 1.15,
            letterSpacing: -0.5,
          ),
        ),
        const SizedBox(height: 12),
        Text(
          _subtitle(amharic),
          style: TextStyle(
            color: Colors.white.withOpacity(0.9),
            fontSize: 15,
            height: 1.6,
          ),
        ),
      ],
    );
  }

  // ── Bottom content ────────────────────────────────────────────────────────────
  Widget _buildBottomContent(double bottomPadding, bool amharic) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: _P.bg,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.15),
            blurRadius: 30,
            offset: const Offset(0, -10),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(36)),
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: EdgeInsets.fromLTRB(24, 32, 24, 20 + bottomPadding),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [

              // ── Stats row ─────────────────────────────────────────────────
              _buildStatsRow(amharic),
              const SizedBox(height: 32),

              // ── Section label ─────────────────────────────────────────────
              Text(
                amharic ? 'ዋና ባህሪያት' : 'Key Features',
                style: const TextStyle(
                  color: _P.textDark,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),

              // ── Feature grid ──────────────────────────────────────────────
              _buildFeatureGrid(amharic),
              const SizedBox(height: 36),

              // ── Sign In button ────────────────────────────────────────────
              _buildSignInButton(amharic),
              const SizedBox(height: 20),

              // ── Footer ───────────────────────────────────────────────────
              Center(
                child: Text(
                  _footer(amharic),
                  style: TextStyle(
                    color: _P.textSoft,
                    fontSize: 14,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ── Stats row ─────────────────────────────────────────────────────────────────
  Widget _buildStatsRow(bool amharic) {
    final List<_Stat> stats = amharic
        ? [const _Stat('10K+', 'እናቶች', _P.pink), const _Stat('98%', 'ደህንነት', _P.green), const _Stat('24/7', 'ድጋፍ', _P.blue)]
        : [const _Stat('10K+', 'Mothers', _P.pink), const _Stat('98%', 'Safe Births', _P.green), const _Stat('24/7', 'Support', _P.blue)];

    return Row(
      children: stats.asMap().entries.map((entry) {
        final int index = entry.key;
        final _Stat stat = entry.value;
        final bool isLast = index == stats.length - 1;
        return Expanded(
          child: _PressableCard(
            child: Container(
              margin: EdgeInsets.only(right: isLast ? 0 : 12),
              padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.08),
                    blurRadius: 16,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Text(
                    stat.value,
                    style: TextStyle(
                      color: stat.color,
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    stat.label,
                    style: const TextStyle(
                      color: _P.textSoft,
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  // ── Feature grid ──────────────────────────────────────────────────────────────
  Widget _buildFeatureGrid(bool amharic) {
    final List<_Feat> features = amharic
        ? [
            const _Feat(Icons.calendar_month_rounded, 'ቀጠሮ ክትትል',    'ሁሉም ቀጠሮዎችዎን ይከታተሉ',          _P.blue),
            const _Feat(Icons.vaccines_rounded,        'ክትባት ማሳወቂያ',  'ለልጅዎ ክትባቶች ማሳወቂያ ያግኙ',       _P.green),
            const _Feat(Icons.emergency_rounded,       'አደጋ ጊዜ ድጋፍ', 'ፈጣን የጤና ድጋፍ ያግኙ',             _P.red),
            const _Feat(Icons.child_care_rounded,      'ሕፃን ዕድገት',    'የልጅዎን ዕድገት ይከታተሉ',           _P.gold),
          ]
        : [
            const _Feat(Icons.calendar_month_rounded, 'ANC Tracking',      'Track all your prenatal visits',    _P.blue),
            const _Feat(Icons.vaccines_rounded,        'Vaccine Reminders', 'Never miss baby\'s immunizations',  _P.green),
            const _Feat(Icons.emergency_rounded,       'Emergency SOS',     'Quick access to urgent support',    _P.red),
            const _Feat(Icons.child_care_rounded,      'Child Growth',      'Monitor your baby\'s development',  _P.gold),
          ];

    return GridView.count(
      crossAxisCount: 2,
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisSpacing: 12,
      mainAxisSpacing: 12,
      childAspectRatio: 1.2,
      children: features.map((f) => _PressableCard(child: _FeatureCard(feat: f))).toList(),
    );
  }

  // ── Sign In button ────────────────────────────────────────────────────────────
  Widget _buildSignInButton(bool amharic) {
    return AnimatedBuilder(
      animation: _pulseAnim,
      builder: (_, child) => Transform.scale(scale: _pulseAnim.value, child: child),
      child: GestureDetector(
        onTap: () => Navigator.pushReplacementNamed(context, AppRoutes.login),
        child: Container(
          height: 64,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(32),
            gradient: const LinearGradient(
              colors: [_P.brownDeep, _P.brownRich, _P.brownWarm],
            ),
            boxShadow: [
              BoxShadow(
                color: _P.brownRich.withOpacity(0.55),
                blurRadius: 28,
                offset: const Offset(0, 12),
              ),
            ],
          ),
          child: Stack(
            children: [
              // Shimmer sweep
              ClipRRect(
                borderRadius: BorderRadius.circular(32),
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
              // Label
              Center(
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Flexible(
                      child: Text(
                        _btnLabel(amharic),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                        ),
                        textAlign: TextAlign.center,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    const SizedBox(width: 14),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.25),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.arrow_forward_rounded,
                        color: Colors.white,
                        size: 18,
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
// Pressable card with scale animation
// ─────────────────────────────────────────────────────────────────────────────
class _PressableCard extends StatefulWidget {
  final Widget child;
  const _PressableCard({required this.child});

  @override
  State<_PressableCard> createState() => _PressableCardState();
}

class _PressableCardState extends State<_PressableCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 150),
    );
    _scale = Tween<double>(begin: 1.0, end: 0.96).animate(
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

// ─────────────────────────────────────────────────────────────────────────────
// Feature card
// ─────────────────────────────────────────────────────────────────────────────
class _FeatureCard extends StatelessWidget {
  final _Feat feat;
  const _FeatureCard({required this.feat});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 16,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: feat.color.withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(feat.icon, color: feat.color, size: 22),
          ),
          const SizedBox(height: 10),
          Flexible(
            child: Text(
              feat.title,
              style: const TextStyle(
                color: _P.textDark,
                fontSize: 13,
                fontWeight: FontWeight.bold,
                height: 1.2,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
          const SizedBox(height: 4),
          Flexible(
            child: Text(
              feat.desc,
              style: const TextStyle(
                color: _P.textSoft,
                fontSize: 10,
                height: 1.4,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );
  }
}
