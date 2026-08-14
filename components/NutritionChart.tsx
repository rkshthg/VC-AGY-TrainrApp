import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionStore } from '../store/nutritionStore';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../lib/theme';

export const NutritionChart: React.FC = () => {
  const { macroTargets, todayMeals, setMacroTargets } = useNutritionStore();
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const theme = useTheme();

  const [modalVisible, setModalVisible] = useState(false);
  const [calInput, setCalInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');

  let consumedCalories = 0;
  let consumedProtein = 0;
  let consumedCarbs = 0;
  let consumedFat = 0;
  let hasLoggedFood = false;

  todayMeals.forEach((meal) => {
    if (meal.items && meal.items.length > 0) {
      hasLoggedFood = true;
    }
    consumedCalories += meal.totalCalories || 0;
    consumedProtein += meal.totalProteinG || 0;
    consumedCarbs += meal.totalCarbsG || 0;
    consumedFat += meal.totalFatG || 0;
  });

  const targetCalories = macroTargets.calories || 2500;
  const targetProtein = macroTargets.protein || 75;
  const targetCarbs = macroTargets.carbs || 250;
  const targetFat = macroTargets.fat || 65;

  const proteinPct = Math.min(100, Math.round((consumedProtein / targetProtein) * 100));
  const carbsPct = Math.min(100, Math.round((consumedCarbs / targetCarbs) * 100));
  const fatPct = Math.min(100, Math.round((consumedFat / targetFat) * 100));

  const proteinKcal = Math.round(consumedProtein * 4);
  const carbsKcal = Math.round(consumedCarbs * 4);
  const fatKcal = Math.round(consumedFat * 9);
  const remainingKcal = Math.max(0, targetCalories - consumedCalories);

  const handleOpenModal = () => {
    setCalInput(String(targetCalories));
    setProteinInput(String(targetProtein));
    setCarbsInput(String(targetCarbs));
    setFatInput(String(targetFat));
    setModalVisible(true);
  };

  const handleSaveOwnTargets = () => {
    const calories = parseInt(calInput) || 2500;
    const protein = parseFloat(proteinInput) || 75;
    const carbs = parseFloat(carbsInput) || 250;
    const fat = parseFloat(fatInput) || 65;

    const newTargets = { calories, protein, carbs, fat };
    setMacroTargets(newTargets);

    if (profile) {
      setProfile({
        ...profile,
        macroTargets: newTargets,
      });
    }

    setModalVisible(false);
    Alert.alert('Targets Updated 🎯', 'Your daily calorie & macro targets have been updated.');
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...theme.shadow,
        },
      ]}
    >
      {/* Header Row: Title + Subtitle & Actions */}
      <View style={styles.energyFlowHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Daily Energy & Macro Flow</Text>
          <Text style={[styles.energyFlowSub, { color: theme.textSecondary }]}>
            {consumedCalories.toLocaleString()} of {targetCalories.toLocaleString()} kcal consumed
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            style={[
              styles.editTargetsBtn,
              {
                backgroundColor: theme.cardInner,
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
              },
            ]}
            onPress={handleOpenModal}
            activeOpacity={0.8}
          >
            <Ionicons name="pencil-outline" size={12} color={theme.isDark ? theme.accentGold : theme.primary} />
            <Text style={[styles.editTargetsBtnText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
              Edit Targets
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Proportional Segmented Progress Bar */}
      <View
        style={[
          styles.segmentedProgressBarTrack,
          { backgroundColor: theme.cardInner, borderColor: theme.border },
        ]}
      >
        {proteinKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: proteinKcal, backgroundColor: theme.macroProtein },
            ]}
          />
        )}
        {carbsKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: carbsKcal, backgroundColor: theme.macroCarbs },
            ]}
          />
        )}
        {fatKcal > 0 && (
          <View
            style={[
              styles.segmentedFill,
              { flex: fatKcal, backgroundColor: theme.macroFat },
            ]}
          />
        )}
        {(remainingKcal > 0 || !hasLoggedFood) && (
          <View
            style={[
              styles.segmentedFillEmpty,
              { flex: Math.max(1, remainingKcal), backgroundColor: theme.cardAlt },
            ]}
          />
        )}
      </View>

      {/* 3-Column Macro Details Grid */}
      <View style={styles.macroPillGrid}>
        {/* Protein */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroProtein }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>PROTEIN</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedProtein)}g / {targetProtein}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {proteinKcal} kcal ({proteinPct}%)
          </Text>
        </View>

        {/* Carbs */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroCarbs }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>CARBS</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedCarbs)}g / {targetCarbs}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {carbsKcal} kcal ({carbsPct}%)
          </Text>
        </View>

        {/* Fat */}
        <View
          style={[
            styles.macroPillCard,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <View style={styles.macroPillHeader}>
            <View style={[styles.macroDot, { backgroundColor: theme.macroFat }]} />
            <Text style={[styles.macroPillLabel, { color: theme.textSecondary }]}>FAT</Text>
          </View>
          <Text style={[styles.macroPillVal, { color: theme.text }]}>
            {Math.round(consumedFat)}g / {targetFat}g
          </Text>
          <Text style={[styles.macroPillSub, { color: theme.textMuted }]}>
            {fatKcal} kcal ({fatPct}%)
          </Text>
        </View>
      </View>

      {/* 🎯 SELF EDIT TARGETS MODAL */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Set Macro Targets</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
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
              value={calInput}
              keyboardType="numeric"
              onChangeText={setCalInput}
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
              value={proteinInput}
              keyboardType="numeric"
              onChangeText={setProteinInput}
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
              value={carbsInput}
              keyboardType="numeric"
              onChangeText={setCarbsInput}
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
              value={fatInput}
              keyboardType="numeric"
              onChangeText={setFatInput}
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
                onPress={() => setModalVisible(false)}
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
                onPress={handleSaveOwnTargets}
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
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  energyFlowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  energyFlowSub: {
    fontSize: 11.5,
    marginTop: 2,
  },
  remainingPillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  remainingPillText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
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
  macroPillGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  macroPillCard: {
    flex: 1,
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
  },
  macroPillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  macroDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  macroPillLabel: {
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    fontSize: 9.5,
    marginTop: 2,
  },
  editTargetsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  editTargetsBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
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
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseText: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 4,
  },
  modalInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
  },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 20,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalSaveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: 'bold',
  },
});
