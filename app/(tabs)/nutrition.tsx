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
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBar } from '../../components/HeaderBar';
import { SettingsDrawer } from '../../components/SettingsDrawer';
import { NutritionChart } from '../../components/NutritionChart';
import { useNutritionStore } from '../../store/nutritionStore';
import { useAuthStore } from '../../store/authStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useTheme } from '../../lib/theme';
import logger from '../../lib/logger';

const COMMON_FOOD_PRESETS = [
  { name: 'Eggs (2 boiled)', calories: 140, p: 12, c: 1, f: 10 },
  { name: 'Whey Protein (1 scoop)', calories: 130, p: 25, c: 3, f: 2 },
  { name: 'Chicken Breast (150g)', calories: 240, p: 46, c: 0, f: 5 },
  { name: 'Oats with Milk', calories: 300, p: 12, c: 48, f: 6 },
  { name: 'Greek Yogurt (200g)', calories: 130, p: 20, c: 8, f: 0 },
  { name: 'White Rice (1 cup)', calories: 200, p: 4, c: 45, f: 0 },
  { name: 'Paneer (100g)', calories: 265, p: 18, c: 4, f: 20 },
  { name: 'Banana (medium)', calories: 105, p: 1, c: 27, f: 0 },
  { name: 'Almonds (30g)', calories: 170, p: 6, c: 6, f: 15 },
  { name: 'Whole Wheat Toast (2)', calories: 160, p: 7, c: 28, f: 2 },
];

export default function NutritionScreen() {
  const router = useRouter();
  const { todayMeals, deleteMealEntry, saveMealEntry, fetchTodayMeals, fetchAllMeals } = useNutritionStore();
  const profile = useAuthStore((state) => state.profile);
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const theme = useTheme();

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      if (profile?.id) {
        await Promise.all([
          fetchTodayMeals(profile.id),
          fetchAllMeals ? fetchAllMeals(profile.id) : Promise.resolve(),
        ]);
      }
    } catch (e) {
      logger.warn('Nutrition refresh error:', e);
    } finally {
      setRefreshing(false);
    }
  };

  const toggleHistoryDay = (dateLabel: string) => {
    setExpandedHistoryDays((prev) => ({
      ...prev,
      [dateLabel]: !prev[dateLabel],
    }));
  };

  // Manual Quick Add Modal state
  const [quickAddModalVisible, setQuickAddModalVisible] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>('LUNCH');
  const [dishTitleInput, setDishTitleInput] = useState('');
  const [caloriesInput, setCaloriesInput] = useState('');
  const [proteinInput, setProteinInput] = useState('');
  const [carbsInput, setCarbsInput] = useState('');
  const [fatInput, setFatInput] = useState('');

  const handleDelete = (id: string, name: string) => {
    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`Are you sure you want to remove ${name}?`);
      if (confirmDelete) {
        deleteMealEntry(id);
      }
    } else {
      Alert.alert('Delete Meal Log', `Are you sure you want to remove ${name}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteMealEntry(id) },
      ]);
    }
  };

  const handleOpenQuickAdd = (category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS') => {
    setSelectedCategory(category);
    setDishTitleInput('');
    setCaloriesInput('');
    setProteinInput('');
    setCarbsInput('');
    setFatInput('');
    setQuickAddModalVisible(true);
  };

  const handleSelectPreset = (preset: (typeof COMMON_FOOD_PRESETS)[0]) => {
    setDishTitleInput(preset.name);
    setCaloriesInput(String(preset.calories));
    setProteinInput(String(preset.p));
    setCarbsInput(String(preset.c));
    setFatInput(String(preset.f));
  };

  const handleSaveQuickAdd = async () => {
    if (!dishTitleInput.trim()) {
      Alert.alert('Missing Title', 'Please enter a dish name.');
      return;
    }

    const totalCal = parseInt(caloriesInput) || 0;
    const totalP = parseFloat(proteinInput) || 0;
    const totalC = parseFloat(carbsInput) || 0;
    const totalF = parseFloat(fatInput) || 0;

    const savedMealId = await saveMealEntry({
      userId: profile?.id || 'usr_1',
      dishName: dishTitleInput.trim(),
      category: selectedCategory,
      timestamp: new Date().toISOString(),
      totalCalories: totalCal,
      totalProteinG: totalP,
      totalCarbsG: totalC,
      totalFatG: totalF,
      items: [
        {
          name: dishTitleInput.trim(),
          quantity: '1 serving',
          calories: totalCal,
          proteinG: totalP,
          carbsG: totalC,
          fatG: totalF,
        },
      ],
    });

    addLiveFeedEvent({
      clientId: profile?.id || 'usr_1',
      clientName: profile?.fullName || 'Client',
      avatarUrl: profile?.avatarUrl,
      eventType: 'LOG_MEAL',
      actionVerb: 'Logged',
      targetTitle: `${selectedCategory.charAt(0) + selectedCategory.slice(1).toLowerCase()} (${dishTitleInput.trim()})`,
      breakdownItems: [
        {
          title: dishTitleInput.trim(),
          subtitle: `P: ${totalP}g • C: ${totalC}g • F: ${totalF}g`,
          value: `${totalCal} kcal`,
        },
      ],
      tags: [
        { label: `${totalCal} kcal`, type: 'info' },
        { label: `${totalP}g P`, type: 'success' },
      ],
      timestamp: new Date().toISOString(),
      mealId: savedMealId,
    });

    setQuickAddModalVisible(false);
  };

  const mealCategories: Array<{
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
    title: string;
    iconName: keyof typeof Ionicons.glyphMap;
  }> = [
    { type: 'BREAKFAST', title: 'Breakfast', iconName: 'sunny-outline' },
    { type: 'LUNCH', title: 'Lunch', iconName: 'partly-sunny-outline' },
    { type: 'DINNER', title: 'Dinner', iconName: 'moon-outline' },
    { type: 'SNACKS', title: 'Snacks', iconName: 'nutrition-outline' },
  ];

  const samplePastSevenDaysHistory: Array<{
    dateLabel: string;
    totalCalories: number;
    targetCalories: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
    meals: Array<{ name: string; category: string; kcal: number }>;
  }> = [];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.isDark ? theme.accentGold : theme.primary}
            colors={[theme.isDark ? theme.accentGold : theme.primary]}
          />
        }
      >
        {/* HERO MACRO TRACKER CARD (Matches Dashboard Tab 1:1) */}
        <NutritionChart />

        {/* DUAL LOG ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[
              styles.btnScanner,
              {
                backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
                ...theme.shadowButton,
              },
            ]}
            onPress={() => router.push('/nutrition/scan-meal')}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-outline" size={22} color={theme.isDark ? '#0A1A12' : '#FFFFFF'} />
            <View>
              <Text
                style={[
                  styles.btnScannerTitle,
                  { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                ]}
              >
                Scan / Upload Photo
              </Text>
              <Text
                style={[
                  styles.btnScannerSub,
                  { color: theme.isDark ? '#1F3A2A' : '#E2E8F0' },
                ]}
              >
                Gemini AI Vision Parsing
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.btnQuickAdd,
              {
                backgroundColor: theme.card,
                borderColor: theme.isDark ? theme.accentGold : theme.primary,
                ...theme.shadowButton,
              },
            ]}
            onPress={() => handleOpenQuickAdd('LUNCH')}
            activeOpacity={0.8}
          >
            <Ionicons name="search-outline" size={20} color={theme.isDark ? theme.accentGold : theme.primary} />
            <View>
              <Text
                style={[
                  styles.btnQuickAddTitle,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                Quick Add Meal
              </Text>
              <Text style={[styles.btnQuickAddSub, { color: theme.textSecondary }]}>
                Manual Entry / Search
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CATEGORIZED MEAL TIME SECTIONS */}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Today's Meals</Text>

          {mealCategories.map((cat) => {
            const catMeals = todayMeals.filter((m) => m.category === cat.type);
            const catCalories = catMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);

            return (
              <View
                key={cat.type}
                style={[
                  styles.categoryCard,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
              >
                {/* Category Header Row */}
                <View style={[styles.categoryCardHeader, { justifyContent: 'space-between' }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={cat.iconName}
                      size={18}
                      color={theme.isDark ? theme.accentGold : theme.primary}
                    />
                    <Text style={[styles.categoryTitle, { color: theme.text }]}>{cat.title}</Text>
                    <Text
                      style={[
                        styles.categoryKcalText,
                        { color: theme.isDark ? theme.accentGold : theme.primary },
                      ]}
                    >
                      {catCalories} kcal
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.quickAddCategoryBtn,
                      {
                        backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                        borderColor: theme.isDark ? theme.accentGold : theme.primary,
                      },
                    ]}
                    onPress={() => handleOpenQuickAdd(cat.type)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={13} color={theme.isDark ? theme.accentGold : theme.primary} />
                    <Text style={[styles.quickAddCategoryBtnText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                {catMeals.length === 0 ? (
                  <View style={styles.emptyCatRow}>
                    <Text style={[styles.categoryEmptyText, { color: theme.textMuted }]}>
                      No {cat.title.toLowerCase()} logged
                    </Text>
                    <TouchableOpacity onPress={() => handleOpenQuickAdd(cat.type)}>
                      <Text style={[styles.emptyCatAddText, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                        + Log {cat.title}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  catMeals.map((meal) => {
                    const isGenericCategoryName =
                      meal.dishName.trim().toLowerCase() === cat.title.toLowerCase() ||
                      meal.dishName.trim().toLowerCase() === cat.type.toLowerCase();

                    // If meal has items breakdown and dishName is just the category name:
                    if (isGenericCategoryName && meal.items && meal.items.length > 0) {
                      return meal.items.map((item, itemIdx) => (
                        <View
                          key={item.id || `${meal.id}_${itemIdx}`}
                          style={[
                            styles.mealItemBox,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={styles.mealItemHeader}>
                            <Text style={[styles.mealDishName, { color: theme.text }]}>{item.name}</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text
                                style={[
                                  styles.mealKcalVal,
                                  { color: theme.isDark ? theme.accentGold : theme.primary },
                                ]}
                              >
                                {item.calories} kcal
                              </Text>
                              {itemIdx === 0 && (
                                <TouchableOpacity onPress={() => handleDelete(meal.id, item.name)}>
                                  <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>

                          <Text style={[styles.itemSubText, { color: theme.textSecondary }]}>
                            {item.quantity} • P: {item.proteinG}g | C: {item.carbsG}g | F: {item.fatG}g
                          </Text>
                        </View>
                      ));
                    }

                    // Render meal entry with distinct dishName
                    return (
                      <View
                        key={meal.id}
                        style={[
                          styles.mealItemBox,
                          {
                            backgroundColor: theme.card,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <View style={styles.mealItemHeader}>
                          <Text style={[styles.mealDishName, { color: theme.text }]}>{meal.dishName}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={[
                                styles.mealKcalVal,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              {meal.totalCalories} kcal
                            </Text>
                            <TouchableOpacity onPress={() => handleDelete(meal.id, meal.dishName)}>
                              <Ionicons name="trash-outline" size={16} color={theme.textMuted} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={[styles.itemSubText, { color: theme.textSecondary }]}>
                          P: {meal.totalProteinG}g | C: {meal.totalCarbsG}g | F: {meal.totalFatG}g
                        </Text>
                      </View>
                    );
                  })
                )}
              </View>
            );
          })}
        </View>

        {/* MEAL HISTORY */}
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Meal History</Text>

          <View style={styles.historyList}>
            {samplePastSevenDaysHistory.map((day, idx) => {
              const isExpanded = !!expandedHistoryDays[day.dateLabel];
              const isTargetMet =
                day.totalCalories <= day.targetCalories + 100 &&
                day.totalCalories >= day.targetCalories - 200;

              return (
                <View
                  key={idx}
                  style={[
                    styles.historyCard,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  {/* Day Summary Header Row */}
                  <View style={styles.historyCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={[styles.historyDateTitle, { color: theme.text }]}>{day.dateLabel}</Text>
                        <View
                          style={[
                            styles.historyTargetBadge,
                            {
                              backgroundColor: isTargetMet
                                ? theme.isDark
                                  ? theme.badgeBg
                                  : '#E8F5E9'
                                : theme.isDark
                                ? '#3B1A08'
                                : '#FEF3C7',
                              borderColor: isTargetMet ? theme.success : theme.warning,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyTargetText,
                              { color: isTargetMet ? theme.success : theme.warning },
                            ]}
                          >
                            {isTargetMet ? 'On Target' : 'Over Target'}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={[
                          styles.historyKcalText,
                          { color: theme.isDark ? theme.accentGold : theme.primary },
                        ]}
                      >
                        {day.totalCalories} / {day.targetCalories} kcal
                      </Text>
                      <Text style={[styles.historyMacroSub, { color: theme.textSecondary }]}>
                        P: {day.proteinG}g • C: {day.carbsG}g • F: {day.fatG}g
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[
                        styles.historyToggleBtn,
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
                      onPress={() => toggleHistoryDay(day.dateLabel)}
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
                            styles.historyToggleBtnText,
                            {
                              color: isExpanded
                                ? theme.isDark
                                  ? '#0A1A12'
                                  : '#FFFFFF'
                                : theme.textSecondary,
                            },
                          ]}
                        >
                          {isExpanded ? 'Hide' : `${day.meals.length} Meals`}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Expanded Meals List */}
                  {isExpanded && (
                    <View style={styles.historyExpandedContent}>
                      <View style={[styles.historyDivider, { backgroundColor: theme.border }]} />
                      {day.meals.map((meal, mIdx) => (
                        <View
                          key={mIdx}
                          style={[
                            styles.historyMealRow,
                            {
                              backgroundColor: theme.card,
                              borderColor: theme.border,
                            },
                          ]}
                        >
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.historyMealCategory,
                                { color: theme.isDark ? theme.accentGold : theme.primary },
                              ]}
                            >
                              {meal.category.toUpperCase()}
                            </Text>
                            <Text style={[styles.historyMealName, { color: theme.text }]}>{meal.name}</Text>
                          </View>
                          <Text
                            style={[
                              styles.historyMealKcal,
                              { color: theme.isDark ? theme.accentGold : theme.primary },
                            ]}
                          >
                            {meal.kcal} kcal
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>

      {/* QUICK ADD MANUAL ENTRY MODAL */}
      <Modal
        visible={quickAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQuickAddModalVisible(false)}
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
              <Text style={[styles.modalTitle, { color: theme.text }]}>Quick Add Meal Entry</Text>
              <TouchableOpacity onPress={() => setQuickAddModalVisible(false)}>
                <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Select Category</Text>
            <View style={styles.catPickerRow}>
              {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((cat) => {
                const isSelected = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPill,
                      {
                        backgroundColor: isSelected
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.cardInner,
                        borderColor: isSelected
                          ? theme.isDark
                            ? theme.accentGold
                            : theme.primary
                          : theme.border,
                      },
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catPillText,
                        {
                          color: isSelected
                            ? theme.isDark
                              ? '#0A1A12'
                              : '#FFFFFF'
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {cat.substring(0, 4)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Quick Presets / Suggestions</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              {COMMON_FOOD_PRESETS.map((p, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: theme.cardInner,
                      borderColor: theme.border,
                    },
                  ]}
                  onPress={() => handleSelectPreset(p)}
                >
                  <Text style={[styles.presetChipText, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.presetChipSub, { color: theme.isDark ? theme.accentGold : theme.primary }]}>
                    {p.calories} kcal
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Dish Title / Item Name</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  color: theme.text,
                },
              ]}
              value={dishTitleInput}
              placeholder="e.g. Chicken Biryani / Protein Shake"
              placeholderTextColor={theme.textMuted}
              onChangeText={setDishTitleInput}
            />

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Calories (kcal)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={caloriesInput}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  onChangeText={setCaloriesInput}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Protein (g)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={proteinInput}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  onChangeText={setProteinInput}
                />
              </View>
            </View>

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Carbs (g)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={carbsInput}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  onChangeText={setCarbsInput}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Fat (g)</Text>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.inputBg,
                      borderColor: theme.inputBorder,
                      color: theme.text,
                    },
                  ]}
                  value={fatInput}
                  placeholder="0"
                  placeholderTextColor={theme.textMuted}
                  keyboardType="numeric"
                  onChangeText={setFatInput}
                />
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[
                  styles.modalCancelBtn,
                  {
                    backgroundColor: theme.cardInner,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setQuickAddModalVisible(false)}
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
                onPress={handleSaveQuickAdd}
              >
                <Text
                  style={[
                    styles.modalSaveText,
                    { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
                  ]}
                >
                  Log Meal
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  macroCol: {
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  btnScanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
  },
  btnScannerTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  btnScannerSub: {
    fontSize: 10,
    marginTop: 2,
  },
  btnQuickAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 10,
    borderWidth: 1,
  },
  btnQuickAddTitle: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  btnQuickAddSub: {
    fontSize: 10,
    marginTop: 2,
  },
  sectionCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  categoryCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  categoryKcalText: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  categoryAddBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryAddBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  categoryEmptyText: {
    fontSize: 12,
    fontStyle: 'italic',
    paddingVertical: 4,
  },
  historyList: {
    gap: 10,
  },
  historyCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyDateTitle: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  historyTargetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  historyTargetText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyKcalText: {
    fontSize: 13,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  historyMacroSub: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 3,
  },
  historyToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  historyToggleBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  historyExpandedContent: {
    marginTop: 12,
  },
  historyDivider: {
    height: 1,
    marginBottom: 10,
  },
  historyMealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
  },
  historyMealCategory: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  historyMealName: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyMealKcal: {
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  mealItemBox: {
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
  },
  mealItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealDishName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  mealKcalVal: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  itemSubText: {
    fontSize: 12,
    fontWeight: '500',
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
  inputLabel: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  catPickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  catPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  input: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
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
  quickAddHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  quickAddHeaderBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  quickAddCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  quickAddCategoryBtnText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyCatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  emptyCatAddText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 6,
    alignItems: 'center',
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  presetChipSub: {
    fontSize: 9.5,
    fontWeight: '600',
    marginTop: 1,
  },
});
