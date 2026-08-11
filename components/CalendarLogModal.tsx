import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useNutritionStore } from '../store/nutritionStore';

interface CalendarLogModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CalendarLogModal: React.FC<CalendarLogModalProps> = ({ visible, onClose }) => {
  const { role } = useAuthStore();
  const selectedDate = useNutritionStore((state) => state.selectedDate);

  const [activeDate, setActiveDate] = useState(selectedDate);
  const [selectedClient, setSelectedClient] = useState<string>('Marcus Vance');

  // Accordion expansion states for granular inspection
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    workout: true, // Default open workout for immediate granular inspection
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
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>📅 Log Calendar Inspector</Text>
              <Text style={styles.modalSub}>Select any past date to inspect granular log details</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* TRAINER CLIENT ROSTER FILTER BAR */}
            {role === 'TRAINER' && (
              <View style={styles.trainerFilterCard}>
                <Text style={styles.trainerFilterLabel}>👤 FILTER CLIENT LOGS (TRAINER MODE)</Text>
                <View style={styles.clientPillsRow}>
                  {(['All Clients', 'Marcus Vance', 'Sarah Jenkins', 'David Miller'] as const).map((client) => (
                    <TouchableOpacity
                      key={client}
                      style={[styles.clientPill, selectedClient === client && styles.clientPillActive]}
                      onPress={() => setSelectedClient(client)}
                    >
                      <Text
                        style={[
                          styles.clientPillText,
                          selectedClient === client && styles.clientPillTextActive,
                        ]}
                      >
                        {client}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* MONTHLY CALENDAR GRID */}
            <View style={styles.calendarCard}>
              <View style={styles.monthHeaderRow}>
                <Text style={styles.monthNavBtn}>◀</Text>
                <Text style={styles.monthTitle}>{currentMonth}</Text>
                <Text style={styles.monthNavBtn}>▶</Text>
              </View>

              {/* Day Headers */}
              <View style={styles.weekHeaderRow}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                  <Text key={d} style={styles.weekDayText}>
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
                        isSelected && styles.dayCellSelected,
                        hasLog && !isSelected && styles.dayCellHasLog,
                      ]}
                      onPress={() => handleSelectDay(dayNum)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.dayNumText,
                          isSelected && styles.dayNumTextSelected,
                          hasLog && !isSelected && styles.dayNumTextHasLog,
                        ]}
                      >
                        {dayNum}
                      </Text>
                      {hasLog && <View style={[styles.dotIndicator, isSelected && { backgroundColor: '#FFFFFF' }]} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* GRANULAR DAY LOG INSPECTOR SHEET */}
            <View style={styles.logInspectorCard}>
              <View style={styles.inspectorHeaderRow}>
                <View>
                  <Text style={styles.inspectorLabel}>DAY LOG DETAILS & AUDIT</Text>
                  <Text style={styles.inspectorDateTitle}>{formattedActiveDateLabel}</Text>
                </View>
                {role === 'TRAINER' && (
                  <View style={styles.clientTag}>
                    <Text style={styles.clientTagText}>Client: {selectedClient}</Text>
                  </View>
                )}
              </View>

              <View style={styles.inspectorDivider} />

              {/* 🏋️ WORKOUT SESSION LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View style={styles.expandableCard}>
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={styles.logItemIcon}>🏋️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logItemTitle}>Push Split (Chest & Shoulders)</Text>
                      <Text style={styles.logItemSub}>Duration: 42m • Total Volume: 3,850 kg • 14 Sets</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleBtn, expandedSections['workout'] && styles.toggleBtnActive]}
                    onPress={() => toggleSection('workout')}
                  >
                    <Text style={[styles.toggleBtnText, expandedSections['workout'] && styles.toggleBtnTextActive]}>
                      {expandedSections['workout'] ? '▲ Hide' : '▼ Details'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {expandedSections['workout'] && (
                  <View style={styles.granularBox}>
                    <Text style={styles.granularTitle}>Exercise & Set Audit Logs:</Text>

                    <View style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>1. Barbell Bench Press (3 Sets)</Text>
                      <Text style={styles.setDetailText}>• Set 1: 80 kg × 10 reps (800 kg)</Text>
                      <Text style={styles.setDetailText}>• Set 2: 85 kg × 8 reps (680 kg)</Text>
                      <Text style={styles.setDetailText}>• Set 3: 90 kg × 6 reps (540 kg) ⚡ Personal Record!</Text>
                    </View>

                    <View style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>2. Incline Dumbbell Press (2 Sets)</Text>
                      <Text style={styles.setDetailText}>• Set 1: 28 kg × 12 reps (336 kg)</Text>
                      <Text style={styles.setDetailText}>• Set 2: 30 kg × 10 reps (300 kg)</Text>
                    </View>

                    <View style={styles.exerciseItem}>
                      <Text style={styles.exerciseName}>3. Standing Overhead Press (2 Sets)</Text>
                      <Text style={styles.setDetailText}>• Set 1: 50 kg × 8 reps (400 kg)</Text>
                      <Text style={styles.setDetailText}>• Set 2: 55 kg × 6 reps (330 kg)</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* 🥗 NUTRITION LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View style={styles.expandableCard}>
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={styles.logItemIcon}>🥗</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logItemTitle}>Daily Nutrition & Macros</Text>
                      <Text style={styles.logItemSub}>1,850 / 2,100 kcal • 158g P • 210g C • 52g F</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleBtn, expandedSections['nutrition'] && styles.toggleBtnActive]}
                    onPress={() => toggleSection('nutrition')}
                  >
                    <Text style={[styles.toggleBtnText, expandedSections['nutrition'] && styles.toggleBtnTextActive]}>
                      {expandedSections['nutrition'] ? '▲ Hide' : '▼ Details'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {expandedSections['nutrition'] && (
                  <View style={styles.granularBox}>
                    <Text style={styles.granularTitle}>Logged Meals Breakdown:</Text>

                    <View style={styles.mealItemRow}>
                      <Text style={styles.mealCatBadge}>BREAKFAST</Text>
                      <Text style={styles.mealNameText}>Oatmeal, Whole Eggs & Berries</Text>
                      <Text style={styles.mealKcalText}>520 kcal (28g P)</Text>
                    </View>

                    <View style={styles.mealItemRow}>
                      <Text style={styles.mealCatBadge}>LUNCH</Text>
                      <Text style={styles.mealNameText}>Chicken Tikka Bowl w/ Rice</Text>
                      <Text style={styles.mealKcalText}>680 kcal (48g P)</Text>
                    </View>

                    <View style={styles.mealItemRow}>
                      <Text style={styles.mealCatBadge}>DINNER</Text>
                      <Text style={styles.mealNameText}>Pan-seared Salmon & Asparagus</Text>
                      <Text style={styles.mealKcalText}>650 kcal (42g P)</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* ⚖️ BODY WEIGHT & METRICS LOG (EXPANDABLE GRANULAR DETAILS) */}
              <View style={styles.expandableCard}>
                <View style={styles.expandableHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Text style={styles.logItemIcon}>⚖️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logItemTitle}>Body Weight & Health Metrics</Text>
                      <Text style={styles.logItemSub}>Weight: 76.4 kg • Body Fat: 16.4% • BMI: 24.5</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.toggleBtn, expandedSections['metrics'] && styles.toggleBtnActive]}
                    onPress={() => toggleSection('metrics')}
                  >
                    <Text style={[styles.toggleBtnText, expandedSections['metrics'] && styles.toggleBtnTextActive]}>
                      {expandedSections['metrics'] ? '▲ Hide' : '▼ Details'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {expandedSections['metrics'] && (
                  <View style={styles.granularBox}>
                    <Text style={styles.granularTitle}>Recorded Body Tape & Calculated Metrics:</Text>

                    <View style={styles.metricsGridRow}>
                      <View style={styles.metricMiniTile}>
                        <Text style={styles.metricMiniLabel}>Body Weight</Text>
                        <Text style={styles.metricMiniVal}>76.4 kg</Text>
                      </View>

                      <View style={styles.metricMiniTile}>
                        <Text style={styles.metricMiniLabel}>Body Fat %</Text>
                        <Text style={styles.metricMiniVal}>16.4%</Text>
                      </View>

                      <View style={styles.metricMiniTile}>
                        <Text style={styles.metricMiniLabel}>Waist Tape</Text>
                        <Text style={styles.metricMiniVal}>84 cm</Text>
                      </View>

                      <View style={styles.metricMiniTile}>
                        <Text style={styles.metricMiniLabel}>Neck Tape</Text>
                        <Text style={styles.metricMiniVal}>39 cm</Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </ScrollView>

          {/* Clean Close Action */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.fullCloseBtn} onPress={onClose} activeOpacity={0.8}>
              <Text style={styles.fullCloseBtnText}>Close Calendar ✕</Text>
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
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 30,
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalSub: {
    color: '#94A3B8',
    fontSize: 11.5,
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
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  trainerFilterCard: {
    backgroundColor: '#091512',
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  trainerFilterLabel: {
    color: '#A7F3D0',
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
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clientPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  clientPillText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  clientPillTextActive: {
    color: '#10B981',
  },
  calendarCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  monthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  monthTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  monthNavBtn: {
    color: '#10B981',
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
    color: '#64748B',
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
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellSelected: {
    backgroundColor: '#10B981',
  },
  dayCellHasLog: {
    borderColor: '#10B98166',
    borderWidth: 1,
  },
  dayNumText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dayNumTextSelected: {
    color: '#064E3B',
  },
  dayNumTextHasLog: {
    color: '#F8FAFC',
  },
  dotIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#10B981',
    position: 'absolute',
    bottom: 4,
  },
  logInspectorCard: {
    backgroundColor: '#091512',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  inspectorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inspectorLabel: {
    color: '#64748B',
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  inspectorDateTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  clientTag: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  clientTagText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  inspectorDivider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginVertical: 12,
  },
  expandableCard: {
    backgroundColor: '#0C1E19',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  logItemSub: {
    color: '#94A3B8',
    fontSize: 10.5,
    marginTop: 2,
  },
  toggleBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#10B981',
  },
  granularBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#10B98122',
  },
  granularTitle: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  exerciseItem: {
    marginBottom: 8,
    backgroundColor: '#091512',
    padding: 8,
    borderRadius: 8,
  },
  exerciseName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  setDetailText: {
    color: '#94A3B8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  mealItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091512',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
    gap: 8,
  },
  mealCatBadge: {
    color: '#10B981',
    fontSize: 9,
    fontWeight: 'bold',
    width: 65,
  },
  mealNameText: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: '600',
  },
  mealKcalText: {
    color: '#A7F3D0',
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
    backgroundColor: '#091512',
    padding: 8,
    borderRadius: 8,
  },
  metricMiniLabel: {
    color: '#64748B',
    fontSize: 10,
  },
  metricMiniVal: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  actionRow: {
    marginTop: 14,
  },
  fullCloseBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  fullCloseBtnText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
