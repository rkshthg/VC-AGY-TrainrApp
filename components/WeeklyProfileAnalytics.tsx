import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent, ActivityIndicator } from 'react-native';
import Svg, { Path, Rect, Line, Defs, LinearGradient, Stop, Text as SvgText, Circle } from 'react-native-svg';
import { useTheme } from '../lib/theme';
import { useAuthStore } from '../store/authStore';
import { supabase } from '../lib/supabase';
import { formatVolume, getWeightUnitLabel } from '../lib/units';

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
  const profile = useAuthStore((state) => state.profile);
  const unitSystem = useAuthStore((state) => state.unitSystem);
  const [workoutFilter, setWorkoutFilter] = useState<WorkoutMetricFilter>('VOLUME');
  const [nutritionFilter, setNutritionFilter] = useState<NutritionMetricFilter>('CALORIES');
  const [timeRange, setTimeRange] = useState<TimeHorizonFilter>('4W');
  const [containerWidth, setContainerWidth] = useState<number>(360);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [workouts, setWorkouts] = useState<any[]>([]);
  const [meals, setMeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    const loadData = async () => {
      const userId = profile?.id;
      if (!userId) return;
      setLoading(true);
      try {
        const [workoutsRes, mealsRes] = await Promise.all([
          supabase
            .from('workout_logs')
            .select('*, workout_log_sets(reps, is_completed)')
            .eq('user_id', userId)
            .order('created_at', { ascending: true }),
          supabase
            .from('meals')
            .select('created_at, total_calories, total_protein_g')
            .eq('user_id', userId)
            .order('created_at', { ascending: true })
        ]);

        if (workoutsRes.data) setWorkouts(workoutsRes.data);
        if (mealsRes.data) setMeals(mealsRes.data);
      } catch (e) {
        console.warn('Failed to load analytics data:', e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [profile?.id]);

  // Helper to generate dynamic daily analytics for the past 7 days (ending today)
  const getDynamicLast7DaysData = (): AnalyticsDataPoint[] => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: AnalyticsDataPoint[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStr = d.toISOString().split('T')[0]; // "YYYY-MM-DD"

      const dayName = dayNames[d.getDay()];
      const monthName = monthNames[d.getMonth()];
      const dateNum = d.getDate();
      const isToday = i === 0;
      const isYesterday = i === 1;
      const dayDescriptor = isToday ? 'Today' : isYesterday ? 'Yesterday' : dayName;

      // Filter data for this local day
      const dayWorkouts = workouts.filter(w => {
        const wDate = new Date(w.created_at);
        return wDate.toLocaleDateString('en-CA') === dayStr;
      });
      const dayMeals = meals.filter(m => {
        const mDate = new Date(m.created_at);
        return mDate.toLocaleDateString('en-CA') === dayStr;
      });

      // Sum metrics
      const volKg = dayWorkouts.reduce((sum, w) => sum + Number(w.total_volume_kg || 0), 0);
      const durationMins = dayWorkouts.reduce((sum, w) => sum + Number(w.duration_minutes || 0), 0);
      const reps = dayWorkouts.reduce((sum, w) => {
        const setReps = (w.workout_log_sets || [])
          .filter((s: any) => s.is_completed)
          .reduce((sSum: number, s: any) => sSum + Number(s.reps || 0), 0);
        return sum + setReps;
      }, 0);

      const caloriesKcal = dayMeals.reduce((sum, m) => sum + Number(m.total_calories || 0), 0);
      const proteinG = dayMeals.reduce((sum, m) => sum + Number(m.total_protein_g || 0), 0);

      result.push({
        label: isToday ? 'Today' : dayName,
        fullLabel: `${dayDescriptor} (${monthName} ${dateNum})`,
        volKg,
        durationMins,
        reps,
        caloriesKcal,
        proteinG: Math.round(proteinG),
      });
    }

    return result;
  };

  // Helper to generate dynamic multi-week Sunday milestone dataset
  const getDynamicMultiWeekData = (totalWeeks: number): AnalyticsDataPoint[] => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    const result: AnalyticsDataPoint[] = [];

    const currentDay = now.getDay();
    const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - diffToMonday);
    thisMonday.setHours(0, 0, 0, 0);

    for (let i = totalWeeks - 1; i >= 0; i--) {
      const weekStart = new Date(thisMonday);
      weekStart.setDate(thisMonday.getDate() - i * 7);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7); // Exclusive end

      const sundayDate = new Date(weekStart);
      sundayDate.setDate(weekStart.getDate() + 6);
      const monthName = monthNames[sundayDate.getMonth()];
      const dateNum = sundayDate.getDate();

      const isCurrentWeek = i === 0;

      // Filter data for this week range
      const weekWorkouts = workouts.filter(w => {
        const wDate = new Date(w.created_at);
        return wDate >= weekStart && wDate < weekEnd;
      });
      const weekMeals = meals.filter(m => {
        const mDate = new Date(m.created_at);
        return mDate >= weekStart && mDate < weekEnd;
      });

      // Sum metrics
      const volKg = weekWorkouts.reduce((sum, w) => sum + Number(w.total_volume_kg || 0), 0);
      const durationMins = weekWorkouts.reduce((sum, w) => sum + Number(w.duration_minutes || 0), 0);
      const reps = weekWorkouts.reduce((sum, w) => {
        const setReps = (w.workout_log_sets || [])
          .filter((s: any) => s.is_completed)
          .reduce((sSum: number, s: any) => sSum + Number(s.reps || 0), 0);
        return sum + setReps;
      }, 0);

      const daysInWeek = isCurrentWeek ? Math.max(1, now.getDay() === 0 ? 7 : now.getDay()) : 7;
      const caloriesKcal = Math.round(weekMeals.reduce((sum, m) => sum + Number(m.total_calories || 0), 0) / daysInWeek);
      const proteinG = Math.round(weekMeals.reduce((sum, m) => sum + Number(m.total_protein_g || 0), 0) / daysInWeek);

      result.push({
        label: isCurrentWeek ? 'This Wk' : `${monthName} ${dateNum}`,
        fullLabel: isCurrentWeek
          ? `This Week (${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} – Today)`
          : `Week ending ${monthName} ${dateNum}`,
        volKg,
        durationMins,
        reps,
        caloriesKcal,
        proteinG,
      });
    }

    return result;
  };

  // Slice dataset according to time range filter
  const getFilteredData = (): AnalyticsDataPoint[] => {
    switch (timeRange) {
      case '1W':
        return getDynamicLast7DaysData();
      case '4W':
        return getDynamicMultiWeekData(4);
      case '8W':
        return getDynamicMultiWeekData(8);
      case '12W':
        return getDynamicMultiWeekData(12);
      default:
        return getDynamicMultiWeekData(4);
    }
  };

  const chartData = getFilteredData();

  // Layout calculations
  const onContainerLayout = (event: LayoutChangeEvent) => {
    const width = event.nativeEvent.layout.width;
    if (width > 0 && Math.abs(width - containerWidth) > 1) {
      setContainerWidth(width);
    }
  };

  const svgWidth = Math.max(300, containerWidth - 32);
  const svgHeight = 220;
  const paddingLeft = 44;
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
          primaryColor: theme.isDark ? theme.accentGold : theme.primary,
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
          lineColor: theme.isDark ? theme.accentGreen : theme.primary,
          areaGradientId: 'greenGrad',
          getVal: (d: AnalyticsDataPoint) => d.caloriesKcal,
          fmtVal: (val: number) => `${val} kcal`,
        };
      case 'PROTEIN':
        return {
          max: 250,
          ticks: ['250g', '190g', '125g', '60g', '0'],
          label: 'Protein (g)',
          lineColor: '#06B6D4',
          areaGradientId: 'cyanGrad',
          getVal: (d: AnalyticsDataPoint) => d.proteinG,
          fmtVal: (val: number) => `${val}g protein`,
        };
    }
  };

  const wConfig = getWorkoutConfig();
  const nConfig = getNutritionConfig();

  // Selected Data Point for tooltip
  const activeIdx = selectedIndex !== null && selectedIndex < chartData.length ? selectedIndex : chartData.length - 1;
  const activeDataPoint = chartData[activeIdx] || chartData[0];

  // Dynamic Bar Width
  const maxBarWidth = timeRange === '1W' ? 18 : timeRange === '4W' ? 24 : timeRange === '8W' ? 14 : 9;
  const rawBarWidth = (graphWidth / chartData.length) * 0.45;
  const barWidth = Math.max(6, Math.min(maxBarWidth, rawBarWidth));

  // Compute smooth line path and points for Nutrition Curve
  const points = chartData.map((d, idx) => {
    const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = paddingLeft + (idx / divisor) * graphWidth;
    const nVal = nConfig.getVal(d);
    const yRatio = Math.min(1, Math.max(0, nVal / nConfig.max));
    const y = paddingTop + graphHeight - yRatio * graphHeight;
    return { x, y, data: d };
  });

  const generateSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let path = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const linePath = generateSmoothPath(points);
  const baselineY = paddingTop + graphHeight;
  const areaPath = points.length > 1
    ? `${linePath} L ${points[points.length - 1].x} ${baselineY} L ${points[0].x} ${baselineY} Z`
    : '';

  const fontSizeX = timeRange === '12W' ? 7.5 : timeRange === '8W' ? 8.5 : 10;

  if (loading) {
    return (
      <View
        style={[
          styles.cardContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            height: 300,
            justifyContent: 'center',
            alignItems: 'center',
          },
        ]}
      >
        <ActivityIndicator size="small" color={theme.isDark ? theme.accentGold : theme.primary} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.cardContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...theme.shadow,
        },
      ]}
      onLayout={onContainerLayout}
    >
      {/* Header: Title + Time Horizon Selector */}
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: theme.text }]}>Progress Analytics</Text>

        {/* Time Horizon Pills */}
        <View
          style={[
            styles.topRightRangeSelector,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          {(['1W', '4W', '8W', '12W'] as const).map((range) => {
            const isActive = timeRange === range;
            return (
              <TouchableOpacity
                key={range}
                style={[
                  styles.topRangeBtn,
                  isActive && {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                onPress={() => {
                  setTimeRange(range);
                  setSelectedIndex(null);
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.topRangeBtnText,
                    {
                      color: isActive
                        ? theme.isDark
                          ? '#0A1A12'
                          : '#FFFFFF'
                        : theme.textMuted,
                    },
                  ]}
                >
                  {range}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Interactive Tooltip Card */}
      {activeDataPoint && (
        <View
          style={[
            styles.activeSelectionBanner,
            {
              backgroundColor: theme.cardInner,
              borderColor: theme.border,
            },
          ]}
        >
          <View style={styles.activeSelectionHeader}>
            <Text style={[styles.activeDateText, { color: theme.text }]}>{activeDataPoint.fullLabel}</Text>
            {activeDataPoint.volKg >= 190000 && timeRange !== '1W' && (
              <View style={styles.peakBadge}>
                <Text style={styles.peakBadgeText}>Peak Volume</Text>
              </View>
            )}
          </View>

          <View style={styles.activeSelectionStats}>
            {/* Workout Stat */}
            <View style={styles.statPill}>
              <View style={[styles.colorDot, { backgroundColor: wConfig.primaryColor }]} />
              <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>{wConfig.label}:</Text>
              <Text style={[styles.statPillValue, { color: theme.text }]}>
                {wConfig.fmtVal(wConfig.getVal(activeDataPoint))}
              </Text>
            </View>

            {/* Nutrition Stat */}
            <View style={styles.statPill}>
              <View style={[styles.colorDot, { backgroundColor: nConfig.lineColor }]} />
              <Text style={[styles.statPillLabel, { color: theme.textSecondary }]}>{nConfig.label}:</Text>
              <Text style={[styles.statPillValue, { color: theme.text }]}>
                {nConfig.fmtVal(nConfig.getVal(activeDataPoint))}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Dynamic Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: wConfig.primaryColor }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Bars: {wConfig.label}</Text>
        </View>

        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: nConfig.lineColor }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Curve: {nConfig.label}</Text>
        </View>
      </View>

      {/* SVG Dual-Axis Chart Canvas */}
      <View style={styles.chartWrapper}>
        <Svg width={svgWidth} height={svgHeight}>
          <Defs>
            {/* Workout Volume Gradient */}
            <LinearGradient id="workoutVolGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={theme.isDark ? '#E5C158' : '#1B4332'} stopOpacity="1" />
              <Stop offset="100%" stopColor={theme.isDark ? '#D4AF37' : '#2D6A4F'} stopOpacity="0.85" />
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
              <Stop offset="0%" stopColor={theme.isDark ? '#10B981' : '#2D6A4F'} stopOpacity="0.45" />
              <Stop offset="100%" stopColor={theme.isDark ? '#10B981' : '#2D6A4F'} stopOpacity="0.0" />
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
                stroke={theme.border}
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
              fill={theme.textMuted}
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
              fill={theme.textMuted}
              fontSize="9"
              textAnchor="start"
            >
              {tick}
            </SvgText>
          ))}

          {/* Workout Vertical Bars */}
          {chartData.map((d, idx) => {
            const divisor = chartData.length > 1 ? chartData.length - 1 : 1;
            const xCenter = paddingLeft + (idx / divisor) * graphWidth;
            const x = xCenter - barWidth / 2;

            const wVal = wConfig.getVal(d);
            const yRatio = Math.min(1, Math.max(0, wVal / wConfig.max));
            const barHeight = Math.max(wVal > 0 ? 4 : 0, yRatio * graphHeight);
            const y = paddingTop + graphHeight - barHeight;
            const isSelected = idx === activeIdx;

            return (
              <Rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                rx={barWidth / 2}
                ry={barWidth / 2}
                fill={`url(#${wConfig.barGradientId})`}
                opacity={isSelected ? 1 : 0.65}
              />
            );
          })}

          {/* Nutrition Area Fill */}
          <Path d={areaPath} fill={`url(#${nConfig.areaGradientId})`} />

          {/* Glowing Nutrition Curve Line */}
          <Path d={linePath} fill="none" stroke={nConfig.lineColor} strokeWidth="2.8" />

          {/* Data Point Circles along Curve */}
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
                fill={
                  isSelected
                    ? theme.isDark
                      ? theme.accentGold
                      : theme.primary
                    : theme.textSecondary
                }
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
          <Text style={[styles.filterSectionLabel, { color: theme.textSecondary }]}>WORKOUT METRIC</Text>
          <View style={styles.smallPillRow}>
            {(['VOLUME', 'DURATION', 'REPS'] as const).map((filter) => {
              const isActive = workoutFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: isActive
                        ? theme.isDark
                          ? '#232048'
                          : '#EEF2FF'
                        : theme.cardInner,
                      borderColor: isActive
                        ? theme.isDark
                          ? theme.accentGold
                          : '#6366F1'
                        : theme.border,
                    },
                  ]}
                  onPress={() => setWorkoutFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      {
                        color: isActive
                          ? theme.isDark
                            ? theme.accentGold
                            : '#4F46E5'
                          : theme.textSecondary,
                        fontWeight: isActive ? 'bold' : '600',
                      },
                    ]}
                  >
                    {filter === 'VOLUME'
                      ? 'Volume (kg)'
                      : filter === 'DURATION'
                        ? 'Duration (min)'
                        : 'Total Reps'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Nutrition Metric Selector */}
        <View style={styles.filterSection}>
          <Text style={[styles.filterSectionLabel, { color: theme.textSecondary }]}>NUTRITION METRIC</Text>
          <View style={styles.smallPillRow}>
            {(['CALORIES', 'PROTEIN'] as const).map((filter) => {
              const isActive = nutritionFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  style={[
                    styles.smallPill,
                    {
                      backgroundColor: isActive
                        ? theme.isDark
                          ? theme.badgeBg
                          : '#E8F5E9'
                        : theme.cardInner,
                      borderColor: isActive
                        ? theme.isDark
                          ? theme.accentGreen
                          : theme.primary
                        : theme.border,
                    },
                  ]}
                  onPress={() => setNutritionFilter(filter)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.smallPillText,
                      {
                        color: isActive
                          ? theme.isDark
                            ? theme.accentGreen
                            : theme.primary
                          : theme.textSecondary,
                        fontWeight: isActive ? 'bold' : '600',
                      },
                    ]}
                  >
                    {filter === 'CALORIES' ? 'Calories (kcal)' : 'Protein (g)'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    width: '100%',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  topRightRangeSelector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 2,
    borderWidth: 1,
  },
  topRangeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  topRangeBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  activeSelectionBanner: {
    borderRadius: 12,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
  },
  activeSelectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activeDateText: {
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
    fontSize: 10,
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
    fontSize: 12,
  },
  statPillValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
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
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  smallPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  smallPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  smallPillText: {
    fontSize: 9.5,
  },
});
