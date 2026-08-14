import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { LoggedWorkoutCard } from '../../components/LoggedWorkoutCard';
import { useWorkoutStore, WorkoutPlan } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function WorkoutScreen() {
  const router = useRouter();
  const role = useAuthStore((state) => state.role);
  const theme = useTheme();
  const {
    savedPlans,
    activePlanId,
    activeRoutineDayIndexMap,
    workoutHistory,
    setActivePlan,
    setActiveRoutineDayIndex,
    startSession,
    deletePlan,
    createPlan,
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
  
  // Workouts This Week: Mon to Today
  const getWorkoutsThisWeekCount = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    monday.setHours(0, 0, 0, 0);

    const loggedDates = new Set<string>();
    workoutHistory.forEach((item) => {
      const itemDate = new Date(item.date);
      if (itemDate >= monday && itemDate <= now) {
        loggedDates.add(itemDate.toISOString().split('T')[0]);
      }
    });
    return loggedDates.size;
  };

  const workoutsThisWeekCount = getWorkoutsThisWeekCount();

  // Active Streak Calculation (consecutive logged days)
  const getActiveStreakDays = () => {
    if (!workoutHistory || workoutHistory.length === 0) return 0;

    const loggedDatesSet = new Set(
      workoutHistory.map((h) => new Date(h.date).toISOString().split('T')[0])
    );

    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let checkDate = new Date(today);
    const todayStr = checkDate.toISOString().split('T')[0];

    if (!loggedDatesSet.has(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (loggedDatesSet.has(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  };

  const activeStreak = getActiveStreakDays();

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
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`Are you sure you want to remove "${title}"?`);
      if (confirmDelete) {
        deletePlan(planId);
      }
    } else {
      Alert.alert('Delete Workout Routine', `Are you sure you want to remove "${title}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deletePlan(planId) },
      ]);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: KPI Quick Stats Bar */}
        <View
          style={[
            styles.kpiContainer,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          {/* Workouts This Week */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>WORKOUTS THIS WEEK</Text>
            <Text style={[styles.kpiVal, { color: theme.text }]}>{workoutsThisWeekCount} / 4</Text>
            <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Mon – Today</Text>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />

          {/* Total Volume */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>TOTAL VOLUME</Text>
            <Text style={[styles.kpiVal, { color: theme.text }]}>
              {totalVolumeKg >= 1000 ? `${(totalVolumeKg / 1000).toFixed(1)}k` : totalVolumeKg}
              <Text style={{ fontSize: 12, fontWeight: 'normal' }}> kg</Text>
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Accumulated</Text>
          </View>

          <View style={[styles.kpiDivider, { backgroundColor: theme.border }]} />

          {/* Active Streak */}
          <View style={styles.kpiCard}>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>ACTIVE STREAK</Text>
            <Text
              style={[
                styles.kpiVal,
                { color: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            >
              {activeStreak} {activeStreak === 1 ? 'Day' : 'Days'}
            </Text>
            <Text style={[styles.kpiSub, { color: theme.textMuted }]}>Consistent</Text>
          </View>
        </View>

        {/* MERGED SINGLE ACTIVE ROUTINE & WORKOUT LAUNCHER CARD */}
        <View
          style={[
            styles.activeRoutineMergedCard,
            {
              backgroundColor: theme.card,
              borderColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadow,
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.activeRoutineHeader}>
            <View
              style={[
                styles.badgeActiveTag,
                {
                  backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeActiveTagText,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                {role === 'CLIENT' ? 'ASSIGNED ROUTINE' : 'ACTIVE ROUTINE'}
              </Text>
            </View>

            <Text style={[styles.dayCountText, { color: theme.textSecondary }]}>
              {activePlan ? `${activePlan.days.length}-Day Split` : 'Freestyle'}
            </Text>
          </View>

          {/* Routine Name */}
          <Text style={[styles.activeRoutineTitle, { color: theme.text }]}>
            {activePlan ? activePlan.title : 'Freestyle Workout Session'}
          </Text>

          {/* Next Workout Subtitle */}
          <Text style={[styles.activeRoutineSub, { color: theme.textSecondary }]}>
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
                    style={[
                      styles.dayChipPill,
                      {
                        backgroundColor: isNextUp
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardInner,
                        borderColor: isNextUp
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setActiveRoutineDayIndex(activePlan.id, idx)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.dayChipPillText,
                        {
                          color: isNextUp
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFFFFF'
                            : theme.textSecondary,
                          fontWeight: isNextUp ? 'bold' : '600',
                        },
                      ]}
                    >
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
              style={[
                styles.startFreestyleBtnMerged,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.border,
                },
              ]}
              onPress={handleStartFreestyle}
              activeOpacity={0.85}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="flash-outline" size={16} color={theme.text} />
                <Text style={[styles.startFreestyleBtnMergedText, { color: theme.text }]}>
                  Start Freestyle
                </Text>
              </View>
            </TouchableOpacity>

            {activePlan && (
              <TouchableOpacity
                style={[
                  styles.startRoutineBtnMerged,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                    ...theme.shadowButton,
                  },
                ]}
                onPress={() => handleStartPlanSession(activePlan, activeDayIndex)}
                activeOpacity={0.85}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="play-outline" size={16} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
                  <Text
                    style={[
                      styles.startRoutineBtnMergedText,
                      { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                    ]}
                  >
                    Start Routine
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* SECTION 4: Saved Routines Library */}
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
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Saved Routines</Text>
              <Text style={[styles.sectionHeaderSub, { color: theme.textSecondary }]}>
                {role === 'TRAINER'
                  ? 'Build & assign 1-week workout routines for clients'
                  : 'Your personal 1-week planned workout routines'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.buildRoutineBtn,
                {
                  backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  ...theme.shadowButton,
                },
              ]}
              onPress={() => router.push('/workout/builder')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.buildRoutineBtnText,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                + Build Routine
              </Text>
            </TouchableOpacity>
          </View>

          {displayedSavedPlans.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No saved workout routines found. Tap "+ Build Routine" to create one!
              </Text>
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
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: isActiveRoutine
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                    },
                    menuOpenPlanId === plan.id && { zIndex: 999 },
                  ]}
                >
                  {/* Top Header Row with Title, Badges & 3-Dot Overflow Menu */}
                  <View style={styles.routineCardHeader}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={[styles.routineTitle, { color: theme.text }]}>{plan.title}</Text>
                        {isActiveRoutine && (
                          <View
                            style={[
                              styles.activeTagBadge,
                              {
                                backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                                borderColor: theme.isDark ? theme.accentGold : theme.primary,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.activeTagBadgeText,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              ACTIVE
                            </Text>
                          </View>
                        )}
                        {isAssigned && (
                          <View
                            style={[
                              styles.assignedTag,
                              { backgroundColor: theme.cardAlt, borderColor: theme.border },
                            ]}
                          >
                            <Text
                              style={[
                                styles.assignedTagText,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              Assigned
                            </Text>
                          </View>
                        )}
                      </View>

                      <Text style={[styles.routineDaysSubtitle, { color: theme.textSecondary }]}>
                        {plan.days.length} Days / Wk • {totalExercisesCount} Exercises
                      </Text>
                    </View>

                    {/* 3-Dot Overflow Menu Button */}
                    <TouchableOpacity
                      style={[
                        styles.overflowMenuBtn,
                        {
                          backgroundColor: theme.cardAlt,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setMenuOpenPlanId(menuOpenPlanId === plan.id ? null : plan.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color={theme.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Dropdown Accordion Toggle Button Row */}
                  <TouchableOpacity
                    style={[
                      styles.daysAccordionBtn,
                      {
                        backgroundColor: isExpanded
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardAlt,
                        borderColor: isExpanded
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      },
                    ]}
                    onPress={() => toggleRoutineAccordion(plan.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={isExpanded ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={12}
                        color={
                          isExpanded
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFFFFF'
                            : theme.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.daysAccordionBtnText,
                          {
                            color: isExpanded
                              ? theme.isDark
                                ? '#0A1A12'
                                : '#FFFFFF'
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {isExpanded ? 'Hide Workout Days' : `View ${plan.days.length} Workout Days`}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Collapsible Accordion Content */}
                  {isExpanded && (
                    <>
                      <View style={[styles.routineDivider, { backgroundColor: theme.border }]} />

                      <View style={styles.accordionDaysList}>
                        {plan.days.map((day, dIdx) => (
                          <View
                            key={day.id || dIdx}
                            style={[
                              styles.dayAccordionCard,
                              {
                                backgroundColor: theme.card,
                                borderColor: theme.border,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.dayAccordionTitle,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              {day.dayName}
                            </Text>

                            {day.exercises && day.exercises.length > 0 ? (
                              day.exercises.map((ex, eIdx) => (
                                <Text key={eIdx} style={[styles.dayAccordionExText, { color: theme.text }]}>
                                  • {ex.name}{' '}
                                  <Text style={[styles.dayAccordionExSub, { color: theme.textMuted }]}>
                                    ({ex.targetSets} Sets • {ex.targetReps || '8-10 reps'})
                                  </Text>
                                </Text>
                              ))
                            ) : (
                              <Text style={[styles.dayAccordionEmptyText, { color: theme.textMuted }]}>
                                No exercises added
                              </Text>
                            )}
                          </View>
                        ))}
                      </View>
                    </>
                  )}

                  {/* Full-Width Active Action Button */}
                  <View style={styles.routineActionBarSingle}>
                    {!isActiveRoutine ? (
                      <TouchableOpacity
                        style={[
                          styles.setActiveFullBtn,
                          {
                            backgroundColor: theme.cardAlt,
                            borderColor: theme.isDark ? theme.accentGold : theme.primary,
                          },
                        ]}
                        onPress={() => setActivePlan(plan.id)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.setActiveFullBtnText,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          Make Active Routine
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.setActiveFullBtnActive,
                          {
                            backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                            borderColor: theme.isDark ? theme.accentGold : theme.primary,
                          },
                        ]}
                        onPress={() => handleStartPlanSession(plan)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.setActiveFullBtnTextActive,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          Launch Next Workout
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* OVERFLOW MENU MODAL / POPUP OVERLAY */}
                  {menuOpenPlanId === plan.id && (
                    <View
                      style={[
                        styles.overflowMenuDropdown,
                        {
                          backgroundColor: theme.card,
                          borderColor: theme.border,
                          ...theme.shadow,
                        },
                      ]}
                    >
                      {role === 'TRAINER' && (
                        <TouchableOpacity
                          style={[styles.overflowMenuItem, { borderBottomColor: theme.border }]}
                          onPress={() => {
                            setMenuOpenPlanId(null);
                            router.push({
                              pathname: '/workout/assign-modal',
                              params: { planId: plan.id },
                            });
                          }}
                        >
                          <Ionicons name="people-outline" size={16} color={theme.isDark ? theme.accentGold : theme.primary} />
                          <Text style={[styles.overflowMenuText, { color: theme.text }]}>Assign to Client</Text>
                        </TouchableOpacity>
                      )}

                      <TouchableOpacity
                        style={[styles.overflowMenuItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleEditPlan(plan)}
                      >
                        <Ionicons name="create-outline" size={16} color={theme.text} />
                        <Text style={[styles.overflowMenuText, { color: theme.text }]}>Edit Routine</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.overflowMenuItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleDuplicatePlan(plan)}
                      >
                        <Ionicons name="copy-outline" size={16} color={theme.text} />
                        <Text style={[styles.overflowMenuText, { color: theme.text }]}>Duplicate Routine</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.overflowMenuItem, { borderBottomColor: theme.border }]}
                        onPress={() => handleExportJson(plan)}
                      >
                        <Ionicons name="download-outline" size={16} color={theme.text} />
                        <Text style={[styles.overflowMenuText, { color: theme.text }]}>Export JSON File</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.overflowMenuItem}
                        onPress={() => {
                          setMenuOpenPlanId(null);
                          handleDeletePlan(plan.id, plan.title);
                        }}
                      >
                        <Ionicons name="trash-outline" size={16} color={theme.danger} />
                        <Text style={[styles.overflowMenuText, { color: theme.danger }]}>Delete Routine</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* SECTION 5: Workout Session Logs */}
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
          <Text style={[styles.sectionHeaderTitle, { color: theme.text }]}>Workout Session Log</Text>
          <Text style={[styles.sectionHeaderSub, { color: theme.textSecondary, marginBottom: 16 }]}>
            Past logged workouts and total volume records
          </Text>

          {workoutHistory.length === 0 ? (
            <View
              style={[
                styles.emptyContainer,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                No past logged workout sessions recorded yet.
              </Text>
            </View>
          ) : (
            workoutHistory.map((session, index) => (
              <LoggedWorkoutCard key={session.id || index} session={session} />
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
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  kpiContainer: {
    flexDirection: 'row',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 12,
    marginBottom: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  kpiCard: {
    flex: 1,
    alignItems: 'center',
  },
  kpiLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  kpiVal: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  kpiSub: {
    fontSize: 9.5,
    marginTop: 1,
  },
  kpiDivider: {
    width: 1,
    height: 28,
  },
  activeRoutineMergedCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  activeRoutineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeActiveTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeActiveTagText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
  dayCountText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  activeRoutineTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  activeRoutineSub: {
    fontSize: 12,
    marginBottom: 12,
  },
  dayChipsContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  dayChipPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayChipPillText: {
    fontSize: 11,
  },
  mergedActionBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  startFreestyleBtnMerged: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startFreestyleBtnMergedText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  startRoutineBtnMerged: {
    flex: 1.2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startRoutineBtnMergedText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionHeaderSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  buildRoutineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
  },
  buildRoutineBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  routineCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    position: 'relative',
  },
  routineCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  routineTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  activeTagBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  activeTagBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  assignedTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  assignedTagText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  routineDaysSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  overflowMenuBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  daysAccordionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 10,
  },
  daysAccordionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  routineDivider: {
    height: 1,
    marginVertical: 12,
  },
  accordionDaysList: {
    gap: 8,
    marginBottom: 8,
  },
  dayAccordionCard: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  dayAccordionTitle: {
    fontSize: 12.5,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  dayAccordionExText: {
    fontSize: 12,
    marginBottom: 3,
  },
  dayAccordionExSub: {
    fontSize: 10.5,
  },
  dayAccordionEmptyText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  routineActionBarSingle: {
    marginTop: 10,
  },
  setActiveFullBtn: {
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  setActiveFullBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  setActiveFullBtnActive: {
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  setActiveFullBtnTextActive: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  overflowMenuDropdown: {
    position: 'absolute',
    top: 50,
    right: 16,
    width: 170,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  overflowMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  overflowMenuText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
