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
    consumedCalories += meal.totalCalories;
    consumedProtein += meal.totalProteinG;
    consumedCarbs += meal.totalCarbsG;
    consumedFat += meal.totalFatG;
  });

  // Target values from store or fallback
  const targetCalories = macroTargets.calories || 2400;
  const targetProtein = macroTargets.protein || 180;
  const targetCarbs = macroTargets.carbs || 250;
  const targetFat = macroTargets.fat || 65;

  const calPct = Math.min(1, Math.max(0, consumedCalories / targetCalories));
  const proteinPct = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((consumedFat / targetFat) * 100));

  // Expanded Arc Gauge Bounds (140x140, center 70, radius 52)
  const svgSize = 140;
  const strokeWidth = 11;
  const radius = 52;
  const center = svgSize / 2;
  const startAngle = 120;
  const totalArc = 285;

  const trackPath = describeArc(center, center, radius, startAngle, startAngle + totalArc);
  const fillEndAngle = startAngle + Math.max(1, totalArc * calPct);
  const fillPath = describeArc(center, center, radius, startAngle, fillEndAngle);

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Today's Nutrition</Text>

      <View style={styles.contentRow}>
        {/* Left Side: Enlarged Circular Golden Arc Gauge */}
        <View style={styles.gaugeWrapper}>
          <Svg width={svgSize} height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`}>
            {/* Dark background track */}
            <Path
              d={trackPath}
              stroke="#212516"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
            {/* Glowing Golden progress fill */}
            {consumedCalories > 0 && (
              <Path
                d={fillPath}
                stroke="#EAB308"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>

          {/* Center Calorie Text with Consumed & Target Value */}
          <View style={styles.gaugeCenter}>
            <Text style={styles.calorieValue}>
              {consumedCalories.toLocaleString()}
            </Text>
            <Text style={styles.calorieTargetText}>
              / {targetCalories} KCAL
            </Text>
          </View>
        </View>

        {/* Right Side: Macro Target Bars */}
        <View style={styles.macroList}>
          {/* Protein */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>PROTEIN</Text>
              <Text style={styles.macroVal}>
                {Math.round(consumedProtein)}/{targetProtein}g
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${proteinPct}%`, backgroundColor: '#EAB308' },
                ]}
              />
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>CARBS</Text>
              <Text style={styles.macroVal}>
                {Math.round(consumedCarbs)}/{targetCarbs}g
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${carbsPct}%`, backgroundColor: '#35664F' },
                ]}
              />
            </View>
          </View>

          {/* Fats */}
          <View style={styles.macroRow}>
            <View style={styles.macroHeader}>
              <Text style={styles.macroLabel}>FATS</Text>
              <Text style={styles.macroVal}>
                {Math.round(consumedFat)}/{targetFat}g
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${fatPct}%`, backgroundColor: '#88B09A' },
                ]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0C140F',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#19281F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  gaugeWrapper: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  gaugeCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  calorieValue: {
    color: '#F8FAFC',
    fontSize: 23,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  calorieTargetText: {
    color: '#EAB308',
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  macroList: {
    flex: 1,
    gap: 14,
  },
  macroRow: {
    gap: 6,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  macroLabel: {
    color: '#DCE3DB',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  macroVal: {
    color: '#F1F5F9',
    fontSize: 13,
    fontWeight: 'bold',
  },
  track: {
    height: 9,
    backgroundColor: '#16271D',
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
