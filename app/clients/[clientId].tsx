import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../store/trainerStore';
import { useProgressStore } from '../../store/progressStore';
import { useWorkoutStore, CompletedWorkoutHeader } from '../../store/workoutStore';
import { useNutritionStore, MealEntry } from '../../store/nutritionStore';
import { useAuthStore } from '../../store/authStore';
import { WeeklyProfileAnalytics } from '../../components/WeeklyProfileAnalytics';
import { useTheme } from '../../lib/theme';
import { formatWeight, formatVolume, formatHeight, formatLength } from '../../lib/units';
import { supabase } from '../../lib/supabase';
import logger from '../../lib/logger';

export default function ClientInspectionDetailScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  const { clients, updateClientMacroTargets, unlinkClient } = useTrainerStore();
  const { getCalculatedMetrics } = useProgressStore();
  const { savedPlans } = useWorkoutStore();
  const unitSystem = useAuthStore((state) => state.unitSystem);
  const theme = useTheme();

  const [clientProfile, setClientProfile] = useState<any>(null);
  const [clientMeals, setClientMeals] = useState<MealEntry[]>([]);
  const [clientWorkouts, setClientWorkouts] = useState<CompletedWorkoutHeader[]>([]);
  const [clientPRs, setClientPRs] = useState<any[]>([]);
  const [clientCheckinPhotos, setClientCheckinPhotos] = useState<any[]>([]);
  const [clientWeightLogs, setClientWeightLogs] = useState<any[]>([]);
  const [clientLatestMeasurements, setClientLatestMeasurements] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // Edit Targets Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState<string>('2100');

  const client = clients.find((c) => c.clientId === clientId) || clients[0];
  const targetId = (clientId as string) || client?.clientId;
  const assignedPlan = savedPlans.find((p) => p.assignedClientIds?.includes(targetId || ''));
  const activePlanTitle = assignedPlan?.title || client?.currentPlanTitle || 'No Plan';

  useEffect(() => {
    if (!targetId) return;
    let isMounted = true;
    setIsLoading(true);

    const loadClientProfileData = async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const [userRes, weightRes, measurementRes, mealsRes, workoutsRes, prsRes, photosRes] = await Promise.all([
          supabase.from('users').select('*').eq('id', targetId).maybeSingle(),
          supabase.from('weight_logs').select('*').eq('user_id', targetId).order('recorded_at', { ascending: false }),
          supabase.from('body_measurements').select('*').eq('user_id', targetId).order('recorded_at', { ascending: false }),
          supabase.from('meals').select('*, meal_items(*)').eq('user_id', targetId).gte('created_at', startOfDay.toISOString()),
          supabase.from('workout_logs').select('*, workout_log_sets(*)').eq('user_id', targetId).gte('created_at', startOfDay.toISOString()),
          supabase.from('personal_records').select('*').eq('user_id', targetId),
          supabase.from('checkin_photos').select('*').eq('user_id', targetId).order('created_at', { ascending: false }),
        ]);

        if (!isMounted) return;

        if (userRes.data) setClientProfile(userRes.data);
        setClientWeightLogs(weightRes.data || []);

        const latestMeas = (measurementRes.data || [])[0] || {};
        setClientLatestMeasurements({
          neckCm: latestMeas.neck_cm,
          shouldersCm: latestMeas.shoulders_cm,
          chestCm: latestMeas.chest_cm,
          waistCm: latestMeas.waist_cm,
          hipsCm: latestMeas.hips_cm,
          bicepsCm: latestMeas.biceps_cm,
          bicepsLCm: latestMeas.biceps_l_cm,
          bicepsRCm: latestMeas.biceps_r_cm,
          thighsCm: latestMeas.thighs_cm,
          thighsLCm: latestMeas.thighs_l_cm,
          thighsRCm: latestMeas.thighs_r_cm,
        });

        const meals: MealEntry[] = (mealsRes.data || []).map((m: any) => ({
          id: m.id,
          userId: m.user_id,
          dishName: m.dish_name,
          category: m.category,
          timestamp: m.created_at,
          photoUrl: m.photo_url,
          totalCalories: m.total_calories,
          totalProteinG: m.total_protein_g,
          totalCarbsG: m.total_carbs_g,
          totalFatG: m.total_fat_g,
          items: (m.meal_items || []).map((i: any) => ({
            id: i.id,
            name: i.name,
            quantity: i.quantity,
            calories: i.calories,
            proteinG: i.protein_g,
            carbsG: i.carbs_g,
            fatG: i.fat_g,
          })),
        }));
        setClientMeals(meals);

        const workouts: CompletedWorkoutHeader[] = (workoutsRes.data || []).map((log: any) => {
          const rawSets = (log.workout_log_sets || []).filter((s: any) => s.is_completed !== false);
          const exerciseGroupMap: Record<string, any[]> = {};
          rawSets.forEach((s: any) => {
            const exName = s.exercise_name || 'Exercise';
            if (!exerciseGroupMap[exName]) exerciseGroupMap[exName] = [];
            exerciseGroupMap[exName].push(s);
          });

          const exerciseLogs = Object.keys(exerciseGroupMap).map((exName) => {
            const setsArr = exerciseGroupMap[exName];
            const totalVol = setsArr.reduce((acc: number, s: any) => acc + Number(s.weight_kg) * Number(s.reps), 0);
            const maxWeight = setsArr.reduce((max: number, s: any) => Math.max(max, Number(s.weight_kg)), 0);
            const avgReps = Math.round(setsArr.reduce((acc: number, s: any) => acc + Number(s.reps), 0) / setsArr.length);

            return {
              name: exName,
              sets: setsArr.length,
              reps: `${avgReps} reps`,
              targetWeightKg: maxWeight,
              totalVolumeKg: totalVol,
              rawSets: setsArr,
            };
          });

          return {
            id: log.id,
            title: log.title,
            date: log.created_at,
            durationMinutes: log.duration_minutes,
            totalVolumeKg: log.total_volume_kg,
            exerciseCount: log.exercise_count || exerciseLogs.length,
            exerciseLogs,
          };
        });
        setClientWorkouts(workouts);

        const parsedPRs = (prsRes.data || []).map((pr: any) => ({
          id: pr.id,
          exerciseId: pr.exercise_id,
          exerciseName: pr.exercise_name || 'Exercise',
          weightKg: pr.weight_kg,
          reps: pr.reps,
          oneRmKg: pr.one_rm_kg,
          date: pr.achieved_at,
        }));
        setClientPRs(parsedPRs);

        setClientCheckinPhotos(photosRes.data || []);
        setIsLoading(false);
      } catch (err) {
        logger.warn('Failed loading client inspection data:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    loadClientProfileData();
    return () => {
      isMounted = false;
    };
  }, [targetId]);

  // Auto-calculated health metrics matching Client Personal Profile
  const latestWeightKg = clientWeightLogs[0]?.weight_kg || clientProfile?.weight_kg || 75;
  const healthStats = getCalculatedMetrics({
    heightCm: clientProfile?.height_cm || 175,
    weightKg: latestWeightKg,
    sex: clientProfile?.sex || 'MALE',
    neckCm: clientLatestMeasurements.neckCm || clientProfile?.body_measurements?.neckCm || 39,
    waistCm: clientLatestMeasurements.waistCm || clientProfile?.body_measurements?.waistCm || 84,
    hipsCm: clientLatestMeasurements.hipsCm || clientProfile?.body_measurements?.hipsCm || 98,
    activityLevel: clientProfile?.activity_level || 'MODERATELY_ACTIVE',
  });

  const handleUnlink = () => {
    if (!client) return;
    if (Platform.OS === 'web') {
      const confirmUnlink = window.confirm(`Are you sure you want to drop ${client.fullName} from your client roster?`);
      if (confirmUnlink) {
        unlinkClient(client.clientId);
        router.replace('/(tabs)/clients');
      }
    } else {
      Alert.alert(
        'Unlink Client',
        `Are you sure you want to drop ${client.fullName} from your client roster?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlink Client',
            style: 'destructive',
            onPress: () => {
              unlinkClient(client.clientId);
              router.replace('/(tabs)/clients');
            },
          },
        ]
      );
    }
  };

  const handleSaveTargets = () => {
    if (!client) return;
    const calories = parseInt(targetCaloriesInput) || 2100;
    updateClientMacroTargets(client.clientId, {
      calories,
      protein: Math.round((calories * 0.3) / 4),
      carbs: Math.round((calories * 0.4) / 4),
      fat: Math.round((calories * 0.3) / 9),
    });
    setEditModalVisible(false);
    Alert.alert('Targets Saved', `Updated target calories to ${calories} kcal.`);
  };

  const targetCal = client?.targetCalories || 2500;
  const loggedCal = clientMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);
  const loggedProtein = clientMeals.reduce((sum, m) => sum + (m.totalProteinG || 0), 0);
  const loggedCarbs = clientMeals.reduce((sum, m) => sum + (m.totalCarbsG || 0), 0);
  const loggedFat = clientMeals.reduce((sum, m) => sum + (m.totalFatG || 0), 0);

  const targetProtein = client?.targetProtein || Math.round((targetCal * 0.3) / 4);
  const proteinPct = Math.min(100, Math.round((loggedProtein / targetProtein) * 100));

  const targetCarbs = client?.targetCarbs || Math.round((targetCal * 0.4) / 4);
  const carbsPct = Math.min(100, Math.round((loggedCarbs / targetCarbs) * 100));

  const targetFat = client?.targetFat || Math.round((targetCal * 0.3) / 9);
  const fatPct = Math.min(100, Math.round((loggedFat / targetFat) * 100));

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Top Header Card */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={[
              styles.headerAvatar,
              {
                backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
              },
            ]}
          >
            <Text
              style={[
                styles.headerAvatarText,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              {client?.fullName?.charAt(0) || 'C'}
            </Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.clientName, { color: theme.text }]}>{client?.fullName}</Text>
              <View
                style={[
                  client?.status === 'ON_TRACK' ? styles.badgeSuccess : styles.badgeAlert,
                  {
                    backgroundColor:
                      client?.status === 'ON_TRACK'
                        ? theme.isDark
                          ? theme.badgeBg
                          : '#E8F5E9'
                        : theme.isDark
                        ? '#3B1A08'
                        : '#FEF3C7',
                    borderColor: client?.status === 'ON_TRACK' ? theme.success : theme.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    client?.status === 'ON_TRACK' ? styles.badgeSuccessText : styles.badgeAlertText,
                    { color: client?.status === 'ON_TRACK' ? theme.success : theme.warning },
                  ]}
                >
                  {client?.status === 'ON_TRACK' ? 'On Track' : 'Attention'}
                </Text>
              </View>
            </View>
            <Text style={[styles.headerSubText, { color: theme.textSecondary }]}>
              Plan: {activePlanTitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: TODAY'S LOGS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Logged Activity</Text>

          {/* Today's Nutrition Breakdown */}
          <View
            style={[
              styles.subCard,
              { backgroundColor: theme.cardInner, borderColor: theme.border },
            ]}
          >
            <View style={styles.nutritionCardHeaderRow}>
              <View>
                <Text
                  style={[
                    styles.subCardTitle,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  Today's Nutrition
                </Text>
                <Text style={[styles.subCardBadge, { color: theme.textSecondary }]}>
                  {loggedCal.toLocaleString()} of {targetCal.toLocaleString()} kcal consumed
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.btnEditTargets,
                  {
                    backgroundColor: theme.cardAlt,
                    borderColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                onPress={() => {
                  setTargetCaloriesInput(String(targetCal));
                  setEditModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.btnEditTargetsText,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  Edit Target
                </Text>
              </TouchableOpacity>
            </View>

            {/* Segmented Energy Flow Bar */}
            {(() => {
              const pKcal = Math.round(loggedProtein * 4);
              const cKcal = Math.round(loggedCarbs * 4);
              const fKcal = Math.round(loggedFat * 9);
              const remKcal = Math.max(0, targetCal - loggedCal);
              const totKcalTrack = Math.max(targetCal, pKcal + cKcal + fKcal + remKcal);

              return (
                <>
                  <View
                    style={[
                      styles.segmentedProgressBarTrack,
                      { backgroundColor: theme.cardInner, borderColor: theme.border },
                    ]}
                  >
                    {pKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: pKcal, backgroundColor: theme.macroProtein }]} />
                    )}
                    {cKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: cKcal, backgroundColor: theme.macroCarbs }]} />
                    )}
                    {fKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: fKcal, backgroundColor: theme.macroFat }]} />
                    )}
                    {(remKcal > 0 || totKcalTrack === 0) && (
                      <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remKcal), backgroundColor: theme.cardAlt }]} />
                    )}
                  </View>

                  {/* 3-Column Macro Details Grid */}
                  <View style={styles.macroPillGrid}>
                    {/* Protein */}
                    <View
                      style={[
                        styles.macroPillCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.macroPillHeader}>
                        <View style={[styles.macroDot, { backgroundColor: theme.macroProtein }]} />
                        <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>PROTEIN</Text>
                      </View>
                      <Text style={[styles.macroPillVal, { color: theme.text }]}>{loggedProtein}g / {targetProtein}g</Text>
                      <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>{pKcal} kcal ({proteinPct}%)</Text>
                    </View>

                    {/* Carbs */}
                    <View
                      style={[
                        styles.macroPillCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.macroPillHeader}>
                        <View style={[styles.macroDot, { backgroundColor: theme.macroCarbs }]} />
                        <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>CARBS</Text>
                      </View>
                      <Text style={[styles.macroPillVal, { color: theme.text }]}>{loggedCarbs}g / {targetCarbs}g</Text>
                      <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>{cKcal} kcal ({carbsPct}%)</Text>
                    </View>

                    {/* Fat */}
                    <View
                      style={[
                        styles.macroPillCard,
                        { backgroundColor: theme.card, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.macroPillHeader}>
                        <View style={[styles.macroDot, { backgroundColor: theme.macroFat }]} />
                        <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>FAT</Text>
                      </View>
                      <Text style={[styles.macroPillVal, { color: theme.text }]}>{loggedFat}g / {targetFat}g</Text>
                      <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>{fKcal} kcal ({fatPct}%)</Text>
                    </View>
                  </View>
                </>
              );
            })()}

            {/* Logged Meals List */}
            <Text style={[styles.mealsListHeader, { color: theme.textSecondary }]}>Logged Meals Today:</Text>
            {clientMeals.length === 0 ? (
              <Text style={[styles.mealDesc, { color: theme.textMuted, marginVertical: 8 }]}>
                No meals logged today yet by this client.
              </Text>
            ) : (
              clientMeals.map((meal, idx) => (
                <View
                  key={meal.id || idx}
                  style={[
                    styles.mealRow,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.mealTitle, { color: theme.text }]}>
                      {meal.category}: {meal.dishName}
                    </Text>
                    <Text style={[styles.mealDesc, { color: theme.textMuted }]}>
                      {meal.items && meal.items.length > 0
                        ? meal.items.map((i) => `${i.name} (${i.quantity})`).join(', ')
                        : `${meal.totalProteinG}g P • ${meal.totalCarbsG}g C • ${meal.totalFatG}g F`}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.mealKcal,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    {meal.totalCalories} kcal
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Today's Workout Breakdown */}
          <View
            style={[
              styles.subCard,
              { backgroundColor: theme.cardInner, borderColor: theme.border },
            ]}
          >
            <View style={styles.workoutHeaderRow}>
              <Text
                style={[
                  styles.subCardTitle,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                Today's Workout
              </Text>
              <View
                style={[
                  clientWorkouts.length > 0 ? styles.statusDone : styles.statusPending,
                  {
                    backgroundColor: clientWorkouts.length > 0
                      ? theme.isDark
                        ? theme.badgeBg
                        : '#E8F5E9'
                      : theme.isDark
                      ? '#3B1A08'
                      : '#FEF3C7',
                    borderColor: clientWorkouts.length > 0 ? theme.success : theme.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: clientWorkouts.length > 0 ? theme.success : theme.warning },
                  ]}
                >
                  {clientWorkouts.length > 0 ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>

            {clientWorkouts.length > 0 ? (
              clientWorkouts.map((w, wIdx) => (
                <View key={w.id || wIdx} style={{ marginBottom: 12 }}>
                  <Text style={[styles.workoutSessionTitle, { color: theme.text }]}>{w.title}</Text>

                  <View style={styles.workoutStatsRow}>
                    <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                      <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{w.durationMinutes} min</Text>
                      <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Duration</Text>
                    </View>
                    <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                      <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{w.exerciseCount} Exercises</Text>
                      <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Completed</Text>
                    </View>
                    <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                      <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{formatVolume(w.totalVolumeKg, unitSystem)}</Text>
                      <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Total Volume</Text>
                    </View>
                  </View>

                  <View style={styles.exList}>
                    {(w.exerciseLogs || []).map((ex, exIdx) => (
                      <View
                        key={exIdx}
                        style={[styles.exCard, { backgroundColor: theme.card }]}
                      >
                        <Text style={[styles.exName, { color: theme.text }]}>{ex.name}</Text>
                        <View style={styles.setsList}>
                          {((ex as any).rawSets || []).map((set: any, sIdx: number) => (
                            <View
                              key={sIdx}
                              style={[styles.setRow, { backgroundColor: theme.cardInner }]}
                            >
                              <Text
                                style={[
                                  styles.setNum,
                                  { color: theme.isDark ? theme.accentGold : theme.primary },
                                ]}
                              >
                                Set {set.set_number || sIdx + 1}
                              </Text>
                              <Text style={[styles.setVal, { color: theme.textSecondary }]}>
                                {formatWeight(set.weight_kg, unitSystem)} × {set.reps} reps
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              ))
            ) : (
              <Text style={[styles.emptyWorkoutText, { color: theme.textMuted }]}>
                No workout logged yet today by this client. Routine: "{activePlanTitle}".
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 2: CLIENT PERFORMANCE ANALYTICS */}
        <WeeklyProfileAnalytics userId={targetId} />

        {/* SECTION 3: AUTO-CALCULATED HEALTH METRICS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Auto-Calculated Health Metrics</Text>

          <View style={styles.metricsGrid}>
            {/* BMI */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: theme.text }]}>{healthStats.bmi}</Text>
              <Text style={[styles.metricName, { color: theme.textSecondary }]}>Body Mass Index (BMI)</Text>
              <Text
                style={[
                  styles.metricCategory,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                {healthStats.bmiCategory}
              </Text>
            </View>

            {/* Estimated Body Fat */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: theme.text }]}>
                {healthStats.estimatedBodyFatPct !== null ? `${healthStats.estimatedBodyFatPct}%` : '16.4%'}
              </Text>
              <Text style={[styles.metricName, { color: theme.textSecondary }]}>Estimated Body Fat %</Text>
              <Text
                style={[
                  styles.metricCategory,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                U.S. Navy Method
              </Text>
            </View>

            {/* BMR */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: theme.text }]}>{healthStats.bmrKcal}</Text>
              <Text style={[styles.metricName, { color: theme.textSecondary }]}>BMR (kcal/day)</Text>
              <Text
                style={[
                  styles.metricCategory,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                Mifflin-St Jeor
              </Text>
            </View>

            {/* TDEE */}
            <View
              style={[
                styles.metricTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.metricValue, { color: theme.text }]}>{healthStats.tdeeKcal}</Text>
              <Text style={[styles.metricName, { color: theme.textSecondary }]}>TDEE Target (kcal)</Text>
              <Text
                style={[
                  styles.metricCategory,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                Daily Expenditure
              </Text>
            </View>
          </View>
        </View>

        {/* SECTION 4: BODY MEASUREMENTS (2-COLUMN GRID) */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Body Measurements</Text>

          <View style={styles.measurementsGrid}>
            {/* Height */}
            <View
              style={[
                styles.measureTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.measureTileHeader}>
                <Ionicons name="resize-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>HEIGHT</Text>
              </View>
              <Text style={[styles.measureTileVal, { color: theme.text }]}>
                {formatHeight(clientProfile?.height_cm || 175, unitSystem)}
              </Text>
            </View>

            {/* Weight */}
            <View
              style={[
                styles.measureTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.measureTileHeader}>
                <Ionicons name="scale-outline" size={14} color={theme.textSecondary} />
                <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>WEIGHT</Text>
              </View>
              <Text style={[styles.measureTileVal, { color: theme.text }]}>
                {formatWeight(latestWeightKg, unitSystem)}
              </Text>
            </View>

            {/* Neck */}
            {clientLatestMeasurements?.neckCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>NECK</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(clientLatestMeasurements.neckCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Chest */}
            {clientLatestMeasurements?.chestCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>CHEST</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(clientLatestMeasurements.chestCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Waist */}
            {clientLatestMeasurements?.waistCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>WAIST</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(clientLatestMeasurements.waistCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Hips */}
            {clientLatestMeasurements?.hipsCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="options-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>HIPS</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(clientLatestMeasurements.hipsCm, unitSystem)}
                </Text>
              </View>
            ) : null}

            {/* Biceps */}
            {clientLatestMeasurements?.bicepsCm || clientLatestMeasurements?.bicepsLCm || clientLatestMeasurements?.bicepsRCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="fitness-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>BICEPS</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(
                    clientLatestMeasurements.bicepsCm ||
                      Math.round(((clientLatestMeasurements.bicepsLCm || 0) + (clientLatestMeasurements.bicepsRCm || 0)) / 2),
                    unitSystem
                  )}
                </Text>
              </View>
            ) : null}

            {/* Thighs */}
            {clientLatestMeasurements?.thighsCm || clientLatestMeasurements?.thighsLCm || clientLatestMeasurements?.thighsRCm ? (
              <View
                style={[
                  styles.measureTile,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <View style={styles.measureTileHeader}>
                  <Ionicons name="fitness-outline" size={14} color={theme.textSecondary} />
                  <Text style={[styles.measureTileLabel, { color: theme.textSecondary }]}>THIGHS</Text>
                </View>
                <Text style={[styles.measureTileVal, { color: theme.text }]}>
                  {formatLength(
                    clientLatestMeasurements.thighsCm ||
                      Math.round(((clientLatestMeasurements.thighsLCm || 0) + (clientLatestMeasurements.thighsRCm || 0)) / 2),
                    unitSystem
                  )}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* SECTION 5: TRANSFORMATION PHOTO CHECK-INS */}
        <View
          style={[
            styles.sectionCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Transformation Photo Check-ins</Text>

          {clientCheckinPhotos.length === 0 ? (
            <Text style={[styles.emptyPhotoText, { color: theme.textMuted }]}>No transformation photos uploaded yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {clientCheckinPhotos.map((photo) => (
                <View
                  key={photo.id}
                  style={[
                    styles.photoCard,
                    { backgroundColor: theme.cardInner, borderColor: theme.border },
                  ]}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: photo.photo_url || photo.photoUrl }} style={styles.photoImg} />
                  </View>
                  <Text style={[styles.photoDate, { color: theme.textSecondary }]}>
                    {new Date(photo.created_at || photo.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* UNLINK CLIENT BUTTON */}
        <TouchableOpacity style={styles.unlinkBtn} onPress={handleUnlink} activeOpacity={0.8}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
            <Text style={styles.unlinkBtnText}>Unlink Client from Roster</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* EDIT TARGET MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Edit Targets: {client?.fullName}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Daily Calorie Target (kcal):</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={targetCaloriesInput}
              keyboardType="numeric"
              onChangeText={setTargetCaloriesInput}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                onPress={handleSaveTargets}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                  ]}
                >
                  Save Targets
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  headerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  headerAvatarText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  badgeSuccess: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeSuccessText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeAlert: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  badgeAlertText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerSubText: {
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  subCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  nutritionCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subCardTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  subCardBadge: {
    fontSize: 10.5,
    marginTop: 2,
  },
  btnEditTargets: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  btnEditTargetsText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
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
    gap: 6,
    marginBottom: 12,
  },
  macroPillCard: {
    flex: 1,
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillLabel: {
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    fontSize: 8.5,
    marginTop: 2,
  },
  mealsListHeader: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  mealTitle: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  mealDesc: {
    fontSize: 10,
  },
  mealKcal: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  workoutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDone: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusPending: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  workoutSessionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  workoutStatsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  workoutKpiChip: {
    flex: 1,
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  workoutKpiVal: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  workoutKpiLabel: {
    fontSize: 9,
  },
  exList: {
    gap: 6,
  },
  exCard: {
    borderRadius: 8,
    padding: 8,
  },
  exName: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  setsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  setRow: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
  },
  setNum: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  setVal: {
    fontSize: 10,
  },
  emptyWorkoutText: {
    fontSize: 11.5,
    fontStyle: 'italic',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricTile: {
    width: '48%',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricName: {
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  metricCategory: {
    fontSize: 10.5,
    marginTop: 2,
  },
  measurementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  measureTile: {
    width: '48%',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  measureTileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  measureTileLabel: {
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  measureTileVal: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyPhotoText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 12,
  },
  photoRow: {
    flexDirection: 'row',
  },
  photoCard: {
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
  },
  photoImg: {
    width: 100,
    height: 120,
    borderRadius: 8,
  },
  deletePhotoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deletePhotoBadgeText: {
    fontSize: 11,
  },
  photoDate: {
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
  },
  unlinkBtn: {
    backgroundColor: '#3B1A08',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#EF444455',
  },
  unlinkBtnText: {
    color: '#EF4444',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
