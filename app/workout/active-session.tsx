import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, ExerciseDef } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';
import { formatVolume, getWeightUnitLabel, convertWeight, parseWeightToKg, formatWeight } from '../../lib/units';
import { WeightInput } from '../../components/WeightInput';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
  const unitSystem = useAuthStore((state) => state.unitSystem);
  const weightStep = useAuthStore((state) => state.weightStep);

  const {
    activeSession,
    exerciseCatalog,
    toggleSetCompleted,
    updateSetValues,
    addSetToExercise,
    removeSetFromExercise,
    addExerciseToActiveSession,
    removeExerciseFromActiveSession,
    finishSession,
    cancelSession,
    addCustomExercise,
  } = useWorkoutStore();

  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const profile = useAuthStore((state) => state.profile);

  // Ticks once a second; elapsed time is measured from the session start so
  // it stays correct if the app was closed and the session restored.
  const [now, setNow] = useState(Date.now());
  const elapsedSeconds = activeSession ? Math.max(0, Math.floor((now - activeSession.startTime) / 1000)) : 0;

  // Rest timer (PRD 4.2): starts when a set is ticked off.
  const [restDurationSec, setRestDurationSec] = useState(90);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const restRemainingSec = restEndsAt ? Math.max(0, Math.ceil((restEndsAt - now) / 1000)) : 0;
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customMuscle, setCustomMuscle] = useState('Chest');
  const [customCategory, setCustomCategory] = useState('Barbell');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (restEndsAt && now >= restEndsAt) {
      setRestEndsAt(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, [now, restEndsAt]);

  const adjustRest = (deltaSec: number) => {
    setRestDurationSec((d) => Math.min(600, Math.max(15, d + deltaSec)));
    setRestEndsAt((end) => (end ? Math.max(Date.now() + 1000, end + deltaSec * 1000) : end));
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(remainingSec).padStart(2, '0')}`;
  };

  const handleToggleSet = (
    exerciseId: string,
    setIndex: number,
    weightKg: number,
    reps: number
  ) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const wasCompleted = activeSession?.exercises
      .find((ex) => ex.exerciseId === exerciseId)?.sets[setIndex]?.isCompleted;
    toggleSetCompleted(exerciseId, setIndex, weightKg, reps);
    setRestEndsAt(wasCompleted ? null : Date.now() + restDurationSec * 1000);
  };

  const handleFinishWorkout = () => {
    const header = finishSession();
    if (header) {
      const breakdownItems = (header.exerciseLogs || []).map((log) => ({
        title: log.name,
        subtitle: `${log.sets} Sets • ${log.reps} | Target: ${formatWeight(log.targetWeightKg, unitSystem)}`,
        value: formatVolume(log.totalVolumeKg, unitSystem),
      }));

      addLiveFeedEvent({
        clientId: profile?.id || 'usr_1',
        clientName: profile?.fullName || 'Client',
        avatarUrl: profile?.avatarUrl,
        eventType: 'FINISH_WORKOUT',
        actionVerb: 'Logged',
        targetTitle: header.title,
        breakdownItems,
        tags: [
          { label: 'Strength', type: 'success' },
          { label: 'Completed', type: 'success' },
        ],
        timestamp: new Date().toISOString(),
      });

      Alert.alert(
        'Workout Completed! 🏆',
        `Great session! You completed ${header.title} in ${header.durationMinutes} mins with ${formatVolume(header.totalVolumeKg, unitSystem)} total volume.`
      );
    }
    router.replace('/(tabs)/workout');
  };

  const handleCancelWorkout = () => {
    if (Platform.OS === 'web') {
      const confirmDiscard = window.confirm('Are you sure you want to discard this active session?');
      if (confirmDiscard) {
        cancelSession();
        router.replace('/(tabs)/workout');
      }
    } else {
      Alert.alert('Cancel Workout Session', 'Are you sure you want to discard this active session?', [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            cancelSession();
            router.replace('/(tabs)/workout');
          },
        },
      ]);
    }
  };

  const exercises = activeSession?.exercises || [];

  // Calculate live progress metrics
  let totalSetsCount = 0;
  let completedSetsCount = 0;
  let currentVolumeKg = 0;

  exercises.forEach((ex) => {
    ex.sets.forEach((s) => {
      totalSetsCount += 1;
      if (s.isCompleted) {
        completedSetsCount += 1;
        currentVolumeKg += s.weightKg * s.reps;
      }
    });
  });

  const progressPct = totalSetsCount > 0 ? (completedSetsCount / totalSetsCount) * 100 : 0;

  // Filter Catalog Exercises
  const categories = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE', 'CARDIO'];

  const filteredCatalog = exerciseCatalog.filter((ex) => {
    const searchLower = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !searchLower ||
      ex.name.toLowerCase().includes(searchLower) ||
      ex.target_muscle.toLowerCase().includes(searchLower) ||
      ex.category.toLowerCase().includes(searchLower);

    const matchesCat =
      selectedCategory === 'ALL' ||
      ex.target_muscle.toUpperCase().includes(selectedCategory);

    return matchesSearch && matchesCat;
  });

  const handleAddCatalogExercise = (ex: ExerciseDef) => {
    addExerciseToActiveSession({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetMuscle: ex.target_muscle,
    });
    setCatalogModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  const handleCreateCustomExercise = async () => {
    if (!customName.trim()) {
      Alert.alert('Required', 'Please enter an exercise name.');
      return;
    }
    const created = await addCustomExercise(customName, customMuscle, customCategory);
    addExerciseToActiveSession({
      exerciseId: created.id,
      exerciseName: created.name,
      targetMuscle: created.target_muscle,
    });
    setCustomName('');
    setCustomModalVisible(false);
    setCatalogModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* 📌 FROZEN / STICKY HEADER CARD */}
      <View
        style={[
          styles.frozenHeaderContainer,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
            ...theme.shadow,
          },
        ]}
      >
        {/* Top Header Row */}
        <View style={styles.headerTopRow}>
          <View style={styles.titleTimerGroup}>
            <Text style={[styles.routineTitle, { color: theme.text }]} numberOfLines={1}>
              {activeSession?.planTitle || 'Freestyle Workout'}
            </Text>
            <View
              style={[
                styles.timerBadge,
                {
                  backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                  borderColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name="time-outline" size={13} color={theme.isDark ? theme.accentGold : theme.primary} />
                <Text
                  style={[
                    styles.timerText,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  {formatTimer(elapsedSeconds)}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelWorkout}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
              <Ionicons name="close-outline" size={14} color={theme.danger} />
              <Text style={[styles.cancelBtnText, { color: theme.danger }]}>Discard</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Live Progress Metrics Bar */}
        <View style={styles.progressMetricsRow}>
          <Text style={[styles.progressText, { color: theme.textSecondary }]}>
            <Text style={[styles.progressHighlight, { color: theme.isDark ? theme.accentGold : theme.primary }]}>{completedSetsCount}</Text> of{' '}
            {totalSetsCount} Sets Completed
          </Text>

          <Text style={[styles.volumeText, { color: theme.textSecondary }]}>
            Volume:{' '}
            <Text style={[styles.volumeHighlight, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
              {formatVolume(currentVolumeKg, unitSystem)}
            </Text>
          </Text>
        </View>

        {/* Progress Bar Track */}
        <View style={[styles.progressBarTrack, { backgroundColor: theme.cardAlt }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.min(100, progressPct)}%`,
                backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* 📜 SCROLLABLE EXERCISE LIST */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No exercises in this session</Text>
            <Text style={[styles.emptySub, { color: theme.textMuted }]}>Tap below to add exercises from the catalog!</Text>
          </View>
        ) : (
          exercises.map((ex) => (
            <View
              key={ex.exerciseId}
              style={[
                styles.exerciseCard,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  ...theme.shadow,
                },
              ]}
            >
              {/* Exercise Header */}
              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseTitleGroup}>
                  <Text style={[styles.exerciseName, { color: theme.text }]}>{ex.exerciseName}</Text>
                  <View
                    style={[
                      styles.muscleBadge,
                      {
                        backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                        borderColor: theme.isDark ? theme.accentGold : theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.muscleBadgeText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      {(ex.targetMuscle || 'GENERAL').toUpperCase()}
                    </Text>
                  </View>
                  {ex.lastWeightKg !== undefined && (
                    <Text style={[styles.lastSessionText, { color: theme.textMuted }]}>
                      Last time: {formatWeight(ex.lastWeightKg, unitSystem)} × {ex.lastReps}
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.deleteExBtn}
                  onPress={() => removeExerciseFromActiveSession(ex.exerciseId)}
                >
                  <Ionicons name="trash-outline" size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>

              {/* Set Table */}
              <View style={styles.setTable}>
                <View style={styles.setTableHeader}>
                  <Text style={[styles.colHeader, { width: 24, textAlign: 'center', color: theme.textMuted }]}>SET</Text>
                  <Text style={[styles.colHeader, { flex: 1.25, textAlign: 'center', color: theme.textMuted }]}>
                    {getWeightUnitLabel(unitSystem).toUpperCase()}
                  </Text>
                  <Text style={[styles.colHeader, { flex: 0.9, textAlign: 'center', color: theme.textMuted }]}>REPS</Text>
                  <Text style={[styles.colHeader, { width: 40, textAlign: 'center', color: theme.textMuted }]}>DONE</Text>
                  <View style={{ width: 26 }} />
                </View>

                {ex.sets.map((set, idx) => (
                  <View
                    key={set.setId || idx}
                    style={[
                      styles.setRow,
                      {
                        backgroundColor: set.isCompleted
                          ? theme.isDark
                            ? theme.badgeBg
                            : '#E8F5E9'
                          : theme.cardInner,
                        borderColor: set.isCompleted
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.setNum,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      {set.setNumber}
                    </Text>

                    {/* Weight Input with Stepper */}
                    <WeightInput
                      valueKg={set.weightKg}
                      unitSystem={unitSystem}
                      weightStep={weightStep}
                      onChangeWeightKg={(kg) => updateSetValues(ex.exerciseId, idx, kg, set.reps)}
                      theme={theme}
                    />

                    {/* REPS Input */}
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          flex: 0.9,
                          backgroundColor: theme.cardAlt,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.setField, { color: theme.text }]}
                        value={String(set.reps)}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                          const num = parseInt(val) || 0;
                          updateSetValues(ex.exerciseId, idx, set.weightKg, num);
                        }}
                      />
                      <Text style={[styles.unitTag, { color: theme.textMuted }]}>reps</Text>
                    </View>

                    {/* DONE Checkbox Button */}
                    <TouchableOpacity
                      style={[
                        styles.checkBtn,
                        {
                          backgroundColor: set.isCompleted
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.cardAlt,
                          borderColor: set.isCompleted
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.border,
                        },
                      ]}
                      onPress={() => handleToggleSet(ex.exerciseId, idx, set.weightKg, set.reps)}
                      activeOpacity={0.8}
                    >
                      {set.isCompleted ? (
                        <Ionicons
                          name="checkmark-sharp"
                          size={14}
                          color={theme.isDark ? '#0A1A12' : '#FFFFFF'}
                        />
                      ) : null}
                    </TouchableOpacity>

                    {/* Delete Set Button */}
                    <TouchableOpacity
                      style={styles.deleteSetBtn}
                      onPress={() => removeSetFromExercise(ex.exerciseId, idx)}
                      hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>


              {/* Add Set Action */}
              <TouchableOpacity
                style={[
                  styles.addSetBtn,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => addSetToExercise(ex.exerciseId)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.addSetBtnText,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  + Add Set
                </Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Ad-Hoc Exercise Selector Trigger */}
        <TouchableOpacity
          style={[
            styles.addAdHocBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? theme.accentGold : theme.primary,
            },
          ]}
          onPress={() => setCatalogModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Ionicons name="search-outline" size={16} color={theme.isDark ? theme.accentGold : theme.primary} />
            <Text
              style={[
                styles.addAdHocBtnText,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              Add Exercise from Catalog
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* REST TIMER BANNER */}
      {restEndsAt && (
        <View
          style={[
            styles.restBanner,
            { backgroundColor: theme.card, borderColor: theme.isDark ? theme.accentGold : theme.primary, ...theme.shadow },
          ]}
        >
          <Ionicons name="hourglass-outline" size={16} color={theme.isDark ? theme.accentGold : theme.primary} />
          <Text style={[styles.restText, { color: theme.text }]}>Rest {formatTimer(restRemainingSec)}</Text>
          <TouchableOpacity style={[styles.restBtn, { borderColor: theme.border }]} onPress={() => adjustRest(-15)}>
            <Text style={[styles.restBtnText, { color: theme.textSecondary }]}>-15s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.restBtn, { borderColor: theme.border }]} onPress={() => adjustRest(15)}>
            <Text style={[styles.restBtnText, { color: theme.textSecondary }]}>+15s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.restBtn, { borderColor: theme.border }]} onPress={() => setRestEndsAt(null)}>
            <Text style={[styles.restBtnText, { color: theme.danger }]}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* FIXED BOTTOM ACTION BAR */}
      <View style={[styles.bottomBar, { backgroundColor: theme.bg, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.finishBtn,
            {
              backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadowButton,
            },
          ]}
          onPress={handleFinishWorkout}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.finishBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            Finish Session
          </Text>
        </TouchableOpacity>
      </View>

      {/* AD-HOC EXERCISE CATALOG MODAL */}
      <Modal
        visible={catalogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCatalogModalVisible(false)}
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
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exercise to Workout</Text>
              <TouchableOpacity
                onPress={() => setCatalogModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search exercises..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catContainer}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor:
                        selectedCategory === cat
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardInner,
                      borderColor:
                        selectedCategory === cat
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                    },
                  ]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      {
                        color:
                          selectedCategory === cat
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFFFFF'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Action Bar inside Modal: Add Custom Exercise shortcut */}
            <TouchableOpacity
              style={[
                styles.createCustomQuickBtn,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
              onPress={() => setCustomModalVisible(true)}
            >
              <Ionicons name="add-circle-outline" size={16} color={theme.isDark ? theme.accentGold : theme.primary} />
              <Text style={[styles.createCustomQuickBtnText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                Can't find it? Create Custom Exercise
              </Text>
            </TouchableOpacity>

            {/* Catalog List */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyCatalogContainer}>
                  <Text style={[styles.emptyCatalogText, { color: theme.textMuted }]}>
                    No exercises found matching "{searchQuery}"
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.addCatalogItemBtn,
                      {
                        backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                        marginTop: 12,
                      },
                    ]}
                    onPress={() => setCustomModalVisible(true)}
                  >
                    <Text style={{ color: theme.isDark ? '#0A1A12' : '#FFF', fontWeight: 'bold' }}>
                      + Create "{searchQuery || 'Custom'}" Exercise
                    </Text>
                  </TouchableOpacity>
                </View>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.catalogItemCard,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catalogItemName, { color: theme.text }]}>{item.name}</Text>
                    <Text
                      style={[
                        styles.catalogItemCategory,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      {item.category.toUpperCase()} • {item.target_muscle}
                      {item.isCustom && ' • CUSTOM'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.addCatalogItemBtn,
                      {
                        backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                        borderColor: theme.isDark ? theme.accentGold : theme.primary,
                      },
                    ]}
                    onPress={() => handleAddCatalogExercise(item)}
                  >
                    <Text
                      style={[
                        styles.addCatalogItemBtnText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      + Add
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* CREATE CUSTOM EXERCISE MODAL */}
      <Modal
        visible={customModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCustomModalVisible(false)}
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>New Custom Exercise</Text>
              <TouchableOpacity onPress={() => setCustomModalVisible(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.customFieldLabel, { color: theme.textSecondary }]}>EXERCISE NAME</Text>
            <View
              style={[
                styles.searchBox,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  marginBottom: 14,
                },
              ]}
            >
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="e.g. Incline Cable Crossover"
                placeholderTextColor={theme.textMuted}
                value={customName}
                onChangeText={setCustomName}
                autoFocus
              />
            </View>

            <Text style={[styles.customFieldLabel, { color: theme.textSecondary }]}>TARGET MUSCLE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              {['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio'].map((m) => (
                <TouchableOpacity
                  key={m}
                  onPress={() => setCustomMuscle(m)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor:
                        customMuscle === m
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardInner,
                      borderColor:
                        customMuscle === m
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      marginRight: 6,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      {
                        color:
                          customMuscle === m
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFF'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.customFieldLabel, { color: theme.textSecondary }]}>EQUIPMENT / TYPE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              {['Barbell', 'Dumbbell', 'Cable', 'Machine', 'Bodyweight', 'Other'].map((c) => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setCustomCategory(c)}
                  style={[
                    styles.catPill,
                    {
                      backgroundColor:
                        customCategory === c
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardInner,
                      borderColor:
                        customCategory === c
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      marginRight: 6,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.catPillText,
                      {
                        color:
                          customCategory === c
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFF'
                            : theme.textSecondary,
                      },
                    ]}
                  >
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.finishBtn,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  ...theme.shadowButton,
                },
              ]}
              onPress={handleCreateCustomExercise}
            >
              <Text style={[styles.finishBtnText, { color: theme.isDark ? '#0A1A12' : '#FFF' }]}>
                Save & Add to Workout
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 50,
    paddingHorizontal: 16,
  },

  /* FROZEN HEADER CARD */
  frozenHeaderContainer: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleTimerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  routineTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    maxWidth: '55%',
  },
  timerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  timerText: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cancelBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 11.5,
  },
  progressHighlight: {
    fontWeight: 'bold',
  },
  volumeText: {
    fontSize: 11.5,
  },
  volumeHighlight: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* SCROLL CONTENT & EXERCISE CARDS */
  scrollContent: {
    flex: 1,
  },
  emptyBox: {
    padding: 30,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySub: {
    fontSize: 12,
    marginTop: 4,
  },
  exerciseCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  exerciseCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  muscleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  muscleBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  deleteExBtn: {
    padding: 4,
  },
  deleteExBtnText: {
    fontSize: 14,
  },

  /* SET TABLE STYLES */
  setTable: {
    gap: 6,
  },
  setTableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
    marginBottom: 4,
  },
  colHeader: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  lastSessionText: {
    fontSize: 11,
    marginTop: 4,
  },
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  restText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  restBtn: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    borderWidth: 1,
  },
  restBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    gap: 8,
  },
  setNum: {
    fontSize: 13,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
  },
  setField: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingVertical: 6,
    textAlign: 'center',
  },
  unitTag: {
    fontSize: 10,
  },

  /* CHECKBOX STYLES */
  checkBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetBtn: {
    width: 26,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIcon: {

    fontSize: 16,
    fontWeight: 'bold',
  },
  addSetBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
  },
  addSetBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* AD HOC BUTTON */
  addAdHocBtn: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  addAdHocBtnText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },

  /* BOTTOM BAR */
  bottomBar: {
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  finishBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBox: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
  },
  searchInput: {
    fontSize: 14,
  },
  catScroll: {
    marginBottom: 14,
  },
  catContainer: {
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  catalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  catalogItemCategory: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addCatalogItemBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  addCatalogItemBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  createCustomQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  createCustomQuickBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyCatalogContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    gap: 8,
  },
  emptyCatalogText: {
    fontSize: 13,
  },
  customFieldLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
});
