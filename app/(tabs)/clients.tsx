import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { useTrainerStore, ClientSummaryCard } from '../../store/trainerStore';

export default function ClientsScreen() {
  const router = useRouter();
  const { clients, updateClientMacroTargets } = useTrainerStore();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'ON_TRACK' | 'NEEDS_ATTENTION'>('ALL');
  const [expandedClientIds, setExpandedClientIds] = useState<Record<string, boolean>>({});

  // Target Editor Modal state
  const [targetModalClient, setTargetModalClient] = useState<ClientSummaryCard | null>(null);
  const [targetCaloriesInput, setTargetCaloriesInput] = useState<string>('2100');

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
    setTargetCaloriesInput(String(client.targetCalories || 2100));
  };

  const handleSaveTargets = () => {
    if (!targetModalClient) return;
    const calories = parseInt(targetCaloriesInput) || 2100;
    updateClientMacroTargets(targetModalClient.clientId, {
      calories,
      protein: Math.round((calories * 0.3) / 4),
      carbs: Math.round((calories * 0.4) / 4),
      fat: Math.round((calories * 0.3) / 9),
    });
    setTargetModalClient(null);
    Alert.alert('Targets Updated', `Updated macro targets for ${targetModalClient.fullName}.`);
  };


  return (
    <View style={styles.container}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* KPI Summary Row */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiValue}>{totalClients}</Text>
            <Text style={styles.kpiLabel}>Active Clients</Text>
          </View>
          <View style={[styles.kpiCard, actionRequired > 0 && styles.kpiCardAlert]}>
            <Text style={[styles.kpiValue, actionRequired > 0 && { color: '#EF4444' }]}>
              {actionRequired}
            </Text>
            <Text style={styles.kpiLabel}>Needs Attention</Text>
          </View>
        </View>

        {/* Roster Section Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Signed Client Roster</Text>
          </View>

          {/* Filter Chips Bar */}
          <View style={styles.filterBar}>
            <TouchableOpacity
              style={[styles.filterPill, filter === 'ALL' && styles.filterPillActive]}
              onPress={() => setFilter('ALL')}
            >
              <Text style={[styles.filterPillText, filter === 'ALL' && styles.filterPillTextActive]}>
                ALL ({totalClients})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filter === 'ON_TRACK' && styles.filterPillActive]}
              onPress={() => setFilter('ON_TRACK')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'ON_TRACK' && styles.filterPillTextActive,
                ]}
              >
                ON TRACK ({onTrackCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, filter === 'NEEDS_ATTENTION' && styles.filterPillActive]}
              onPress={() => setFilter('NEEDS_ATTENTION')}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filter === 'NEEDS_ATTENTION' && { color: '#EF4444' },
                ]}
              >
                NEEDS ATTENTION ({actionRequired})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Roster Cards List */}
          {filteredClients.length === 0 ? (
            <Text style={styles.emptyText}>No clients found in this filter category.</Text>
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
                  style={[styles.clientCard, isAlert ? styles.cardAlertBorder : styles.cardNormalBorder]}
                >
                  {/* Top Header Row */}
                  <View style={styles.clientCardHeader}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>{client.fullName.charAt(0)}</Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <View style={styles.nameBadgeRow}>
                        <Text style={styles.clientName}>{client.fullName}</Text>
                        <View
                          style={[
                            styles.statusBadge,
                            isAlert ? styles.statusAlert : styles.statusSuccess,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isAlert ? { color: '#F59E0B' } : { color: '#10B981' },
                            ]}
                          >
                            {isAlert ? '⚠️ Needs Attention' : '⚡ On Track'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.planTitleText}>
                        Routine: {client.currentPlanTitle || 'No Active Plan'}
                      </Text>
                    </View>
                  </View>

                  {/* Nutrition Progress Indicator */}
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutriLabelRow}>
                      <Text style={styles.nutriText}>
                        🥗 Calories:{' '}
                        <Text style={styles.nutriHighlight}>
                          {client.todayCaloriesLogged} / {client.targetCalories} kcal
                        </Text>
                      </Text>
                      <Text style={styles.nutriPct}>{calPct}%</Text>
                    </View>

                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${calPct}%` },
                          isAlert ? { backgroundColor: '#F59E0B' } : { backgroundColor: '#10B981' },
                        ]}
                      />
                    </View>
                  </View>

                  {/* Workout Status Badge & Accordion Toggle */}
                  <View style={styles.subCardRow}>
                    <View
                      style={[
                        styles.workoutBadge,
                        client.todayWorkoutDone
                          ? styles.workoutBadgeDone
                          : styles.workoutBadgePending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.workoutBadgeText,
                          client.todayWorkoutDone ? { color: '#10B981' } : { color: '#CBD5E1' },
                        ]}
                      >
                        {client.todayWorkoutDone ? '✓ Workout Completed' : '⌛ Workout Pending'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.toggleBtn, isExpanded && styles.toggleBtnActive]}
                      onPress={() => toggleExpandClient(client.clientId)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.toggleBtnText, isExpanded && styles.toggleBtnTextActive]}>
                        {isExpanded ? '▲ Hide Details' : '▼ Inspect Details'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* 📜 EXPANDED INSPECTION DRAWER */}
                  {isExpanded && (
                    <>
                      <View style={styles.divider} />

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
                          <View style={styles.macroGrid}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <Text style={styles.macroGridTitle}>Daily Macro Compliance</Text>
                              <Text style={{ color: '#EAB308', fontSize: 11, fontWeight: 'bold' }}>
                                {client.todayCaloriesLogged} / {client.targetCalories} kcal
                              </Text>
                            </View>

                            {/* Mini Segmented Progress Bar */}
                            <View style={styles.miniSegmentedTrack}>
                              {pKcal > 0 && <View style={[styles.segmentedFill, { flex: pKcal, backgroundColor: '#3B82F6' }]} />}
                              {cKcal > 0 && <View style={[styles.segmentedFill, { flex: cKcal, backgroundColor: '#A855F7' }]} />}
                              {fKcal > 0 && <View style={[styles.segmentedFill, { flex: fKcal, backgroundColor: '#F59E0B' }]} />}
                              {(remKcal > 0 || (pKcal + cKcal + fKcal) === 0) && (
                                <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remKcal), backgroundColor: '#1E293B' }]} />
                              )}
                            </View>

                            <View style={styles.miniMacroPillRow}>
                              <View style={styles.miniMacroPill}>
                                <Text style={{ color: '#3B82F6', fontSize: 9, fontWeight: 'bold' }}>PROTEIN</Text>
                                <Text style={styles.miniMacroPillVal}>{pG}g / {pTarget}g</Text>
                              </View>
                              <View style={styles.miniMacroPill}>
                                <Text style={{ color: '#A855F7', fontSize: 9, fontWeight: 'bold' }}>CARBS</Text>
                                <Text style={styles.miniMacroPillVal}>{cG}g / {cTarget}g</Text>
                              </View>
                              <View style={styles.miniMacroPill}>
                                <Text style={{ color: '#F59E0B', fontSize: 9, fontWeight: 'bold' }}>FAT</Text>
                                <Text style={styles.miniMacroPillVal}>{fG}g / {fTarget}g</Text>
                              </View>
                            </View>
                          </View>
                        );
                      })()}

                      {/* Trainer Actions Bar */}
                      <View style={styles.trainerActionBar}>
                        {/* 👤 View Full Profile Button */}
                        <TouchableOpacity
                          style={styles.actionBtnPrimary}
                          onPress={() => router.push(`/clients/${client.clientId}`)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnPrimaryText}>👤 View Full Profile</Text>
                        </TouchableOpacity>

                        {/* 🎯 Edit Targets Button */}
                        <TouchableOpacity
                          style={styles.actionBtnSecondary}
                          onPress={() => handleOpenTargetModal(client)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.actionBtnSecondaryText}>🎯 Edit Targets</Text>
                        </TouchableOpacity>

                      </View>
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
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Edit Targets: {targetModalClient?.fullName}
              </Text>
              <TouchableOpacity onPress={() => setTargetModalClient(null)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Daily Calorie Target (kcal):</Text>
            <TextInput
              style={styles.modalInput}
              value={targetCaloriesInput}
              keyboardType="numeric"
              onChangeText={setTargetCaloriesInput}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTargetModalClient(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveTargets}>
                <Text style={styles.modalSaveText}>Save Targets 🎯</Text>
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
    backgroundColor: '#0F172A',
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
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  kpiCardAlert: {
    borderColor: '#EF444455',
  },
  kpiValue: {
    color: '#F8FAFC',
    fontSize: 26,
    fontWeight: 'bold',
  },
  kpiLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },

  sectionCard: {
    backgroundColor: '#171E2D',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 17,
    fontWeight: 'bold',
  },
  filterBar: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  filterPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  filterPillText: {
    color: '#94A3B8',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  filterPillTextActive: {
    color: '#10B981',
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },

  clientCard: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  cardNormalBorder: {
    borderColor: '#10B98133',
  },
  cardAlertBorder: {
    borderColor: '#F59E0B66',
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
    backgroundColor: '#064E3B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#10B981',
    marginRight: 12,
  },
  avatarText: {
    color: '#10B981',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  statusAlert: {
    backgroundColor: '#451A03',
    borderColor: '#F59E0B',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  planTitleText: {
    color: '#94A3B8',
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
    color: '#CBD5E1',
    fontSize: 12,
  },
  nutriHighlight: {
    color: '#10B981',
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  nutriPct: {
    color: '#A7F3D0',
    fontSize: 11,
    fontWeight: 'bold',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#0F172A',
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
  workoutBadgeDone: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  workoutBadgePending: {
    backgroundColor: '#0F172A',
    borderColor: '#334155',
  },
  workoutBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  toggleBtnText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleBtnTextActive: {
    color: '#10B981',
  },

  divider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginVertical: 12,
  },
  macroGrid: {
    backgroundColor: '#0C1E19',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  macroGridTitle: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniSegmentedTrack: {
    flexDirection: 'row',
    height: 10,
    backgroundColor: '#1E293B',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 10,
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
    backgroundColor: '#0F172A',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
  },
  miniMacroPillVal: {
    color: '#F8FAFC',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  macroLabel: {
    color: '#94A3B8',
    fontSize: 11.5,
  },
  macroValue: {
    color: '#F8FAFC',
    fontSize: 11.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },

  trainerActionBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionBtnPrimary: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  actionBtnPrimaryText: {
    color: '#064E3B',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  actionBtnSecondary: {
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#10B981',
    alignItems: 'center',
  },
  actionBtnSecondaryText: {
    color: '#10B981',
    fontSize: 11.5,
    fontWeight: 'bold',
  },
  actionBtnDanger: {
    backgroundColor: '#451A03',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF444455',
    alignItems: 'center',
  },
  actionBtnDangerText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: 'bold',
  },

  /* TARGET EDIT MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: '#0F172A',
    borderRadius: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalCloseText: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  modalSaveBtn: {
    flex: 1.5,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  modalSaveText: {
    color: '#064E3B',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
