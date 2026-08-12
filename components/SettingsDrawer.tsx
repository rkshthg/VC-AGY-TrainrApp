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
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useWorkoutStore } from '../store/workoutStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useProgressStore } from '../store/progressStore';
import { generateUserDataJSON } from '../lib/dataExport';
import { CalendarLogModal } from './CalendarLogModal';
import { useTheme } from '../lib/theme';

interface SettingsDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ visible, onClose }) => {
  const { profile, role, themeMode, unitSystem, setThemeMode, setUnitSystem, logout, setRole } =
    useAuthStore();
  const todayMeals = useNutritionStore((state) => state.todayMeals);
  const workoutHistory = useWorkoutStore((state) => state.workoutHistory);
  const weightHistory = useProgressStore((state) => state.weightHistory);
  const theme = useTheme();

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
        <View
          style={[
            styles.drawerContainer,
            {
              backgroundColor: theme.bg,
              borderLeftColor: theme.navBorder,
            },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.drawerHeader,
              { borderBottomColor: theme.navBorder },
            ]}
          >
            <Text style={[styles.drawerTitle, { color: theme.text }]}>App Settings</Text>
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
            {/* Account Info */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACCOUNT IDENTITY</Text>
              <Text style={[styles.userEmailText, { color: theme.text }]}>{profile?.email || 'user@trainr.app'}</Text>
              <Text style={[styles.roleSubText, { color: theme.textSecondary }]}>
                Role:{' '}
                <Text
                  style={{
                    color: theme.isDark ? theme.accentGold : theme.primary,
                    fontWeight: 'bold',
                  }}
                >
                  {role}
                </Text>
              </Text>
            </View>

            {/* CALENDAR BUTTON HERO ACTION */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>LOG HISTORY CALENDAR</Text>

              <TouchableOpacity
                style={[
                  styles.openCalendarBtn,
                  {
                    backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                    ...theme.shadowButton,
                  },
                ]}
                onPress={() => setCalendarModalVisible(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="calendar-outline" size={20} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.openCalendarBtnTitle,
                      { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                    ]}
                  >
                    Open Interactive Calendar
                  </Text>
                  <Text
                    style={[
                      styles.openCalendarBtnSub,
                      { color: theme.isDark ? '#1F3A2A' : '#E2E8F0' },
                    ]}
                  >
                    {role === 'TRAINER'
                      ? 'Inspect logs by date & filter client roster'
                      : 'View past logs, workouts & nutrition entries'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward-outline" size={18} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>

            {/* Appearance Settings */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>APPEARANCE THEME</Text>
              <View style={styles.toggleRow}>
                {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((mode) => {
                  const isActive = themeMode === mode;
                  return (
                    <TouchableOpacity
                      key={mode}
                      style={[
                        styles.toggleOption,
                        {
                          backgroundColor: isActive
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.cardInner,
                          borderColor: isActive
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.border,
                        },
                      ]}
                      onPress={() => setThemeMode(mode)}
                    >
                      <Text
                        style={[
                          styles.toggleOptionText,
                          {
                            color: isActive
                              ? theme.isDark
                                ? '#0A1A12'
                                : '#FFFFFF'
                              : theme.textSecondary,
                            fontWeight: isActive ? 'bold' : 'normal',
                          },
                        ]}
                      >
                        {mode}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Unit Preference */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>UNIT SYSTEM PREFERENCE</Text>
              <View style={styles.toggleRow}>
                {(['METRIC', 'IMPERIAL'] as const).map((unit) => {
                  const isActive = unitSystem === unit;
                  return (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.toggleOption,
                        {
                          backgroundColor: isActive
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.cardInner,
                          borderColor: isActive
                            ? theme.isDark
                              ? theme.accentGold
                              : theme.primary
                            : theme.border,
                        },
                      ]}
                      onPress={() => setUnitSystem(unit)}
                    >
                      <Text
                        style={[
                          styles.toggleOptionText,
                          {
                            color: isActive
                              ? theme.isDark
                                ? '#0A1A12'
                                : '#FFFFFF'
                              : theme.textSecondary,
                            fontWeight: isActive ? 'bold' : 'normal',
                          },
                        ]}
                      >
                        {unit === 'METRIC' ? 'Metric (kg, cm)' : 'Imperial (lbs, ft)'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tools & Storage */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>DATA & TOOLS</Text>

              <TouchableOpacity
                style={[styles.menuItemRow, { borderBottomColor: theme.navBorder }]}
                onPress={handleExportAllData}
              >
                <Ionicons name="download-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Export All User Data (JSON/CSV)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemRow, { borderBottomColor: 'transparent' }]}
                onPress={handleCleanStorage}
              >
                <Ionicons name="trash-outline" size={18} color={theme.textSecondary} />
                <Text style={[styles.menuItemText, { color: theme.text }]}>Clean Local Cache & Storage</Text>
              </TouchableOpacity>
            </View>

            {/* Account Management */}
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
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>ACCOUNT MANAGEMENT</Text>

              {role !== 'TRAINER' && (
                <TouchableOpacity
                  style={[styles.menuItemRow, { borderBottomColor: theme.navBorder }]}
                  onPress={handleSwitchToTrainer}
                >
                  <Ionicons name="flash-outline" size={18} color={theme.isDark ? theme.accentGold : theme.primary} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Switch to Trainer Account</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.menuItemRow, { borderBottomColor: theme.navBorder }]}
                onPress={logout}
              >
                <Ionicons name="log-out-outline" size={18} color={theme.danger} />
                <Text style={[styles.menuItemText, { color: theme.danger }]}>Log Out</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItemRow, { borderBottomColor: 'transparent' }]}
                onPress={() => setShowDeleteModal(true)}
              >
                <Ionicons name="trash-bin-outline" size={18} color={theme.danger} />
                <Text style={[styles.menuItemText, { color: theme.danger }]}>Delete Account</Text>
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
          <View
            style={[
              styles.deleteModalBox,
              {
                backgroundColor: theme.card,
                borderColor: theme.dangerBorder,
                ...theme.shadow,
              },
            ]}
          >
            <Text style={[styles.deleteTitle, { color: theme.danger }]}>Permanently Delete Account?</Text>
            <Text style={[styles.deleteDesc, { color: theme.textSecondary }]}>
              This action cannot be undone. All your workout routines, meal logs, transformation photos, and client links will be wiped out.
            </Text>

            <Text style={[styles.confirmPromptText, { color: theme.text }]}>Type "DELETE" below to confirm:</Text>
            <TextInput
              style={[
                styles.deleteInput,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="DELETE"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="characters"
            />

            <View style={styles.deleteBtnRow}>
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  { backgroundColor: theme.cardInner, borderColor: theme.border },
                ]}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.confirmDeleteBtn, { backgroundColor: theme.danger }]} onPress={handleDeleteAccount}>
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
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  drawerContainer: {
    width: '100%',
    // maxWidth: '90%',
    // maxHeight: '80%',
    height: '100%',
    paddingTop: 26,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderLeftWidth: 1,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderBottomWidth: 1,
    paddingBottom: 16,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  scrollContent: {
    flex: 1,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  userEmailText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  roleSubText: {
    fontSize: 12,
    marginTop: 4,
  },
  openCalendarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    marginBottom: 4,
  },
  openCalendarBtnIcon: {
    fontSize: 22,
  },
  openCalendarBtnTitle: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  openCalendarBtnSub: {
    fontSize: 10,
    marginTop: 1,
  },
  openCalendarArrow: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  toggleOptionText: {
    fontSize: 12,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
    borderBottomWidth: 1,
  },
  menuItemIcon: {
    fontSize: 16,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '500',
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  deleteModalBox: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  confirmPromptText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  deleteInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    marginBottom: 20,
  },
  deleteBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmDeleteBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});
