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
import { useNutritionStore, FoodItem } from '../../store/nutritionStore';
import { useTrainerStore } from '../../store/trainerStore';
import { useAuthStore } from '../../store/authStore';

export default function VerifyMealScreen() {
  const router = useRouter();
  const { pendingScanResult, saveMealEntry, clearPendingScanResult } = useNutritionStore();
  const addLiveFeedEvent = useTrainerStore((state) => state.addLiveFeedEvent);
  const profile = useAuthStore((state) => state.profile);

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
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Verify & Edit Meal Items</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.inputLabel}>Meal Category</Text>
          <View style={styles.categoryPickerRow}>
            {(['BREAKFAST', 'LUNCH', 'DINNER', 'SNACKS'] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryPill, category === cat && styles.categoryPillActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryPillText, category === cat && styles.categoryPillTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.inputLabel}>Dish Title</Text>
          <TextInput style={styles.input} value={dishName} onChangeText={setDishName} />

          <Text style={styles.sectionHeader}>Adjust Total Macros</Text>

          <View style={styles.macroGrid}>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Calories (kcal)</Text>
              <TextInput style={styles.macroInput} value={calories} onChangeText={setCalories} keyboardType="numeric" />
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Protein (g)</Text>
              <TextInput style={styles.macroInput} value={protein} onChangeText={setProtein} keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.macroGrid}>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Carbs (g)</Text>
              <TextInput style={styles.macroInput} value={carbs} onChangeText={setCarbs} keyboardType="numeric" />
            </View>
            <View style={styles.macroCol}>
              <Text style={styles.macroLabel}>Fat (g)</Text>
              <TextInput style={styles.macroInput} value={fat} onChangeText={setFat} keyboardType="numeric" />
            </View>
          </View>

          {/* Editable Identified Items List */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
            <Text style={styles.sectionHeader}>Identified Meal Items ({items.length})</Text>
            <TouchableOpacity onPress={handleAddItem} style={styles.addItemBtn}>
              <Text style={styles.addItemBtnText}>+ Add Item</Text>
            </TouchableOpacity>
          </View>

          {items.map((item, idx) => (
            <View key={idx} style={styles.editableItemCard}>
              <View style={styles.itemRowTop}>
                <TextInput
                  style={styles.itemNameInput}
                  value={item.name}
                  onChangeText={(val) => handleUpdateItemName(idx, val)}
                  placeholder="Item Name"
                  placeholderTextColor="#64748B"
                />
                <TouchableOpacity onPress={() => handleRemoveItem(idx)}>
                  <Text style={styles.removeItemText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.itemRowSub}>
                <TextInput
                  style={styles.itemQtyInput}
                  value={item.quantity}
                  onChangeText={(val) => handleUpdateItemQty(idx, val)}
                  placeholder="Serving size / Portion"
                  placeholderTextColor="#64748B"
                />
                <Text style={styles.itemKcalBadge}>{item.calories} kcal</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.saveBtn} onPress={handleConfirmSave} activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>Save Meal Log ✅</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
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
  card: {
    backgroundColor: '#091512',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#10B98133',
  },
  inputLabel: {
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  categoryPillActive: {
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
  },
  categoryPillText: {
    color: '#94A3B8',
    fontSize: 9.5,
    fontWeight: 'bold',
  },
  categoryPillTextActive: {
    color: '#10B981',
  },
  input: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 16,
  },
  sectionHeader: {
    color: '#A7F3D0',
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
    color: '#64748B',
    fontSize: 10.5,
    marginBottom: 4,
  },
  macroInput: {
    backgroundColor: '#0F172A',
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'monospace',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  addItemBtn: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#10B981',
  },
  addItemBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
  },
  editableItemCard: {
    backgroundColor: '#0C1E19',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#10B98122',
  },
  itemRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemNameInput: {
    flex: 1,
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: 'bold',
    paddingVertical: 2,
    marginRight: 8,
  },
  removeItemText: {
    color: '#EF4444',
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
    color: '#94A3B8',
    fontSize: 11,
    paddingVertical: 2,
  },
  itemKcalBadge: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  saveBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#064E3B',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
