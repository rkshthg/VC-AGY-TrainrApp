import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useNutritionStore } from '../store/nutritionStore';

const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const describeArc = (x: number, y: number, radius: number, startAngle: number, endAngle: number) => {
  const clampedEnd = Math.max(startAngle + 0.1, endAngle);
  const start = polarToCartesian(x, y, radius, clampedEnd);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';
  return [
    'M', start.x.toFixed(2), start.y.toFixed(2),
    'A', radius, radius, 0, largeArcFlag, 0, end.x.toFixed(2), end.y.toFixed(2),
  ].join(' ');
};

export const NutritionChart: React.FC = () => {
  const { macroTargets, todayMeals } = useNutritionStore();

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;

  todayMeals.forEach((meal) => {
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
  const totalKcalTrack = Math.max(targetCalories, proteinKcal + carbsKcal + fatKcal + remainingKcal);

  return (
    <View style={styles.card}>
      {/* Header Row: Title + Consumed / Target Subtitle & Remaining Pill */}
      <View style={styles.energyFlowHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Daily Energy & Macro Flow</Text>
          <Text style={styles.energyFlowSub}>
            {consumedCalories.toLocaleString()} of {targetCalories.toLocaleString()} kcal consumed
          </Text>
        </View>
        <View style={styles.remainingPillBadge}>
          <Text style={styles.remainingPillText}>
            ⚡ {remainingKcal} left
          </Text>
        </View>
      </View>

      {/* Proportional Segmented Progress Bar */}
      <View style={styles.segmentedProgressBarTrack}>
        {proteinKcal > 0 && (
          <View style={[styles.segmentedFill, { flex: proteinKcal, backgroundColor: '#3B82F6' }]} />
        )}
        {carbsKcal > 0 && (
          <View style={[styles.segmentedFill, { flex: carbsKcal, backgroundColor: '#A855F7' }]} />
        )}
        {fatKcal > 0 && (
          <View style={[styles.segmentedFill, { flex: fatKcal, backgroundColor: '#F59E0B' }]} />
        )}
        {(remainingKcal > 0 || totalKcalTrack === 0) && (
          <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remainingKcal), backgroundColor: '#1E293B' }]} />
        )}
      </View>

      {/* 3-Column Macro Details Grid */}
      <View style={styles.macroPillGrid}>
        {/* Protein */}
        <View style={styles.macroPillCard}>
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.macroPillLabel}>PROTEIN</Text>
          </View>
          <Text style={styles.macroPillVal}>{Math.round(consumedProtein)}g / {targetProtein}g</Text>
          <Text style={styles.macroPillSub}>{proteinKcal} kcal ({proteinPct}%)</Text>
        </View>

        {/* Carbs */}
        <View style={styles.macroPillCard}>
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: '#A855F7' }]} />
            <Text style={styles.macroPillLabel}>CARBS</Text>
          </View>
          <Text style={styles.macroPillVal}>{Math.round(consumedCarbs)}g / {targetCarbs}g</Text>
          <Text style={styles.macroPillSub}>{carbsKcal} kcal ({carbsPct}%)</Text>
        </View>

        {/* Fat */}
        <View style={styles.macroPillCard}>
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.macroPillLabel}>FAT</Text>
          </View>
          <Text style={styles.macroPillVal}>{Math.round(consumedFat)}g / {targetFat}g</Text>
          <Text style={styles.macroPillSub}>{fatKcal} kcal ({fatPct}%)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#091512',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  cardTitle: {
    color: '#F8FAFC',
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
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  remainingPillBadge: {
    backgroundColor: '#06110D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAB30844',
  },
  remainingPillText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: 'bold',
  },
  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 14,
    backgroundColor: '#1E293B',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
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
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
  },
});
