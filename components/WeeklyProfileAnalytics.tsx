import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import Svg, { Path, Rect, Line, Defs, LinearGradient, Stop, Text as SvgText, Circle } from 'react-native-svg';

export type WorkoutMetricFilter = 'VOLUME' | 'DURATION' | 'REPS';
export type NutritionMetricFilter = 'CALORIES' | 'PROTEIN';
export type TimeHorizonFilter = '1W' | '4W' | '8W' | '12W';

export interface WeeklySundayData {
  sundayDateLabel: string;
  volKg: number;
  durationMins: number;
  reps: number;
  caloriesKcal: number;
  proteinG: number;
}

export interface AnalyticsDataPoint {
  label: string; // X-axis label e.g. "Mon", "May 12"
  fullLabel: string; // Detailed tooltip title e.g. "Monday (Daily)", "Week ending May 12"
  volKg: number;
  durationMins: number;
  reps: number;
  caloriesKcal: number;
  proteinG: number;
}

export const WeeklyProfileAnalytics: React.FC = () => {
  const [workoutFilter, setWorkoutFilter] = useState<WorkoutMetricFilter>('VOLUME');
  const [nutritionFilter, setNutritionFilter] = useState<NutritionMetricFilter>('CALORIES');
  const [timeRange, setTimeRange] = useState<TimeHorizonFilter>('4W');
  const [containerWidth, setContainerWidth] = useState<number>(360);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Helper to generate dynamic daily analytics for the past 7 days (ending today)
  const getDynamicLast7DaysData = (): AnalyticsDataPoint[] => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // 7 sample daily metrics (from 6 days ago up to Today)
    const sampleMetrics = [
      { volKg: 18500, durationMins: 45, reps: 120, caloriesKcal: 2650, proteinG: 165 },
      { volKg: 22000, durationMins: 50, reps: 140, caloriesKcal: 2700, proteinG: 170 },
      { volKg: 0,     durationMins: 0,  reps: 0,   caloriesKcal: 2200, proteinG: 145 }, // Rest day
      { volKg: 24500, durationMins: 55, reps: 150, caloriesKcal: 2800, proteinG: 175 },
      { volKg: 20000, durationMins: 45, reps: 130, caloriesKcal: 2600, proteinG: 160 },
      { volKg: 26000, durationMins: 60, reps: 160, caloriesKcal: 2900, proteinG: 180 },
      { volKg: 15000, durationMins: 35, reps: 95,  caloriesKcal: 2450, proteinG: 155 }, // Today
    ];

    const now = new Date();
    const result: AnalyticsDataPoint[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);

      const dayName = dayNames[d.getDay()];
      const monthName = monthNames[d.getMonth()];
      const dateNum = d.getDate();

      const isToday = i === 0;
      const label = isToday ? 'Today' : `${dayName} ${dateNum}`;
      const fullLabel = isToday
        ? `Today, ${monthName} ${dateNum}`
        : `${dayName}, ${monthName} ${dateNum}`;

      const metrics = sampleMetrics[6 - i];

      result.push({
        label,
        fullLabel,
        ...metrics,
      });
    }

    return result;
  };

  // Full 12-week dataset with Sunday dates
  const full12WeekData: AnalyticsDataPoint[] = [
    { label: 'May 12', fullLabel: 'Week of May 12', volKg: 85000, durationMins: 38, reps: 280, caloriesKcal: 1950, proteinG: 128 },
    { label: 'May 19', fullLabel: 'Week of May 19', volKg: 92000, durationMins: 40, reps: 310, caloriesKcal: 2020, proteinG: 135 },
    { label: 'May 26', fullLabel: 'Week of May 26', volKg: 104000, durationMins: 45, reps: 340, caloriesKcal: 2100, proteinG: 140 },
    { label: 'Jun 2', fullLabel: 'Week of Jun 2', volKg: 110000, durationMins: 46, reps: 360, caloriesKcal: 2150, proteinG: 142 },
    { label: 'Jun 9', fullLabel: 'Week of Jun 9', volKg: 118000, durationMins: 49, reps: 380, caloriesKcal: 2120, proteinG: 144 },
    { label: 'Jun 16', fullLabel: 'Week of Jun 16', volKg: 125000, durationMins: 50, reps: 400, caloriesKcal: 2190, proteinG: 148 },
    { label: 'Jun 23', fullLabel: 'Week of Jun 23', volKg: 132000, durationMins: 52, reps: 420, caloriesKcal: 2200, proteinG: 150 },
    { label: 'Jun 30', fullLabel: 'Week of Jun 30', volKg: 108000, durationMins: 44, reps: 350, caloriesKcal: 2080, proteinG: 141 },
    { label: 'Jul 7', fullLabel: 'Week of Jul 7', volKg: 115000, durationMins: 48, reps: 390, caloriesKcal: 2180, proteinG: 145 },
    { label: 'Jul 14', fullLabel: 'Week of Jul 14', volKg: 142000, durationMins: 55, reps: 440, caloriesKcal: 2210, proteinG: 154 },
    { label: 'Jul 21', fullLabel: 'Week of Jul 21', volKg: 98000, durationMins: 42, reps: 320, caloriesKcal: 2050, proteinG: 138 },
    { label: 'Jul 28', fullLabel: 'Week of Jul 28', volKg: 165000, durationMins: 60, reps: 480, caloriesKcal: 2750, proteinG: 160 },
  ];

  // Dynamic data slicing based on selected time horizon
  const getSlicedData = (): AnalyticsDataPoint[] => {
    switch (timeRange) {
      case '1W':
        return getDynamicLast7DaysData(); // 7 daily points ending today
      case '4W':
        return full12WeekData.slice(-4);
      case '8W':
        return full12WeekData.slice(-8);
      case '12W':
        return full12WeekData;
    }
  };

  const chartData = getSlicedData();
  const activeIdx = selectedIndex !== null && selectedIndex < chartData.length ? selectedIndex : chartData.length - 1;
  const activePoint = chartData[activeIdx];

  const handleTimeRangeChange = (range: TimeHorizonFilter) => {
    setTimeRange(range);
    setSelectedIndex(null); // Reset to latest point
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width } = event.nativeEvent.layout;
    if (width > 0) {
      setContainerWidth(width);
    }
  };

  // SVG Dimensions & Grid bounds
  const svgWidth = Math.max(containerWidth - 32, 320);
  const svgHeight = 240;
  const paddingLeft = 48;
  const paddingRight = 48;
  const paddingTop = 24;
  const paddingBottom = 38;

  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  // Dynamic Y-axis scale configs for Workout (adapt for Daily 1W vs Weekly multi-week)
  const getWorkoutConfig = () => {
    const isDaily = timeRange === '1W';
    switch (workoutFilter) {
      case 'VOLUME':
        const maxVol = isDaily ? 30000 : 200000;
        return {
          max: maxVol,
          ticks: isDaily ? ['30k', '22.5k', '15k', '7.5k', '0'] : ['200k', '150k', '100k', '50k', '0'],
          label: 'Workout Vol (kg)',
          barGradientId: 'workoutVolGrad',
          primaryColor: '#6366F1',
          getVal: (d: AnalyticsDataPoint) => d.volKg,
          fmtVal: (val: number) => (val >= 1000 ? `${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k kg` : `${val} kg`),
        };
      case 'DURATION':
        const maxDur = isDaily ? 90 : 80;
        return {
          max: maxDur,
          ticks: isDaily ? ['90m', '67m', '45m', '22m', '0'] : ['80m', '60m', '40m', '20m', '0'],
          label: 'Duration (min)',
          barGradientId: 'workoutDurGrad',
          primaryColor: '#F59E0B',
          getVal: (d: AnalyticsDataPoint) => d.durationMins,
          fmtVal: (val: number) => `${val} mins`,
        };
      case 'REPS':
        const maxReps = isDaily ? 200 : 600;
        return {
          max: maxReps,
          ticks: isDaily ? ['200', '150', '100', '50', '0'] : ['600', '450', '300', '150', '0'],
          label: 'Total Reps',
          barGradientId: 'workoutRepsGrad',
          primaryColor: '#8B5CF6',
          getVal: (d: AnalyticsDataPoint) => d.reps,
          fmtVal: (val: number) => `${val} reps`,
        };
    }
  };

  // Dynamic Y-axis scale configs for Nutrition
  const getNutritionConfig = () => {
    switch (nutritionFilter) {
      case 'CALORIES':
        return {
          max: 3500,
          ticks: ['3.5k', '2.6k', '1.75k', '875', '0'],
          label: 'Calories (kcal)',
          lineColor: '#10B981',
          areaGradientId: 'greenGrad',
          getVal: (d: AnalyticsDataPoint) => d.caloriesKcal,
          fmtVal: (val: number) => `${val} kcal`,
        };
      case 'PROTEIN':
        return {
          max: 200,
          ticks: ['200g', '150g', '100g', '50g', '0'],
          label: 'Protein (g)',
          lineColor: '#06B6D4',
          areaGradientId: 'cyanGrad',
          getVal: (d: AnalyticsDataPoint) => d.proteinG,
          fmtVal: (val: number) => `${val}g`,
        };
    }
  };

  const wConfig = getWorkoutConfig();
  const nConfig = getNutritionConfig();

  // Generate Bezier curve points for Nutrition Line
  const points = chartData.map((d, idx) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = paddingLeft + (idx / divisor) * graphWidth;
    const val = nConfig.getVal(d);
    const clampedVal = Math.min(val, nConfig.max);
    const y = paddingTop + graphHeight - (clampedVal / nConfig.max) * graphHeight;
    return { x, y };
  });

  let linePath = `M ${points[0].x} ${points[0].y}`;
  if (points.length > 1) {
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const ctrlX = (curr.x + next.x) / 2;
      linePath += ` C ${ctrlX} ${curr.y}, ${ctrlX} ${next.y}, ${next.x} ${next.y}`;
    }
  } else {
    linePath += ` L ${points[0].x + 10} ${points[0].y}`;
  }

  const lastX = points.length > 1 ? points[points.length - 1].x : points[0].x + 10;
  const areaPath = `${linePath} L ${lastX} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`;


  // Dynamic bar width & font sizes according to dataset length
  const barWidth = chartData.length > 8 ? 10 : chartData.length > 4 ? 14 : 18;
  const fontSizeX = chartData.length > 8 ? 8.5 : 10;

  return (
    <View style={styles.cardContainer} onLayout={handleLayout}>
      {/* Header Row: Title & Time Horizon Pills */}
      <View style={styles.headerRow}>
        <Text style={styles.cardTitle}>Performance Analytics</Text>

        {/* Top Right Range Buttons */}
        <View style={styles.topRightRangeSelector}>
          {(['1W', '4W', '8W', '12W'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.topRangeBtn, timeRange === r && styles.topRangeBtnActive]}
              onPress={() => handleTimeRangeChange(r)}
              activeOpacity={0.8}
            >
              <Text style={[styles.topRangeBtnText, timeRange === r && styles.topRangeBtnTextActive]}>
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Interactive Tooltip Banner for Selected Data Point */}
      <View style={styles.activeSelectionBanner}>
        <View style={styles.activeSelectionHeader}>
          <Text style={styles.activeDateText}>📌 {activePoint?.fullLabel}</Text>
          {activePoint && wConfig.getVal(activePoint) === Math.max(...chartData.map(d => wConfig.getVal(d))) && wConfig.getVal(activePoint) > 0 && (
            <View style={styles.peakBadge}>
              <Text style={styles.peakBadgeText}>🔥 Peak {workoutFilter.toLowerCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.activeSelectionStats}>
          <View style={styles.statPill}>
            <View style={[styles.colorDot, { backgroundColor: wConfig.primaryColor }]} />
            <Text style={styles.statPillLabel}>{wConfig.label}:</Text>
            <Text style={styles.statPillValue}>{wConfig.fmtVal(wConfig.getVal(activePoint))}</Text>
          </View>

          <View style={styles.statPill}>
            <View style={[styles.colorDot, { backgroundColor: nConfig.lineColor }]} />
            <Text style={styles.statPillLabel}>{nConfig.label}:</Text>
            <Text style={styles.statPillValue}>{nConfig.fmtVal(nConfig.getVal(activePoint))}</Text>
          </View>
        </View>
      </View>

      {/* Chart Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: wConfig.primaryColor }]} />
          <Text style={styles.legendText}>Workout ({workoutFilter})</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: nConfig.lineColor }]} />
          <Text style={styles.legendText}>Nutrition ({nutritionFilter})</Text>
        </View>
      </View>

      {/* Interactive SVG Canvas */}
      <View style={styles.chartWrapper}>
        <Svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
          <Defs>
            {/* Workout Volume Gradient */}
            <LinearGradient id="workoutVolGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#818CF8" stopOpacity="1" />
              <Stop offset="100%" stopColor="#4338CA" stopOpacity="0.85" />
            </LinearGradient>

            {/* Workout Duration Gradient */}
            <LinearGradient id="workoutDurGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#FBBF24" stopOpacity="1" />
              <Stop offset="100%" stopColor="#D97706" stopOpacity="0.85" />
            </LinearGradient>

            {/* Workout Reps Gradient */}
            <LinearGradient id="workoutRepsGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#A78BFA" stopOpacity="1" />
              <Stop offset="100%" stopColor="#6D28D9" stopOpacity="0.85" />
            </LinearGradient>

            {/* Nutrition Calories Gradient */}
            <LinearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
            </LinearGradient>

            {/* Nutrition Protein Gradient */}
            <LinearGradient id="cyanGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
              <Stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + graphHeight * pct;
            return (
              <Line
                key={idx}
                x1={paddingLeft - 8}
                y1={y}
                x2={svgWidth - paddingRight + 8}
                y2={y}
                stroke="#334155"
                strokeWidth="0.8"
                strokeDasharray="3,3"
              />
            );
          })}

          {/* Left Y-Axis Ticks (Nutrition) */}
          {nConfig.ticks.map((tick, idx) => (
            <SvgText
              key={idx}
              x={paddingLeft - 10}
              y={paddingTop + graphHeight * (idx * 0.25) + 3}
              fill="#94A3B8"
              fontSize="9"
              textAnchor="end"
            >
              {tick}
            </SvgText>
          ))}

          {/* Right Y-Axis Ticks (Workout) */}
          {wConfig.ticks.map((tick, idx) => (
            <SvgText
              key={idx}
              x={svgWidth - paddingRight + 10}
              y={paddingTop + graphHeight * (idx * 0.25) + 3}
              fill="#94A3B8"
              fontSize="9"
              textAnchor="start"
            >
              {tick}
            </SvgText>
          ))}

          {/* Workout Metric Bars */}
          {chartData.map((d, idx) => {
            const val = wConfig.getVal(d);
            const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
            const x = paddingLeft + (idx / divisor) * graphWidth - barWidth / 2;
            const barH = (Math.min(val, wConfig.max) / wConfig.max) * graphHeight;
            const y = paddingTop + graphHeight - barH;
            const isSelected = idx === activeIdx;

            return (
              <React.Fragment key={idx}>
                <Rect
                  x={x}
                  y={val > 0 ? y : paddingTop + graphHeight - 4}
                  width={barWidth}
                  height={val > 0 ? Math.max(barH, 6) : 4}
                  rx={3}
                  fill={`url(#${wConfig.barGradientId})`}
                  stroke={isSelected ? '#FFFFFF' : 'none'}
                  strokeWidth={isSelected ? 1.5 : 0}
                  opacity={isSelected ? 1.0 : 0.75}
                />
              </React.Fragment>
            );
          })}

          {/* Nutrition Area Fill */}
          <Path d={areaPath} fill={`url(#${nConfig.areaGradientId})`} />

          {/* Glowing Nutrition Curve Line */}
          <Path d={linePath} fill="none" stroke={nConfig.lineColor} strokeWidth="2.8" />

          {/* Glowing Data Point Circles along Curve */}
          {points.map((pt, idx) => {
            const isSelected = idx === activeIdx;
            return (
              <React.Fragment key={idx}>
                {isSelected && (
                  <Circle
                    cx={pt.x}
                    cy={pt.y}
                    r={10}
                    fill={nConfig.lineColor}
                    fillOpacity={0.25}
                  />
                )}
                <Circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : 3.5}
                  fill={isSelected ? '#FFFFFF' : nConfig.lineColor}
                  stroke={nConfig.lineColor}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
              </React.Fragment>
            );
          })}

          {/* X-Axis Labels */}
          {chartData.map((d, idx) => {
            const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
            const x = paddingLeft + (idx / divisor) * graphWidth;
            const isSelected = idx === activeIdx;

            return (
              <SvgText
                key={idx}
                x={x}
                y={svgHeight - 10}
                fill={isSelected ? '#10B981' : '#CBD5E1'}
                fontSize={fontSizeX}
                fontWeight={isSelected ? 'bold' : '600'}
                textAnchor="middle"
              >
                {d.label}
              </SvgText>
            );
          })}
        </Svg>

        {/* Absolute Touch Overlay View for web-friendly click/touch targets */}
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          {chartData.map((_, idx) => {
            const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
            const stepW = graphWidth / divisor;
            const colWidth = Math.max(stepW, 24);
            // Center touch column over SVG chart column x position
            const colLeft = (svgWidth - containerWidth) / 2 + paddingLeft + (idx / divisor) * graphWidth - colWidth / 2;

            return (
              <TouchableOpacity
                key={`touch-${idx}`}
                style={[
                  styles.touchColumn,
                  {
                    position: 'absolute',
                    left: colLeft,
                    top: paddingTop,
                    width: colWidth,
                    height: graphHeight + 24,
                  },
                ]}
                onPress={() => setSelectedIndex(idx)}
                activeOpacity={1}
              />
            );
          })}
        </View>
      </View>


      {/* Filter Options Controls */}
      <View style={styles.filtersWrapper}>
        {/* Workout Metric Selector */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>WORKOUT METRIC</Text>
          <View style={styles.smallPillRow}>
            <TouchableOpacity
              style={[styles.smallPill, workoutFilter === 'VOLUME' && styles.smallPillActiveWorkout]}
              onPress={() => setWorkoutFilter('VOLUME')}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallPillText, workoutFilter === 'VOLUME' && styles.smallPillTextActive]}>
                Volume (kg)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallPill, workoutFilter === 'DURATION' && styles.smallPillActiveWorkout]}
              onPress={() => setWorkoutFilter('DURATION')}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallPillText, workoutFilter === 'DURATION' && styles.smallPillTextActive]}>
                Duration (min)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallPill, workoutFilter === 'REPS' && styles.smallPillActiveWorkout]}
              onPress={() => setWorkoutFilter('REPS')}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallPillText, workoutFilter === 'REPS' && styles.smallPillTextActive]}>
                Total Reps
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Nutrition Metric Selector */}
        <View style={styles.filterSection}>
          <Text style={styles.filterSectionLabel}>NUTRITION METRIC</Text>
          <View style={styles.smallPillRow}>
            <TouchableOpacity
              style={[styles.smallPill, nutritionFilter === 'CALORIES' && styles.smallPillActiveNutrition]}
              onPress={() => setNutritionFilter('CALORIES')}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallPillText, nutritionFilter === 'CALORIES' && styles.smallPillTextActive]}>
                Calories (kcal)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallPill, nutritionFilter === 'PROTEIN' && styles.smallPillActiveNutrition]}
              onPress={() => setNutritionFilter('PROTEIN')}
              activeOpacity={0.8}
            >
              <Text style={[styles.smallPillText, nutritionFilter === 'PROTEIN' && styles.smallPillTextActive]}>
                Protein (g)
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  topRightRangeSelector: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
    borderColor: '#334155',
  },
  topRangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topRangeBtnActive: {
    backgroundColor: '#10B981',
  },
  topRangeBtnText: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  topRangeBtnTextActive: {
    color: '#FFFFFF',
  },
  activeSelectionBanner: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  activeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeDateText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  peakBadge: {
    backgroundColor: '#7C2D12',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#EA580C',
  },
  peakBadgeText: {
    color: '#FFEDD5',
    fontSize: 9,
    fontWeight: 'bold',
  },
  activeSelectionStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  colorDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statPillLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  statPillValue: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendBox: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  legendLine: {
    width: 12,
    height: 3,
    borderRadius: 2,
  },
  legendText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  chartWrapper: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 4,
    position: 'relative',
  },
  touchColumn: {
    position: 'absolute',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },

  filtersWrapper: {
    gap: 10,
  },
  filterSection: {
    gap: 4,
  },
  filterSectionLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 2,
  },
  smallPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  smallPillActiveWorkout: {
    backgroundColor: '#1E1B4B',
    borderColor: '#6366F1',
  },
  smallPillActiveNutrition: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  smallPillText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: '600',
  },
  smallPillTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});
