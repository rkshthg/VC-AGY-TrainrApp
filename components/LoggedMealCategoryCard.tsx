import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FoodItem } from '../store/nutritionStore';

export interface LoggedMealCategoryProps {
  category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  totalCalories: number;
  items: FoodItem[];
}

const CATEGORY_ICONS: Record<string, string> = {
  BREAKFAST: '🔆',
  LUNCH: '☀️',
  DINNER: '🌙',
  SNACKS: '🍎',
};

export const LoggedMealCategoryCard: React.FC<LoggedMealCategoryProps> = ({
  category,
  totalCalories,
  items,
}) => {
  const icon = CATEGORY_ICONS[category] || '🍽️';

  return (
    <View style={styles.outerContainer}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.categoryTitleGroup}>
          <Text style={styles.categoryIcon}>{icon}</Text>
          <Text style={styles.categoryTitle}>{category}</Text>
        </View>
        <Text style={styles.totalKcalText}>
          {totalCalories} <Text style={styles.kcalUnit}>kcal</Text>
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Item Inset Cards */}
      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View key={item.id || index} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemCalText}>
                {item.calories} <Text style={styles.calUnit}>cal</Text>
              </Text>
            </View>

            <Text style={styles.itemBottomRow}>
              {item.quantity} <Text style={styles.dotSeparator}>•</Text> P: {item.proteinG}g{' '}
              <Text style={styles.pipeSeparator}>|</Text> C: {item.carbsG}g{' '}
              <Text style={styles.pipeSeparator}>|</Text> F: {item.fatG}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    backgroundColor: '#091512',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#10B98133',
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
  },
  categoryTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryIcon: {
    fontSize: 16,
  },
  categoryTitle: {
    color: '#A7F3D0',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  totalKcalText: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  kcalUnit: {
    color: '#A7F3D0',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  divider: {
    height: 1,
    backgroundColor: '#10B98122',
    marginBottom: 12,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    backgroundColor: '#050D0A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#10B9811A',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemCalText: {
    color: '#F59E0B',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  calUnit: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  itemBottomRow: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  dotSeparator: {
    color: '#F59E0B',
    fontSize: 12,
  },
  pipeSeparator: {
    color: '#334155',
    fontSize: 12,
  },
});
