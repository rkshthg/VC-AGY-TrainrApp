import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FoodItem } from '../store/nutritionStore';
import { useTheme } from '../lib/theme';

export interface LoggedMealCategoryProps {
  category: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACKS';
  totalCalories: number;
  items: FoodItem[];
}

const CATEGORY_ICON_NAMES: Record<string, keyof typeof Ionicons.glyphMap> = {
  BREAKFAST: 'sunny-outline',
  LUNCH: 'partly-sunny-outline',
  DINNER: 'moon-outline',
  SNACKS: 'nutrition-outline',
};

export const LoggedMealCategoryCard: React.FC<LoggedMealCategoryProps> = ({
  category,
  totalCalories,
  items,
}) => {
  const iconName = CATEGORY_ICON_NAMES[category] || 'restaurant-outline';
  const theme = useTheme();

  return (
    <View
      style={[
        styles.outerContainer,
        {
          backgroundColor: theme.card,
          borderColor: theme.border,
          ...theme.shadow,
        },
      ]}
    >
      {/* Header Row */}
      <View style={styles.headerRow}>
        <View style={styles.categoryTitleGroup}>
          <Ionicons
            name={iconName}
            size={18}
            color={theme.isDark ? theme.accentGold : theme.primary}
          />
          <Text
            style={[
              styles.categoryTitle,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            {category}
          </Text>
        </View>
        <Text style={[styles.totalKcalText, { color: theme.text }]}>
          {totalCalories}{' '}
          <Text
            style={[
              styles.kcalUnit,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            kcal
          </Text>
        </Text>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      {/* Item Inset Cards */}
      <View style={styles.itemsList}>
        {items.map((item, index) => (
          <View
            key={item.id || index}
            style={[
              styles.itemCard,
              {
                backgroundColor: theme.cardInner,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.itemTopRow}>
              <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
              <Text style={[styles.itemCalText, { color: theme.accentGold }]}>
                {item.calories} <Text style={styles.calUnit}>cal</Text>
              </Text>
            </View>

            <Text style={[styles.itemBottomRow, { color: theme.textSecondary }]}>
              {item.quantity} <Text style={{ color: theme.accentGold }}>•</Text> P: {item.proteinG}g{' '}
              <Text style={{ color: theme.border }}>|</Text> C: {item.carbsG}g{' '}
              <Text style={{ color: theme.border }}>|</Text> F: {item.fatG}g
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerContainer: {
    borderRadius: 20,
    borderWidth: 1,
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
  categoryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1.5,
  },
  totalKcalText: {
    fontSize: 18,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  kcalUnit: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  divider: {
    height: 1,
    marginBottom: 12,
  },
  itemsList: {
    gap: 10,
  },
  itemCard: {
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemCalText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  calUnit: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'normal',
  },
  itemBottomRow: {
    fontSize: 12,
    fontWeight: '500',
  },
});
