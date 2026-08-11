import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Switch,
  Modal,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useWorkoutStore, PlanExercise } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { useTrainerStore } from '../../store/trainerStore';

interface BuilderDay {
  id: string;
  dayName: string;
  isRestDay: boolean;
  exercises: PlanExercise[];
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string }>();
  const role = useAuthStore((state) => state.role);
  const clients = useTrainerStore((state) => state.clients);
  const { exerciseCatalog, savedPlans, createPlan, updatePlan } = useWorkoutStore();

  // Check if editing existing plan
  const existingPlan = params.planId ? savedPlans.find((p) => p.id === params.planId) : null;

  const [title, setTitle] = useState(existingPlan?.title || '');
  const [description, setDescription] = useState(
    '5-Day Progressive overload split with structured rest & recovery days.'
  );
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    existingPlan?.assignedClientIds || []
  );

  // Initial days state (default 5-day split if creating new)
  const [days, setDays] = useState<BuilderDay[]>(() => {
    if (existingPlan) {
      return existingPlan.days.map((d) => ({
        id: d.id,
        dayName: d.dayName,
        isRestDay: d.exercises.length === 0,
        exercises: [...d.exercises],
      }));
    }

    return [
      {
        id: 'day_1',
        dayName: 'Day 1: Push (Chest & Shoulders)',
        isRestDay: false,
        exercises: [
          { exerciseId: 'ex_01', name: 'Barbell Bench Press', targetSets: 4, targetReps: '8-10', targetWeightKg: 75 },
          { exerciseId: 'ex_28', name: 'Seated DB Press', targetSets: 3, targetReps: '10-12', targetWeightKg: 20 },
        ],
      },
      {
        id: 'day_2',
        dayName: 'Day 2: Pull (Back & Biceps)',
        isRestDay: false,
        exercises: [
          { exerciseId: 'ex_20', name: 'Lat Pulldown', targetSets: 4, targetReps: '10-12', targetWeightKg: 55 },
          { exerciseId: 'ex_33', name: 'Barbell Bicep Curl', targetSets: 3, targetReps: '10-12', targetWeightKg: 30 },
        ],
      },
      {
        id: 'day_3',
        dayName: 'Day 3: Rest & Recovery',
        isRestDay: true,
        exercises: [],
      },
      {
        id: 'day_4',
        dayName: 'Day 4: Legs & Core',
        isRestDay: false,
        exercises: [
          { exerciseId: 'ex_07', name: 'Barbell Back Squat', targetSets: 4, targetReps: '8-10', targetWeightKg: 90 },
        ],
      },
    ];
  });

  // Modal State for adding exercises
  const [activeDayIdForPicker, setActiveDayIdForPicker] = useState<string | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');

  // Day Management Handlers
  const handleAddDay = () => {
    const newDayNum = days.length + 1;
    const newDay: BuilderDay = {
      id: 'day_' + Date.now() + '_' + newDayNum,
      dayName: `Day ${newDayNum}: Training Split`,
      isRestDay: false,
      exercises: [],
    };
    setDays([...days, newDay]);
  };

  const handleRemoveDay = (dayId: string) => {
    if (days.length <= 1) {
      Alert.alert('Cannot Remove', 'Routine must contain at least one day.');
      return;
    }
    setDays(days.filter((d) => d.id !== dayId));
  };

  const handleToggleRestDay = (dayId: string, isRest: boolean) => {
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          isRestDay: isRest,
          // Clear exercises if marked as Rest Day
          exercises: isRest ? [] : d.exercises,
        };
      })
    );
  };

  const handleUpdateDayName = (dayId: string, name: string) => {
    setDays(days.map((d) => (d.id === dayId ? { ...d, dayName: name } : d)));
  };

  // Exercise Handlers
  const handleAddExerciseToDay = (exerciseDef: { id: string; name: string }) => {
    if (!activeDayIdForPicker) return;

    setDays(
      days.map((d) => {
        if (d.id !== activeDayIdForPicker) return d;
        const exists = d.exercises.some((e) => e.exerciseId === exerciseDef.id);
        if (exists) return d;

        return {
          ...d,
          exercises: [
            ...d.exercises,
            {
              exerciseId: exerciseDef.id,
              name: exerciseDef.name,
              targetSets: 3,
              targetReps: '8-12',
              targetWeightKg: 20,
            },
          ],
        };
      })
    );

    setActiveDayIdForPicker(null);
    setExerciseSearch('');
  };

  const handleRemoveExercise = (dayId: string, exerciseId: string) => {
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          exercises: d.exercises.filter((e) => e.exerciseId !== exerciseId),
        };
      })
    );
  };

  const handleUpdateExerciseParam = (
    dayId: string,
    exerciseId: string,
    field: 'targetSets' | 'targetReps' | 'targetWeightKg',
    value: any
  ) => {
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) => {
            if (ex.exerciseId !== exerciseId) return ex;
            return { ...ex, [field]: value };
          }),
        };
      })
    );
  };

  // Save Routine Handler
  const handleSaveRoutine = () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a name for this workout routine.');
      return;
    }

    const formattedDays = days.map((d) => ({
      id: d.id,
      dayName: d.dayName,
      exercises: d.isRestDay ? [] : d.exercises,
    }));

    if (existingPlan) {
      updatePlan(existingPlan.id, {
        title: title.trim(),
        days: formattedDays,
        assignedClientIds: selectedClientIds,
      });

      const assignedMessage = selectedClientIds.length > 0
        ? `Routine updated and assigned to selected client(s)!`
        : `Routine updated and saved to your personal Trainer library!`;

      Alert.alert('Routine Updated', assignedMessage);
      router.back();
    } else {
      createPlan(
        {
          title: title.trim(),
          createdBy: 'usr_1',
          days: formattedDays,
          assignedClientIds: selectedClientIds,
        },
        selectedClientIds
      );

      const assignedMessage = selectedClientIds.length > 0
        ? `Routine saved and added to the selected Client's Saved Routines!`
        : `Routine saved to your personal Trainer library!`;

      Alert.alert('Routine Saved', assignedMessage);
      router.back();
    }
  };

  const filteredCatalog = exerciseCatalog.filter(
    (ex) =>
      ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
      ex.target_muscle.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>
            {existingPlan ? 'Edit Workout Routine' : 'Build Workout Routine'}
          </Text>
          <Text style={styles.headerSub}>Plan daily split, exercises, sets & recovery days</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Routine Information Header Card */}
        <View style={styles.infoCard}>
          <Text style={styles.inputLabel}>ROUTINE NAME</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Hypertrophy 5-Day Push/Pull/Legs"
            placeholderTextColor="#64748B"
          />

          <Text style={styles.inputLabel}>SHORT DESCRIPTION</Text>
          <TextInput
            style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief routine description or goals..."
            placeholderTextColor="#64748B"
            multiline
          />

          {/* Optional Assign To Client Section for Trainers */}
          {role === 'TRAINER' && (
            <View style={styles.assignSection}>
              <Text style={styles.inputLabel}>ASSIGN TO CLIENT (OPTIONAL)</Text>
              <Text style={styles.assignSectionSub}>
                Select client(s) to assign this routine directly to their saved routines, or leave unselected to save to your Trainer library.
              </Text>

              <View style={styles.clientChipsRow}>
                {clients.map((client) => {
                  const isSelected = selectedClientIds.includes(client.clientId);
                  return (
                    <TouchableOpacity
                      key={client.clientId}
                      style={[styles.clientChip, isSelected && styles.clientChipSelected]}
                      onPress={() => {
                        if (isSelected) {
                          setSelectedClientIds(
                            selectedClientIds.filter((id) => id !== client.clientId)
                          );
                        } else {
                          setSelectedClientIds([...selectedClientIds, client.clientId]);
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.clientChipText,
                          isSelected && styles.clientChipTextSelected,
                        ]}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {client.fullName}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}
        </View>

        {/* Days List Section Header */}
        <View style={styles.daysListHeaderRow}>
          <Text style={styles.sectionTitle}>Training Days ({days.length} Days)</Text>
          <TouchableOpacity style={styles.addDayTopBtn} onPress={handleAddDay}>
            <Text style={styles.addDayTopBtnText}>+ Add Day</Text>
          </TouchableOpacity>
        </View>

        {/* Vertical List of Day Cards */}
        {days.map((day, dayIdx) => (
          <View key={day.id} style={styles.dayCard}>
            {/* Day Header Row with Rest Day Slider Switch */}
            <View style={styles.dayHeaderRow}>
              <View style={styles.dayTitleBox}>
                <TextInput
                  style={styles.dayNameInput}
                  value={day.dayName}
                  onChangeText={(val) => handleUpdateDayName(day.id, val)}
                />
              </View>

              <View style={styles.dayRightHeaderControls}>
                {/* Rest Day Slider Switch */}
                <View style={styles.restDaySwitchBox}>
                  <Text style={[styles.restDayLabel, day.isRestDay && styles.restDayLabelActive]}>
                    Rest Day
                  </Text>
                  <Switch
                    value={day.isRestDay}
                    onValueChange={(val) => handleToggleRestDay(day.id, val)}
                    trackColor={{ false: '#334155', true: '#10B981' }}
                    thumbColor={day.isRestDay ? '#FFFFFF' : '#94A3B8'}
                  />
                </View>

                {/* Remove Day Button */}
                {days.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveDay(day.id)}
                    style={styles.removeDayBtn}
                  >
                    <Text style={styles.removeDayBtnText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Day Content: Rest Day Banner OR Exercise Configuration List */}
            {day.isRestDay ? (
              <View style={styles.restDayCardBanner}>
                <Text style={{ fontSize: 26 }}>😴</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restDayBannerTitle}>Rest & Muscle Recovery Day</Text>
                  <Text style={styles.restDayBannerSub}>
                    No heavy strength exercises scheduled. Focus on active recovery, stretching, and hydration.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.exercisesContainer}>
                {day.exercises.length === 0 ? (
                  <Text style={styles.noExercisesText}>
                    No exercises added for this day yet. Tap below to add exercises from catalog!
                  </Text>
                ) : (
                  day.exercises.map((ex) => (
                    <View key={ex.exerciseId} style={styles.exerciseCardItem}>
                      <View style={styles.exerciseHeader}>
                        <Text style={styles.exerciseNameText}>🏋️ {ex.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveExercise(day.id, ex.exerciseId)}
                        >
                          <Text style={styles.removeExText}>Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Sets / Reps / Weight Input Row */}
                      <View style={styles.paramInputRow}>
                        <View style={styles.paramBox}>
                          <Text style={styles.paramLabel}>SETS</Text>
                          <TextInput
                            style={styles.paramInput}
                            keyboardType="numeric"
                            value={String(ex.targetSets)}
                            onChangeText={(val) =>
                              handleUpdateExerciseParam(
                                day.id,
                                ex.exerciseId,
                                'targetSets',
                                parseInt(val) || 1
                              )
                            }
                          />
                        </View>

                        <View style={styles.paramBox}>
                          <Text style={styles.paramLabel}>REPS</Text>
                          <TextInput
                            style={styles.paramInput}
                            value={ex.targetReps}
                            onChangeText={(val) =>
                              handleUpdateExerciseParam(day.id, ex.exerciseId, 'targetReps', val)
                            }
                          />
                        </View>

                        <View style={styles.paramBox}>
                          <Text style={styles.paramLabel}>TARGET (KG)</Text>
                          <TextInput
                            style={styles.paramInput}
                            keyboardType="numeric"
                            value={String(ex.targetWeightKg || 0)}
                            onChangeText={(val) =>
                              handleUpdateExerciseParam(
                                day.id,
                                ex.exerciseId,
                                'targetWeightKg',
                                parseFloat(val) || 0
                              )
                            }
                          />
                        </View>
                      </View>
                    </View>
                  ))
                )}

                {/* Add Exercise to Day Button */}
                <TouchableOpacity
                  style={styles.addExerciseToDayBtn}
                  onPress={() => setActiveDayIdForPicker(day.id)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.addExerciseToDayBtnText}>+ Add Exercise from Catalog</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Global Add Day Button at Bottom of List */}
        <TouchableOpacity style={styles.bottomAddDayBtn} onPress={handleAddDay} activeOpacity={0.85}>
          <Text style={styles.bottomAddDayBtnText}>+ Add Training Day</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Save Routine Action CTA Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveRoutineBtn} onPress={handleSaveRoutine} activeOpacity={0.85}>
          <Text style={styles.saveRoutineBtnText}>Save Routine 🚀</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise Catalog Selector Modal */}
      <Modal
        visible={activeDayIdForPicker !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveDayIdForPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <TouchableOpacity onPress={() => setActiveDayIdForPicker(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.modalSearchInput}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
              placeholder="Search exercise catalog..."
              placeholderTextColor="#64748B"
            />

            <ScrollView style={{ maxHeight: 380 }}>
              {filteredCatalog.map((ex) => (
                <TouchableOpacity
                  key={ex.id}
                  style={styles.catalogItemRow}
                  onPress={() => handleAddExerciseToDay(ex)}
                >
                  <View>
                    <Text style={styles.catalogItemName}>{ex.name}</Text>
                    <Text style={styles.catalogItemSub}>
                      {ex.target_muscle} • {ex.category}
                    </Text>
                  </View>
                  <Text style={styles.catalogAddIcon}>➕</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    color: '#94A3B8',
    fontSize: 12,
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
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollContent: {
    flex: 1,
  },
  infoCard: {
    backgroundColor: '#171E2D',
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#F8FAFC',
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  assignSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  assignSectionSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: -2,
    marginBottom: 10,
  },
  clientChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  clientChip: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clientChipSelected: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  clientChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  clientChipTextSelected: {
    color: '#10B981',
    fontWeight: 'bold',
  },
  daysListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  addDayTopBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addDayTopBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  dayCard: {
    backgroundColor: '#171E2D',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  dayTitleBox: {
    flex: 1,
  },
  dayNameInput: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
    backgroundColor: '#0F172A',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayRightHeaderControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  restDaySwitchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  restDayLabel: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: 'bold',
  },
  restDayLabelActive: {
    color: '#10B981',
  },
  removeDayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDayBtnText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: 'bold',
  },
  restDayCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  restDayBannerTitle: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  restDayBannerSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  exercisesContainer: {
    gap: 10,
  },
  noExercisesText: {
    color: '#64748B',
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  exerciseCardItem: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNameText: {
    color: '#F8FAFC',
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  removeExText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '600',
  },
  paramInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paramBox: {
    flex: 1,
  },
  paramLabel: {
    color: '#64748B',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  paramInput: {
    backgroundColor: '#1E293B',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  addExerciseToDayBtn: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 4,
  },
  addExerciseToDayBtnText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomAddDayBtn: {
    backgroundColor: '#171E2D',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#10B981',
    marginBottom: 20,
  },
  bottomAddDayBtnText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBar: {
    paddingVertical: 12,
    backgroundColor: '#0F172A',
  },
  saveRoutineBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveRoutineBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#171E2D',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSearchInput: {
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  catalogItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  catalogItemName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  catalogItemSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  catalogAddIcon: {
    fontSize: 14,
  },
});
