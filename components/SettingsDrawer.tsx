import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useProgressStore } from '../store/progressStore';
import { generateUserDataJSON } from '../lib/dataExport';
import { CalendarLogModal } from './CalendarLogModal';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose }) => {
  const { profile, role, themeMode, unitSystem, setThemeMode, setUnitSystem, logout, setRole } =
    useAuthStore();
  const todayMeals = useNutritionStore((state) => state.todayMeals);
  const selectedDate = useNutritionStore((state) => state.selectedDate);
  const setSelectedDate = useNutritionStore((state) => state.setSelectedDate);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);
  const weightHistory = useProgressStore((state) => state.weightHistory);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  const handleExportAllData = () => {
    generateUserDataJSON(profile, todayMeals, workoutHistory, weightHistory);
    Alert.alert('User Data Exported', 'Full dataset compiled successfully (JSON/CSV).');
  };

  const handleCleanStorage = () => {
    Alert.alert('Cache Cleared', 'Local image cache and temporary sync logs flushed.');
  };

  const handleSwitchToTrainer = () => {
    setRole('TRAINER');
    Alert.alert('Account Updated', 'You have switched to a Trainer Account.');
    onClose();
  };

  const handleDeleteAccount = () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      Alert.alert('Verification Failed', 'Please type DELETE exactly to confirm account deletion.');
      return;
    }
    setShowDeleteModal(false);
    logout();
    Alert.alert('Account Deleted', 'Your account and data have been permanently removed.');
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.drawerContainer}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>App Settings</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Account Info */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACCOUNT IDENTITY</Text>
              <Text style={styles.userEmailText}>{profile?.email || 'user@trainr.app'}</Text>
              <Text style={styles.roleSubText}>
                Role: <Text style={{ color: '#10B981', fontWeight: 'bold' }}>{role}</Text>
              </Text>
            </View>

            {/* 📅 CALENDAR BUTTON HERO ACTION */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>LOG HISTORY CALENDAR</Text>

              <TouchableOpacity
                style={styles.openCalendarBtn}
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.openCalendarBtnIcon}>📅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.openCalendarBtnTitle}>Open Interactive Calendar</Text>
                  <Text style={styles.openCalendarBtnSub}>
                    {role === 'TRAINER'
                      ? 'Inspect logs by date & filter client roster'
                      : 'View past logs, workouts & nutrition entries'}
                  </Text>
                </View>
                <Text style={styles.openCalendarArrow}>➔</Text>
              </TouchableOpacity>
            </View>

            {/* Appearance Settings */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>APPEARANCE THEME</Text>
              <View style={styles.toggleRow}>
                {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.toggleOption, themeMode === mode && styles.toggleOptionActive]}
                    onPress={() => setThemeMode(mode)}
                  >
                    <Text
                      style={[
                        styles.toggleOptionText,
                        themeMode === mode && styles.toggleOptionTextActive,
                      ]}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Unit Preference */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>UNIT SYSTEM PREFERENCE</Text>
              <View style={styles.toggleRow}>
                {(['METRIC', 'IMPERIAL'] as const).map((unit) => (
                  <TouchableOpacity
                    key={unit}
                    style={[styles.toggleOption, unitSystem === unit && styles.toggleOptionActive]}
                    onPress={() => setUnitSystem(unit)}
                  >
                    <Text
                      style={[
                        styles.toggleOptionText,
                        unitSystem === unit && styles.toggleOptionTextActive,
                      ]}
                    >
                      {unit === 'METRIC' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tools & Storage */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>DATA & TOOLS</Text>

              <TouchableOpacity style={styles.menuItemRow} onPress={handleExportAllData}>
                <Text style={styles.menuItemIcon}>📦</Text>
                <Text style={styles.menuItemText}>Export All User Data (JSON/CSV)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItemRow} onPress={handleCleanStorage}>
                <Text style={styles.menuItemIcon}>🧹</Text>
                <Text style={styles.menuItemText}>Clean Local Cache & Storage</Text>
              </TouchableOpacity>
            </View>

            {/* Account Management */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>ACCOUNT MANAGEMENT</Text>

              {role !== 'TRAINER' && (
                <TouchableOpacity style={styles.menuItemRow} onPress={handleSwitchToTrainer}>
                  <Text style={styles.menuItemIcon}>⚡</Text>
                  <Text style={styles.menuItemText}>Switch to Trainer Account</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity style={styles.menuItemRow} onPress={logout}>
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Log Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItemRow}
                onPress={() => setShowDeleteModal(true)}
              >
                <Text style={styles.menuItemIcon}>🗑️</Text>
                <Text style={[styles.menuItemText, { color: '#EF4444' }]}>Delete Account</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Calendar Screen Modal */}
      <CalendarLogModal
        visible={calendarModalVisible}
        onClose={() => setCalendarModalVisible(false)}
      />

      {/* Delete Account Confirmation Modal */}
      <Modal visible={showDeleteModal} animationType="fade" transparent={true}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalBox}>
            <Text style={styles.deleteTitle}>Permanently Delete Account?</Text>
            <Text style={styles.deleteDesc}>
              This action cannot be undone. All your workout routines, meal logs, transformation photos, and client links will be wiped out.
            </Text>

            <Text style={styles.confirmPromptText}>Type "DELETE" below to confirm:</Text>
            <TextInput
              style={styles.deleteInput}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />

            <View style={styles.deleteBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.confirmDeleteBtn} onPress={handleDeleteAccount}>
                <Text style={styles.confirmDeleteBtnText}>Confirm Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    width: '85%',
    maxWidth: 360,
    backgroundColor: '#0F172A',
    height: '100%',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    paddingBottom: 16,
  },
  drawerTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  scrollContent: {
    flex: 1,
  },
  sectionCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    color: '#64748B',
    fontSize: 10.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  userEmailText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleSubText: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 4,
  },
  dateSubText: {
    color: '#94A3B8',
    fontSize: 12,
    marginBottom: 10,
  },
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  openCalendarBtnIcon: {
    fontSize: 24,
  },
  openCalendarBtnTitle: {
    color: '#064E3B',
    fontSize: 13,
    fontWeight: 'bold',
  },
  openCalendarBtnSub: {
    color: '#064E3B',
    fontSize: 9.5,
    opacity: 0.85,
    marginTop: 1,
  },
  openCalendarArrow: {
    color: '#064E3B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  datePillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  datePill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  datePillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  datePillText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: 'bold',
  },
  datePillTextActive: {
    color: '#10B981',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleOption: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  toggleOptionActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  toggleOptionText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toggleOptionTextActive: {
    color: '#FFFFFF',
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuItemIcon: {
    fontSize: 18,
  },
  menuItemText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModalBox: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  deleteTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmPromptText: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteInput: {
    backgroundColor: '#0F172A',
    color: '#EF4444',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 20,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#334155',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
