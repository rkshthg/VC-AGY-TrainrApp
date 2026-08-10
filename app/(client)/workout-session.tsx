import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '@/features/workout/presentation/workoutStore';
import { LoggedSet } from '@/features/workout/domain/workout';

interface WorkoutSetRowProps {
  set: LoggedSet;
  onLogSet: (weightKg: number, reps: number) => void;
}

function WorkoutSetRow({ set, onLogSet }: WorkoutSetRowProps) {
  const [localKg, setLocalKg] = useState(set.weight_kg ? set.weight_kg.toString() : '40');
  const [localReps, setLocalReps] = useState(set.reps ? set.reps.toString() : '10');

  return (
    <View style={[styles.tableRow, set.completed && styles.completedRow]}>
      <Text style={styles.setNum}>{set.set_number}</Text>

      <TextInput
        style={styles.cellInput}
        keyboardType="numeric"
        value={localKg}
        onChangeText={setLocalKg}
        editable={!set.completed}
      />

      <TextInput
        style={styles.cellInput}
        keyboardType="numeric"
        value={localReps}
        onChangeText={setLocalReps}
        editable={!set.completed}
      />

      <TouchableOpacity
        style={[styles.checkBtn, set.completed && styles.checkedBtn]}
        onPress={() => onLogSet(parseFloat(localKg) || 0, parseInt(localReps) || 0)}
      >
        <Ionicons
          name={set.completed ? 'checkmark-done' : 'checkmark'}
          size={18}
          color="#fff"
        />
      </TouchableOpacity>
    </View>
  );
}

export default function ActiveWorkoutSessionScreen() {
  const router = useRouter();
  const {
    activeSession,
    logCompletedSet,
    startRestTimer,
    tickRestTimer,
    stopRestTimer,
    finishWorkoutSession,
    latestPR,
    clearPRCelebration,
  } = useWorkoutStore();

  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [rpeRating, setRpeRating] = useState<number>(8);

  // Live session timer interval
  useEffect(() => {
    const timer = setInterval(() => {
      setSessionSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Rest timer countdown interval
  useEffect(() => {
    let restInterval: any = null;
    if (activeSession?.isRestTimerActive) {
      restInterval = setInterval(() => {
        tickRestTimer();
      }, 1000);
    }
    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [activeSession?.isRestTimerActive]);

  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!activeSession) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.emptyContainer}>
          <Ionicons name="barbell-outline" size={60} color="#94a3b8" />
          <Text style={styles.emptyTitle}>No Active Workout</Text>
          <Text style={styles.emptySubtitle}>Select a workout routine from your plan to get started.</Text>
          <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
            <Text style={styles.backHomeBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const handleLogSet = (exId: string, weightKg: number, reps: number) => {
    logCompletedSet(exId, weightKg, reps, rpeRating);
    startRestTimer(60); // Auto-trigger 60s rest timer
  };

  const handleFinish = async () => {
    await finishWorkoutSession();
    setShowFinishModal(false);
    Alert.alert('Workout Completed!', 'Great effort! Your workout & PR data has been saved.');
    router.replace('/(client)');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Session Bar */}
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.sessionTitle}>{activeSession.session_name}</Text>
          <View style={styles.timerBadge}>
            <Ionicons name="time-outline" size={14} color="#0284c7" />
            <Text style={styles.timerText}>{formatDuration(sessionSeconds)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={() => setShowFinishModal(true)}>
          <Text style={styles.finishBtnText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* PR Celebration Banner */}
      {latestPR && (
        <View style={styles.prBanner}>
          <View style={{ flex: 1 }}>
            <Text style={styles.prTitle}>NEW PERSONAL RECORD!</Text>
            <Text style={styles.prSub}>
              {latestPR.exerciseName}: {latestPR.weightKg} kg × {latestPR.reps} reps (Est 1RM: {latestPR.new1RM} kg)
            </Text>
          </View>
          <TouchableOpacity onPress={clearPRCelebration}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {/* Rest Timer Floating Bar */}
      {activeSession.isRestTimerActive && (
        <View style={styles.restTimerBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Ionicons name="timer" size={22} color="#0284c7" />
            <Text style={styles.restTimerText}>
              Rest Timer: {formatDuration(activeSession.restTimerSeconds)}
            </Text>
          </View>
          <TouchableOpacity style={styles.skipRestBtn} onPress={stopRestTimer}>
            <Text style={styles.skipRestText}>Skip</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeSession.exercises.map((ex, exIdx) => (
          <View key={exIdx} style={styles.exerciseCard}>
            <View style={styles.exHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exTitle}>{ex.exercise_name}</Text>
                <Text style={styles.exMuscle}>
                  {ex.muscle_groups?.join(', ') || 'Strength'} • Target: {ex.sets_target} Sets × {ex.reps_min}-{ex.reps_max} Reps
                </Text>
              </View>
              <TouchableOpacity
                style={styles.quickTimerBtn}
                onPress={() => startRestTimer(ex.rest_seconds || 60)}
              >
                <Ionicons name="timer-outline" size={18} color="#0284c7" />
                <Text style={styles.quickTimerText}>{ex.rest_seconds || 60}s</Text>
              </TouchableOpacity>
            </View>

            {/* Set Headers */}
            <View style={styles.tableHeader}>
              <Text style={[styles.colHeader, { width: 40 }]}>SET</Text>
              <Text style={[styles.colHeader, { flex: 1 }]}>KG</Text>
              <Text style={[styles.colHeader, { flex: 1 }]}>REPS</Text>
              <Text style={[styles.colHeader, { width: 50, textAlign: 'center' }]}>LOG</Text>
            </View>

            {/* Set Rows */}
            {ex.completed_sets.map((set) => (
              <WorkoutSetRow
                key={set.id}
                set={set}
                onLogSet={(weight, reps) => handleLogSet(ex.exercise_id, weight, reps)}
              />
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Finish Session Confirmation Modal */}
      <Modal visible={showFinishModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Finish Workout</Text>
            <Text style={styles.modalSub}>Rate your Rate of Perceived Exertion (RPE 1-10):</Text>

            <View style={styles.rpeGrid}>
              {[6, 7, 8, 9, 10].map((rpe) => (
                <TouchableOpacity
                  key={rpe}
                  style={[styles.rpeBtn, rpeRating === rpe && styles.activeRpeBtn]}
                  onPress={() => setRpeRating(rpe)}
                >
                  <Text style={[styles.rpeBtnText, rpeRating === rpe && styles.activeRpeText]}>
                    {rpe}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowFinishModal(false)}
              >
                <Text style={styles.cancelBtnText}>Continue Session</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmFinishBtn} onPress={handleFinish}>
                <Text style={styles.confirmFinishText}>Complete & Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0A1913' },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#10241C',
    borderBottomWidth: 1,
    borderBottomColor: '#1C4033',
  },
  sessionTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  timerBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  timerText: { fontSize: 13, fontWeight: '700', color: '#E5C158' },
  finishBtn: {
    backgroundColor: '#E5C158',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  finishBtnText: { color: '#0A1913', fontWeight: '800', fontSize: 14 },
  prBanner: {
    backgroundColor: '#3B2900',
    borderColor: '#E5C158',
    borderWidth: 1,
    padding: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  prTitle: { color: '#E5C158', fontWeight: '800', fontSize: 13 },
  prSub: { color: '#FFFFFF', fontSize: 12, marginTop: 2 },
  restTimerBar: {
    backgroundColor: '#1C4033',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#275746',
  },
  restTimerText: { fontSize: 14, fontWeight: '700', color: '#E5C158' },
  skipRestBtn: { backgroundColor: '#E5C158', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  skipRestText: { color: '#0A1913', fontSize: 12, fontWeight: '800' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  exerciseCard: {
    backgroundColor: '#10241C',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  exTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  exMuscle: { fontSize: 12, color: '#A3B8B0', marginTop: 2 },
  quickTimerBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1C4033', padding: 6, borderRadius: 8 },
  quickTimerText: { fontSize: 12, fontWeight: '700', color: '#E5C158' },
  tableHeader: { flexDirection: 'row', marginBottom: 8, paddingHorizontal: 4 },
  colHeader: { fontSize: 11, fontWeight: '700', color: '#A3B8B0' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: '#0A1913',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  completedRow: { backgroundColor: '#14382B', borderColor: '#275746' },
  setNum: { width: 40, textAlign: 'center', fontWeight: '800', color: '#E5C158', fontSize: 14 },
  cellInput: {
    flex: 1,
    backgroundColor: '#10241C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C4033',
    textAlign: 'center',
    paddingVertical: 6,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 8,
  },
  checkBtn: {
    width: 44,
    height: 36,
    backgroundColor: '#1C4033',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkedBtn: { backgroundColor: '#E5C158' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#0A1913' },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  emptySubtitle: { fontSize: 14, color: '#A3B8B0', textAlign: 'center' },
  backHomeBtn: { backgroundColor: '#E5C158', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, marginTop: 12 },
  backHomeBtnText: { color: '#0A1913', fontWeight: '800', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#10241C', borderRadius: 24, padding: 20, width: '100%', borderWidth: 1, borderColor: '#1C4033' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  modalSub: { fontSize: 13, color: '#A3B8B0', marginVertical: 8 },
  rpeGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  rpeBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1C4033', alignItems: 'center', justifyContent: 'center' },
  activeRpeBtn: { backgroundColor: '#E5C158' },
  rpeBtnText: { fontSize: 16, fontWeight: '800', color: '#A3B8B0' },
  activeRpeText: { color: '#0A1913' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#1C4033', alignItems: 'center' },
  cancelBtnText: { color: '#A3B8B0', fontWeight: '700' },
  confirmFinishBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#E5C158', alignItems: 'center' },
  confirmFinishText: { color: '#0A1913', fontWeight: '800' },
});
