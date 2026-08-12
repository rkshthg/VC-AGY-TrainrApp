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
import { useTheme } from '../lib/theme';

interface CalendarLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalendarLogModal: React.FC<CalendarLogModalProps> = ({ visible, onClose }) => {
  const { role } = useAuthStore();
  const selectedDate = useNutritionStore((state) => state.selectedDate);
  const theme = useTheme();

  const [activeDate, setActiveDate] = useState(selectedDate);
  const [selectedClient, setSelectedClient] = useState<string>('Marcus Vance');

  // Accordion expansion states for granular inspection
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workout: true,
  });

  const toggleSection = (sectionKey: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Days in August 2026 (31 days)
  const currentMonth = 'August 2026';
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  // Mock logged days (days with recorded activities)
  const loggedDays = [2, 4, 5, 7, 8, 9, 10, 11];

  const handleSelectDay = (dayNum: number) => {
    const formattedDate = `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}`;
    setActiveDate(formattedDate);
  };

  const formattedActiveDateLabel = new Date(activeDate).toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

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
                  {(['All Clients', 'Marcus Vance', 'Sarah Jenkins', 'David Miller'] as const).map((client) => {
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
                <TouchableOpacity>
                  <Ionicons name="chevron-back-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                </TouchableOpacity>
                <Text style={[styles.monthTitle, { color: theme.text }]}>{currentMonth}</Text>
                <TouchableOpacity>
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
                {daysInMonth.map((dayNum) => {
                  const dateStr = `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}`;
                  const isSelected = activeDate === dateStr;
                  const hasLog = loggedDays.includes(dayNum);

                  return (
                    <TouchableOpacity
                      key={dayNum}
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
                      <Text style={[styles.logItemTitle, { color: theme.text }]}>Push Split (Chest & Shoulders)</Text>
                      <Text style={[styles.logItemSub, { color: theme.textSecondary }]}>
                        Duration: 42m • Total Volume: 3,850 kg • 14 Sets
                      </Text>
                    </View>
                  </View>

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
                </View>

                {expandedSections['workout'] && (
                  <View style={[styles.granularBox, { borderTopColor: theme.border }]}>
                    <Text
                      style={[
                        styles.granularTitle,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      Exercise & Set Audit Logs:
                    </Text>

                    <View style={[styles.exerciseItem, { backgroundColor: theme.cardInner }]}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>1. Barbell Bench Press (3 Sets)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 1: 80 kg × 10 reps (800 kg)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 2: 85 kg × 8 reps (680 kg)</Text>
                      <Text style={[styles.setDetailText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                        • Set 3: 90 kg × 6 reps (540 kg) — Personal Record!
                      </Text>
                    </View>

                    <View style={[styles.exerciseItem, { backgroundColor: theme.cardInner }]}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>2. Incline Dumbbell Press (2 Sets)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 1: 28 kg × 12 reps (336 kg)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 2: 30 kg × 10 reps (300 kg)</Text>
                    </View>

                    <View style={[styles.exerciseItem, { backgroundColor: theme.cardInner }]}>
                      <Text style={[styles.exerciseName, { color: theme.text }]}>3. Standing Overhead Press (2 Sets)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 1: 50 kg × 8 reps (400 kg)</Text>
                      <Text style={[styles.setDetailText, { color: theme.textSecondary }]}>• Set 2: 55 kg × 6 reps (330 kg)</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* NUTRITION LOG (EXPANDABLE GRANULAR DETAILS) */}
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
                      <Text style={[styles.logItemTitle, { color: theme.text }]}>Daily Nutrition & Macros</Text>
                      <Text style={[styles.logItemSub, { color: theme.textSecondary }]}>
                        1,850 / 2,100 kcal • 158g P • 210g C • 52g F
                      </Text>
                    </View>
                  </View>

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
                </View>

                {expandedSections['nutrition'] && (
                  <View style={[styles.granularBox, { borderTopColor: theme.border }]}>
                    <Text
                      style={[
                        styles.granularTitle,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      Logged Meals Breakdown:
                    </Text>

                    <View style={[styles.mealItemRow, { backgroundColor: theme.cardInner }]}>
                      <Text
                        style={[
                          styles.mealCatBadge,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        BREAKFAST
                      </Text>
                      <Text style={[styles.mealNameText, { color: theme.text }]}>Oatmeal, Whole Eggs & Berries</Text>
                      <Text
                        style={[
                          styles.mealKcalText,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        520 kcal (28g P)
                      </Text>
                    </View>

                    <View style={[styles.mealItemRow, { backgroundColor: theme.cardInner }]}>
                      <Text
                        style={[
                          styles.mealCatBadge,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        LUNCH
                      </Text>
                      <Text style={[styles.mealNameText, { color: theme.text }]}>Chicken Tikka Bowl w/ Rice</Text>
                      <Text
                        style={[
                          styles.mealKcalText,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        680 kcal (48g P)
                      </Text>
                    </View>

                    <View style={[styles.mealItemRow, { backgroundColor: theme.cardInner }]}>
                      <Text
                        style={[
                          styles.mealCatBadge,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        DINNER
                      </Text>
                      <Text style={[styles.mealNameText, { color: theme.text }]}>Pan-seared Salmon & Asparagus</Text>
                      <Text
                        style={[
                          styles.mealKcalText,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        650 kcal (42g P)
                      </Text>
                    </View>
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
                        Weight: 76.4 kg • Body Fat: 16.4% • BMI: 24.5
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

                    <View style={styles.metricsGridRow}>
                      <View style={[styles.metricMiniTile, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.metricMiniLabel, { color: theme.textMuted }]}>Body Weight</Text>
                        <Text
                          style={[
                            styles.metricMiniVal,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          76.4 kg
                        </Text>
                      </View>

                      <View style={[styles.metricMiniTile, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.metricMiniLabel, { color: theme.textMuted }]}>Body Fat %</Text>
                        <Text
                          style={[
                            styles.metricMiniVal,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          16.4%
                        </Text>
                      </View>

                      <View style={[styles.metricMiniTile, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.metricMiniLabel, { color: theme.textMuted }]}>Waist Tape</Text>
                        <Text
                          style={[
                            styles.metricMiniVal,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          84 cm
                        </Text>
                      </View>

                      <View style={[styles.metricMiniTile, { backgroundColor: theme.cardInner }]}>
                        <Text style={[styles.metricMiniLabel, { color: theme.textMuted }]}>Neck Tape</Text>
                        <Text
                          style={[
                            styles.metricMiniVal,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          39 cm
                        </Text>
                      </View>
                    </View>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
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
