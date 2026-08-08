import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNutritionStore } from '@/store/nutritionStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { MacroRing } from '@/components/MacroRing';
import { MealLogModal } from '@/components/MealLogModal';
import { AppHeader } from '@/components/AppHeader';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { MealEntry } from '@/types/nutrition';

export default function NutritionTab() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const { meals, target, fetchMeals } = useNutritionStore();
  const [mealModalVisible, setMealModalVisible] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchMeals(user.id);
    }
  }, [user?.id]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayMeals = meals.filter((m) => m.date === todayStr);

  const totalCalories = todayMeals.reduce((sum, m) => sum + (m.calories || 0), 0);
  const totalProtein = todayMeals.reduce((sum, m) => sum + (m.protein_g || 0), 0);
  const totalCarbs = todayMeals.reduce((sum, m) => sum + (m.carbs_g || 0), 0);
  const totalFat = todayMeals.reduce((sum, m) => sum + (m.fat_g || 0), 0);

  // Group meals history by date
  const groupedMealsMap = new Map<string, MealEntry[]>();
  meals.forEach((m) => {
    const list = groupedMealsMap.get(m.date) || [];
    list.push(m);
    groupedMealsMap.set(m.date, list);
  });

  const sortedDates = Array.from(groupedMealsMap.keys()).sort((a, b) => b.localeCompare(a));

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Nutrition Tracker" subtitle="Daily Targets & Meal History" />

      {/* Top Banner: Daily Nutrition Goals & Today's Progress */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className={`text-base font-bold tracking-wide ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              Daily Nutrition Goals
            </Text>
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Today's Progress Overview</Text>
          </View>
          <NeumorphicButton
            title="+ Log New Meal"
            variant="gold"
            size="sm"
            onPress={() => setMealModalVisible(true)}
          />
        </View>

        <View className="flex-row -mx-1 mb-1">
          <MacroRing label="Calories" current={totalCalories} target={target.calories} unit="kcal" colorBar="bg-[#D4AF37]" />
          <MacroRing label="Protein" current={totalProtein} target={target.protein_g} unit="g" colorBar="bg-emerald-500" />
        </View>
        <View className="flex-row -mx-1">
          <MacroRing label="Carbs" current={totalCarbs} target={target.carbs_g} unit="g" colorBar="bg-amber-500" />
          <MacroRing label="Fat" current={totalFat} target={target.fat_g} unit="g" colorBar="bg-purple-500" />
        </View>
      </NeumorphicView>

      {/* Log New Meal Primary Action Button */}
      <NeumorphicButton
        title="Log Meal with AI Scanner"
        variant="gold"
        size="lg"
        className="w-full mb-6"
        onPress={() => setMealModalVisible(true)}
      />

      {/* History of All Meals Grouped by Date */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-4 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Meal Log History</Text>

        {sortedDates.length === 0 ? (
          <Text className={`text-xs text-center py-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No meal history logged yet.</Text>
        ) : (
          sortedDates.map((dateStr) => {
            const dayLogs = groupedMealsMap.get(dateStr) || [];
            const isToday = dateStr === todayStr;
            const dayCalories = dayLogs.reduce((s, m) => s + (m.calories || 0), 0);

            return (
              <View key={dateStr} className={`mb-5 pb-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className={`text-xs font-black uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                    {isToday ? 'Today' : dateStr}
                  </Text>
                  <Text className={`text-xs font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{dayCalories} kcal logged</Text>
                </View>

                {dayLogs.map((m) => (
                  <View key={m.id} className="py-2 flex-row justify-between items-center">
                    <View style={{ flex: 1 }}>
                      <View className="flex-row items-center space-x-2">
                        <Text className={`font-semibold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{m.meal_name}</Text>
                        <View className={`px-1.5 py-0.5 rounded ${isLight ? 'bg-amber-100' : 'bg-gold-dark/30'}`}>
                          <Text className={`text-[9px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                            {m.meal_type}
                          </Text>
                        </View>
                      </View>
                      <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                        {m.calories} kcal • {m.protein_g}g P • {m.carbs_g}g C • {m.fat_g}g F
                      </Text>
                    </View>
                    <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{m.logged_time || 'Logged'}</Text>
                  </View>
                ))}
              </View>
            );
          })
        )}
      </NeumorphicView>

      <MealLogModal visible={mealModalVisible} onClose={() => setMealModalVisible(false)} />
    </ScrollView>
  );
}

