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
import * as Haptics from 'expo-haptics';
import { useWorkoutStore, ExerciseDef } from '../../store/workoutStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useAuthStore } from '../../store/authStore';

export default function ActiveSessionScreen() {
  const router = useRouter();
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
    <View style={styles.container}>
      {/* 📌 FROZEN / STICKY HEADER CARD */}
      <View style={styles.frozenHeaderContainer}>
        {/* Top Header Row */}
        <View style={styles.headerTopRow}>
          <View style={styles.titleTimerGroup}>
            <Text style={styles.routineTitle} numberOfLines={1}>
              {activeSession?.planTitle || 'Freestyle Workout'}
            </Text>
            <View style={styles.timerBadge}>
              <Text style={styles.timerText}>⏱️ {formatTimer(elapsedSeconds)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelWorkout}>
            <Text style={styles.cancelBtnText}>✕ Discard</Text>
          </TouchableOpacity>
        </View>

        {/* Live Progress Metrics Bar */}
        <View style={styles.progressMetricsRow}>
          <Text style={styles.progressText}>
            📊 <Text style={styles.progressHighlight}>{completedSetsCount}</Text> of{' '}
            {totalSetsCount} Sets Completed
          </Text>

          <Text style={styles.volumeText}>
            Volume: <Text style={styles.volumeHighlight}>{currentVolumeKg.toLocaleString()} kg</Text>
          </Text>
        </View>

        {/* Progress Bar Track */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${Math.min(100, progressPct)}%` }]} />
        </View>
      </View>

      {/* 📜 SCROLLABLE EXERCISE LIST */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {exercises.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No exercises in this session</Text>
            <Text style={styles.emptySub}>Tap below to add exercises from the catalog!</Text>
          </View>
        ) : (
          exercises.map((ex) => (
            <View key={ex.exerciseId} style={styles.exerciseCard}>
              {/* Exercise Header */}
              <View style={styles.exerciseCardHeader}>
                <View style={styles.exerciseTitleGroup}>
                  <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                  <View style={styles.muscleBadge}>
                    <Text style={styles.muscleBadgeText}>
                      {(ex.targetMuscle || 'GENERAL').toUpperCase()}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.deleteExBtn}
                  onPress={() => removeExerciseFromActiveSession(ex.exerciseId)}
                >
                  <Text style={styles.deleteExBtnText}>🗑️</Text>
                </TouchableOpacity>
              </View>

              {/* Set Table */}
              <View style={styles.setTable}>
                <View style={styles.setTableHeader}>
                  <Text style={[styles.colHeader, { width: 24, textAlign: 'center' }]}>SET</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>KG</Text>
                  <Text style={[styles.colHeader, { flex: 1, textAlign: 'center' }]}>REPS</Text>
                  <Text style={[styles.colHeader, { width: 44, textAlign: 'center' }]}>DONE</Text>
                </View>

                {ex.sets.map((set, idx) => (
                  <View
                    key={set.setId || idx}
                    style={[styles.setRow, set.isCompleted && styles.setRowCompleted]}
                  >
                    <Text style={styles.setNum}>{set.setNumber}</Text>

                    {/* KG Input */}
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.setField}
                        value={String(set.weightKg)}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                          const num = parseFloat(val) || 0;
                          updateSetValues(ex.exerciseId, idx, num, set.reps);
                        }}
                      />
                      <Text style={styles.unitTag}>kg</Text>
                    </View>

                    {/* REPS Input */}
                    <View style={styles.inputWrap}>
                      <TextInput
                        style={styles.setField}
                        value={String(set.reps)}
                        keyboardType="numeric"
                        onChangeText={(val) => {
                          const num = parseInt(val) || 0;
                          updateSetValues(ex.exerciseId, idx, set.weightKg, num);
                        }}
                      />
                      <Text style={styles.unitTag}>reps</Text>
                    </View>

                    {/* DONE Checkbox Button */}
                    <TouchableOpacity
                      style={[styles.checkBtn, set.isCompleted && styles.checkBtnCompleted]}
                      onPress={() => handleToggleSet(ex.exerciseId, idx, set.weightKg, set.reps)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.checkIcon, set.isCompleted && styles.checkIconCompleted]}>
                        {set.isCompleted ? '✓' : ''}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              {/* Add Set Action */}
              <TouchableOpacity
                style={styles.addSetBtn}
                onPress={() => addSetToExercise(ex.exerciseId)}
                activeOpacity={0.8}
              >
                <Text style={styles.addSetBtnText}>+ Add Set</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Ad-Hoc Exercise Selector Trigger */}
        <TouchableOpacity
          style={styles.addAdHocBtn}
          onPress={() => setCatalogModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addAdHocBtnText}>🔍 + Add Exercise from Catalog</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* 🏆 FIXED BOTTOM ACTION BAR */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.finishBtn} onPress={handleFinishWorkout} activeOpacity={0.85}>
          <Text style={styles.finishBtnText}>Finish Session 🏆</Text>
        </TouchableOpacity>
      </View>

      {/* 🔍 AD-HOC EXERCISE CATALOG MODAL */}
      <Modal
        visible={catalogModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCatalogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Exercise from Catalog</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setCatalogModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchBox}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises (e.g. Bench, Incline)..."
                placeholderTextColor="#64748B"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Category Filter Scroll */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.catScroll}
              contentContainerStyle={styles.catContainer}
            >
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catPillText, selectedCategory === cat && styles.catPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Exercise Catalog List */}
            <FlatList
              data={filteredCatalog}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => (
                <View style={styles.catalogItemCard}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={styles.catalogItemName}>{item.name}</Text>
                    <Text style={styles.catalogItemCategory}>{item.category.toUpperCase()}</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addCatalogItemBtn}
                    onPress={() => handleAddCatalogExercise(item)}
                  >
                    <Text style={styles.addCatalogItemBtnText}>+ Add</Text>
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: 50,
  },

  /* FROZEN HEADER STYLES */
  frozenHeaderContainer: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleTimerGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  routineTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  timerBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  timerText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  cancelBtn: {
    backgroundColor: '#451A03',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444455',
  },
  cancelBtnText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  progressHighlight: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  volumeText: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  volumeHighlight: {
    color: '#A7F3D0',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  progressBarTrack: {
    height: 6,
    backgroundColor: '#1E293B',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
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
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySub: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 4,
  },
  exerciseCard: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
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
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  muscleBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B98155',
  },
  muscleBadgeText: {
    color: '#10B981',
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
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0C1E19',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#10B9811A',
    gap: 8,
  },
  setRowCompleted: {
    backgroundColor: '#064E3B33',
    borderColor: '#10B98144',
  },
  setNum: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  setField: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingVertical: 6,
    textAlign: 'center',
  },
  unitTag: {
    color: '#64748B',
    fontSize: 10,
  },

  /* CHECKBOX STYLES */
  checkBtn: {
    width: 44,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBtnCompleted: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  checkIcon: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  checkIconCompleted: {
    color: '#10B981',
  },

  addSetBtn: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  addSetBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* AD HOC BUTTON */
  addAdHocBtn: {
    backgroundColor: '#091512',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#10B98166',
    borderRadius: 20,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  addAdHocBtnText: {
    color: '#10B981',
    fontSize: 13.5,
    fontWeight: 'bold',
  },

  /* BOTTOM BAR */
  bottomBar: {
    paddingVertical: 12,
    backgroundColor: '#0F172A',
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  finishBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  finishBtnText: {
    color: '#064E3B',
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
    backgroundColor: '#0F172A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  searchBox: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  searchInput: {
    color: '#F8FAFC',
    fontSize: 14,
  },
  catScroll: {
    marginBottom: 14,
  },
  catContainer: {
    gap: 6,
  },
  catPill: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  catPillActive: {
    backgroundColor: '#064E3B',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  catPillTextActive: {
    color: '#10B981',
  },
  catalogItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#091512',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  catalogItemName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  catalogItemCategory: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 2,
  },
  addCatalogItemBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addCatalogItemBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
