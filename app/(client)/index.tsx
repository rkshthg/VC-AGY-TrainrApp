import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNutritionStore } from '@/store/nutritionStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { MacroRing } from '@/components/MacroRing';
import { MealLogModal } from '@/components/MealLogModal';
import { AppHeader } from '@/components/AppHeader';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { useRouter } from 'expo-router';

import { CompletedWorkoutDetailModal } from '@/components/CompletedWorkoutDetailModal';
import { CompletedWorkoutSummary } from '@/types/workout';

export default function ClientDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const { meals, target, fetchMeals } = useNutritionStore();
  const { activePlan, fetchPlanForUser, completedSessions, startWorkoutSession } = useWorkoutStore();
  const [mealModalVisible, setMealModalVisible] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<CompletedWorkoutSummary | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchMeals(user.id);
      fetchPlanForUser(user.id);
    }
  }, [user?.id]);

  const todayMeals = meals.filter((m) => m.date === new Date().toISOString().split('T')[0]);
  const totalCalories = todayMeals.reduce((acc, m) => acc + m.calories, 0);
  const totalProtein = todayMeals.reduce((acc, m) => acc + m.protein_g, 0);
  const totalCarbs = todayMeals.reduce((acc, m) => acc + m.carbs_g, 0);
  const totalFat = todayMeals.reduce((acc, m) => acc + m.fat_g, 0);

  const handleStartWorkout = () => {
    if (activePlan?.days?.[0]) {
      startWorkoutSession(activePlan.days[0]);
    } else {
      startWorkoutSession({ day_order: 1, day_label: 'Freestyle Workout', exercises: [] });
    }
    router.push('/(client)/workout-session');
  };

  const greetingName = userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Client';

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Dashboard" subtitle={`WELCOME BACK, ${greetingName.toUpperCase()}`} />


      {/* 1. Today's Nutrition (Graph/Chart Dashboard) */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className={`text-base font-bold tracking-wide ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              Today's Nutrition Chart
            </Text>
            <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Live macro targets tracking</Text>
          </View>
          <NeumorphicButton title="+ Log Meal" variant="gold" size="sm" onPress={() => setMealModalVisible(true)} />
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

      {/* 2. Today's Logged Meals */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Today's Logged Meals</Text>
          <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{todayMeals.length} Logged</Text>
        </View>

        {todayMeals.length === 0 ? (
          <View className="py-4 items-center">
            <Text className={`text-xs text-center mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              No meals logged today. Use AI scanning or manual entry!
            </Text>
            <NeumorphicButton title="+ Log Meal Now" variant="gold" size="sm" onPress={() => setMealModalVisible(true)} />
          </View>
        ) : (
          todayMeals.map((m) => (
            <View
              key={m.id}
              className={`py-3 flex-row justify-between items-center border-b ${
                isLight ? 'border-slate-200' : 'border-deepGreen-border'
              }`}
            >
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center space-x-2 mb-1">
                  <Text className={`font-semibold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{m.meal_name}</Text>
                  <View className={`px-2 py-0.5 rounded ${isLight ? 'bg-amber-100' : 'bg-gold-dark/40'}`}>
                    <Text className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                      {m.meal_type}
                    </Text>
                  </View>
                </View>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {m.calories} kcal • {m.protein_g}g P • {m.carbs_g}g C • {m.fat_g}g F
                </Text>
              </View>
              <Text className={`text-xs font-bold ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
                🕒 {m.logged_time || 'Today'}
              </Text>
            </View>
          ))
        )}
      </NeumorphicView>

      {/* 3. Recent Workouts */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Recent Workouts</Text>
          <NeumorphicButton title="+ Start Workout" variant="gold" size="sm" onPress={handleStartWorkout} />
        </View>

        {completedSessions.length === 0 ? (
          <View className="py-3 items-center">
            <Text className={`text-xs mb-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No completed workouts logged yet.</Text>
            <NeumorphicButton title="Start First Workout" variant="gold" size="sm" onPress={handleStartWorkout} />
          </View>
        ) : (
          completedSessions.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedWorkout(item)}
              activeOpacity={0.8}
              className={`py-3 flex-row justify-between items-center border-b ${
                isLight ? 'border-slate-200' : 'border-deepGreen-border'
              }`}
            >
              <View style={{ flex: 1 }}>
                <Text className={`font-semibold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{item.title}</Text>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {item.date} • {item.duration_minutes} mins
                </Text>
              </View>
              <View
                className={`px-2.5 py-1 rounded border flex-row items-center space-x-1 ${
                  isLight ? 'bg-amber-50 border-amber-300' : 'bg-gold-dark/30 border-gold-bright/20'
                }`}
              >
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                  {item.exercises_count} Exercises
                </Text>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}> ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      {/* 4. Next Workout Plan */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          UPCOMING ROUTINE
        </Text>
        <Text className={`text-xl font-black mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          {activePlan?.name || activePlan?.title || 'Hypertrophy Split'}
        </Text>
        <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          {activePlan?.days?.[0]?.day_label || activePlan?.days?.[0]?.day_name || 'Day 1: Upper Body Push & Core'}
        </Text>
        <View className="flex-row space-x-3">
          <View className="flex-1">
            <NeumorphicButton title="Start Workout Now" variant="gold" onPress={handleStartWorkout} />
          </View>
          <View className="flex-1">
            <NeumorphicButton title="View Full Plan" variant="green" onPress={() => router.push('/(client)/workouts')} />
          </View>
        </View>
      </NeumorphicView>

      <MealLogModal visible={mealModalVisible} onClose={() => setMealModalVisible(false)} />
      <CompletedWorkoutDetailModal workout={selectedWorkout} visible={!!selectedWorkout} onClose={() => setSelectedWorkout(null)} />
    </ScrollView>
  );
}

