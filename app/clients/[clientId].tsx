import React, { useState } from 'react';
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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../store/trainerStore';
import { useProgressStore } from '../../store/progressStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { WeeklyProfileAnalytics } from '../../components/WeeklyProfileAnalytics';
import { useTheme } from '../../lib/theme';

export default function ClientInspectionDetailScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  const { clients, updateClientMacroTargets, unlinkClient } = useTrainerStore();
  const { weightHistory, checkinPhotos, getCalculatedMetrics, deleteCheckinPhoto } = useProgressStore();
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const profile = useAuthStore((state) => state.profile);
  const theme = useTheme();

  // Edit Targets Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState<string>('2100');

  const client = clients.find((c) => c.clientId === clientId) || clients[0];

  // Auto-calculated health metrics matching Client Personal Profile
  const healthStats = getCalculatedMetrics({
    heightCm: profile?.heightCm || 175,
    weightKg: profile?.weightKg || 76.4,
    sex: profile?.sex || 'MALE',
    neckCm: profile?.bodyMeasurements?.neckCm || 39,
    waistCm: profile?.bodyMeasurements?.waistCm || 84,
    hipsCm: profile?.bodyMeasurements?.hipsCm || 98,
    activityLevel: profile?.activityLevel || 'MODERATELY_ACTIVE',
  });

  const handleUnlink = () => {
    if (!client) return;
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

  const targetCal = client?.targetCalories || 2100;
  const loggedCal = client?.todayCaloriesLogged || 1850;

  const targetProtein = Math.round((targetCal * 0.3) / 4);
  const loggedProtein = Math.round((loggedCal * 0.3) / 4);
  const proteinPct = Math.min(100, Math.round((loggedProtein / targetProtein) * 100));

  const targetCarbs = Math.round((targetCal * 0.4) / 4);
  const loggedCarbs = Math.round((loggedCal * 0.4) / 4);
  const carbsPct = Math.min(100, Math.round((loggedCarbs / targetCarbs) * 100));

  const targetFat = Math.round((targetCal * 0.3) / 9);
  const loggedFat = Math.round((loggedCal * 0.3) / 9);
  const fatPct = Math.min(100, Math.round((loggedFat / targetFat) * 100));

  const sampleWorkoutDetails = {
    title: client?.currentPlanTitle ? `${client.currentPlanTitle} - Day 1` : 'Chest & Triceps Hypertrophy',
    time: '10:15 AM',
    duration: '42 min',
    setsCount: 14,
    volumeKg: 3850,
    exercises: [
      {
        name: 'Barbell Bench Press',
        sets: [
          { setNum: 1, weight: 80, reps: 8 },
          { setNum: 2, weight: 85, reps: 8 },
          { setNum: 3, weight: 85, reps: 6 },
          { setNum: 4, weight: 80, reps: 8 },
        ],
      },
      {
        name: 'Incline DB Press',
        sets: [
          { setNum: 1, weight: 28, reps: 10 },
          { setNum: 2, weight: 30, reps: 10 },
          { setNum: 3, weight: 30, reps: 8 },
        ],
      },
      {
        name: 'Tricep Rope Pushdown',
        sets: [
          { setNum: 1, weight: 32, reps: 12 },
          { setNum: 2, weight: 36, reps: 10 },
          { setNum: 3, weight: 36, reps: 10 },
        ],
      },
    ],
  };

  const sampleLoggedMeals = [
    { title: 'Breakfast: Eggs & Sourdough Toast', desc: '3 Whole Eggs, 2 Toast, Butter', kcal: 520 },
    { title: 'Lunch: Grilled Chicken & Rice', desc: '200g Chicken, 150g Rice, Broccoli', kcal: 680 },
    { title: 'Dinner: Salmon & Roasted Veggies', desc: '180g Salmon, Asparagus, Olive Oil', kcal: 650 },
  ];

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
              Plan: {client?.currentPlanTitle || 'No Plan'} • Goal: Hypertrophy
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
            {sampleLoggedMeals.map((meal, idx) => (
              <View
                key={idx}
                style={[
                  styles.mealRow,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mealTitle, { color: theme.text }]}>{meal.title}</Text>
                  <Text style={[styles.mealDesc, { color: theme.textMuted }]}>{meal.desc}</Text>
                </View>
                <Text
                  style={[
                    styles.mealKcal,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  {meal.kcal} kcal
                </Text>
              </View>
            ))}
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
                  client?.todayWorkoutDone ? styles.statusDone : styles.statusPending,
                  {
                    backgroundColor: client?.todayWorkoutDone
                      ? theme.isDark
                        ? theme.badgeBg
                        : '#E8F5E9'
                      : theme.isDark
                      ? '#3B1A08'
                      : '#FEF3C7',
                    borderColor: client?.todayWorkoutDone ? theme.success : theme.warning,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    { color: client?.todayWorkoutDone ? theme.success : theme.warning },
                  ]}
                >
                  {client?.todayWorkoutDone ? 'Completed' : 'Pending'}
                </Text>
              </View>
            </View>

            {client?.todayWorkoutDone ? (
              <>
                <Text style={[styles.workoutSessionTitle, { color: theme.text }]}>{sampleWorkoutDetails.title}</Text>

                <View style={styles.workoutStatsRow}>
                  <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                    <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{sampleWorkoutDetails.duration}</Text>
                    <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Duration</Text>
                  </View>
                  <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                    <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{sampleWorkoutDetails.setsCount} Sets</Text>
                    <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Completed</Text>
                  </View>
                  <View style={[styles.workoutKpiChip, { backgroundColor: theme.card }]}>
                    <Text style={[styles.workoutKpiVal, { color: theme.text }]}>{sampleWorkoutDetails.volumeKg.toLocaleString()} kg</Text>
                    <Text style={[styles.workoutKpiLabel, { color: theme.textMuted }]}>Total Volume</Text>
                  </View>
                </View>

                <View style={styles.exList}>
                  {sampleWorkoutDetails.exercises.map((ex, exIdx) => (
                    <View
                      key={exIdx}
                      style={[styles.exCard, { backgroundColor: theme.card }]}
                    >
                      <Text style={[styles.exName, { color: theme.text }]}>{ex.name}</Text>
                      <View style={styles.setsList}>
                        {ex.sets.map((set, sIdx) => (
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
                              Set {set.setNum}
                            </Text>
                            <Text style={[styles.setVal, { color: theme.textSecondary }]}>
                              {set.weight} kg × {set.reps} reps
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={[styles.emptyWorkoutText, { color: theme.textMuted }]}>
                No workout logged yet today. Scheduled routine: "{client?.currentPlanTitle || 'Routine'}".
              </Text>
            )}
          </View>
        </View>

        {/* SECTION 2: CLIENT PERFORMANCE ANALYTICS */}
        <WeeklyProfileAnalytics />

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

        {/* SECTION 4: PERSONAL RECORDS (1RMs) */}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Records (1RMs)</Text>

          <View style={styles.prGrid}>
            <View
              style={[
                styles.prTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.prExercise, { color: theme.textSecondary }]}>Bench Press</Text>
              <Text
                style={[
                  styles.prValue,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                {personalRecords['ex_01']?.oneRmKg ? `${personalRecords['ex_01'].oneRmKg} kg` : '95.0 kg'}
              </Text>
              <Text style={[styles.prFormula, { color: theme.textMuted }]}>Epley 1RM Formula</Text>
            </View>

            <View
              style={[
                styles.prTile,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.prExercise, { color: theme.textSecondary }]}>Back Squat</Text>
              <Text
                style={[
                  styles.prValue,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                {personalRecords['ex_07']?.oneRmKg ? `${personalRecords['ex_07'].oneRmKg} kg` : '128.3 kg'}
              </Text>
              <Text style={[styles.prFormula, { color: theme.textMuted }]}>Epley 1RM Formula</Text>
            </View>
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

          {checkinPhotos.length === 0 ? (
            <Text style={[styles.emptyPhotoText, { color: theme.textMuted }]}>No transformation photos uploaded yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {checkinPhotos.map((photo) => (
                <View
                  key={photo.id}
                  style={[
                    styles.photoCard,
                    { backgroundColor: theme.cardInner, borderColor: theme.border },
                  ]}
                >
                  <View style={{ position: 'relative' }}>
                    <Image source={{ uri: photo.photoUrl }} style={styles.photoImg} />
                    <TouchableOpacity
                      style={styles.deletePhotoBadge}
                      onPress={() => {
                        Alert.alert(
                          'Delete Check-In Photo',
                          'Are you sure you want to remove this transformation photo?',
                          [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deleteCheckinPhoto(photo.id) },
                          ]
                        );
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="trash-outline" size={14} color={theme.danger} />
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.photoDate, { color: theme.textSecondary }]}>
                    {new Date(photo.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
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
  prGrid: {
    gap: 10,
  },
  prTile: {
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
  },
  prExercise: {
    fontSize: 12,
    fontWeight: '600',
  },
  prValue: {
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  prFormula: {
    fontSize: 10.5,
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
