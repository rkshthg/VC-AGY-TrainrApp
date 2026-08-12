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
import { NutritionChart } from '../../components/NutritionChart';
import { useNutritionStore } from '../../store/nutritionStore';
import { useAuthStore } from '../../store/authStore';

export default function NutritionScreen() {
  const router = useRouter();
  const { todayMeals, deleteMealEntry, saveMealEntry } = useNutritionStore();
  const profile = useAuthStore((state) => state.profile);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [expandedHistoryDays, setExpandedHistoryDays] = useState<Record<string, boolean>>({});

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
  const [caloriesInput, setCaloriesInput] = useState('450');
  const [proteinInput, setProteinInput] = useState('30');
  const [carbsInput, setCarbsInput] = useState('45');
  const [fatInput, setFatInput] = useState('15');

  const handleDelete = (id: string, name: string) => {
    Alert.alert('Delete Meal Log', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMealEntry(id) },
    ]);
  };

  const handleOpenQuickAdd = (category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS') => {
    setSelectedCategory(category);
    setDishTitleInput('');
    setCaloriesInput('450');
    setProteinInput('30');
    setCarbsInput('45');
    setFatInput('15');
    setQuickAddModalVisible(true);
  };

  const handleSaveQuickAdd = () => {
    if (!dishTitleInput.trim()) {
      Alert.alert('Missing Title', 'Please enter a dish name.');
      return;
    }

    const totalCal = parseInt(caloriesInput) || 450;
    const totalP = parseFloat(proteinInput) || 30;
    const totalC = parseFloat(carbsInput) || 45;
    const totalF = parseFloat(fatInput) || 15;

    saveMealEntry({
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

    setQuickAddModalVisible(false);
    Alert.alert('Meal Logged', `Logged ${dishTitleInput.trim()} under ${selectedCategory}.`);
  };

  // Aggregated Daily Macro Calculations
  const targetCalories = 2100;
  const totalCaloriesLogged = todayMeals.reduce((acc, m) => acc + (m.totalCalories || 0), 0);
  const calPct = Math.min(100, Math.round((totalCaloriesLogged / targetCalories) * 100));

  const totalProteinLogged = todayMeals.reduce((acc, m) => acc + (m.totalProteinG || 0), 0);
  const targetProtein = 180;
  const proteinPct = Math.min(100, Math.round((totalProteinLogged / targetProtein) * 100));

  const totalCarbsLogged = todayMeals.reduce((acc, m) => acc + (m.totalCarbsG || 0), 0);
  const targetCarbs = 250;
  const carbsPct = Math.min(100, Math.round((totalCarbsLogged / targetCarbs) * 100));

  const totalFatLogged = todayMeals.reduce((acc, m) => acc + (m.totalFatG || 0), 0);
  const targetFat = 70;
  const fatPct = Math.min(100, Math.round((totalFatLogged / targetFat) * 100));

  const mealCategories: Array<{
    type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
    title: string;
    icon: string;
  }> = [
    { type: 'BREAKFAST', title: 'Breakfast', icon: '🍳' },
    { type: 'LUNCH', title: 'Lunch', icon: '🥗' },
    { type: 'DINNER', title: 'Dinner', icon: '🐟' },
    { type: 'SNACKS', title: 'Snacks', icon: '🍎' },
  ];

  const samplePastSevenDaysHistory = [
    {
      dateLabel: 'Yesterday (Mon, Aug 10)',
      totalCalories: 2050,
      targetCalories: 2100,
      proteinG: 175,
      carbsG: 240,
      fatG: 68,
      meals: [
        { name: 'Oatmeal, Whole Eggs & Berries', category: 'Breakfast', kcal: 520 },
        { name: 'Chicken Tikka Bowl w/ Rice', category: 'Lunch', kcal: 680 },
        { name: 'Greek Yogurt & Almonds', category: 'Snacks', kcal: 200 },
        { name: 'Pan-seared Salmon & Asparagus', category: 'Dinner', kcal: 650 },
      ],
    },
    {
      dateLabel: 'Sun, Aug 9',
      totalCalories: 2180,
      targetCalories: 2100,
      proteinG: 182,
      carbsG: 260,
      fatG: 72,
      meals: [
        { name: 'Protein Pancakes & Bananas', category: 'Breakfast', kcal: 580 },
        { name: 'Turkey Sub Sandwich & Baked Chips', category: 'Lunch', kcal: 720 },
        { name: 'Apple & Whey Protein Shake', category: 'Snacks', kcal: 230 },
        { name: 'Lean Beef Stir-Fry w/ Noodles', category: 'Dinner', kcal: 650 },
      ],
    },
    {
      dateLabel: 'Sat, Aug 8',
      totalCalories: 1950,
      targetCalories: 2100,
      proteinG: 165,
      carbsG: 220,
      fatG: 62,
      meals: [
        { name: 'Scrambled Eggs & Avocado Toast', category: 'Breakfast', kcal: 490 },
        { name: 'Grilled Chicken Caesar Salad', category: 'Lunch', kcal: 610 },
        { name: 'Tofu & Vegetable Curry w/ Basmati Rice', category: 'Dinner', kcal: 850 },
      ],
    },
    {
      dateLabel: 'Fri, Aug 7',
      totalCalories: 2080,
      targetCalories: 2100,
      proteinG: 178,
      carbsG: 245,
      fatG: 66,
      meals: [
        { name: 'Overnight Oats w/ Chia Seeds', category: 'Breakfast', kcal: 480 },
        { name: 'Egg Bhurji & Whole Wheat Roti', category: 'Lunch', kcal: 620 },
        { name: 'Peanut Butter Toast & Protein Shake', category: 'Snacks', kcal: 320 },
        { name: 'Grilled Shrimp & Quinoa Salad', category: 'Dinner', kcal: 660 },
      ],
    },
    {
      dateLabel: 'Thu, Aug 6',
      totalCalories: 2010,
      targetCalories: 2100,
      proteinG: 172,
      carbsG: 235,
      fatG: 65,
      meals: [
        { name: 'Greek Yogurt, Honey & Granola', category: 'Breakfast', kcal: 450 },
        { name: 'Dal Tadka, Rice & Grilled Chicken', category: 'Lunch', kcal: 710 },
        { name: 'Mixed Nuts & Green Tea', category: 'Snacks', kcal: 180 },
        { name: 'Chicken Wrap & Roasted Potatoes', category: 'Dinner', kcal: 670 },
      ],
    },
    {
      dateLabel: 'Wed, Aug 5',
      totalCalories: 1990,
      targetCalories: 2100,
      proteinG: 170,
      carbsG: 230,
      fatG: 64,
      meals: [
        { name: '3 Egg White Omelette & Toast', category: 'Breakfast', kcal: 420 },
        { name: 'Paneer Burrito Bowl', category: 'Lunch', kcal: 780 },
        { name: 'Grilled Cod & Steamed Vegetables', category: 'Dinner', kcal: 790 },
      ],
    },
    {
      dateLabel: 'Tue, Aug 4',
      totalCalories: 2120,
      targetCalories: 2100,
      proteinG: 180,
      carbsG: 250,
      fatG: 70,
      meals: [
        { name: 'Protein Smoothie & Rice Cakes', category: 'Breakfast', kcal: 500 },
        { name: 'Chicken Breast & Sweet Potato Fries', category: 'Lunch', kcal: 750 },
        { name: 'Dark Chocolate & Almonds', category: 'Snacks', kcal: 210 },
        { name: 'Egg Curry & Jeera Rice', category: 'Dinner', kcal: 660 },
      ],
    },
  ];

  return (
    <View style={styles.container}>
      <HeaderBar onOpenSettings={() => setDrawerVisible(true)} />

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 🥗 HERO MACRO TRACKER CARD (CONCEPT 3: STACKED SEGMENTED ENERGY FLOW) */}
        {(() => {
          const proteinKcal = Math.round(totalProteinLogged * 4);
          const carbsKcal = Math.round(totalCarbsLogged * 4);
          const fatKcal = Math.round(totalFatLogged * 9);
          const remainingKcal = Math.max(0, targetCalories - totalCaloriesLogged);
          const totalKcalTrack = Math.max(targetCalories, proteinKcal + carbsKcal + fatKcal + remainingKcal);

          return (
            <View style={styles.heroMacroCard}>
              {/* Header Row: Title + Consumed / Target Subtitle & Remaining Pill */}
              <View style={styles.energyFlowHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroTitle}>Daily Energy & Macro Flow</Text>
                  <Text style={styles.energyFlowSub}>
                    {totalCaloriesLogged.toLocaleString()} of {targetCalories.toLocaleString()} kcal consumed
                  </Text>
                </View>
                <View style={styles.remainingPillBadge}>
                  <Text style={styles.remainingPillText}>
                    ⚡ {remainingKcal} left
                  </Text>
                </View>
              </View>

              {/* Proportional Segmented Progress Bar */}
              <View style={styles.segmentedProgressBarTrack}>
                {proteinKcal > 0 && (
                  <View style={[styles.segmentedFill, { flex: proteinKcal, backgroundColor: '#3B82F6' }]} />
                )}
                {carbsKcal > 0 && (
                  <View style={[styles.segmentedFill, { flex: carbsKcal, backgroundColor: '#A855F7' }]} />
                )}
                {fatKcal > 0 && (
                  <View style={[styles.segmentedFill, { flex: fatKcal, backgroundColor: '#F59E0B' }]} />
                )}
                {(remainingKcal > 0 || totalKcalTrack === 0) && (
                  <View style={[styles.segmentedFillEmpty, { flex: Math.max(1, remainingKcal), backgroundColor: '#1E293B' }]} />
                )}
              </View>

              {/* 3-Column Macro Details Grid */}
              <View style={styles.macroPillGrid}>
                {/* Protein */}
                <View style={styles.macroPillCard}>
                  <View style={styles.macroPillHeader}>
                    <View style={[styles.macroDot, { backgroundColor: '#3B82F6' }]} />
                    <Text style={styles.macroPillLabel}>PROTEIN</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{Math.round(totalProteinLogged)}g / {targetProtein}g</Text>
                  <Text style={styles.macroPillSub}>{proteinKcal} kcal ({proteinPct}%)</Text>
                </View>

                {/* Carbs */}
                <View style={styles.macroPillCard}>
                  <View style={styles.macroPillHeader}>
                    <View style={[styles.macroDot, { backgroundColor: '#A855F7' }]} />
                    <Text style={styles.macroPillLabel}>CARBS</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{Math.round(totalCarbsLogged)}g / {targetCarbs}g</Text>
                  <Text style={styles.macroPillSub}>{carbsKcal} kcal ({carbsPct}%)</Text>
                </View>

                {/* Fat */}
                <View style={styles.macroPillCard}>
                  <View style={styles.macroPillHeader}>
                    <View style={[styles.macroDot, { backgroundColor: '#F59E0B' }]} />
                    <Text style={styles.macroPillLabel}>FAT</Text>
                  </View>
                  <Text style={styles.macroPillVal}>{Math.round(totalFatLogged)}g / {targetFat}g</Text>
                  <Text style={styles.macroPillSub}>{fatKcal} kcal ({fatPct}%)</Text>
                </View>
              </View>
            </View>
          );
        })()}

        {/* DUAL LOG ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.btnScanner}
            onPress={() => router.push('/nutrition/scan-meal')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnScannerIcon}>📸</Text>
            <View>
              <Text style={styles.btnScannerTitle}>Scan / Upload Photo</Text>
              <Text style={styles.btnScannerSub}>Gemini AI Vision Parsing</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnQuickAdd}
            onPress={() => handleOpenQuickAdd('LUNCH')}
            activeOpacity={0.8}
          >
            <Text style={styles.btnQuickAddIcon}>🔍</Text>
            <View>
              <Text style={styles.btnQuickAddTitle}>Quick Add Meal</Text>
              <Text style={styles.btnQuickAddSub}>Manual Entry / Search</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* CATEGORIZED MEAL TIME SECTIONS */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>

          {mealCategories.map((cat) => {
            const catMeals = todayMeals.filter((m) => m.category === cat.type);
            const catCalories = catMeals.reduce((sum, m) => sum + (m.totalCalories || 0), 0);

            return (
              <View key={cat.type} style={styles.categoryCard}>
                <View style={styles.categoryCardHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.categoryIcon}>{cat.icon}</Text>
                    <Text style={styles.categoryTitle}>{cat.title}</Text>
                    <Text style={styles.categoryKcalText}>{catCalories} kcal</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.categoryAddBtn}
                    onPress={() => handleOpenQuickAdd(cat.type)}
                  >
                    <Text style={styles.categoryAddBtnText}>+ Add</Text>
                  </TouchableOpacity>
                </View>

                {catMeals.length === 0 ? (
                  <Text style={styles.categoryEmptyText}>No {cat.title.toLowerCase()} logged</Text>
                ) : (
                  catMeals.map((meal) => (
                    <View key={meal.id} style={styles.mealItemBox}>
                      <View style={styles.mealItemHeader}>
                        <Text style={styles.mealDishName}>{meal.dishName}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={styles.mealKcalVal}>{meal.totalCalories} kcal</Text>
                          <TouchableOpacity onPress={() => handleDelete(meal.id, meal.dishName)}>
                            <Text style={styles.deleteText}>🗑️</Text>
                          </TouchableOpacity>
                        </View>
                      </View>

                      {meal.items && meal.items.length > 0 && (
                        <View style={styles.itemsSubList}>
                          {meal.items.map((item, iIdx) => (
                            <Text key={iIdx} style={styles.itemSubText}>
                              • {item.name}{' '}
                              <Text style={styles.itemSubQty}>({item.quantity})</Text>
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  ))
                )}
              </View>
            );
          })}
        </View>

        {/* MEAL HISTORY */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Meal History</Text>

          <View style={styles.historyList}>
            {samplePastSevenDaysHistory.map((day, idx) => {
              const isExpanded = !!expandedHistoryDays[day.dateLabel];
              const isTargetMet =
                day.totalCalories <= day.targetCalories + 100 &&
                day.totalCalories >= day.targetCalories - 200;

              return (
                <View key={idx} style={styles.historyCard}>
                  {/* Day Summary Header Row */}
                  <View style={styles.historyCardHeader}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <Text style={styles.historyDateTitle}>{day.dateLabel}</Text>
                        <View
                          style={[
                            styles.historyTargetBadge,
                            isTargetMet ? styles.targetMet : styles.targetOff,
                          ]}
                        >
                          <Text
                            style={[
                              styles.historyTargetText,
                              isTargetMet ? { color: '#10B981' } : { color: '#F59E0B' },
                            ]}
                          >
                            {isTargetMet ? '🎯 On Target' : '⚠️ Over Target'}
                          </Text>
                        </View>
                      </View>

                      <Text style={styles.historyKcalText}>
                        {day.totalCalories} / {day.targetCalories} kcal •{' '}
                        <Text style={styles.historyMacroSub}>
                          🥩 {day.proteinG}g P • 🍞 {day.carbsG}g C • 🥑 {day.fatG}g F
                        </Text>
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.historyToggleBtn, isExpanded && styles.historyToggleBtnActive]}
                      onPress={() => toggleHistoryDay(day.dateLabel)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.historyToggleBtnText,
                          isExpanded && styles.historyToggleBtnTextActive,
                        ]}
                      >
                        {isExpanded ? '▲ Hide' : `▼ ${day.meals.length} Meals`}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Expanded Meals List */}
                  {isExpanded && (
                    <View style={styles.historyExpandedContent}>
                      <View style={styles.historyDivider} />

                      {day.meals.map((meal, mIdx) => (
                        <View key={mIdx} style={styles.historyMealRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.historyMealCategory}>[{meal.category.toUpperCase()}]</Text>
                            <Text style={styles.historyMealName}>{meal.name}</Text>
                          </View>
                          <Text style={styles.historyMealKcal}>{meal.kcal} kcal</Text>
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

      {/* QUICK ADD MEAL MODAL */}
      <Modal
        visible={quickAddModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setQuickAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Quick Add Meal Log</Text>
              <TouchableOpacity onPress={() => setQuickAddModalVisible(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Meal Category</Text>
            <View style={styles.catPickerRow}>
              {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catPill, selectedCategory === cat && styles.catPillActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.catPillText, selectedCategory === cat && styles.catPillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Dish Title / Item Name</Text>
            <TextInput
              style={styles.input}
              value={dishTitleInput}
              placeholder="e.g. Chicken Biryani / Protein Shake"
              placeholderTextColor="#64748B"
              onChangeText={setDishTitleInput}
            />

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <Text style={styles.inputLabel}>Calories (kcal)</Text>
                <TextInput
                  style={styles.input}
                  value={caloriesInput}
                  keyboardType="numeric"
                  onChangeText={setCaloriesInput}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.inputLabel}>Protein (g)</Text>
                <TextInput
                  style={styles.input}
                  value={proteinInput}
                  keyboardType="numeric"
                  onChangeText={setProteinInput}
                />
              </View>
            </View>

            <View style={styles.macroGrid}>
              <View style={styles.macroCol}>
                <Text style={styles.inputLabel}>Carbs (g)</Text>
                <TextInput
                  style={styles.input}
                  value={carbsInput}
                  keyboardType="numeric"
                  onChangeText={setCarbsInput}
                />
              </View>
              <View style={styles.macroCol}>
                <Text style={styles.inputLabel}>Fat (g)</Text>
                <TextInput
                  style={styles.input}
                  value={fatInput}
                  keyboardType="numeric"
                  onChangeText={setFatInput}
                />
              </View>
            </View>

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setQuickAddModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveQuickAdd}>
                <Text style={styles.modalSaveText}>Log Meal 🥗</Text>
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

  heroMacroCard: {
    backgroundColor: '#091512',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  heroTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  macroCol: {
    flex: 1,
  },
  energyFlowHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  energyFlowSub: {
    color: '#94A3B8',
    fontSize: 11.5,
    marginTop: 2,
  },
  remainingPillBadge: {
    backgroundColor: '#06110D',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAB30844',
  },
  remainingPillText: {
    color: '#EAB308',
    fontSize: 11,
    fontWeight: 'bold',
  },
  segmentedProgressBarTrack: {
    flexDirection: 'row',
    height: 14,
    backgroundColor: '#1E293B',
    borderRadius: 7,
    overflow: 'hidden',
    marginBottom: 16,
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
    backgroundColor: '#06110D',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#10B98122',
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
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  macroPillVal: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  macroPillSub: {
    color: '#64748B',
    fontSize: 9.5,
    marginTop: 2,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  btnScanner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  btnScannerIcon: {
    fontSize: 24,
  },
  btnScannerTitle: {
    color: '#064E3B',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  btnScannerSub: {
    color: '#064E3B',
    fontSize: 9.5,
    opacity: 0.8,
  },
  btnQuickAdd: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#091512',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  btnQuickAddIcon: {
    fontSize: 22,
  },
  btnQuickAddTitle: {
    color: '#10B981',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  btnQuickAddSub: {
    color: '#94A3B8',
    fontSize: 9.5,
  },

  sectionCard: {
    backgroundColor: '#171E2D',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },

  categoryCard: {
    backgroundColor: '#091512',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  categoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  categoryKcalText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  categoryAddBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryAddBtnText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  categoryEmptyText: {
    color: '#64748B',
    fontSize: 11,
    fontStyle: 'italic',
  },

  historyList: {
    gap: 10,
  },
  historyCard: {
    backgroundColor: '#091512',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  historyDateTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
  },
  historyTargetBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  targetMet: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  targetOff: {
    backgroundColor: '#451A03',
    borderColor: '#F59E0B',
  },
  historyTargetText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  historyKcalText: {
    color: '#A7F3D0',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    marginTop: 4,
  },
  historyMacroSub: {
    color: '#94A3B8',
    fontSize: 10.5,
  },
  historyToggleBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyToggleBtnActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  historyToggleBtnText: {
    color: '#CBD5E1',
    fontSize: 10.5,
    fontWeight: 'bold',
  },
  historyToggleBtnTextActive: {
    color: '#10B981',
  },
  historyExpandedContent: {
    marginTop: 10,
  },
  historyDivider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginBottom: 10,
  },
  historyMealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0C1E19',
    padding: 8,
    borderRadius: 8,
    marginBottom: 6,
  },
  historyMealCategory: {
    color: '#10B981',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  historyMealName: {
    color: '#F8FAFC',
    fontSize: 12,
    fontWeight: '600',
  },
  historyMealKcal: {
    color: '#A7F3D0',
    fontSize: 11.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },

  mealItemBox: {
    backgroundColor: '#0C1E19',
    borderRadius: 10,
    padding: 8,
    marginTop: 6,
  },
  mealItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealDishName: {
    color: '#F8FAFC',
    fontSize: 12.5,
    fontWeight: 'bold',
  },
  mealKcalVal: {
    color: '#A7F3D0',
    fontSize: 11.5,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  deleteText: {
    fontSize: 12,
  },
  itemsSubList: {
    marginTop: 4,
  },
  itemSubText: {
    color: '#94A3B8',
    fontSize: 10.5,
  },
  itemSubQty: {
    color: '#64748B',
    fontSize: 9.5,
  },

  /* MODAL STYLES */
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
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  catPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  catPillText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  catPillTextActive: {
    color: '#10B981',
  },
  input: {
    backgroundColor: '#1E293B',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
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
