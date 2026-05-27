import { Injectable } from '@nestjs/common';
import { RecommendationRequestDto } from './dto/recommendation.dto';
import { RecommendationResultDto, FoodAvoidanceDto } from './dto/recommendation-result.dto';
import { nutritionRules } from './data/nutrition.rules';
import { foodsToAvoidRules } from './data/foods_to_avoid.rules';
import { sleepRules } from './data/sleep.rules';
import { sunlightRules } from './data/sunlight.rules';
import { feedingRules } from './data/feeding.rules';
import { proteinDeficiencyRules, carbDeficiencyRules, ironDeficiencyRules } from './data/deficiency.rules';

@Injectable()
export class RecommendationService {

  evaluate(payload: RecommendationRequestDto): RecommendationResultDto {
    const conditions = this.normalizeList(payload.conditions);
    const babyConditions = this.normalizeList(payload.babyConditions);
    const deficiencies = this.normalizeList(payload.deficiencies);

    const recommendations: string[] = [];
    const foodsToAvoid: FoodAvoidanceDto[] = [];
    const feedingAdvice: string[] = [];

    // Rule 1: PREGNANCY NUTRITION RULES
    for (const rule of nutritionRules) {
      if (this.containsCondition(conditions, rule.condition)) {
        recommendations.push(...rule.recommendations);
      }
    }

    // Rule 2: Always include foods to avoid when any maternal condition is present
    if (conditions.length > 0) {
      foodsToAvoid.push(...foodsToAvoidRules);
    }

    // Rule 3: SLEEP POSITION RULES
    for (const rule of sleepRules) {
      if (this.containsCondition(conditions, rule.condition)) {
        recommendations.push(rule.advice);
      }
    }

    // Rule 4: SUNLIGHT FOR BABY
    for (const rule of sunlightRules) {
      if (this.containsCondition(babyConditions, rule.babyCondition)) {
        const fullAdvice = `${rule.recommendation} (Best time: ${rule.bestTime})`;
        recommendations.push(fullAdvice);
      }
    }

    // Rule 5: FEEDING RECOMMENDATIONS
    if (payload.babyAgeMonths !== undefined && payload.babyAgeMonths !== null) {
      for (const rule of feedingRules) {
        if (payload.babyAgeMonths >= rule.minAge && payload.babyAgeMonths < rule.maxAge) {
          feedingAdvice.push(...rule.recommendations);
          break;
        }
      }
    }

    // Rule 6: PROTEIN DEFICIENCY
    for (const rule of proteinDeficiencyRules) {
      if (this.containsCondition(deficiencies, rule.condition)) {
        recommendations.push(rule.advice);
      }
    }

    // Rule 7: CARBOHYDRATE DEFICIENCY
    for (const rule of carbDeficiencyRules) {
      if (this.containsCondition(deficiencies, rule.condition)) {
        recommendations.push(rule.advice);
      }
    }

    // Rule 8: IRON DEFICIENCY
    for (const rule of ironDeficiencyRules) {
      if (this.containsCondition(deficiencies, rule.condition)) {
        recommendations.push(rule.advice);
      }
    }

    return {
      recommendations: this.unique(recommendations),
      foodsToAvoid: this.uniqueFoods(foodsToAvoid),
      feedingAdvice: this.unique(feedingAdvice),
    };
  }

  private normalizeList(values?: string[]): string[] {
    return (values || []).map((value) => value.toString().trim().toLowerCase()).filter(Boolean);
  }

  private containsCondition(list: string[], condition: string): boolean {
    return list.includes(condition.toLowerCase());
  }

  private unique(items: string[]): string[] {
    return Array.from(new Set(items));
  }

  private uniqueFoods(items: FoodAvoidanceDto[]): FoodAvoidanceDto[] {
    const uniqueMap = new Map<string, FoodAvoidanceDto>();
    for (const item of items) {
      if (!uniqueMap.has(item.food)) {
        uniqueMap.set(item.food, item);
      }
    }
    return Array.from(uniqueMap.values());
  }
}
