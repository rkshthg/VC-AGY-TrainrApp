import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { AppHeader } from '@/components/AppHeader';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { useRouter } from 'expo-router';
import { CompletedWorkoutDetailModal } from '@/components/CompletedWorkoutDetailModal';
import { CompletedWorkoutSummary } from '@/types/workout';

export default function WorkoutsTab() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const { activePlan, fetchPlanForUser, completedSessions, startWorkoutSession } = useWorkoutStore();
  const [selectedWorkout, setSelectedWorkout] = useState<CompletedWorkoutSummary | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchPlanForUser(user.id);
    }
  }, [user?.id]);

  const handleStartWorkout = (targetDay?: any) => {
    if (targetDay) {
      startWorkoutSession(targetDay);
    } else if (activePlan?.days?.[0]) {
      startWorkoutSession(activePlan.days[0]);
    } else {
      startWorkoutSession({ day_order: 1, day_label: 'Freestyle Workout', exercises: [] });
    }
    router.push('/(client)/workout-session');
  };

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Workout Center" subtitle="Plans, Live Tracker & History" />

      {/* Section 1: Quick Actions (Build Plan & Start Workout) */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Quick Training Actions</Text>
        <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          Start logging live workout sets or construct a personalized training split routine.
        </Text>

        <View className="flex-row space-x-3">
          <View className="flex-1">
            <NeumorphicButton
              title="Start Workout"
              variant="gold"
              size="md"
              onPress={() => handleStartWorkout()}
            />
          </View>
          <View className="flex-1">
            <NeumorphicButton
              title="Build New Plan"
              variant="green"
              size="md"
              onPress={() => router.push('/(client)/create-plan')}
            />
          </View>
        </View>
      </NeumorphicView>

      {/* Section 2: Featured Current Workout Plan */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Current Workout Plan</Text>
          <View className={`px-2 py-0.5 rounded border ${
            isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/30'
          }`}>
            <Text className={`text-[10px] font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Active Split</Text>
          </View>
        </View>

        {!activePlan ? (
          <View className="py-4 items-center">
            <Text className={`text-xs text-center mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              No active workout plan assigned. Build one or request your trainer!
            </Text>
            <NeumorphicButton
              title="+ Build Your First Plan"
              variant="gold"
              size="sm"
              onPress={() => router.push('/(client)/create-plan')}
            />
          </View>
        ) : (
          <View>
            <Text className={`text-xl font-black mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {activePlan.name || activePlan.title || 'Workout Plan'}
            </Text>
            <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              {activePlan.description || 'Assigned Workout Plan Routine'}
            </Text>

            <Text className={`text-xs font-bold uppercase tracking-wider mb-2 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              Plan Days & Routines:
            </Text>
            {activePlan.days?.map((day, idx) => (
              <TouchableOpacity
                key={day.id || idx}
                onPress={() => handleStartWorkout(day)}
                className={`py-3 px-4 mb-2.5 rounded-2xl border flex-row justify-between items-center ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
                }`}
              >
                <View>
                  <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                    Day {idx + 1}: {day.day_label || day.day_name}
                  </Text>
                  <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                    {day.exercises?.length || 0} Scheduled Exercises
                  </Text>
                </View>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>Start →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </NeumorphicView>

      {/* Section 3: History of Completed Workouts */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Workout History ({completedSessions.length})
        </Text>

        {completedSessions.length === 0 ? (
          <Text className={`text-xs text-center py-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No completed workouts recorded yet.</Text>
        ) : (
          completedSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => setSelectedWorkout(session)}
              activeOpacity={0.8}
              className={`py-3 flex-row justify-between items-center border-b ${
                isLight ? 'border-slate-200' : 'border-deepGreen-border'
              }`}
            >
              <View style={{ flex: 1 }}>
                <Text className={`font-bold text-sm mb-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{session.title}</Text>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {session.date} • {session.duration_minutes} mins
                </Text>
              </View>
              <View
                className={`px-3 py-1 rounded-full border flex-row items-center space-x-1 ${
                  isLight ? 'bg-amber-50 border-amber-300' : 'bg-gold-dark/30 border-gold-bright/30'
                }`}
              >
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                  {session.exercises_count} Exercises
                </Text>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}> ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      <CompletedWorkoutDetailModal workout={selectedWorkout} visible={!!selectedWorkout} onClose={() => setSelectedWorkout(null)} />
    </ScrollView>
  );
}

