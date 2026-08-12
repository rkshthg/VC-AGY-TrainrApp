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
import { useTrainerStore } from '../../store/trainerStore';
import { useProgressStore } from '../../store/progressStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { WeeklyProfileAnalytics } from '../../components/WeeklyProfileAnalytics';

export default function ClientInspectionDetailScreen() {
  const router = useRouter();
  const { clientId } = useLocalSearchParams();
  const { clients, updateClientMacroTargets, unlinkClient } = useTrainerStore();
  const { weightHistory, checkinPhotos, getCalculatedMetrics, deleteCheckinPhoto } = useProgressStore();
  const personalRecords = useWorkoutStore((state) => state.personalRecords);
  const profile = useAuthStore((state) => state.profile);

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
  const calPct = Math.min(100, Math.round((loggedCal / targetCal) * 100));

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
          { setNum: 2, weight: 35, reps: 12 },
          { setNum: 3, weight: 35, reps: 10 },
        ],
      },
    ],
  };

  const sampleLoggedMeals = [
    { title: '🍳 Breakfast', desc: 'Oatmeal, Whole Eggs & Blueberries', kcal: 520 },
    { title: '🥗 Lunch', desc: 'Grilled Chicken Breast, Brown Rice & Broccoli', kcal: 680 },
    { title: '🐟 Dinner', desc: 'Pan-seared Salmon & Asparagus', kcal: 650 },
  ];

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{client?.fullName.charAt(0) || 'C'}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.clientName}>{client?.fullName || 'Client Profile'}</Text>
              <View style={client?.status === 'ON_TRACK' ? styles.badgeSuccess : styles.badgeAlert}>
                <Text style={client?.status === 'ON_TRACK' ? styles.badgeSuccessText : styles.badgeAlertText}>
                  {client?.status === 'ON_TRACK' ? '⚡ ON TRACK' : '⚠️ ATTENTION'}
                </Text>
              </View>
            </View>
            <Text style={styles.headerSubText}>
              Assigned: {client?.currentPlanTitle || 'No Active Routine'}
            </Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1️⃣ SECTION 1: TODAY'S OVERVIEW (PROGRESS, NUTRITION & WORKOUT) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>1️⃣ Today's Overview</Text>

          {/* Today's Daily Nutrition Section with Edit Targets Action */}
          <View style={styles.subCard}>
            <View style={styles.nutritionCardHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subCardTitle}>🥗 Today's Daily Nutrition</Text>
                <Text style={styles.subCardBadge}>
                  {loggedCal.toLocaleString()} of {targetCal.toLocaleString()} kcal ({calPct}%)
                </Text>
              </View>

              {/* 🎯 Edit Targets Button */}
              <TouchableOpacity
                style={styles.btnEditTargets}
                onPress={() => {
                  setTargetCaloriesInput(String(client?.targetCalories || 2100));
                  setEditModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.btnEditTargetsText}>🎯 Edit Targets</Text>
              </TouchableOpacity>
            </View>

            {/* Proportional Segmented Progress Bar & Macro Grid */}
            {(() => {
              const pKcal = Math.round(loggedProtein * 4);
              const cKcal = Math.round(loggedCarbs * 4);
              const fKcal = Math.round(loggedFat * 9);
              const remKcal = Math.max(0, targetCal - loggedCal);
              const totKcalTrack = Math.max(targetCal, pKcal + cKcal + fKcal + remKcal);

              return (
                <>
                  <View style={styles.segmentedProgressBarTrack}>
                    {pKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: pKcal, backgroundColor: '#3B82F6' }]} />
                    )}
                    {cKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: cKcal, backgroundColor: '#A855F7' }]} />
                    )}
                    {fKcal > 0 && (
                      <View style={[styles.segmentedFill, { flex: fKcal, backgroundColor: '#F59E0B' }]} />
                    )}
                    {(remKcal > 0 || totKcalTrack === 0) && (
                      <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remKcal), backgroundColor: '#1E293B' }]} />
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
                      <Text style={styles.macroPillVal}>{loggedProtein}g / {targetProtein}g</Text>
                      <Text style={styles.macroPillSub}>{pKcal} kcal ({proteinPct}%)</Text>
                    </View>

                    {/* Carbs */}
                    <View style={styles.macroPillCard}>
                      <View style={styles.macroPillHeader}>
                        <View style={[styles.macroDot, { backgroundColor: '#A855F7' }]} />
                        <Text style={styles.macroPillLabel}>CARBS</Text>
                      </View>
                      <Text style={styles.macroPillVal}>{loggedCarbs}g / {targetCarbs}g</Text>
                      <Text style={styles.macroPillSub}>{cKcal} kcal ({carbsPct}%)</Text>
                    </View>

                    {/* Fat */}
                    <View style={styles.macroPillCard}>
                      <View style={styles.macroPillHeader}>
                        <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
                        <Text style={styles.macroPillLabel}>FAT</Text>
                      </View>
                      <Text style={styles.macroPillVal}>{loggedFat}g / {targetFat}g</Text>
                      <Text style={styles.macroPillSub}>{fKcal} kcal ({fatPct}%)</Text>
                    </View>
                  </View>
                </>
              );
            })()}

            {/* Logged Meals List */}
            <Text style={styles.mealsListHeader}>Logged Meals Today:</Text>
            {sampleLoggedMeals.map((meal, idx) => (
              <View key={idx} style={styles.mealRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealTitle}>{meal.title}</Text>
                  <Text style={styles.mealDesc}>{meal.desc}</Text>
                </View>
                <Text style={styles.mealKcal}>{meal.kcal} kcal</Text>
              </View>
            ))}
          </View>

          {/* Today's Workout Breakdown */}
          <View style={styles.subCard}>
            <View style={styles.workoutHeaderRow}>
              <Text style={styles.subCardTitle}>🏋️ Today's Workout</Text>
              <View style={[styles.statusTag, client?.todayWorkoutDone ? styles.statusDone : styles.statusPending]}>
                <Text style={[styles.statusTagText, client?.todayWorkoutDone ? { color: '#10B981' } : { color: '#F59E0B' }]}>
                  {client?.todayWorkoutDone ? '✓ Completed' : '⌛ Pending'}
                </Text>
              </View>
            </View>

            {client?.todayWorkoutDone ? (
              <>
                <Text style={styles.workoutSessionTitle}>{sampleWorkoutDetails.title}</Text>

                <View style={styles.workoutStatsRow}>
                  <View style={styles.workoutKpiChip}>
                    <Text style={styles.workoutKpiVal}>⏱️ {sampleWorkoutDetails.duration}</Text>
                    <Text style={styles.workoutKpiLabel}>Duration</Text>
                  </View>
                  <View style={styles.workoutKpiChip}>
                    <Text style={styles.workoutKpiVal}>⚡ {sampleWorkoutDetails.setsCount} Sets</Text>
                    <Text style={styles.workoutKpiLabel}>Completed</Text>
                  </View>
                  <View style={styles.workoutKpiChip}>
                    <Text style={styles.workoutKpiVal}>💪 {sampleWorkoutDetails.volumeKg.toLocaleString()} kg</Text>
                    <Text style={styles.workoutKpiLabel}>Total Volume</Text>
                  </View>
                </View>

                <View style={styles.exList}>
                  {sampleWorkoutDetails.exercises.map((ex, exIdx) => (
                    <View key={exIdx} style={styles.exCard}>
                      <Text style={styles.exName}>🏋️ {ex.name}</Text>
                      <View style={styles.setsList}>
                        {ex.sets.map((set, sIdx) => (
                          <View key={sIdx} style={styles.setRow}>
                            <Text style={styles.setNum}>Set {set.setNum}</Text>
                            <Text style={styles.setVal}>{set.weight} kg × {set.reps} reps</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.emptyWorkoutText}>
                No workout logged yet today. Scheduled routine: "{client?.currentPlanTitle || 'Routine'}".
              </Text>
            )}
          </View>
        </View>

        {/* 2️⃣ SECTION 2: CLIENT PERFORMANCE ANALYTICS (Matches Client Personal Profile) */}
        <WeeklyProfileAnalytics />

        {/* 3️⃣ SECTION 3: AUTO-CALCULATED HEALTH METRICS (Matches Client Personal Profile) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Auto-Calculated Health Metrics</Text>

          <View style={styles.metricsGrid}>
            {/* BMI */}
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{healthStats.bmi}</Text>
              <Text style={styles.metricName}>Body Mass Index (BMI)</Text>
              <Text style={styles.metricCategory}>{healthStats.bmiCategory}</Text>
            </View>

            {/* Estimated Body Fat */}
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>
                {healthStats.estimatedBodyFatPct !== null ? `${healthStats.estimatedBodyFatPct}%` : '16.4%'}
              </Text>
              <Text style={styles.metricName}>Estimated Body Fat %</Text>
              <Text style={styles.metricCategory}>U.S. Navy Method</Text>
            </View>

            {/* BMR */}
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{healthStats.bmrKcal}</Text>
              <Text style={styles.metricName}>BMR (kcal/day)</Text>
              <Text style={styles.metricCategory}>Mifflin-St Jeor</Text>
            </View>

            {/* TDEE */}
            <View style={styles.metricTile}>
              <Text style={styles.metricValue}>{healthStats.tdeeKcal}</Text>
              <Text style={styles.metricName}>TDEE Target (kcal)</Text>
              <Text style={styles.metricCategory}>Daily Expenditure</Text>
            </View>
          </View>
        </View>

        {/* 4️⃣ SECTION 4: PERSONAL RECORDS (1RMs) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Personal Records (1RMs)</Text>

          <View style={styles.prGrid}>
            <View style={styles.prTile}>
              <Text style={styles.prExercise}>Bench Press</Text>
              <Text style={styles.prValue}>
                {personalRecords['ex_01']?.oneRmKg ? `${personalRecords['ex_01'].oneRmKg} kg` : '95.0 kg'}
              </Text>
              <Text style={styles.prFormula}>Epley 1RM Formula</Text>
            </View>

            <View style={styles.prTile}>
              <Text style={styles.prExercise}>Back Squat</Text>
              <Text style={styles.prValue}>
                {personalRecords['ex_07']?.oneRmKg ? `${personalRecords['ex_07'].oneRmKg} kg` : '128.3 kg'}
              </Text>
              <Text style={styles.prFormula}>Epley 1RM Formula</Text>
            </View>
          </View>
        </View>

        {/* 5️⃣ SECTION 5: TRANSFORMATION PHOTO CHECK-INS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Transformation Photo Check-ins</Text>

          {checkinPhotos.length === 0 ? (
            <Text style={styles.emptyPhotoText}>No transformation photos uploaded yet.</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
              {checkinPhotos.map((photo) => (
                <View key={photo.id} style={styles.photoCard}>
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
                      <Text style={styles.deletePhotoBadgeText}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.photoDate}>
                    {new Date(photo.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* 🗑️ UNLINK CLIENT BUTTON */}
        <TouchableOpacity style={styles.unlinkBtn} onPress={handleUnlink} activeOpacity={0.8}>
          <Text style={styles.unlinkBtnText}>🗑️ Unlink Client from Roster</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🎯 EDIT TARGET MODAL */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Targets: {client?.fullName}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Daily Calorie Target (kcal):</Text>
            <TextInput
              style={styles.modalInput}
              value={targetCaloriesInput}
              keyboardType="numeric"
              onChangeText={setTargetCaloriesInput}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTargets}>
                <Text style={styles.modalSaveText}>Save Targets 🎯</Text>
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
    backgroundColor: '#0F172A',
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
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  headerAvatarText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  clientName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  badgeSuccess: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  badgeSuccessText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  badgeAlert: {
    backgroundColor: '#451A03',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  badgeAlertText: {
    color: '#F59E0B',
    fontSize: 9,
    fontWeight: 'bold',
  },
  headerSubText: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },

  sectionCard: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  subCard: {
    backgroundColor: '#0C1E19',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  nutritionCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subCardTitle: {
    color: '#A7F3D0',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  subCardBadge: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 2,
  },
  btnEditTargets: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  btnEditTargetsText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },

  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 12,
    backgroundColor: '#1E293B',
    borderRadius: 6,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 12,
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
    backgroundColor: '#06110D',
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#94A3B8',
    fontSize: 8.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    color: '#64748B',
    fontSize: 8.5,
    marginTop: 2,
  },
  macroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  macroName: {
    color: '#CBD5E1',
    fontSize: 11.5,
  },
  macroValText: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  progressTrack: {
    height: 5,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  mealsListHeader: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 6,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  mealTitle: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  mealDesc: {
    color: '#64748B',
    fontSize: 10,
  },
  mealKcal: {
    color: '#10B981',
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
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusDone: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  statusPending: {
    backgroundColor: '#451A03',
    borderColor: '#F59E0B',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  workoutSessionTitle: {
    color: '#F8FAFC',
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
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 6,
    alignItems: 'center',
  },
  workoutKpiVal: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
  },
  workoutKpiLabel: {
    color: '#64748B',
    fontSize: 9,
  },

  exList: {
    gap: 6,
  },
  exCard: {
    backgroundColor: '#0F172A',
    borderRadius: 8,
    padding: 8,
  },
  exName: {
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
    flexDirection: 'row',
    gap: 4,
  },
  setNum: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  setVal: {
    color: '#CBD5E1',
    fontSize: 10,
  },
  emptyWorkoutText: {
    color: '#64748B',
    fontSize: 11.5,
    fontStyle: 'italic',
  },

  /* HEALTH METRICS STYLES */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricTile: {
    width: '48%',
    backgroundColor: '#0C1E19',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  metricValue: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  metricName: {
    color: '#CBD5E1',
    fontSize: 11.5,
    fontWeight: '600',
    marginTop: 2,
  },
  metricCategory: {
    color: '#10B981',
    fontSize: 10.5,
    marginTop: 2,
  },

  /* PR STYLES */
  prGrid: {
    gap: 10,
  },
  prTile: {
    backgroundColor: '#0C1E19',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  prExercise: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  prValue: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  prFormula: {
    color: '#64748B',
    fontSize: 10.5,
  },

  /* PHOTO CHECKIN STYLES */
  emptyPhotoText: {
    color: '#64748B',
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
    backgroundColor: '#0C1E19',
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#94A3B8',
    fontSize: 10,
    textAlign: 'center',
    paddingVertical: 4,
  },

  unlinkBtn: {
    backgroundColor: '#451A03',
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

  /* EDIT TARGET MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#064E3B',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
