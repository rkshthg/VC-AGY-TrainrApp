import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useTrainerStore } from '../store/trainerStore';
import { useTheme } from '../lib/theme';
import { formatWeight, formatLength } from '../lib/units';

import { useWorkoutStore } from '../store/workoutStore';
import { useProgressStore } from '../store/progressStore';

interface CalendarLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalendarLogModal: React.FC<CalendarLogModalProps> = ({ visible, onClose }) => {
  const { role, unitSystem } = useAuthStore();
  const selectedDate = useNutritionStore((state) => state.selectedDate);
  const theme = useTheme();

  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);
  const todayMeals = useNutritionStore((state) => state.todayMeals);
  const weightHistory = useProgressStore((state) => state.weightHistory);
  const checkinPhotos = useProgressStore((state) => state.checkinPhotos);

  const [activeDate, setActiveDate] = useState(selectedDate);
  const [selectedClient, setSelectedClient] = useState<string>('All Clients');

  // Accordion expansion states for granular inspection
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workout: true,
    nutrition: true,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Compute set of logged dates in YYYY-MM-DD format
  const loggedDatesSet = new Set<string>();
  workoutHistory.forEach((w) => {
    if (w.date) loggedDatesSet.add(new Date(w.date).toISOString().split('T')[0]);
  });
  todayMeals.forEach((m) => {
    if (m.timestamp) loggedDatesSet.add(new Date(m.timestamp).toISOString().split('T')[0]);
  });
  weightHistory.forEach((wh) => {
    if (wh.date) loggedDatesSet.add(new Date(wh.date).toISOString().split('T')[0]);
  });
  checkinPhotos.forEach((cp) => {
    if (cp.date) loggedDatesSet.add(new Date(cp.date).toISOString().split('T')[0]);
  });

  // Helper to parse date string YYYY-MM-DD safely into local time Date object
  const parseYYYYMMDD = (dateStr: string) => {
    const parts = dateStr.split('-');
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  };

  const [viewDate, setViewDate] = useState(() => parseYYYYMMDD(activeDate));

  const viewYear = viewDate.getFullYear();
  const viewMonthIndex = viewDate.getMonth(); // 0-11
  const viewMonthNum = viewMonthIndex + 1; // 1-12
  const currentMonthStr = `${viewYear}-${viewMonthNum < 10 ? '0' + viewMonthNum : viewMonthNum}`;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = `${monthNames[viewMonthIndex]} ${viewYear}`;

  const daysInMonthCount = new Date(viewYear, viewMonthNum, 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  // Compute offset: first day of week for current month (0 = Sunday, 1 = Monday...)
  const firstDayOfWeek = new Date(viewYear, viewMonthIndex, 1).getDay();
  const emptyDays = Array.from({ length: firstDayOfWeek });

  const loggedDays = daysInMonth.filter((dayNum) => {
    const dayStr = `${currentMonthStr}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
    return loggedDatesSet.has(dayStr);
  });

  const handlePrevMonth = () => {
    setViewDate(new Date(viewYear, viewMonthIndex - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewYear, viewMonthIndex + 1, 1));
  };

  const handleSelectDay = (dayNum: number) => {
    const formattedDate = `${currentMonthStr}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
    setActiveDate(formattedDate);
  };

  const dayWorkouts = workoutHistory.filter((w) => {
    if (!w.date) return false;
    return new Date(w.date).toISOString().split('T')[0] === activeDate;
  });

  const dayMeals = todayMeals.filter((m) => {
    if (!m.timestamp) return false;
    return new Date(m.timestamp).toISOString().split('T')[0] === activeDate;
  });

  const formattedActiveDateLabel = new Date(activeDate).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Calculate dynamic weight/health metrics for activeDate
  const dayWeightLog = weightHistory.find((wh) => {
    if (!wh.date) return false;
    return new Date(wh.date).toISOString().split('T')[0] === activeDate;
  });

  const checkinLogs = useProgressStore((state) => state.checkinLogs);
  const dayCheckin = checkinLogs.find((cl) => {
    if (!cl.date) return false;
    return new Date(cl.date).toISOString().split('T')[0] === activeDate;
  });

  const dayWeightLogVal = dayWeightLog?.weightKg || dayCheckin?.weightKg;
  const weight = dayWeightLogVal ? formatWeight(dayWeightLogVal, unitSystem) : 'N/A';

  // Compile all metrics recorded on this day
  const recordedMetrics: { label: string; value: string }[] = [];

  if (dayWeightLogVal) {
    recordedMetrics.push({
      label: 'Body Weight',
      value: formatWeight(dayWeightLogVal, unitSystem),
    });
  }

  if (dayCheckin?.measurements) {
    const m = dayCheckin.measurements;
    if (m.neckCm !== undefined && m.neckCm !== null) {
      recordedMetrics.push({ label: 'Neck Tape', value: formatLength(m.neckCm, unitSystem) });
    }
    if (m.shouldersCm !== undefined && m.shouldersCm !== null) {
      recordedMetrics.push({ label: 'Shoulders Tape', value: formatLength(m.shouldersCm, unitSystem) });
    }
    if (m.chestCm !== undefined && m.chestCm !== null) {
      recordedMetrics.push({ label: 'Chest Tape', value: formatLength(m.chestCm, unitSystem) });
    }
    if (m.waistCm !== undefined && m.waistCm !== null) {
      recordedMetrics.push({ label: 'Waist Tape', value: formatLength(m.waistCm, unitSystem) });
    }
    if (m.hipsCm !== undefined && m.hipsCm !== null) {
      recordedMetrics.push({ label: 'Hips Tape', value: formatLength(m.hipsCm, unitSystem) });
    }
    if (m.bicepsCm !== undefined && m.bicepsCm !== null) {
      recordedMetrics.push({ label: 'Biceps Tape', value: formatLength(m.bicepsCm, unitSystem) });
    }
    if (m.bicepsLCm !== undefined && m.bicepsLCm !== null) {
      recordedMetrics.push({ label: 'Biceps L Tape', value: formatLength(m.bicepsLCm, unitSystem) });
    }
    if (m.bicepsRCm !== undefined && m.bicepsRCm !== null) {
      recordedMetrics.push({ label: 'Biceps R Tape', value: formatLength(m.bicepsRCm, unitSystem) });
    }
    if (m.thighsCm !== undefined && m.thighsCm !== null) {
      recordedMetrics.push({ label: 'Thighs Tape', value: formatLength(m.thighsCm, unitSystem) });
    }
    if (m.thighsLCm !== undefined && m.thighsLCm !== null) {
      recordedMetrics.push({ label: 'Thighs L Tape', value: formatLength(m.thighsLCm, unitSystem) });
    }
    if (m.thighsRCm !== undefined && m.thighsRCm !== null) {
      recordedMetrics.push({ label: 'Thighs R Tape', value: formatLength(m.thighsRCm, unitSystem) });
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
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
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Log Calendar Inspector</Text>
              <Text style={[styles.modalSub, { color: theme.textSecondary }]}>
                Select any past date to inspect granular log details
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <Ionicons name="close-outline" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* TRAINER CLIENT ROSTER FILTER BAR */}
            {role === 'TRAINER' && (
              <View
                style={[
                  styles.trainerFilterCard,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
              >
                <Text
                  style={[
                    styles.trainerFilterLabel,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  FILTER CLIENT LOGS (TRAINER MODE)
                </Text>
                <View style={styles.clientPillsRow}>
                  {['All Clients', ...useTrainerStore.getState().clients.map((c) => c.fullName)].map((client) => {
                    const isActive = selectedClient === client;
                    return (
                      <TouchableOpacity
                        key={client}
                        style={[
                          styles.clientPill,
                          {
                            backgroundColor: isActive
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.cardAlt,
                            borderColor: isActive
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => setSelectedClient(client)}
                      >
                        <Text
                          style={[
                            styles.clientPillText,
                            {
                              color: isActive
                                ? theme.isDark
                                  ? '#0A1A12'
                                  : '#FFFFFF'
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {client}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* MONTHLY CALENDAR GRID */}
            <View
              style={[
                styles.calendarCard,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.monthHeaderRow}>
                <TouchableOpacity onPress={handlePrevMonth}>
                  <Ionicons name="chevron-back-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: theme.text }]}>{currentMonth}</Text>
                <TouchableOpacity onPress={handleNextMonth}>
                  <Ionicons name="chevron-forward-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                </TouchableOpacity>
              </View>

              {/* Day Headers */}
              <View style={styles.weekHeaderRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <Text key={d} style={[styles.weekDayText, { color: theme.textMuted }]}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {(() => {
                  const allCells = [
                    ...emptyDays.map((_, idx) => ({ type: 'empty' as const, id: `empty-${idx}`, dayNum: null })),
                    ...daysInMonth.map((dayNum) => ({ type: 'day' as const, id: `day-${dayNum}`, dayNum })),
                  ];
                  const rows: typeof allCells[] = [];
                  for (let i = 0; i < allCells.length; i += 7) {
                    rows.push(allCells.slice(i, i + 7));
                  }

                  return rows.map((weekRow, rowIdx) => (
                    <View key={`week-${rowIdx}`} style={styles.weekRow}>
                      {weekRow.map((cell) => {
                        if (cell.type === 'empty') {
                          return (
                            <View
                              key={cell.id}
                              style={[
                                styles.dayCell,
                                {
                                  backgroundColor: 'transparent',
                                  borderColor: 'transparent',
                                },
                              ]}
                            />
                          );
                        }

                        const dayNum = cell.dayNum!;
                        const dateStr = `${currentMonthStr}-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                        const isSelected = activeDate === dateStr;
                        const hasLog = loggedDays.includes(dayNum);

                        return (
                          <TouchableOpacity
                            key={cell.id}
                            style={[
                              styles.dayCell,
                              {
                                backgroundColor: isSelected
                                  ? theme.isDark
                                    ? theme.accentGold
                                    : theme.primary
                                  : theme.cardAlt,
                                borderColor: isSelected
                                  ? 'transparent'
                                  : hasLog
                                  ? theme.isDark
                                    ? theme.borderGold
                                    : theme.primaryLight
                                  : 'transparent',
                              },
                            ]}
                            onPress={() => handleSelectDay(dayNum)}
                            activeOpacity={0.8}
                          >
                            <Text
                              style={[
                                styles.dayNumText,
                                {
                                  color: isSelected
                                    ? theme.isDark
                                      ? '#0A1A12'
                                      : '#FFFFFF'
                                    : hasLog
                                    ? theme.text
                                    : theme.textMuted,
                                  fontWeight: isSelected || hasLog ? 'bold' : 'normal',
                                },
                              ]}
                            >
                              {dayNum}
                            </Text>
                            {hasLog && (
                              <View
                                style={[
                                  styles.dotIndicator,
                                  {
                                    backgroundColor: isSelected
                                      ? theme.isDark
                                        ? '#0A1A12'
                                        : '#FFFFFF'
                                      : theme.isDark
                                      ? theme.accentGold
                                      : theme.primary,
                                  },
                                ]}
                              />
                            )}
                          </TouchableOpacity>
                        );
                      })}
                      {weekRow.length < 7 &&
                        Array.from({ length: 7 - weekRow.length }).map((_, idx) => (
                          <View
                            key={`pad-${idx}`}
                            style={[
                              styles.dayCell,
                              {
                                backgroundColor: 'transparent',
                                borderColor: 'transparent',
                              },
                            ]}
                          />
                        ))}
                    </View>
                  ));
                })()}
              </View>
            </View>

            {/* GRANULAR DAY LOG INSPECTOR SHEET */}
            <View
              style={[
                styles.logInspectorCard,
                { backgroundColor: theme.cardInner, borderColor: theme.border },
              ]}
            >
              <View style={styles.inspectorHeaderRow}>
                <View>
                  <Text style={[styles.inspectorLabel, { color: theme.textMuted }]}>DAY LOG DETAILS & AUDIT</Text>
                  <Text style={[styles.inspectorDateTitle, { color: theme.text }]}>{formattedActiveDateLabel}</Text>
                </View>
                {role === 'TRAINER' && (
                  <View
                    style={[
                      styles.clientTag,
                      {
                        backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                        borderColor: theme.isDark ? theme.accentGold : theme.primary,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.clientTagText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      Client: {selectedClient}
                    </Text>
                  </View>
                )}
              </View>

              <View style={[styles.inspectorDivider, { backgroundColor: theme.border }]} />

              {/* 🏋️ WORKOUT SESSION LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View
                style={[
                  styles.expandableCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="barbell-outline" size={20} color={theme.isDark ? theme.accentGold : theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logItemTitle, { color: theme.text }]}>Workout Session Logs</Text>
                      <Text style={[styles.logItemSub, { color: theme.textSecondary }]}>
                        {dayWorkouts.length > 0
                          ? `${dayWorkouts.length} workout(s) logged on this date`
                          : 'No workouts logged on this date'}
                      </Text>
                    </View>
                  </View>

                  {dayWorkouts.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: expandedSections['workout']
                            ? theme.isDark
                              ? theme.cardInner
                              : theme.badgeBg
                            : theme.cardInner,
                          borderColor: expandedSections['workout'] ? theme.accentGold : theme.border,
                        },
                      ]}
                      onPress={() => toggleSection('workout')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons
                          name={expandedSections['workout'] ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={12}
                          color={
                            expandedSections['workout']
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.toggleBtnText,
                            {
                              color: expandedSections['workout']
                                ? theme.isDark
                                  ? theme.accentGold
                                  : theme.primary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {expandedSections['workout'] ? 'Hide' : 'Details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {expandedSections['workout'] && dayWorkouts.length > 0 && (
                  <View style={[styles.granularBox, { borderTopColor: theme.border }]}>
                    {dayWorkouts.map((w, wIdx) => (
                      <View key={w.id || wIdx} style={[styles.exerciseItem, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {wIdx + 1}. {w.title} ({w.durationMinutes}m • {w.totalVolumeKg} kg)
                        </Text>
                        {w.exerciseLogs && w.exerciseLogs.length > 0 ? (
                          w.exerciseLogs.map((ex, exIdx) => (
                            <Text key={exIdx} style={[styles.setDetailText, { color: theme.textSecondary }]}>
                              • {ex.name}: {ex.sets} set(s) completed ({ex.totalVolumeKg} kg)
                            </Text>
                          ))
                        ) : (
                          <Text style={[styles.setDetailText, { color: theme.textMuted }]}>
                            • {w.exerciseCount} exercises completed
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* 🥗 NUTRITION LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View
                style={[
                  styles.expandableCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="nutrition-outline" size={20} color={theme.isDark ? theme.accentGold : theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logItemTitle, { color: theme.text }]}>Daily Nutrition & Meals</Text>
                      <Text style={[styles.logItemSub, { color: theme.textSecondary }]}>
                        {dayMeals.length > 0
                          ? `${dayMeals.length} meal(s) logged on this date`
                          : 'No meals logged on this date'}
                      </Text>
                    </View>
                  </View>

                  {dayMeals.length > 0 && (
                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
                        {
                          backgroundColor: expandedSections['nutrition']
                            ? theme.isDark
                              ? theme.cardInner
                              : theme.badgeBg
                            : theme.cardInner,
                          borderColor: expandedSections['nutrition'] ? theme.accentGold : theme.border,
                        },
                      ]}
                      onPress={() => toggleSection('nutrition')}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Ionicons
                          name={expandedSections['nutrition'] ? 'chevron-up-outline' : 'chevron-down-outline'}
                          size={12}
                          color={
                            expandedSections['nutrition']
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.textSecondary
                          }
                        />
                        <Text
                          style={[
                            styles.toggleBtnText,
                            {
                              color: expandedSections['nutrition']
                                ? theme.isDark
                                  ? theme.accentGold
                                  : theme.primary
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {expandedSections['nutrition'] ? 'Hide' : 'Details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>

                {expandedSections['nutrition'] && dayMeals.length > 0 && (
                  <View style={[styles.granularBox, { borderTopColor: theme.border }]}>
                    {dayMeals.map((m, mIdx) => (
                      <View key={m.id || mIdx} style={[styles.exerciseItem, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                          {mIdx + 1}. {m.dishName} ({m.totalCalories} kcal • {m.totalProteinG}g P • {m.totalCarbsG}g C • {m.totalFatG}g F)
                        </Text>
                        {m.items.map((item, itemIdx) => (
                          <Text key={itemIdx} style={[styles.setDetailText, { color: theme.textSecondary }]}>
                            • {item.name} ({item.quantity}): {item.calories} kcal
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* BODY WEIGHT & METRICS LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View
                style={[
                  styles.expandableCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                ]}
              >
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Ionicons name="scale-outline" size={20} color={theme.isDark ? theme.accentGold : theme.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.logItemTitle, { color: theme.text }]}>Body Weight & Health Metrics</Text>
                      <Text style={[styles.logItemSub, { color: theme.textSecondary }]}>
                        {weight !== 'N/A' ? `Weight: ${weight}` : 'No metrics logged on this date'}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleBtn,
                      {
                        backgroundColor: expandedSections['metrics']
                          ? theme.isDark
                            ? theme.cardInner
                            : theme.badgeBg
                          : theme.cardInner,
                        borderColor: expandedSections['metrics'] ? theme.accentGold : theme.border,
                      },
                    ]}
                    onPress={() => toggleSection('metrics')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons
                        name={expandedSections['metrics'] ? 'chevron-up-outline' : 'chevron-down-outline'}
                        size={12}
                        color={
                          expandedSections['metrics']
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.textSecondary
                        }
                      />
                      <Text
                        style={[
                          styles.toggleBtnText,
                          {
                            color: expandedSections['metrics']
                              ? theme.isDark
                                ? theme.accentGold
                                : theme.primary
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {expandedSections['metrics'] ? 'Hide' : 'Details'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                {expandedSections['metrics'] && (
                  <View style={[styles.granularBox, { borderTopColor: theme.border }]}>
                    <Text
                      style={[
                        styles.granularTitle,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      Recorded Body Tape & Calculated Metrics:
                    </Text>

                    {recordedMetrics.length > 0 ? (
                      <View style={styles.metricsGridRow}>
                        {recordedMetrics.map((item, idx) => (
                          <View key={idx} style={[styles.metricMiniTile, { backgroundColor: theme.cardInner }]}>
                            <Text style={[styles.metricMiniLabel, { color: theme.textMuted }]}>{item.label}</Text>
                            <Text
                              style={[
                                styles.metricMiniVal,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              {item.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={[styles.setDetailText, { color: theme.textMuted, marginVertical: 10, textAlign: 'center', width: '100%' }]}>
                        No weight or health metrics logged on this date.
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Clean Close Action */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[
                styles.fullCloseBtn,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.border,
                },
              ]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.fullCloseBtnText, { color: theme.text }]}>Close Calendar ✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  modalContent: {
    flex: 1,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    fontSize: 11.5,
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
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  trainerFilterCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
  },
  trainerFilterLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  clientPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  clientPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  clientPillText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  calendarCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthNavBtn: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekDayText: {
    width: '13%',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: 'bold',
  },
  daysGrid: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    width: '100%',
  },
  dayCell: {
    width: '13%',
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  dayNumText: {
    fontSize: 12,
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 4,
  },
  logInspectorCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  inspectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectorLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  inspectorDateTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  clientTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  clientTagText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  inspectorDivider: {
    height: 1,
    marginVertical: 12,
  },
  expandableCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  expandableHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logItemIcon: {
    fontSize: 20,
  },
  logItemTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  logItemSub: {
    fontSize: 10.5,
    marginTop: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  granularBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  granularTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseItem: {
    marginBottom: 8,
    padding: 8,
    borderRadius: 8,
  },
  exerciseName: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  setDetailText: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  mealCatBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    width: 65,
  },
  mealNameText: {
    flex: 1,
    fontSize: 11.5,
    fontWeight: '600',
  },
  mealKcalText: {
    fontSize: 10.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  metricsGridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricMiniTile: {
    width: '48%',
    padding: 8,
    borderRadius: 8,
  },
  metricMiniLabel: {
    fontSize: 10,
  },
  metricMiniVal: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  actionRow: {
    marginTop: 14,
  },
  fullCloseBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  fullCloseBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});
