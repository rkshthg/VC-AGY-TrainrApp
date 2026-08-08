import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNutritionStore } from '@/store/nutritionStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
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
  const { user } = useAuthStore();
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

  return (
    <ScrollView
      className="flex-1 bg-deepGreen px-6 py-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Dashboard" subtitle={`WELCOME BACK, ${(user?.email?.split('@')[0] || 'Client').toUpperCase()}`} />

      {/* 1. Today's Nutrition (Graph/Chart Dashboard) */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-base font-bold text-white tracking-wide">Today's Nutrition Chart</Text>
            <Text className="text-xs text-sage">Live macro targets tracking</Text>
          </View>
          <NeumorphicButton title="+ Log Meal" variant="gold" size="sm" onPress={() => setMealModalVisible(true)} />
        </View>

        <View className="flex-row -mx-1 mb-1">
          <MacroRing label="Calories" current={totalCalories} target={target.calories} unit="kcal" colorBar="bg-gold-light" />
          <MacroRing label="Protein" current={totalProtein} target={target.protein_g} unit="g" colorBar="bg-emerald-400" />
        </View>
        <View className="flex-row -mx-1">
          <MacroRing label="Carbs" current={totalCarbs} target={target.carbs_g} unit="g" colorBar="bg-amber-400" />
          <MacroRing label="Fat" current={totalFat} target={target.fat_g} unit="g" colorBar="bg-purple-400" />
        </View>
      </NeumorphicView>

      {/* 2. Today's Logged Meals */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-white">Today's Logged Meals</Text>
          <Text className="text-xs text-sage">{todayMeals.length} Logged</Text>
        </View>

        {todayMeals.length === 0 ? (
          <View className="py-4 items-center">
            <Text className="text-xs text-sage text-center mb-3">No meals logged today. Use AI scanning or manual entry!</Text>
            <NeumorphicButton title="+ Log Meal Now" variant="gold" size="sm" onPress={() => setMealModalVisible(true)} />
          </View>
        ) : (
          todayMeals.map((m) => (
            <View key={m.id} className="py-3 border-b border-deepGreen-border flex-row justify-between items-center">
              <View style={{ flex: 1 }}>
                <View className="flex-row items-center space-x-2 mb-1">
                  <Text className="font-semibold text-white text-sm">{m.meal_name}</Text>
                  <View className="bg-gold-dark/40 px-2 py-0.5 rounded">
                    <Text className="text-[10px] text-gold-light font-bold uppercase">{m.meal_type}</Text>
                  </View>
                </View>
                <Text className="text-xs text-sage">{m.calories} kcal • {m.protein_g}g P • {m.carbs_g}g C • {m.fat_g}g F</Text>
              </View>
              <Text className="text-xs text-gold-bright font-bold">🕒 {m.logged_time || 'Today'}</Text>
            </View>
          ))
        )}
      </NeumorphicView>

      {/* 3. Recent Workouts */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-white">Recent Workouts</Text>
          <NeumorphicButton title="+ Start Workout" variant="gold" size="sm" onPress={handleStartWorkout} />
        </View>

        {completedSessions.length === 0 ? (
          <View className="py-3 items-center">
            <Text className="text-xs text-sage mb-2">No completed workouts logged yet.</Text>
            <NeumorphicButton title="Start First Workout" variant="gold" size="sm" onPress={handleStartWorkout} />
          </View>
        ) : (
          completedSessions.slice(0, 3).map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => setSelectedWorkout(item)}
              activeOpacity={0.8}
              className="py-3 border-b border-deepGreen-border flex-row justify-between items-center"
            >
              <View style={{ flex: 1 }}>
                <Text className="font-semibold text-white text-sm">{item.title}</Text>
                <Text className="text-xs text-sage">{item.date} • {item.duration_minutes} mins</Text>
              </View>
              <View className="bg-gold-dark/30 px-2.5 py-1 rounded border border-gold-bright/20 flex-row items-center space-x-1">
                <Text className="text-xs text-gold-light font-bold">{item.exercises_count} Exercises</Text>
                <Text className="text-gold-light text-xs font-bold"> ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      {/* 4. Next Workout Plan */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className="text-xs text-gold-light font-bold uppercase tracking-wider mb-1">UPCOMING ROUTINE</Text>
        <Text className="text-xl font-black text-white mb-1">
          {activePlan?.name || activePlan?.title || 'Hypertrophy Split'}
        </Text>
        <Text className="text-xs text-sage mb-4">
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
