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
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, ExerciseDef } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function ActiveSessionScreen() {
  const router = useRouter();
  const theme = useTheme();
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
  } = useWorkoutStore();

  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const profile = useAuthStore((state) => state.profile);

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [catalogModalVisible, setCatalogModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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
    toggleSetCompleted(exerciseId, setIndex, weightKg, reps);
  };

  const handleFinishWorkout = () => {
    const header = finishSession();
    if (header) {
      addLiveFeedEvent({
        clientId: profile?.id || 'usr_1',
        clientName: profile?.fullName || 'Client',
        eventType: 'FINISH_WORKOUT',
        timeAgo: 'Just now',
        actionVerb: 'Logged',
        targetTitle: header.title,
        tags: [
          { label: 'Strength', type: 'success' },
          { label: 'Completed', type: 'success' },
        ],
        timestamp: new Date().toISOString(),
      });

      Alert.alert(
        'Workout Completed! 🏆',
        `Great session! You completed ${header.title} in ${header.durationMinutes} mins with ${header.totalVolumeKg} kg total volume.`
      );
    }
    router.replace('/(tabs)/workout');
  };

  const handleCancelWorkout = () => {
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
  const categories = ['ALL', 'CHEST', 'BACK', 'LEGS', 'SHOULDERS', 'ARMS', 'CORE'];

  const filteredCatalog = exerciseCatalog.filter((ex) => {
    const matchesSearch =
      ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ex.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat =
      selectedCategory === 'ALL' ||
      ex.category.toUpperCase() === selectedCategory.toUpperCase();
    return matchesSearch && matchesCat;
  });

  const handleAddCatalogExercise = (ex: ExerciseDef) => {
    addExerciseToActiveSession({
      exerciseId: ex.id,
      exerciseName: ex.name,
      targetMuscle: ex.category,
    });
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
              {currentVolumeKg.toLocaleString()} kg
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
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'center', color: theme.textMuted }]}>KG</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'center', color: theme.textMuted }]}>REPS</Text>
                  <Text style={[styles.colHeader, { width: 44, textAlign: 'center', color: theme.textMuted }]}>DONE</Text>
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

                    {/* KG Input */}
                    <View
                      style={[
                        styles.inputWrap,
                        {
                          backgroundColor: theme.cardAlt,
                          borderColor: theme.border,
                        },
                      ]}
                    >
                      <TextInput
                        style={[styles.setField, { color: theme.text }]}
                        value={String(set.weightKg)}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                          const num = parseFloat(val) || 0;
                          updateSetValues(ex.exerciseId, idx, num, set.reps);
                        }}
                      />
                      <Text style={[styles.unitTag, { color: theme.textMuted }]}>kg</Text>
                    </View>

                    {/* REPS Input */}
                    <View
                      style={[
                        styles.inputWrap,
                        {
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

            {/* Catalog List */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
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
});
