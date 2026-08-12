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
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore, PlanExercise } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';

interface BuilderDay {
  id: string;
  dayName: string;
  isRestDay: boolean;
  exercises: PlanExercise[];
}

export default function WorkoutBuilderScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ planId?: string; editPlanId?: string; assignPlanId?: string }>();
  const role = useAuthStore((state) => state.role);
  const clients = useTrainerStore((state) => state.clients);
  const { exerciseCatalog, savedPlans, createPlan, updatePlan } = useWorkoutStore();
  const theme = useTheme();

  const targetPlanId = params.editPlanId || params.assignPlanId || params.planId;
  const existingPlan = targetPlanId ? savedPlans.find((p) => p.id === targetPlanId) : null;

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
          dayName: isRest
            ? d.dayName.includes(':')
              ? `${d.dayName.split(':')[0]}: Rest & Recovery`
              : 'Rest & Recovery'
            : d.dayName.includes(':')
            ? `${d.dayName.split(':')[0]}: Training Split`
            : 'Training Split',
        };
      })
    );
  };

  const handleUpdateDayName = (dayId: string, name: string) => {
    setDays(
      days.map((d) => (d.id === dayId ? { ...d, dayName: name } : d))
    );
  };

  const handleOpenExercisePicker = (dayId: string) => {
    setActiveDayIdForPicker(dayId);
    setExerciseSearch('');
  };

  const handleAddExerciseToDay = (catalogEx: typeof exerciseCatalog[0]) => {
    if (!activeDayIdForPicker) return;

    const newPlanExercise: PlanExercise = {
      exerciseId: catalogEx.id,
      name: catalogEx.name,
      targetSets: 3,
      targetReps: '8-10',
      targetWeightKg: 50,
    };

    setDays(
      days.map((d) => {
        if (d.id !== activeDayIdForPicker) return d;
        return {
          ...d,
          exercises: [...d.exercises, newPlanExercise],
        };
      })
    );

    setActiveDayIdForPicker(null);
  };

  const handleRemoveExercise = (dayId: string, exerciseId: string) => {
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          exercises: d.exercises.filter((ex) => ex.exerciseId !== exerciseId),
        };
      })
    );
  };

  const handleUpdateExerciseParam = (
    dayId: string,
    exerciseId: string,
    field: keyof PlanExercise,
    value: any
  ) => {
    setDays(
      days.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          exercises: d.exercises.map((ex) =>
            ex.exerciseId === exerciseId ? { ...ex, [field]: value } : ex
          ),
        };
      })
    );
  };

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {existingPlan ? 'Edit Workout Routine' : 'Build Workout Routine'}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            Plan daily split, exercises, sets & recovery days
          </Text>
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
        {/* Routine Information Header Card */}
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ROUTINE NAME</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Hypertrophy 5-Day Push/Pull/Legs"
            placeholderTextColor={theme.textMuted}
          />

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>SHORT DESCRIPTION</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.text,
                height: 60,
                textAlignVertical: 'top',
              },
            ]}
            value={description}
            onChangeText={setDescription}
            placeholder="Brief routine description or goals..."
            placeholderTextColor={theme.textMuted}
            multiline
          />

          {/* Optional Assign To Client Section for Trainers */}
          {role === 'TRAINER' && (
            <View style={[styles.assignSection, { borderTopColor: theme.border }]}>
              <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>ASSIGN TO CLIENT (OPTIONAL)</Text>
              <Text style={[styles.assignSectionSub, { color: theme.textMuted }]}>
                Select client(s) to assign this routine directly to their saved routines, or leave unselected to save to your Trainer library.
              </Text>

              <View style={styles.clientChipsRow}>
                {clients.map((client) => {
                  const isSelected = selectedClientIds.includes(client.clientId);
                  return (
                    <TouchableOpacity
                      key={client.clientId}
                      style={[
                        styles.clientChip,
                        {
                          backgroundColor: isSelected
                            ? theme.isDark
                              ? theme.badgeBg
                              : '#E8F5E9'
                            : theme.cardInner,
                          borderColor: isSelected
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.border,
                        },
                      ]}
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
                          {
                            color: isSelected
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.textSecondary,
                            fontWeight: isSelected ? 'bold' : '600',
                          },
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Training Days ({days.length} Days)</Text>
          <TouchableOpacity
            style={[
              styles.addDayTopBtn,
              {
                backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
              },
            ]}
            onPress={handleAddDay}
          >
            <Text
              style={[
                styles.addDayTopBtnText,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              + Add Day
            </Text>
          </TouchableOpacity>
        </View>

        {/* Vertical List of Day Cards */}
        {days.map((day) => (
          <View
            key={day.id}
            style={[
              styles.dayCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            {/* Day Header Row with Rest Day Slider Switch */}
            <View style={styles.dayHeaderRow}>
              <View style={styles.dayTitleBox}>
                <TextInput
                  style={[
                    styles.dayNameInput,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                      color: theme.text,
                    },
                  ]}
                  value={day.dayName}
                  onChangeText={(val) => handleUpdateDayName(day.id, val)}
                />
              </View>

              <View style={styles.dayRightHeaderControls}>
                {/* Rest Day Slider Switch */}
                <View
                  style={[
                    styles.restDaySwitchBox,
                    { backgroundColor: theme.cardInner, borderColor: theme.border },
                  ]}
                >
                  <Text
                    style={[
                      styles.restDayLabel,
                      { color: day.isRestDay ? (theme.isDark ? theme.accentGold : theme.primary) : theme.textMuted },
                    ]}
                  >
                    Rest Day
                  </Text>
                  <Switch
                    value={day.isRestDay}
                    onValueChange={(val) => handleToggleRestDay(day.id, val)}
                    trackColor={{
                      false: theme.cardAlt,
                      true: theme.isDark ? theme.accentGold : theme.primary,
                    }}
                    thumbColor={day.isRestDay ? '#FFFFFF' : theme.textMuted}
                  />
                </View>

                {/* Remove Day Button */}
                {days.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveDay(day.id)}
                    style={[styles.removeDayBtn, { backgroundColor: theme.cardInner }]}
                  >
                    <Ionicons name="close-outline" size={16} color={theme.danger} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Day Content: Rest Day Banner OR Exercise Configuration List */}
            {day.isRestDay ? (
              <View
                style={[
                  styles.restDayCardBanner,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
              >
                <Ionicons name="moon-outline" size={24} color={theme.isDark ? theme.accentGold : theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.restDayBannerTitle,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    Rest & Muscle Recovery Day
                  </Text>
                  <Text style={[styles.restDayBannerSub, { color: theme.textSecondary }]}>
                    No heavy strength exercises scheduled. Focus on active recovery, stretching, and hydration.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.exercisesContainer}>
                {day.exercises.length === 0 ? (
                  <Text style={[styles.noExercisesText, { color: theme.textMuted }]}>
                    No exercises added for this day yet. Tap below to add exercises from catalog!
                  </Text>
                ) : (
                  day.exercises.map((ex) => (
                    <View
                      key={ex.exerciseId}
                      style={[
                        styles.exerciseCardItem,
                        { backgroundColor: theme.cardInner, borderColor: theme.border },
                      ]}
                    >
                      <View style={styles.exerciseHeader}>
                        <Text style={[styles.exerciseNameText, { color: theme.text }]}>{ex.name}</Text>
                        <TouchableOpacity
                          onPress={() => handleRemoveExercise(day.id, ex.exerciseId)}
                        >
                          <Text style={[styles.removeExText, { color: theme.danger }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Configurable Parameters (Sets, Reps, Weight) */}
                      <View style={styles.paramInputRow}>
                        <View style={styles.paramBox}>
                          <Text style={[styles.paramLabel, { color: theme.textMuted }]}>SETS</Text>
                          <TextInput
                            style={[
                              styles.paramInput,
                              {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.border,
                                color: theme.text,
                              },
                            ]}
                            value={String(ex.targetSets || 3)}
                            keyboardType="numeric"
                            onChangeText={(val) =>
                              handleUpdateExerciseParam(
                                day.id,
                                ex.exerciseId,
                                'targetSets',
                                parseInt(val) || 3
                              )
                            }
                          />
                        </View>

                        <View style={styles.paramBox}>
                          <Text style={[styles.paramLabel, { color: theme.textMuted }]}>REPS RANGE</Text>
                          <TextInput
                            style={[
                              styles.paramInput,
                              {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.border,
                                color: theme.text,
                              },
                            ]}
                            value={String(ex.targetReps || '8-10')}
                            onChangeText={(val) =>
                              handleUpdateExerciseParam(
                                day.id,
                                ex.exerciseId,
                                'targetReps',
                                val
                              )
                            }
                          />
                        </View>

                        <View style={styles.paramBox}>
                          <Text style={[styles.paramLabel, { color: theme.textMuted }]}>TARGET (KG)</Text>
                          <TextInput
                            style={[
                              styles.paramInput,
                              {
                                backgroundColor: theme.cardAlt,
                                borderColor: theme.border,
                                color: theme.text,
                              },
                            ]}
                            value={String(ex.targetWeightKg || 50)}
                            keyboardType="numeric"
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
                  style={[
                    styles.addExerciseToDayBtn,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleOpenExercisePicker(day.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.addExerciseToDayBtnText,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    + Add Exercise
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}

        {/* Bottom Full Add Day Button */}
        <TouchableOpacity
          style={[
            styles.bottomAddDayBtn,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? theme.accentGold : theme.primary,
            },
          ]}
          onPress={handleAddDay}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.bottomAddDayBtnText,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            + Add Another Day to Routine
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Fixed Sticky Save Routine Bottom Bar */}
      <View style={[styles.bottomBar, { backgroundColor: theme.bg }]}>
        <TouchableOpacity
          style={[
            styles.saveRoutineBtn,
            {
              backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadowButton,
            },
          ]}
          onPress={handleSaveRoutine}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.saveRoutineBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            {existingPlan ? 'Update Routine' : 'Save Routine'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* EXERCISE CATALOG PICKER MODAL */}
      <Modal
        visible={!!activeDayIdForPicker}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setActiveDayIdForPicker(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Exercise to Day</Text>
              <TouchableOpacity onPress={() => setActiveDayIdForPicker(null)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[
                styles.modalSearchInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              placeholder="Search exercise catalog..."
              placeholderTextColor={theme.textMuted}
              value={exerciseSearch}
              onChangeText={setExerciseSearch}
            />

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {filteredCatalog.map((catalogEx) => (
                <TouchableOpacity
                  key={catalogEx.id}
                  style={[
                    styles.catalogItemRow,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleAddExerciseToDay(catalogEx)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.catalogItemName, { color: theme.text }]}>{catalogEx.name}</Text>
                    <Text style={[styles.catalogItemSub, { color: theme.textSecondary }]}>
                      Target: {catalogEx.target_muscle} • Category: {catalogEx.category}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.catalogAddIcon,
                      { color: theme.isDark ? theme.accentGold : theme.primary },
                    ]}
                  >
                    + Add
                  </Text>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSub: {
    fontSize: 12,
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
  },
  scrollContent: {
    flex: 1,
  },
  infoCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  assignSection: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  assignSectionSub: {
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  clientChipText: {
    fontSize: 12,
  },
  daysListHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addDayTopBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  addDayTopBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  dayCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
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
    fontSize: 15,
    fontWeight: 'bold',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  restDayLabel: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  removeDayBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeDayBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  restDayCardBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  restDayBannerTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  restDayBannerSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  exercisesContainer: {
    gap: 10,
  },
  noExercisesText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 10,
  },
  exerciseCardItem: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  exerciseNameText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  removeExText: {
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
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 3,
  },
  paramInput: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12.5,
    fontWeight: 'bold',
    textAlign: 'center',
    borderWidth: 1,
  },
  addExerciseToDayBtn: {
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    marginTop: 4,
  },
  addExerciseToDayBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomAddDayBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 20,
  },
  bottomAddDayBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  bottomBar: {
    paddingVertical: 12,
  },
  saveRoutineBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveRoutineBtnText: {
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
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSearchInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  catalogItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  catalogItemName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  catalogItemSub: {
    fontSize: 11,
    marginTop: 2,
  },
  catalogAddIcon: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
