import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNutritionStore } from '@/features/nutrition/presentation/nutritionStore';
import { useWorkoutStore } from '@/features/workout/presentation/workoutStore';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { MacroRing } from '@/features/nutrition/presentation/MacroRing';
import { MealLogModal } from '@/features/nutrition/presentation/MealLogModal';
import { AppHeader } from '@/core/presentation/components/AppHeader';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { useRouter } from 'expo-router';

import { CompletedWorkoutDetailModal } from '@/features/workout/presentation/CompletedWorkoutDetailModal';
import { CompletedWorkoutSummary } from '@/features/workout/domain/workout';

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
  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Dashboard" />

      {/* Greeting & Date Header */}
      <View className="mb-6">
        <Text className={`text-3xl font-black mb-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Hey {greetingName}!
        </Text>
        <Text className={`text-xs font-mono font-bold tracking-widest ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          {todayDateStr}
        </Text>
      </View>

      {/* 1. Nutrition Bento Box */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-4">
          <Text className={`text-lg font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Nutrition</Text>
          <View className={`px-2.5 py-1 rounded border ${isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/30'}`}>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>TARGET</Text>
          </View>
        </View>

        <View className="flex-row items-center space-x-4">
          {/* Circular Progress Display */}
          <View className="w-24 h-24 rounded-full bg-deepGreen-inset items-center justify-center border-2 border-gold-bright/40 p-2">
            <Text className={`text-lg font-mono font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{totalCalories}</Text>
            <Text className={`text-[9px] font-bold uppercase ${isLight ? 'text-[#476355]' : 'text-sage'}`}>KCAL</Text>
          </View>

          {/* Macro Progress Fills */}
          <View className="flex-1 space-y-2">
            <View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Protein</Text>
                <Text className={`text-xs font-mono font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{totalProtein}/{target.protein_g}g</Text>
              </View>
              <View className="h-2 w-full bg-deepGreen-inset rounded-full overflow-hidden">
                <View className="h-full bg-gold-light rounded-full" style={{ width: `${Math.min(100, Math.round((totalProtein / (target.protein_g || 1)) * 100))}%` }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Carbs</Text>
                <Text className={`text-xs font-mono font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{totalCarbs}/{target.carbs_g}g</Text>
              </View>
              <View className="h-2 w-full bg-deepGreen-inset rounded-full overflow-hidden">
                <View className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round((totalCarbs / (target.carbs_g || 1)) * 100))}%` }} />
              </View>
            </View>

            <View>
              <View className="flex-row justify-between items-center mb-1">
                <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Fats</Text>
                <Text className={`text-xs font-mono font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{totalFat}/{target.fat_g}g</Text>
              </View>
              <View className="h-2 w-full bg-deepGreen-inset rounded-full overflow-hidden">
                <View className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(100, Math.round((totalFat / (target.fat_g || 1)) * 100))}%` }} />
              </View>
            </View>
          </View>
        </View>
      </NeumorphicView>

      {/* 2. Today's Meals Section */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Today's Meals</Text>
          <Text className={`text-xs font-mono font-bold ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{todayMeals.length} Logged</Text>
        </View>

        {todayMeals.length === 0 ? (
          <View className="py-3 items-center">
            <Text className={`text-xs text-center mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              No meals logged today. Use AI photo scanning or manual entry!
            </Text>
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
                  <View className={`px-2 py-0.5 rounded-full ${isLight ? 'bg-amber-100' : 'bg-gold-dark/40'}`}>
                    <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                      {m.meal_type}
                    </Text>
                  </View>
                </View>
                <Text className={`text-xs font-mono ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {m.calories} kcal • {m.protein_g}g P • {m.carbs_g}g C • {m.fat_g}g F
                </Text>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          className="mt-3 p-3 rounded-xl border border-dashed border-gold-bright/40 items-center justify-center flex-row space-x-2 bg-gold-dark/10"
          onPress={() => setMealModalVisible(true)}
        >
          <Text className="text-sm">📷</Text>
          <Text className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
            LOG MEAL WITH AI SCANNER
          </Text>
        </TouchableOpacity>
      </NeumorphicView>

      {/* 3. Upcoming Routine & Start Workout Action */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6 rounded-2xl">
        <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          WORKOUT OF THE DAY
        </Text>
        <Text className={`text-xl font-black mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          {activePlan?.name || activePlan?.title || 'Hypertrophy Split'}
        </Text>
        <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          {activePlan?.days?.[0]?.day_label || activePlan?.days?.[0]?.day_name || 'Day 1: Upper Body Push & Core'}
        </Text>

        <View className="flex-row space-x-3">
          <View className="flex-1">
            <NeumorphicButton title="Start Workout" variant="gold" onPress={handleStartWorkout} />
          </View>
          <View className="flex-1">
            <NeumorphicButton title="View Full Plan" variant="green" onPress={() => router.push('/(client)/workouts')} />
          </View>
        </View>
      </NeumorphicView>

      {/* 4. Recent Completed Workouts */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Recent Workouts</Text>
          <TouchableOpacity onPress={() => router.push('/(client)/workouts')}>
            <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>View All →</Text>
          </TouchableOpacity>
        </View>

        {completedSessions.length === 0 ? (
          <Text className={`text-xs py-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No completed workouts logged yet.</Text>
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
                <Text className={`text-xs font-mono ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {item.date} • {item.duration_minutes} mins
                </Text>
              </View>
              <Text className={`text-xs font-mono font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                {item.exercises_count} Exercises →
              </Text>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      <MealLogModal visible={mealModalVisible} onClose={() => setMealModalVisible(false)} />
      <CompletedWorkoutDetailModal workout={selectedWorkout} visible={!!selectedWorkout} onClose={() => setSelectedWorkout(null)} />
    </ScrollView>
  );
}

