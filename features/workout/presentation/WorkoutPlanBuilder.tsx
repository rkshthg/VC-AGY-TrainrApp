import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useWorkoutStore } from './workoutStore';
import { useTrainerStore } from '@/features/trainer/presentation/trainerStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { DBWorkoutPlan, DBPlanDay, DBPlanExercise, DBExercise } from '../domain/workout';


interface WorkoutPlanBuilderProps {
  userRole: 'trainer' | 'client';
  initialClientId?: string;
  initialPlan?: DBWorkoutPlan | null;
  onComplete?: () => void;
}

export function WorkoutPlanBuilder({ userRole, initialClientId, initialPlan, onComplete }: WorkoutPlanBuilderProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
  const { exercises, fetchExerciseLibrary, saveNewPlan } = useWorkoutStore();
  const { clients, fetchClients } = useTrainerStore();


  const [planName, setPlanName] = useState(initialPlan?.name || '');
  const [description, setDescription] = useState(initialPlan?.description || '');
  const [goal, setGoal] = useState<'hypertrophy' | 'strength' | 'fat_loss' | 'endurance' | 'general'>(
    (initialPlan?.goal as any) || 'hypertrophy'
  );
  const [assignedClientId, setAssignedClientId] = useState<string>(initialClientId || '');

  const [days, setDays] = useState<DBPlanDay[]>(
    initialPlan?.days && initialPlan.days.length > 0
      ? initialPlan.days
      : [
          { day_order: 1, day_label: 'Day 1 - Push (Chest, Shoulders & Triceps)', exercises: [] },
          { day_order: 2, day_label: 'Day 2 - Pull (Back & Biceps)', exercises: [] },
          { day_order: 3, day_label: 'Day 3 - Legs & Core', exercises: [] },
          { day_order: 4, day_label: 'Day 4 - Rest & Recovery', exercises: [] },
        ]
  );


  const handleAddDay = () => {
    const nextOrder = days.length + 1;
    setDays([
      ...days,
      { day_order: nextOrder, day_label: `Day ${nextOrder} - Workout Routine`, exercises: [] },
    ]);
  };

  const handleRemoveDay = (idx: number) => {
    if (days.length <= 1) {
      Alert.alert('Notice', 'Workout plan must have at least 1 day.');
      return;
    }
    const updated = days.filter((_, i) => i !== idx).map((d, i) => ({ ...d, day_order: i + 1 }));
    setDays(updated);
    if (activeDayIdx >= updated.length) {
      setActiveDayIdx(updated.length - 1);
    }
  };

  const handleAddExerciseToDay = (ex: DBExercise) => {
    const currentDay = days[activeDayIdx];
    const newPlanEx: DBPlanExercise = {
      exercise_id: ex.id,
      exercise_name: ex.name,
      muscle_groups: ex.muscle_groups,
      exercise_order: currentDay.exercises.length + 1,
      sets: 3,
      reps_min: 8,
      reps_max: 12,
      rest_seconds: 90,
      notes: '',
    };

    const updatedDays = [...days];
    updatedDays[activeDayIdx] = {
      ...currentDay,
      exercises: [...currentDay.exercises, newPlanEx],
    };

    setDays(updatedDays);
    setShowExerciseModal(false);
  };

  const handleRemoveExerciseFromDay = (dayIdx: number, exIdx: number) => {
    const updatedDays = [...days];
    const targetDay = updatedDays[dayIdx];
    targetDay.exercises = targetDay.exercises.filter((_, i) => i !== exIdx);
    setDays(updatedDays);
  };

  const handleUpdateExerciseParams = (
    dayIdx: number,
    exIdx: number,
    field: keyof DBPlanExercise,
    value: any
  ) => {
    const updatedDays = [...days];
    const targetEx = updatedDays[dayIdx].exercises[exIdx];
    (targetEx as any)[field] = value;
    setDays(updatedDays);
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) {
      Alert.alert('Required', 'Please enter a name for your workout plan.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not authenticated.');
      return;
    }

    setIsSaving(true);

    const newPlan: DBWorkoutPlan = {
      created_by: user.id,
      name: planName.trim(),
      description: description.trim(),
      goal,
      days,
      assigned_to_user_id: userRole === 'trainer' ? assignedClientId || undefined : user.id,
    };

    const success = await saveNewPlan(newPlan);
    setIsSaving(false);

    if (success) {
      Alert.alert('Success 🎉', 'Workout plan created & assigned successfully!');
      if (onComplete) {
        onComplete();
      } else {
        router.back();
      }
    }
  };

  const [activeDayIdx, setActiveDayIdx] = useState<number>(0);
  const [showExerciseModal, setShowExerciseModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string>('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('All');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    fetchExerciseLibrary();
    if (userRole === 'trainer' && user?.id) {
      fetchClients(user.id);
    }
  }, []);

  // Dynamically derive muscle groups and equipment choices from exercise database
  const muscleGroupOptions = React.useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((ex) => {
      ex.muscle_groups?.forEach((m) => set.add(m));
    });
    const common = ['Abdominals', 'Biceps', 'Calves', 'Chest', 'Forearms', 'Glutes', 'Hamstrings', 'Lats', 'Obliques', 'Quads', 'Shoulders', 'Traps', 'Triceps'];
    const rest = Array.from(set).filter((m) => !common.includes(m)).sort();
    return ['All', ...common, ...rest];
  }, [exercises]);

  const equipmentOptions = React.useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((ex) => {
      if (ex.equipment) set.add(ex.equipment);
    });
    return ['All', ...Array.from(set).sort()];
  }, [exercises]);

  const filteredExercises = exercises.filter((ex) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      ex.name.toLowerCase().includes(query) ||
      (ex.equipment && ex.equipment.toLowerCase().includes(query)) ||
      ex.muscle_groups.some((m) => m.toLowerCase().includes(query));

    const matchesMuscleGroup =
      selectedMuscleGroup === 'All' ||
      ex.muscle_groups.some((m) => m.toLowerCase().includes(selectedMuscleGroup.toLowerCase()));

    const matchesEquipment =
      selectedEquipment === 'All' ||
      (ex.equipment && ex.equipment.toLowerCase() === selectedEquipment.toLowerCase());

    return matchesSearch && matchesMuscleGroup && matchesEquipment;
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: isLight ? '#F8FAF8' : '#0A1913' }}
    >

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Header Section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Plan Information</Text>
          <Text style={styles.label}>Plan Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 4-Week Hypertrophy Split"
            placeholderTextColor="#A3B8B0"
            value={planName}
            onChangeText={setPlanName}
          />

          <Text style={styles.label}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            placeholder="Brief goals or focus areas..."
            placeholderTextColor="#A3B8B0"
            multiline
            value={description}
            onChangeText={setDescription}
          />

          <Text style={styles.label}>Primary Fitness Goal</Text>
          <View style={styles.pillRow}>
            {(['hypertrophy', 'strength', 'fat_loss', 'general'] as const).map((g) => (
              <TouchableOpacity
                key={g}
                style={[styles.pill, goal === g && styles.activePill]}
                onPress={() => setGoal(g)}
              >
                <Text style={[styles.pillText, goal === g && styles.activePillText]}>
                  {g.replace('_', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {userRole === 'trainer' && (
            <>
              <Text style={styles.label}>Assign to Client (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <TouchableOpacity
                  style={[styles.pill, assignedClientId === '' && styles.activePill]}
                  onPress={() => setAssignedClientId('')}
                >
                  <Text style={[styles.pillText, assignedClientId === '' && styles.activePillText]}>
                    Save as Template
                  </Text>
                </TouchableOpacity>
                {clients.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.pill, assignedClientId === c.id && styles.activePill]}
                    onPress={() => setAssignedClientId(c.id)}
                  >
                    <Text style={[styles.pillText, assignedClientId === c.id && styles.activePillText]}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>

        {/* Days Tab Bar */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workout Days ({days.length})</Text>
          <TouchableOpacity style={styles.addDayBtn} onPress={handleAddDay}>
            <Ionicons name="add-circle" size={20} color="#0284c7" />
            <Text style={styles.addDayBtnText}>Add Day</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysTabScroll}>
          {days.map((day, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.dayTab, activeDayIdx === idx && styles.activeDayTab]}
              onPress={() => setActiveDayIdx(idx)}
            >
              <Text style={[styles.dayTabText, activeDayIdx === idx && styles.activeDayTabText]}>
                Day {day.day_order}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Day Detail */}
        {days[activeDayIdx] && (
          <View style={styles.card}>
            <View style={styles.dayHeaderRow}>
              <TextInput
                style={styles.dayLabelInput}
                value={days[activeDayIdx].day_label}
                onChangeText={(text) => {
                  const updated = [...days];
                  updated[activeDayIdx].day_label = text;
                  setDays(updated);
                }}
              />
              <TouchableOpacity onPress={() => handleRemoveDay(activeDayIdx)}>
                <Ionicons name="trash-outline" size={20} color="#ef4444" />
              </TouchableOpacity>
            </View>

            {/* Exercises List for Active Day */}
            {days[activeDayIdx].exercises.length === 0 ? (
              <View style={styles.emptyDayBox}>
                <Ionicons name="barbell-outline" size={36} color="#94a3b8" />
                <Text style={styles.emptyDayText}>No exercises added to this routine yet.</Text>
              </View>
            ) : (
              days[activeDayIdx].exercises.map((ex, exIdx) => (
                <View key={exIdx} style={styles.exerciseRowCard}>
                  <View style={styles.exRowHeader}>
                    <Text style={styles.exName}>
                      {exIdx + 1}. {ex.exercise_name}
                    </Text>
                    <TouchableOpacity onPress={() => handleRemoveExerciseFromDay(activeDayIdx, exIdx)}>
                      <Ionicons name="close-circle-outline" size={22} color="#94a3b8" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.paramGrid}>
                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>Sets</Text>
                      <TextInput
                        style={styles.paramInput}
                        keyboardType="number-pad"
                        value={ex.sets.toString()}
                        onChangeText={(val) =>
                          handleUpdateExerciseParams(activeDayIdx, exIdx, 'sets', parseInt(val) || 1)
                        }
                      />
                    </View>

                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>Min Reps</Text>
                      <TextInput
                        style={styles.paramInput}
                        keyboardType="number-pad"
                        value={ex.reps_min.toString()}
                        onChangeText={(val) =>
                          handleUpdateExerciseParams(activeDayIdx, exIdx, 'reps_min', parseInt(val) || 1)
                        }
                      />
                    </View>

                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>Max Reps</Text>
                      <TextInput
                        style={styles.paramInput}
                        keyboardType="number-pad"
                        value={ex.reps_max.toString()}
                        onChangeText={(val) =>
                          handleUpdateExerciseParams(activeDayIdx, exIdx, 'reps_max', parseInt(val) || 1)
                        }
                      />
                    </View>

                    <View style={styles.paramItem}>
                      <Text style={styles.paramLabel}>Rest (s)</Text>
                      <TextInput
                        style={styles.paramInput}
                        keyboardType="number-pad"
                        value={ex.rest_seconds.toString()}
                        onChangeText={(val) =>
                          handleUpdateExerciseParams(activeDayIdx, exIdx, 'rest_seconds', parseInt(val) || 60)
                        }
                      />
                    </View>
                  </View>
                </View>
              ))
            )}

            <TouchableOpacity style={styles.addExerciseBtn} onPress={() => setShowExerciseModal(true)}>
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.addExerciseBtnText}>Add Exercise to Routine</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Submit Save Button */}
        <TouchableOpacity style={styles.savePlanBtn} onPress={handleSavePlan} disabled={isSaving}>
          {isSaving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.savePlanBtnText}>Save Workout Plan</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Exercise Picker Modal */}
      <Modal visible={showExerciseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Exercise Database</Text>
                <Text style={{ fontSize: 12, color: '#A3B8B0', marginTop: 2 }}>
                  {filteredExercises.length} of {exercises.length} exercises available
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowExerciseModal(false)} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={26} color="#A3B8B0" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={18} color="#A3B8B0" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name, muscle, or equipment..."
                placeholderTextColor="#64748b"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color="#64748b" />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Filter 1: Target Muscle Groups */}
            <View style={{ marginBottom: 8 }}>
              <Text style={styles.filterSectionLabel}>MUSCLE GROUP</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {muscleGroupOptions.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.categoryPill, selectedMuscleGroup === m && styles.activeCategoryPill]}
                    onPress={() => setSelectedMuscleGroup(m)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedMuscleGroup === m && styles.activeCategoryPillText,
                      ]}
                    >
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Filter 2: Equipment Used */}
            <View style={{ marginBottom: 12 }}>
              <Text style={styles.filterSectionLabel}>EQUIPMENT USED</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {equipmentOptions.map((eq) => (
                  <TouchableOpacity
                    key={eq}
                    style={[styles.categoryPill, selectedEquipment === eq && styles.activeEquipmentPill]}
                    onPress={() => setSelectedEquipment(eq)}
                  >
                    <Text
                      style={[
                        styles.categoryPillText,
                        selectedEquipment === eq && styles.activeCategoryPillText,
                      ]}
                    >
                      {eq}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Exercise List */}
            <ScrollView style={styles.exerciseList} keyboardShouldPersistTaps="handled">
              {filteredExercises.length === 0 ? (
                <View style={{ padding: 30, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={40} color="#64748b" />
                  <Text style={{ color: '#A3B8B0', marginTop: 10, textAlign: 'center' }}>
                    No exercises match your search and filter criteria.
                  </Text>
                </View>
              ) : (
                filteredExercises.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.exerciseItemRow}
                    onPress={() => handleAddExerciseToDay(ex)}
                  >
                    <View style={{ flex: 1, paddingRight: 10 }}>
                      <Text style={styles.exItemName}>{ex.name}</Text>
                      
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4, alignItems: 'center' }}>
                        {ex.equipment ? (
                          <View style={styles.equipmentBadge}>
                            <Text style={styles.equipmentBadgeText}>{ex.equipment}</Text>
                          </View>
                        ) : null}

                        {ex.target_muscle_groups?.primary && ex.target_muscle_groups.primary.length > 0 ? (
                          <Text style={styles.exItemMetaPrimary}>
                            🎯 {ex.target_muscle_groups.primary.join(', ')}
                          </Text>
                        ) : (
                          <Text style={styles.exItemMeta}>
                            💪 {ex.muscle_groups.join(', ')}
                          </Text>
                        )}
                      </View>

                      {ex.target_muscle_groups?.secondary && ex.target_muscle_groups.secondary.length > 0 ? (
                        <Text style={styles.exItemMetaSecondary}>
                          Secondary: {ex.target_muscle_groups.secondary.join(', ')}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="add-circle" size={28} color="#E5C158" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: 16, paddingBottom: 40 },
  container: { flex: 1, backgroundColor: '#0A1913', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#FFFFFF' },
  card: {
    backgroundColor: '#10241C',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  cardTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '700', color: '#A3B8B0', marginTop: 10, marginBottom: 4 },
  input: {
    backgroundColor: '#0A1913',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  pill: {
    backgroundColor: '#1C4033',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
  },
  activePill: { backgroundColor: '#E5C158' },
  pillText: { fontSize: 12, fontWeight: '700', color: '#A3B8B0' },
  activePillText: { color: '#0A1913' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  addDayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addDayBtnText: { fontSize: 14, fontWeight: '700', color: '#E5C158' },
  daysTabScroll: { marginBottom: 14 },
  dayTab: {
    backgroundColor: '#10241C',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  activeDayTab: { backgroundColor: '#E5C158', borderColor: '#E5C158' },
  dayTabText: { fontSize: 14, fontWeight: '700', color: '#A3B8B0' },
  activeDayTabText: { color: '#0A1913' },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dayLabelInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    backgroundColor: '#0A1913',
    padding: 8,
    borderRadius: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  emptyDayBox: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyDayText: { fontSize: 13, color: '#A3B8B0' },
  exerciseRowCard: {
    backgroundColor: '#0A1913',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  exRowHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  paramGrid: { flexDirection: 'row', gap: 10, marginTop: 10 },
  paramItem: { flex: 1, alignItems: 'center' },
  paramLabel: { fontSize: 11, color: '#A3B8B0', marginBottom: 2 },
  paramInput: {
    backgroundColor: '#10241C',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1C4033',
    width: '100%',
    textAlign: 'center',
    paddingVertical: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#E5C158',
  },
  addExerciseBtn: {
    backgroundColor: '#1C4033',
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5C158',
  },
  addExerciseBtnText: { color: '#E5C158', fontWeight: '800', fontSize: 14 },
  savePlanBtn: {
    backgroundColor: '#E5C158',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  savePlanBtnText: { color: '#0A1913', fontWeight: '900', fontSize: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: '#10241C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
    borderTopWidth: 1,
    borderColor: '#1C4033',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#FFFFFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A1913',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  modalSearchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: 14,
    color: '#FFFFFF',
  },
  filterSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#A3B8B0',
    marginTop: 2,
  },
  categoryPill: {
    backgroundColor: '#0A1913',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: '#1C4033',
  },
  activeCategoryPill: { backgroundColor: '#E5C158', borderColor: '#E5C158' },
  activeEquipmentPill: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  categoryPillText: { fontSize: 12, fontWeight: '700', color: '#A3B8B0' },
  activeCategoryPillText: { color: '#0A1913', fontWeight: '900' },
  exerciseList: { maxHeight: 360 },
  exerciseItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1C4033',
  },
  exItemName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  exItemMeta: { fontSize: 12, color: '#A3B8B0' },
  exItemMetaPrimary: { fontSize: 12, fontWeight: '700', color: '#E5C158' },
  exItemMetaSecondary: { fontSize: 11, color: '#64748b', marginTop: 2 },
  equipmentBadge: {
    backgroundColor: '#1C4033',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  equipmentBadgeText: { fontSize: 10, fontWeight: '800', color: '#38bdf8' },
});
