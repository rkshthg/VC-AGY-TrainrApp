import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { useTrainerStore, ClientSummaryCard } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';

export default function ClientsScreen() {
  const router = useRouter();
  const { clients, isLoading, fetchRoster, updateClientMacroTargets } = useTrainerStore();
  const theme = useTheme();

  useEffect(() => {
    fetchRoster();
  }, []);

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ON_TRACK' | 'NEEDS_ATTENTION'>('ALL');
  const [expandedClientIds, setExpandedClientIds] = useState<Record<string, boolean>>({});

  // Target Editor Modal state
  const [targetModalClient, setTargetModalClient] = useState<ClientSummaryCard | null>(null);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState<string>('2500');
  const [targetProteinInput, setTargetProteinInput] = useState<string>('75');
  const [targetCarbsInput, setTargetCarbsInput] = useState<string>('250');
  const [targetFatInput, setTargetFatInput] = useState<string>('65');

  const totalClients = clients.length;
  const actionRequired = clients.filter((c) => c.status === 'NEEDS_ATTENTION').length;
  const onTrackCount = clients.filter((c) => c.status === 'ON_TRACK').length;

  const filteredClients = clients.filter((c) => {
    if (filter === 'ON_TRACK') return c.status === 'ON_TRACK';
    if (filter === 'NEEDS_ATTENTION') return c.status === 'NEEDS_ATTENTION';
    return true;
  });

  const toggleExpandClient = (clientId: string) => {
    setExpandedClientIds((prev) => ({
      ...prev,
      [clientId]: !prev[clientId],
    }));
  };

  const handleOpenTargetModal = (client: ClientSummaryCard) => {
    setTargetModalClient(client);
    setTargetCaloriesInput(String(client.targetCalories || 2500));
    setTargetProteinInput(String(client.targetProtein || 75));
    setTargetCarbsInput(String(client.targetCarbs || 250));
    setTargetFatInput(String(client.targetFat || 65));
  };

  const handleSaveTargets = () => {
    if (!targetModalClient) return;
    const calories = parseInt(targetCaloriesInput) || 2500;
    const protein = parseFloat(targetProteinInput) || 75;
    const carbs = parseFloat(targetCarbsInput) || 250;
    const fat = parseFloat(targetFatInput) || 65;

    updateClientMacroTargets(targetModalClient.clientId, {
      calories,
      protein,
      carbs,
      fat,
    });
    setTargetModalClient(null);
    Alert.alert('Targets Updated', `Updated macro targets for ${targetModalClient.fullName}.`);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView 
        style={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchRoster}
            colors={[theme.isDark ? theme.accentGold : theme.primary]}
            tintColor={theme.isDark ? theme.accentGold : theme.primary}
          />
        }
      >
        {/* KPI Summary Row */}
        <View style={styles.kpiRow}>
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.kpiValue, { color: theme.text }]}>{totalClients}</Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Active Clients</Text>
          </View>

          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: theme.card,
                borderColor: actionRequired > 0 ? theme.warning : theme.border,
                ...theme.shadow,
              },
            ]}
          >
            <Text
              style={[
                styles.kpiValue,
                { color: actionRequired > 0 ? theme.danger : theme.text },
              ]}
            >
              {actionRequired}
            </Text>
            <Text style={[styles.kpiLabel, { color: theme.textSecondary }]}>Needs Attention</Text>
          </View>
        </View>

        {/* Roster Section Card */}
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
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Signed Client Roster</Text>
          </View>

          {/* Filter Chips Bar */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === 'ALL'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.cardInner,
                  borderColor:
                    filter === 'ALL'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.border,
                },
              ]}
              onPress={() => setFilter('ALL')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      filter === 'ALL'
                        ? theme.isDark
                          ? '#0A1A12'
                          : '#FFFFFF'
                        : theme.textSecondary,
                  },
                ]}
              >
                ALL ({totalClients})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === 'ON_TRACK'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.cardInner,
                  borderColor:
                    filter === 'ON_TRACK'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.border,
                },
              ]}
              onPress={() => setFilter('ON_TRACK')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      filter === 'ON_TRACK'
                        ? theme.isDark
                          ? '#0A1A12'
                          : '#FFFFFF'
                        : theme.textSecondary,
                  },
                ]}
              >
                ON TRACK ({onTrackCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                {
                  backgroundColor:
                    filter === 'NEEDS_ATTENTION'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.cardInner,
                  borderColor:
                    filter === 'NEEDS_ATTENTION'
                      ? theme.isDark
                        ? theme.accentGold
                        : theme.primary
                      : theme.border,
                },
              ]}
              onPress={() => setFilter('NEEDS_ATTENTION')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  {
                    color:
                      filter === 'NEEDS_ATTENTION'
                        ? theme.isDark
                          ? '#0A1A12'
                          : '#FFFFFF'
                        : theme.textSecondary,
                  },
                ]}
              >
                NEEDS ATTENTION ({actionRequired})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Roster Cards List */}
          {filteredClients.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>No clients found in this filter category.</Text>
          ) : (
            filteredClients.map((client) => {
              const isAlert = client.status === 'NEEDS_ATTENTION';
              const isExpanded = !!expandedClientIds[client.clientId];
              const calPct = Math.min(
                100,
                Math.round((client.todayCaloriesLogged / (client.targetCalories || 2000)) * 100)
              );

              return (
                <View
                  key={client.clientId}
                  style={[
                    styles.clientCard,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: isAlert ? theme.warning : theme.border,
                    },
                  ]}
                >
                  {/* Top Header Row */}
                  <View style={styles.clientCardHeader}>
                    <View
                      style={[
                        styles.avatarBox,
                        {
                          backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                          borderColor: theme.isDark ? theme.accentGold : theme.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.avatarText,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        {client.fullName.charAt(0)}
                      </Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={[styles.clientName, { color: theme.text }]}>{client.fullName}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: isAlert
                                ? theme.isDark
                                  ? '#3B1A08'
                                  : '#FEF3C7'
                                : theme.isDark
                                ? theme.badgeBg
                                : '#E8F5E9',
                              borderColor: isAlert ? theme.warning : theme.success,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              { color: isAlert ? theme.warning : theme.success },
                            ]}
                          >
                            {isAlert ? 'Needs Attention' : 'On Track'}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.planTitleText, { color: theme.textSecondary }]}>
                        Routine: {client.currentPlanTitle || 'No Active Plan'}
                      </Text>
                    </View>

                    {/* Upper Right View Full Profile Icon Button */}
                    <TouchableOpacity
                      style={[
                        {
                          backgroundColor: theme.cardAlt,
                          borderColor: theme.border,
                          borderWidth: 1,
                          borderRadius: 12,
                          padding: 8,
                          alignItems: 'center',
                          justifyContent: 'center',
                        },
                      ]}
                      onPress={() => router.push(`/clients/${client.clientId}`)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="person-outline"
                        size={18}
                        color={theme.isDark ? theme.accentGold : theme.primary}
                      />
                    </TouchableOpacity>
                  </View>

                  {/* Nutrition Progress Indicator */}
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutriLabelRow}>
                      <Text style={[styles.nutriText, { color: theme.textSecondary }]}>
                        Calories:{' '}
                        <Text
                          style={[
                            styles.nutriHighlight,
                            { color: theme.isDark ? theme.accentGold : theme.primary },
                          ]}
                        >
                          {client.todayCaloriesLogged} / {client.targetCalories} kcal
                        </Text>
                      </Text>
                      <Text
                        style={[
                          styles.nutriPct,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        {calPct}%
                      </Text>
                    </View>

                    <View style={[styles.progressTrack, { backgroundColor: theme.cardAlt }]}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${calPct}%`,
                            backgroundColor: isAlert
                              ? theme.warning
                              : theme.isDark
                              ? theme.accentGold
                              : theme.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Workout Status Badge & Accordion Toggle */}
                  <View style={styles.subCardRow}>
                    <View
                      style={[
                        styles.workoutBadge,
                        {
                          backgroundColor: client.todayWorkoutDone
                            ? theme.isDark
                              ? theme.badgeBg
                              : '#E8F5E9'
                            : theme.cardAlt,
                          borderColor: client.todayWorkoutDone ? theme.success : theme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.workoutBadgeText,
                          {
                            color: client.todayWorkoutDone
                              ? theme.success
                              : theme.textSecondary,
                          },
                        ]}
                      >
                        {client.todayWorkoutDone ? 'Workout Completed' : 'Workout Pending'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.toggleBtn,
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
                      onPress={() => toggleExpandClient(client.clientId)}
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
                            styles.toggleBtnText,
                            {
                              color: isExpanded
                                ? theme.isDark
                                  ? '#0A1A12'
                                  : '#FFFFFF'
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {isExpanded ? 'Hide Details' : 'Inspect Details'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* 📜 EXPANDED INSPECTION DRAWER */}
                  {isExpanded && (
                    <>
                      <View style={[styles.divider, { backgroundColor: theme.border }]} />

                      {/* Detailed Macro Grid */}
                      {(() => {
                        const pG = Math.round((client.todayCaloriesLogged * 0.3) / 4);
                        const cG = Math.round((client.todayCaloriesLogged * 0.4) / 4);
                        const fG = Math.round((client.todayCaloriesLogged * 0.3) / 9);
                        const pTarget = Math.round((client.targetCalories * 0.3) / 4);
                        const cTarget = Math.round((client.targetCalories * 0.4) / 4);
                        const fTarget = Math.round((client.targetCalories * 0.3) / 9);

                        const pKcal = pG * 4;
                        const cKcal = cG * 4;
                        const fKcal = fG * 9;
                        const remKcal = Math.max(0, client.targetCalories - client.todayCaloriesLogged);

                        return (
                          <View
                            style={[
                              styles.macroGrid,
                              { backgroundColor: theme.card, borderColor: theme.border },
                            ]}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={[styles.macroGridTitle, { color: theme.text }]}>Daily Macro Compliance</Text>
                              <Text
                                style={{
                                  color: theme.isDark ? theme.accentGold : theme.primary,
                                  fontSize: 11,
                                  fontWeight: 'bold',
                                }}
                              >
                                {client.todayCaloriesLogged} / {client.targetCalories} kcal
                              </Text>
                            </View>

                            {/* Mini Segmented Progress Bar */}
                            <View
                              style={[
                                styles.miniSegmentedTrack,
                                { backgroundColor: theme.cardInner, borderColor: theme.border },
                              ]}
                            >
                              {pKcal > 0 && <View style={[styles.segmentedFill, { flex: pKcal, backgroundColor: theme.macroProtein }]} />}
                              {cKcal > 0 && <View style={[styles.segmentedFill, { flex: cKcal, backgroundColor: theme.macroCarbs }]} />}
                              {fKcal > 0 && <View style={[styles.segmentedFill, { flex: fKcal, backgroundColor: theme.macroFat }]} />}
                              {(remKcal > 0 || (pKcal + cKcal + fKcal) === 0) && (
                                <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remKcal), backgroundColor: theme.cardAlt }]} />
                              )}
                            </View>

                            <View style={styles.miniMacroPillRow}>
                              <View
                                style={[
                                  styles.miniMacroPill,
                                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                                ]}
                              >
                                <Text style={{ color: theme.macroProtein, fontSize: 9, fontWeight: 'bold' }}>PROTEIN</Text>
                                <Text style={[styles.miniMacroPillVal, { color: theme.text }]}>{pG}g / {pTarget}g</Text>
                              </View>
                              <View
                                style={[
                                  styles.miniMacroPill,
                                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                                ]}
                              >
                                <Text style={{ color: theme.macroCarbs, fontSize: 9, fontWeight: 'bold' }}>CARBS</Text>
                                <Text style={[styles.miniMacroPillVal, { color: theme.text }]}>{cG}g / {cTarget}g</Text>
                              </View>
                              <View
                                style={[
                                  styles.miniMacroPill,
                                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                                ]}
                              >
                                <Text style={{ color: theme.macroFat, fontSize: 9, fontWeight: 'bold' }}>FAT</Text>
                                <Text style={[styles.miniMacroPillVal, { color: theme.text }]}>{fG}g / {fTarget}g</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })()}
                    </>
                  )}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* 🎯 TARGET EDIT MODAL */}
      <Modal
        visible={!!targetModalClient}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTargetModalClient(null)}
      >
        <View style={styles.modalOverlay}>
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
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Edit Targets: {targetModalClient?.fullName}
              </Text>
              <TouchableOpacity onPress={() => setTargetModalClient(null)}>
                <Text style={[styles.modalCloseText, { color: theme.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Daily Calorie Target (kcal):</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={targetCaloriesInput}
              keyboardType="numeric"
              onChangeText={setTargetCaloriesInput}
              placeholder="2500"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Protein Target (g):</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={targetProteinInput}
              keyboardType="numeric"
              onChangeText={setTargetProteinInput}
              placeholder="75"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Carbohydrates Target (g):</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={targetCarbsInput}
              keyboardType="numeric"
              onChangeText={setTargetCarbsInput}
              placeholder="250"
              placeholderTextColor={theme.textMuted}
            />

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Fat Target (g):</Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={targetFatInput}
              keyboardType="numeric"
              onChangeText={setTargetFatInput}
              placeholder="65"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setTargetModalClient(null)}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalSaveBtn,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                  },
                ]}
                onPress={handleSaveTargets}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                  ]}
                >
                  Save Targets 🎯
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <SettingsDrawer visible={drawerVisible} onClose={() => setDrawerVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  kpiCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
  },
  kpiValue: {
    fontSize: 26,
    fontWeight: 'bold',
  },
  kpiLabel: {
    fontSize: 11.5,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
  clientCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  clientCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  planTitleText: {
    fontSize: 12,
    marginTop: 2,
  },
  nutritionRow: {
    marginBottom: 12,
  },
  nutriLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  nutriText: {
    fontSize: 12,
  },
  nutriHighlight: {
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  nutriPct: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  subCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  workoutBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  workoutBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    marginVertical: 12,
  },
  macroGrid: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  macroGridTitle: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniSegmentedTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
    gap: 2,
  },
  segmentedFill: {
    height: '100%',
    borderRadius: 2,
  },
  segmentedFillEmpty: {
    height: '100%',
    borderRadius: 2,
  },
  miniMacroPillRow: {
    flexDirection: 'row',
    gap: 6,
  },
  miniMacroPill: {
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  miniMacroPillVal: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  trainerActionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  actionBtnSecondary: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
