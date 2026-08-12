import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionStore } from '../store/nutritionStore';
import { useTheme } from '../lib/theme';

export const NutritionChart: React.FC = () => {
  const { macroTargets, todayMeals } = useNutritionStore();
  const theme = useTheme();

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;
  let hasLoggedFood = false;

  todayMeals.forEach((meal) => {
    if (meal.items && meal.items.length > 0) {
      hasLoggedFood = true;
    }
    consumedCalories += meal.totalCalories || 0;
    consumedProtein += meal.totalProteinG || 0;
    consumedCarbs += meal.totalCarbsG || 0;
    consumedFat += meal.totalFatG || 0;
  });

  const targetCalories = macroTargets.calories || 2100;
  const targetProtein = macroTargets.protein || 180;
  const targetCarbs = macroTargets.carbs || 250;
  const targetFat = macroTargets.fat || 70;

  const proteinPct = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((consumedFat / targetFat) * 100));

  const proteinKcal = Math.round(consumedProtein * 4);
  const carbsKcal = Math.round(consumedCarbs * 4);
  const fatKcal = Math.round(consumedFat * 9);
  const remainingKcal = Math.max(0, targetCalories - consumedCalories);

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...theme.shadow,
        },
      ]}
    >
      {/* Header Row: Title + Consumed / Target Subtitle & Remaining Pill */}
      <View style={styles.energyFlowHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Daily Energy & Macro Flow</Text>
          <Text style={[styles.energyFlowSub, { color: theme.textSecondary }]}>
            {consumedCalories.toLocaleString()} of {targetCalories.toLocaleString()} kcal consumed
          </Text>
        </View>
        <View
          style={[
            styles.remainingPillBadge,
            {
              backgroundColor: theme.cardInner,
              borderColor: theme.borderGold,
            },
          ]}
        >
          <Text style={[styles.remainingPillText, { color: theme.accentGold, flexDirection: 'row', alignItems: 'center' }]}>
            <Ionicons name="flash-outline" size={12} color={theme.accentGold} /> {remainingKcal} left
          </Text>
        </View>
      </View>

      {/* Proportional Segmented Progress Bar */}
      <View
        style={[
          styles.segmentedProgressBarTrack,
          { backgroundColor: theme.cardInner, borderColor: theme.border },
        ]}
      >
        {proteinKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: proteinKcal, backgroundColor: theme.macroProtein },
            ]}
          />
        )}
        {carbsKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: carbsKcal, backgroundColor: theme.macroCarbs },
            ]}
          />
        )}
        {fatKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: fatKcal, backgroundColor: theme.macroFat },
            ]}
          />
        )}
        {(remainingKcal > 0 || !hasLoggedFood) && (
          <View
            style={[
              styles.segmentedFillEmpty,
              { flex: Math.max(1, remainingKcal), backgroundColor: theme.cardAlt },
            ]}
          />
        )}
      </View>

      {/* 3-Column Macro Details Grid */}
      <View style={styles.macroPillGrid}>
        {/* Protein */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroProtein }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>PROTEIN</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedProtein)}g / {targetProtein}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {proteinKcal} kcal ({proteinPct}%)
          </Text>
        </View>

        {/* Carbs */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroCarbs }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>CARBS</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedCarbs)}g / {targetCarbs}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {carbsKcal} kcal ({carbsPct}%)
          </Text>
        </View>

        {/* Fat */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroFat }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>FAT</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedFat)}g / {targetFat}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {fatKcal} kcal ({fatPct}%)
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  energyFlowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  energyFlowSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  remainingPillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  remainingPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    gap: 2,
  },
  segmentedFill: {
    height: '100%',
    borderRadius: 2,
  },
  segmentedFillEmpty: {
    height: '100%',
    borderRadius: 2,
  },
  macroPillGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPillCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    fontSize: 9.5,
    marginTop: 2,
  },
});
