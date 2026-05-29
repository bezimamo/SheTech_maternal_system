import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/services/language_service.dart';
import '../../../models/recommendation_model.dart';
import '../services/recommendation_service.dart';

class RecommendationsScreen extends StatefulWidget {
  const RecommendationsScreen({super.key});

  @override
  State<RecommendationsScreen> createState() => _RecommendationsScreenState();
}

class _RecommendationsScreenState extends State<RecommendationsScreen> {
  final RecommendationService _recommendationService = RecommendationService();
  RecommendationModel? _recommendations;
  RecommendationModel? _filteredRecommendations;
  bool _isLoading = false;
  bool _hasSearched = false;
  String? _errorMessage;
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  final List<String> _selectedConditions = [];
  final List<String> _selectedBabyConditions = [];
  final List<String> _selectedDeficiencies = [];
  int? _babyAgeMonths;

  final List<String> _motherConditions = [
    'Pregnancy',
    'Weakness',
    'Anemia',
    'Constipation',
    'High BP',
    'Underweight mother',
    'Pregnancy after 5 months',
    'Back pain',
    'Difficulty breathing',
  ];

  final List<String> _babyConditionsList = [
    'Newborn',
    'Jaundice',
    'Weak bones',
  ];

  final List<String> _deficiencyList = [
    'Swollen body',
    'Thin muscles',
    'Low energy',
    'Weight loss',
    'Pale skin',
    'Dizziness',
  ];

  final List<int> _babyAgeOptions = List.generate(60, (index) => index + 1);

  void _toggleCondition(String condition) {
    setState(() {
      if (_selectedConditions.contains(condition)) {
        _selectedConditions.remove(condition);
      } else {
        _selectedConditions.add(condition);
      }
    });
  }

  void _toggleBabyCondition(String condition) {
    setState(() {
      if (_selectedBabyConditions.contains(condition)) {
        _selectedBabyConditions.remove(condition);
      } else {
        _selectedBabyConditions.add(condition);
      }
    });
  }

  void _toggleDeficiency(String deficiency) {
    setState(() {
      if (_selectedDeficiencies.contains(deficiency)) {
        _selectedDeficiencies.remove(deficiency);
      } else {
        _selectedDeficiencies.add(deficiency);
      }
    });
  }

  Future<void> _searchRecommendations({
    List<String>? conditions,
    List<String>? babyConditions,
    List<String>? deficiencies,
  }) async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
      _hasSearched = true;
    });

    try {
      final recs = await _recommendationService.getRecommendations(
        conditions: conditions ?? _selectedConditions,
        babyConditions: babyConditions ?? _selectedBabyConditions,
        babyAgeMonths: _babyAgeMonths,
        deficiencies: deficiencies ?? _selectedDeficiencies,
      );

      setState(() {
        _recommendations = recs;
        _filteredRecommendations = recs;
        _isLoading = false;
      });
      
      // Do NOT apply search filter right after fetching recommendations
      // because the search query was used to select symptoms,
      // not to filter results
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }

  void _handleSearchQuery(String query) {
    setState(() {
      _searchQuery = query.toLowerCase();
    });
    
    // If we already have recommendations, filter them
    if (_recommendations != null) {
      _filterRecommendations();
    }
  }

  void _handleSearchButtonPress() async {
    if (_searchQuery.isNotEmpty) {
      // If we haven't fetched recommendations yet, fetch them first
      if (_recommendations == null) {
        // First, try to auto-select symptoms based on search query to get recommendations
        List<String> conditionsToUse = List.from(_selectedConditions);
        List<String> babyConditionsToUse = List.from(_selectedBabyConditions);
        List<String> deficienciesToUse = List.from(_selectedDeficiencies);
        bool foundMatchingSymptom = false;
        
        for (final condition in _motherConditions) {
          if (condition.toLowerCase().contains(_searchQuery) && !conditionsToUse.contains(condition)) {
            conditionsToUse.add(condition);
            foundMatchingSymptom = true;
          }
        }
        for (final babyCondition in _babyConditionsList) {
          if (babyCondition.toLowerCase().contains(_searchQuery) && !babyConditionsToUse.contains(babyCondition)) {
            babyConditionsToUse.add(babyCondition);
            foundMatchingSymptom = true;
          }
        }
        for (final deficiency in _deficiencyList) {
          if (deficiency.toLowerCase().contains(_searchQuery) && !deficienciesToUse.contains(deficiency)) {
            deficienciesToUse.add(deficiency);
            foundMatchingSymptom = true;
          }
        }
        
        // Update the state (modify in-place since lists are final)
        setState(() {
          // Add any new conditions to the selected list
          for (final c in conditionsToUse) {
            if (!_selectedConditions.contains(c)) {
              _selectedConditions.add(c);
            }
          }
          for (final c in babyConditionsToUse) {
            if (!_selectedBabyConditions.contains(c)) {
              _selectedBabyConditions.add(c);
            }
          }
          for (final c in deficienciesToUse) {
            if (!_selectedDeficiencies.contains(c)) {
              _selectedDeficiencies.add(c);
            }
          }
        });
        
        // If we found matching symptoms OR user has already selected symptoms, fetch recommendations
        if (foundMatchingSymptom || conditionsToUse.isNotEmpty || babyConditionsToUse.isNotEmpty || deficienciesToUse.isNotEmpty) {
          await _searchRecommendations(
            conditions: conditionsToUse,
            babyConditions: babyConditionsToUse,
            deficiencies: deficienciesToUse,
          );
        }
      } else {
        // If we already have recommendations, just filter them
        _filterRecommendations();
      }
    }
  }

  void _filterRecommendations() {
    if (_searchQuery.isEmpty) {
      setState(() {
        _filteredRecommendations = _recommendations;
      });
      return;
    }

    if (_recommendations == null) {
      return;
    }

    final filteredDailyRecs = _recommendations!.dailyRecommendations
        .where((rec) => rec.description.toLowerCase().contains(_searchQuery))
        .toList();

    final filteredFoodsToAvoid = _recommendations!.foodsToAvoid
        .where((food) => 
          food.name.toLowerCase().contains(_searchQuery) ||
          food.reason.toLowerCase().contains(_searchQuery))
        .toList();

    final filteredBabyCare = _recommendations!.babyCareTips
        .where((tip) => tip.advice.toLowerCase().contains(_searchQuery))
        .toList();

    setState(() {
      _filteredRecommendations = RecommendationModel(
        dailyRecommendations: filteredDailyRecs,
        foodsToAvoid: filteredFoodsToAvoid,
        babyCareTips: filteredBabyCare,
      );
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final lang = context.watch<LanguageService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFFF8F5),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            backgroundColor: AppColors.primary,
            elevation: 0,
            pinned: true,
            title: Text(
              lang.isAmharic ? 'ምከርዎች' : 'Recommendations',
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 20,
              ),
            ),
          ),
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 40),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                _buildSearchBar(lang),
                const SizedBox(height: 20),
                _buildSymptomSelectionCard(lang),
                const SizedBox(height: 24),
                if (_isLoading)
                  const Center(child: CircularProgressIndicator())
                else if (_errorMessage != null)
                  _buildErrorWidget(lang)
                else if (_hasSearched)
                  _buildResultsWidget(lang)
                else
                  _buildEmptyInitialWidget(lang),
              ]),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar(LanguageService lang) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 16,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              onChanged: _handleSearchQuery,
              onSubmitted: (_) => _handleSearchButtonPress(),
              decoration: InputDecoration(
                hintText: lang.isAmharic 
                    ? 'ቁልፍ ቃላት ይፈልጉ...' 
                    : 'Search keywords...',
                border: InputBorder.none,
                prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF8D6E63)),
                hintStyle: TextStyle(color: Colors.grey.shade500, fontSize: 15),
                contentPadding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
              ),
            ),
          ),
          if (_searchQuery.isNotEmpty)
            IconButton(
              onPressed: () {
                setState(() {
                  _searchController.clear();
                  _searchQuery = '';
                  _filteredRecommendations = _recommendations;
                });
              },
              icon: const Icon(Icons.clear_rounded, color: Color(0xFF8D6E63)),
            ),
          if (_searchQuery.isNotEmpty)
            Container(
              margin: const EdgeInsets.only(left: 8),
              child: ElevatedButton.icon(
                onPressed: _isLoading ? null : _handleSearchButtonPress,
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primary,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
                icon: const Icon(Icons.search, size: 18),
                label: Text(
                  lang.isAmharic ? 'ፈልግ' : 'Search',
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSymptomSelectionCard(LanguageService lang) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.15),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(Icons.health_and_safety_rounded, color: AppColors.primary, size: 28),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      lang.isAmharic ? 'እንዴት ይሰማዎታል?' : 'Tell us how you feel',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF5D4037),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      lang.isAmharic ? 'ምከርዎችን ለማግኘት ምልክቶችን ይምረጡ' : 'Select symptoms to get recommendations',
                      style: TextStyle(color: Colors.grey.shade600, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 24),
          _buildSectionTitle(lang.isAmharic ? 'የእናት ሁኔታዎች' : 'Mother\'s Conditions'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _motherConditions
                .map((condition) => _buildSymptomChip(
                      condition,
                      _selectedConditions.contains(condition),
                      () => _toggleCondition(condition),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
          _buildSectionTitle(lang.isAmharic ? 'የልጅ ሁኔታዎች' : 'Baby\'s Conditions'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _babyConditionsList
                .map((condition) => _buildSymptomChip(
                      condition,
                      _selectedBabyConditions.contains(condition),
                      () => _toggleBabyCondition(condition),
                    ))
                .toList(),
          ),
          const SizedBox(height: 20),
          _buildSectionTitle(lang.isAmharic ? 'የልጅ ዕድሜ (በወራት)' : 'Baby Age (months)'),
          const SizedBox(height: 12),
          DropdownButtonFormField<int>(
            value: _babyAgeMonths,
            decoration: InputDecoration(
              filled: true,
              fillColor: const Color(0xFFF5F5F5),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(14),
                borderSide: BorderSide.none,
              ),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
            ),
            hint: Text(lang.isAmharic ? 'ዕድሜን ይምረጡ' : 'Select age'),
            items: _babyAgeOptions.map((age) {
              return DropdownMenuItem<int>(
                value: age,
                child: Text('$age ${lang.isAmharic ? 'ወራት' : 'months'}'),
              );
            }).toList(),
            onChanged: (value) {
              setState(() {
                _babyAgeMonths = value;
              });
            },
          ),
          const SizedBox(height: 20),
          _buildSectionTitle(lang.isAmharic ? 'ክሬተርዎች' : 'Deficiencies'),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _deficiencyList
                .map((deficiency) => _buildSymptomChip(
                      deficiency,
                      _selectedDeficiencies.contains(deficiency),
                      () => _toggleDeficiency(deficiency),
                    ))
                .toList(),
          ),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            height: 56,
            child: ElevatedButton.icon(
              onPressed: _isLoading ? null : _searchRecommendations,
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                elevation: 0,
              ),
              icon: const Icon(Icons.check_circle_rounded, size: 22),
              label: Text(
                lang.isAmharic ? 'ምከርዎችን ያግኙ' : 'Get Recommendations',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 14,
        fontWeight: FontWeight.w600,
        color: Color(0xFF5D4037),
      ),
    );
  }

  Widget _buildSymptomChip(String label, bool isSelected, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: isSelected
              ? AppColors.primary
              : AppColors.primary.withOpacity(0.12),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? AppColors.primary
                : AppColors.primary.withOpacity(0.3),
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : AppColors.primary,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ),
    );
  }

  Widget _buildErrorWidget(LanguageService lang) {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline_rounded, size: 72, color: Colors.grey.shade400),
            const SizedBox(height: 20),
            Text(
              lang.isAmharic ? 'ምከርዎችን ለማግኘት አልተቻለም' : 'Failed to load recommendations',
              style: TextStyle(color: Colors.grey.shade700, fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: _searchRecommendations,
              icon: const Icon(Icons.refresh_rounded),
              label: Text(lang.isAmharic ? 'ደገም ይሞክሩ' : 'Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyInitialWidget(LanguageService lang) {
    return Container(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          children: [
            Icon(Icons.lightbulb_outline_rounded, size: 96, color: Colors.grey.shade300),
            const SizedBox(height: 24),
            Text(
              lang.isAmharic ? 'ምልክቶችን ይምረጡ እና ምከርዎችን ያግኙ!' : 'Select symptoms and find your recommendations!',
              style: TextStyle(color: Colors.grey.shade600, fontSize: 16, fontWeight: FontWeight.w500),
              textAlign: TextAlign.center,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildResultsWidget(LanguageService lang) {
    final hasRecommendations = _filteredRecommendations?.dailyRecommendations.isNotEmpty == true;
    final hasFoodsToAvoid = _filteredRecommendations?.foodsToAvoid.isNotEmpty == true;
    final hasBabyCare = _filteredRecommendations?.babyCareTips.isNotEmpty == true;

    if (!hasRecommendations && !hasFoodsToAvoid && !hasBabyCare) {
      return Container(
        padding: const EdgeInsets.all(32),
        child: Center(
          child: Column(
            children: [
              Icon(Icons.search_off_rounded, size: 80, color: Colors.grey.shade300),
              const SizedBox(height: 24),
              Text(
                _searchQuery.isNotEmpty 
                    ? (lang.isAmharic ? 'ለ$_searchQuery ምንም አልተገኙም' : "No results found for \"$_searchQuery\"")
                    : (lang.isAmharic ? 'ምንም ምከርዎች አልተገኙም!' : 'No recommendations found!'),
                style: TextStyle(color: Colors.grey.shade600, fontSize: 18, fontWeight: FontWeight.w500),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 12),
              Text(
                lang.isAmharic ? 'የተለያዩ ምልክቶችን ይምረጡ' : 'Try selecting different symptoms',
                style: TextStyle(color: Colors.grey.shade500, fontSize: 14),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasRecommendations) ...[
          _buildSectionHeader(
            lang.isAmharic ? '✅ የዕለት ተዕለት ምከርዎች' : '✅ Daily Recommendations',
            Icons.recommend_rounded,
            Colors.green,
          ),
          const SizedBox(height: 16),
          ..._filteredRecommendations!.dailyRecommendations.map((rec) => _buildDailyRecCard(rec)),
          const SizedBox(height: 32),
        ],
        if (hasFoodsToAvoid) ...[
          _buildSectionHeader(
            lang.isAmharic ? '🔴 ማለቅ ያለባቸው ምግቦች' : '🔴 Foods to Avoid',
            Icons.warning_amber_rounded,
            Colors.red,
          ),
          const SizedBox(height: 16),
          ..._filteredRecommendations!.foodsToAvoid.map((food) => _buildFoodWarningCard(food)),
          const SizedBox(height: 32),
        ],
        if (hasBabyCare) ...[
          _buildSectionHeader(
            lang.isAmharic ? '🍼 የልጅ እንክብካቤ' : '🍼 Baby Care',
            Icons.child_care_rounded,
            Colors.blue,
          ),
          const SizedBox(height: 16),
          ..._filteredRecommendations!.babyCareTips.map((tip) => _buildBabyCareCard(tip)),
        ],
      ],
    );
  }

  Widget _buildSectionHeader(String title, IconData icon, Color color) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.15),
            borderRadius: BorderRadius.circular(16),
          ),
          child: Icon(icon, color: color, size: 28),
        ),
        const SizedBox(width: 14),
        Text(
          title,
          style: const TextStyle(
            fontSize: 20,
            fontWeight: FontWeight.bold,
            color: Color(0xFF5D4037),
          ),
        ),
      ],
    );
  }

  Widget _buildDailyRecCard(DailyRecommendation rec) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.green.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.check_circle_rounded, color: Colors.green, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              rec.description,
              style: TextStyle(
                color: Colors.grey.shade800,
                fontSize: 15,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFoodWarningCard(FoodWarning food) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: const Color(0xFFFFEBEE),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFFCDD2), width: 1.5),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.warning_amber_rounded, color: Color(0xFFD32F2F), size: 28),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  food.name,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFFB71C1C),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  food.reason,
                  style: TextStyle(
                    color: Colors.red.shade800,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBabyCareCard(BabyCareTip tip) {
    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      padding: const EdgeInsets.all(22),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 14,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.blue.withOpacity(0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.child_care_rounded, color: Colors.blue, size: 26),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Text(
              tip.advice,
              style: TextStyle(
                color: Colors.grey.shade800,
                fontSize: 15,
                height: 1.6,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
