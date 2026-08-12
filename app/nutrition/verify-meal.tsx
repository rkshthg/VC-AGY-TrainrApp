import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useNutritionStore, FoodItem } from '../../store/nutritionStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';

export default function VerifyMealScreen() {
  const router = useRouter();
  const { pendingScanResult, saveMealEntry, clearPendingScanResult } = useNutritionStore();
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const profile = useAuthStore((state) => state.profile);
  const theme = useTheme();

  const [dishName, setDishName] = useState(pendingScanResult?.dishName || 'Paneer Butter Masala & 2 Chapatis');
  const [category, setCategory] = useState<'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS'>(
    pendingScanResult?.category || 'BREAKFAST'
  );
  const [calories, setCalories] = useState(String(pendingScanResult?.totalCalories || 480));
  const [protein, setProtein] = useState(String(pendingScanResult?.totalProteinG || 18.7));
  const [carbs, setCarbs] = useState(String(pendingScanResult?.totalCarbsG || 40.0));
  const [fat, setFat] = useState(String(pendingScanResult?.totalFatG || 23.8));

  // Editable Identified Items List
  const [items, setItems] = useState<FoodItem[]>(
    pendingScanResult?.items || [
      { name: 'Wheat Chapati', quantity: '2 pieces (60g)', calories: 140, proteinG: 4.2, carbsG: 26.0, fatG: 1.8 },
      { name: 'Paneer Butter Masala', quantity: '1 bowl (200g)', calories: 340, proteinG: 14.5, carbsG: 14.0, fatG: 22.0 },
    ]
  );

  const handleUpdateItemName = (index: number, newName: string) => {
    const updated = [...items];
    updated[index].name = newName;
    setItems(updated);
  };

  const handleUpdateItemQty = (index: number, newQty: string) => {
    const updated = [...items];
    updated[index].quantity = newQty;
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, idx) => idx !== index);
    setItems(updated);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      { name: 'Custom Side Dish', quantity: '1 serving (100g)', calories: 100, proteinG: 5, carbsG: 10, fatG: 3 },
    ]);
  };

  const handleConfirmSave = () => {
    const totalCal = parseInt(calories) || 480;
    const totalP = parseFloat(protein) || 18;
    const totalC = parseFloat(carbs) || 40;
    const totalF = parseFloat(fat) || 20;

    saveMealEntry({
      userId: profile?.id || 'usr_1',
      dishName,
      category,
      timestamp: new Date().toISOString(),
      totalCalories: totalCal,
      totalProteinG: totalP,
      totalCarbsG: totalC,
      totalFatG: totalF,
      items,
    });

    // Dispatch Live Feed Event to Trainer
    addLiveFeedEvent({
      clientId: profile?.id || 'usr_1',
      clientName: profile?.fullName || 'Client',
      eventType: 'LOG_MEAL',
      timeAgo: 'Just now',
      actionVerb: 'Logged',
      targetTitle: `${dishName} (${totalCal} kcal)`,
      tags: [
        { label: 'Nutrition', type: 'success' },
        { label: 'On Track', type: 'success' },
      ],
      timestamp: new Date().toISOString(),
    });

    clearPendingScanResult();
    Alert.alert('Meal Saved', 'Your meal entry has been logged and shared to your trainer feed!');
    router.replace('/(tabs)/nutrition');
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Verify & Edit Meal Items</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Meal Category</Text>
          <View style={styles.categoryPickerRow}>
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor:
                      category === cat
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.cardInner,
                    borderColor:
                      category === cat
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                  },
                ]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color:
                        category === cat
                          ? theme.isDark
                            ? '#0A1A12'
                            : '#FFFFFF'
                          : theme.textSecondary,
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Dish Title</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                color: theme.text,
              },
            ]}
            value={dishName}
            onChangeText={setDishName}
          />

          <Text
            style={[
              styles.sectionHeader,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            Adjust Total Macros
          </Text>

          <View style={styles.macroGrid}>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: theme.textMuted }]}>Calories (kcal)</Text>
              <TextInput
                style={[
                  styles.macroInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                value={calories}
                onChangeText={setCalories}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: theme.textMuted }]}>Protein (g)</Text>
              <TextInput
                style={[
                  styles.macroInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                value={protein}
                onChangeText={setProtein}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: theme.textMuted }]}>Carbs (g)</Text>
              <TextInput
                style={[
                  styles.macroInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                value={carbs}
                onChangeText={setCarbs}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.macroCol}>
              <Text style={[styles.macroLabel, { color: theme.textMuted }]}>Fat (g)</Text>
              <TextInput
                style={[
                  styles.macroInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  },
                ]}
                value={fat}
                onChangeText={setFat}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Editable Identified Items List */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
            <Text
              style={[
                styles.sectionHeader,
                { color: theme.isDark ? theme.accentGold : theme.primary, marginBottom: 0 },
              ]}
            >
              Identified Meal Items ({items.length})
            </Text>
            <TouchableOpacity
              onPress={handleAddItem}
              style={[
                styles.addItemBtn,
                {
                  backgroundColor: theme.isDark ? theme.badgeBg : '#E8F5E9',
                  borderColor: theme.isDark ? theme.accentGold : theme.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.addItemBtnText,
                  { color: theme.isDark ? theme.accentGold : theme.primary },
                ]}
              >
                + Add Item
              </Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.editableItemCard,
                {
                  backgroundColor: theme.cardInner,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.itemRowTop}>
                <TextInput
                  style={[styles.itemNameInput, { color: theme.text }]}
                  value={item.name}
                  onChangeText={(val) => handleUpdateItemName(idx, val)}
                  placeholder="Food item name..."
                  placeholderTextColor={theme.textMuted}
                />
                <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                  <Ionicons name="close-outline" size={16} color={theme.danger} />
                </TouchableOpacity>
              </View>

              <View style={styles.itemRowSub}>
                <TextInput
                  style={[styles.itemQtyInput, { color: theme.textSecondary }]}
                  value={item.quantity}
                  onChangeText={(val) => handleUpdateItemQty(idx, val)}
                  placeholder="Quantity (e.g. 1 bowl)..."
                  placeholderTextColor={theme.textMuted}
                />
                <Text
                  style={[
                    styles.itemKcalBadge,
                    { color: theme.isDark ? theme.accentGold : theme.primary },
                  ]}
                >
                  {item.calories} kcal
                </Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
              ...theme.shadowButton,
            },
          ]}
          onPress={handleConfirmSave}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.saveBtnText,
              { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
            ]}
          >
            Log Meal Entry
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
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
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 11.5,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  categoryPickerRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  categoryPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  input: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  macroGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  macroCol: {
    flex: 1,
  },
  macroLabel: {
    fontSize: 10.5,
    marginBottom: 4,
  },
  macroInput: {
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  addItemBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  addItemBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  editableItemCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  itemRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNameInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: 'bold',
    paddingVertical: 2,
    marginRight: 8,
  },
  removeItemText: {
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 6,
  },
  itemRowSub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQtyInput: {
    flex: 1,
    fontSize: 11,
    paddingVertical: 2,
  },
  itemKcalBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
});
