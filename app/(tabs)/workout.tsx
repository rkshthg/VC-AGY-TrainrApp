import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { LoggedWorkoutCard } from '../../components/LoggedWorkoutCard';
import { useWorkoutStore, WorkoutPlan } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';

export default function WorkoutScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const {
    savedPlans,
    activePlanId,
    activeRoutineDayIndexMap,
    setActivePlan,
    setActiveRoutineDayIndex,
    workoutHistory,
    startSession,
    createPlan,
    deletePlan,
  } = useWorkoutStore();
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedRoutineIds, setExpandedRoutineIds] = useState<Record<string, boolean>>({});
  const [menuOpenPlanId, setMenuOpenPlanId] = useState<string | null>(null);

  const toggleRoutineAccordion = (planId: string) => {
    setExpandedRoutineIds((prev) => ({
      ...prev,
      [planId]: !prev[planId],
    }));
  };

  const handleDuplicatePlan = (plan: WorkoutPlan) => {
    createPlan({
      title: `${plan.title} (Copy)`,
      createdBy: role,
      days: plan.days,
    });
    setMenuOpenPlanId(null);
    Alert.alert('Routine Duplicated', `Created a copy of "${plan.title}".`);
  };

  const handleEditPlan = (plan: WorkoutPlan) => {
    setMenuOpenPlanId(null);
    router.push(`/workout/builder?editPlanId=${plan.id}`);
  };

  const handleExportJson = (plan: WorkoutPlan) => {
    setMenuOpenPlanId(null);
    const fileName = `${plan.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_routine.json`;
    const jsonString = JSON.stringify(plan, null, 2);

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert('Export Successful', `Exported "${plan.title}" as ${fileName}`);
    } else {
      Alert.alert('JSON Exported', `Exported "${plan.title}" JSON file: ${fileName}`);
    }
  };

  // Active routine based on activePlanId state
  const activePlan = savedPlans.find((p) => p.id === activePlanId) || savedPlans[0];

  // Current active day index and next workout day for routine
  const activeDayIndex = activePlan ? activeRoutineDayIndexMap[activePlan.id] || 0 : 0;
  const nextWorkoutDay =
    activePlan && activePlan.days.length > 0
      ? activePlan.days[activeDayIndex % activePlan.days.length]
      : null;

  // Filter saved routines based on assignment:
  // If Client is selected, routine shows on the Client's Saved Routines.
  // Else (no client selected), it shows on the Trainer's Saved Routines!
  const displayedSavedPlans = savedPlans.filter((plan) => {
    const isAssigned = plan.assignedClientIds && plan.assignedClientIds.length > 0;
    if (role === 'TRAINER') {
      return !isAssigned;
    } else {
      return isAssigned || !plan.createdBy || plan.createdBy === 'usr_1';
    }
  });

  // Quick KPI Stats Calculations
  const totalVolumeKg = workoutHistory.reduce((acc, h) => acc + (h.totalVolumeKg || 0), 0);
  const sessionsThisWeekCount = workoutHistory.filter((h) => {
    const sessionTime = new Date(h.date).getTime();
    const sevenDaysAgo = Date.now() - 7 * 86400000;
    return sessionTime >= sevenDaysAgo;
  }).length;

  const handleStartFreestyle = () => {
    startSession();
    router.push('/workout/active-session');
  };

  const handleStartPlanSession = (plan: WorkoutPlan, dayIdx?: number) => {
    const idx = dayIdx !== undefined ? dayIdx : activeRoutineDayIndexMap[plan.id] || 0;
    startSession(plan, idx);
    router.push('/workout/active-session');
  };

  const handleDeletePlan = (planId: string, title: string) => {
    Alert.alert('Delete Workout Routine', `Are you sure you want to remove "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deletePlan(planId) },
    ]);
  };

  return (
    <View style={styles.container}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: KPI Quick Stats Bar */}
        <View style={styles.kpiContainer}>
          {/* Workouts This Week */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>WORKOUTS THIS WEEK</Text>
            <Text style={styles.kpiVal}>{sessionsThisWeekCount} / 4</Text>
            <Text style={styles.kpiSub}>Past 7 Days</Text>
          </View>

          <View style={styles.kpiDivider} />

          {/* Total Volume */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>TOTAL VOLUME</Text>
            <Text style={styles.kpiVal}>
              {totalVolumeKg >= 1000 ? `${(totalVolumeKg / 1000).toFixed(1)}k` : totalVolumeKg}
              <Text style={{ fontSize: 12, fontWeight: 'normal' }}> kg</Text>
            </Text>
            <Text style={styles.kpiSub}>Accumulated</Text>
          </View>

          <View style={styles.kpiDivider} />

          {/* Active Streak */}
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>ACTIVE STREAK</Text>
            <Text style={styles.kpiVal}>🔥 4 Days</Text>
            <Text style={styles.kpiSub}>Consistent</Text>
          </View>
        </View>

        {/* MERGED SINGLE ACTIVE ROUTINE & WORKOUT LAUNCHER CARD */}
        <View style={styles.activeRoutineMergedCard}>
          {/* Header Row */}
          <View style={styles.activeRoutineHeader}>
            <View style={styles.badgeActiveTag}>
              <Text style={styles.badgeActiveTagText}>
                {role === 'CLIENT' ? '⚡ ASSIGNED ROUTINE' : '⚡ ACTIVE ROUTINE'}
              </Text>
            </View>

            <Text style={styles.dayCountText}>
              {activePlan ? `${activePlan.days.length}-Day Split` : 'Freestyle'}
            </Text>
          </View>

          {/* Routine Name */}
          <Text style={styles.activeRoutineTitle}>
            {activePlan ? activePlan.title : 'Freestyle Workout Session'}
          </Text>

          {/* Next Workout Subtitle */}
          <Text style={styles.activeRoutineSub}>
            Next Workout: {nextWorkoutDay ? nextWorkoutDay.dayName : 'Freestyle Session'}
          </Text>

          {/* Muscle Groups / Day Chips with active highlight */}
          {activePlan && activePlan.days.length > 0 && (
            <View style={styles.dayChipsContainer}>
              {activePlan.days.map((day, idx) => {
                const isNextUp = idx === activeDayIndex % activePlan.days.length;
                return (
                  <TouchableOpacity
                    key={day.id || idx}
                    style={[styles.dayChipPill, isNextUp && styles.dayChipPillActive]}
                    onPress={() => setActiveRoutineDayIndex(activePlan.id, idx)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.dayChipPillText, isNextUp && styles.dayChipPillTextActive]}>
                      {isNextUp ? '⚡ ' : ''}
                      {day.dayName.includes(':') ? day.dayName.split(':')[1].trim() : day.dayName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Action Buttons Row: [ Start Freestyle ] [ Start Routine ] */}
          <View style={styles.mergedActionBtnRow}>
            <TouchableOpacity
              style={styles.startFreestyleBtnMerged}
              onPress={handleStartFreestyle}
              activeOpacity={0.85}
            >
              <Text style={styles.startFreestyleBtnMergedText}>⚡ Start Freestyle</Text>
            </TouchableOpacity>

            {activePlan && (
              <TouchableOpacity
                style={styles.startRoutineBtnMerged}
                onPress={() => handleStartPlanSession(activePlan, activeDayIndex)}
                activeOpacity={0.85}
              >
                <Text style={styles.startRoutineBtnMergedText}>
                  ▶️ Start Routine
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SECTION 4: Saved Routines Library */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionHeaderTitle}>Saved Routines</Text>
              <Text style={styles.sectionHeaderSub}>
                {role === 'TRAINER'
                  ? 'Build & assign 1-week workout routines for clients'
                  : 'Your personal 1-week planned workout routines'}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.buildRoutineBtn}
              onPress={() => router.push('/workout/builder')}
              activeOpacity={0.85}
            >
              <Text style={styles.buildRoutineBtnText}>+ Build Routine</Text>
            </TouchableOpacity>
          </View>

          {displayedSavedPlans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No saved workout routines found. Tap "+ Build Routine" to create one!</Text>
            </View>
          ) : (
            displayedSavedPlans.map((plan) => {
              const isAssigned = plan.assignedClientIds && plan.assignedClientIds.length > 0;
              const isActiveRoutine = plan.id === (activePlan?.id || activePlanId);
              const isExpanded = !!expandedRoutineIds[plan.id];

              const totalExercisesCount = plan.days.reduce(
                (sum, d) => sum + (d.exercises ? d.exercises.length : 0),
                0
              );

              return (
                <View
                  key={plan.id}
                  style={[
                    styles.routineCard,
                    isActiveRoutine && styles.routineCardActive,
                    menuOpenPlanId === plan.id && { zIndex: 999 },
                  ]}
                >
                  {/* Top Header Row with Title, Badges & 3-Dot Overflow Menu */}
                  <View style={styles.routineCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={styles.routineTitle}>{plan.title}</Text>
                        {isActiveRoutine && (
                          <View style={styles.activeTagBadge}>
                            <Text style={styles.activeTagBadgeText}>⚡ ACTIVE</Text>
                          </View>
                        )}
                        {isAssigned && (
                          <View style={styles.assignedTag}>
                            <Text style={styles.assignedTagText}>Assigned</Text>
                          </View>
                        )}
                      </View>

                      <Text style={styles.routineDaysSubtitle}>
                        📅 {plan.days.length} Days / Wk • 💪 {totalExercisesCount} Exercises
                      </Text>
                    </View>

                    {/* 3-Dot Overflow Menu Button */}
                    <TouchableOpacity
                      style={styles.overflowMenuBtn}
                      onPress={() => setMenuOpenPlanId(menuOpenPlanId === plan.id ? null : plan.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.overflowMenuBtnText}>⋮</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Dropdown Accordion Toggle Button Row */}
                  <TouchableOpacity
                    style={[styles.daysAccordionBtn, isExpanded && styles.daysAccordionBtnActive]}
                    onPress={() => toggleRoutineAccordion(plan.id)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.daysAccordionBtnText, isExpanded && styles.daysAccordionBtnTextActive]}>
                      {isExpanded ? '▲ Hide Workout Days' : `▼ View ${plan.days.length} Workout Days`}
                    </Text>
                  </TouchableOpacity>

                  {/* Collapsible Accordion Content */}
                  {isExpanded && (
                    <>
                      <View style={styles.routineDivider} />

                      <View style={styles.accordionDaysList}>
                        {plan.days.map((day, dIdx) => (
                          <View key={day.id || dIdx} style={styles.dayAccordionCard}>
                            <Text style={styles.dayAccordionTitle}>
                              ⚡ {day.dayName}
                            </Text>

                            {day.exercises && day.exercises.length > 0 ? (
                              day.exercises.map((ex, eIdx) => (
                                <Text key={eIdx} style={styles.dayAccordionExText}>
                                  • {ex.name}{' '}
                                  <Text style={styles.dayAccordionExSub}>
                                    ({ex.targetSets} Sets • {ex.targetReps || '8-10 reps'})
                                  </Text>
                                </Text>
                              ))
                            ) : (
                              <Text style={styles.dayAccordionEmptyText}>No exercises added</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Full-Width Active Action Button (NO START SESSION BUTTON) */}
                  <View style={styles.routineActionBarSingle}>
                    {!isActiveRoutine ? (
                      <TouchableOpacity
                        style={styles.setActiveFullBtn}
                        onPress={() => setActivePlan(plan.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.setActiveFullBtnText}>★ Set as Active Routine</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.activeStatusFullPill}>
                        <Text style={styles.activeStatusFullPillText}>✓ Active Routine</Text>
                      </View>
                    )}
                  </View>

                  {/* 3-Dot Overflow Context Menu Popup */}
                  {menuOpenPlanId === plan.id && (
                    <View style={styles.overflowMenuPopup}>
                      <TouchableOpacity
                        style={styles.menuPopupItem}
                        onPress={() => handleEditPlan(plan)}
                      >
                        <Text style={styles.menuPopupItemText}>✏️ Edit Routine</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuPopupItem}
                        onPress={() => handleDuplicatePlan(plan)}
                      >
                        <Text style={styles.menuPopupItemText}>📋 Duplicate Routine</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.menuPopupItem}
                        onPress={() => handleExportJson(plan)}
                      >
                        <Text style={styles.menuPopupItemText}>📥 Export JSON</Text>
                      </TouchableOpacity>

                      {/* Visible ONLY for Trainer Accounts */}
                      {role === 'TRAINER' && (
                        <TouchableOpacity
                          style={styles.menuPopupItem}
                          onPress={() => {
                            setMenuOpenPlanId(null);
                            router.push(`/workout/builder?assignPlanId=${plan.id}`);
                          }}
                        >
                          <Text style={styles.menuPopupItemText}>👥 Assign to Client</Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.menuPopupDivider} />

                      <TouchableOpacity
                        style={styles.menuPopupItem}
                        onPress={() => {
                          setMenuOpenPlanId(null);
                          handleDeletePlan(plan.id, plan.title);
                        }}
                      >
                        <Text style={styles.menuPopupItemTextDanger}>🗑️ Delete Routine</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* SECTION 5: Workout History (as cards) */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeaderTitle}>Workout History</Text>
          <Text style={styles.sectionHeaderSub}>Log of completed workout sessions and performance</Text>

          {workoutHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No workout sessions recorded yet.</Text>
            </View>
          ) : (
            workoutHistory.map((session) => (
              <LoggedWorkoutCard key={session.id} session={session} />
            ))
          )}
        </View>
      </ScrollView>

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },

  /* SECTION 1: KPI Quick Stats Bar */
  kpiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#171E2D',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#334155',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  kpiVal: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  kpiSub: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 1,
  },

  /* SECTION 2: Prominent "Start Workout" Launcher Card */
  activeRoutineMergedCard: {
    backgroundColor: '#171E2D',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  mergedActionBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  startFreestyleBtnMerged: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  startFreestyleBtnMergedText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  startRoutineBtnMerged: {
    flex: 1.2,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  startRoutineBtnMergedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeRoutineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeActiveTag: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActiveTagText: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  dayCountText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
  },
  activeRoutineTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  activeRoutineSub: {
    color: '#94A3B8',
    fontSize: 12.5,
    marginTop: 4,
    marginBottom: 14,
  },
  dayChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  dayChipPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayChipPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  dayChipPillText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  dayChipPillTextActive: {
    color: '#10B981',
    fontWeight: 'bold',
  },

  /* SECTION 4: Saved Routines Library */
  sectionCard: {
    backgroundColor: '#171E2D',
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  sectionHeaderTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  sectionHeaderSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  buildRoutineBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  buildRoutineBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  routineCard: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
    position: 'relative',
  },
  routineCardActive: {
    borderColor: '#10B981',
    backgroundColor: '#0A1B16',
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routineTitle: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeTagBadge: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  activeTagBadgeText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  assignedTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  assignedTagText: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
  },
  routineDaysSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  overflowMenuBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#0F172A',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  overflowMenuBtnText: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: 'bold',
  },
  daysAccordionBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    marginTop: 10,
  },
  daysAccordionBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  daysAccordionBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  daysAccordionBtnTextActive: {
    color: '#10B981',
  },
  routineDivider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginVertical: 12,
  },
  accordionDaysList: {
    gap: 8,
    marginBottom: 8,
  },
  dayAccordionCard: {
    backgroundColor: '#0C1E19',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  dayAccordionTitle: {
    color: '#A7F3D0',
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dayAccordionExText: {
    color: '#F8FAFC',
    fontSize: 12,
    marginBottom: 3,
  },
  dayAccordionExSub: {
    color: '#64748B',
    fontSize: 10.5,
  },
  dayAccordionEmptyText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },
  routineActionBarSingle: {
    marginTop: 12,
  },
  setActiveFullBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  setActiveFullBtnText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  activeStatusFullPill: {
    backgroundColor: '#064E3B',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
  },
  activeStatusFullPillText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
  },
  overflowMenuPopup: {
    position: 'absolute',
    top: 48,
    right: 16,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 6,
    width: 175,
    zIndex: 9999,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
  menuPopupItem: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  menuPopupItemText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },
  menuPopupDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 4,
  },
  menuPopupItemTextDanger: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: 'bold',
  },
  exerciseTag: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseTagText: {
    color: '#CBD5E1',
    fontSize: 10.5,
  },
  exerciseTagMore: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  exerciseTagMoreText: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  routineActionBar: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  startSessionMiniBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  startSessionMiniBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  assignClientBtn: {
    flex: 1,
    backgroundColor: '#334155',
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  assignClientBtnText: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
  },

  /* SECTION 5: Workout History Cards */
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  historyIconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyMetaRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  historyMetaTag: {
    color: '#94A3B8',
    fontSize: 11,
  },
  historyDateBadge: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyDateText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
});
