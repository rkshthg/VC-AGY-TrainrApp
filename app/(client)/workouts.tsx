import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
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
      className="flex-1 bg-deepGreen px-6 py-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Workout Center" subtitle="Plans, Live Tracker & History" />

      {/* Section 1: Quick Actions (Build Plan & Start Workout) */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className="text-base font-bold text-white mb-1">Quick Training Actions</Text>
        <Text className="text-xs text-sage mb-4">
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
          <Text className="text-base font-bold text-white">Current Workout Plan</Text>
          <View className="bg-gold-dark/40 px-2 py-0.5 rounded border border-gold-bright/30">
            <Text className="text-[10px] text-gold-light font-bold">Active Split</Text>
          </View>
        </View>

        {!activePlan ? (
          <View className="py-4 items-center">
            <Text className="text-xs text-sage text-center mb-3">No active workout plan assigned. Build one or request your trainer!</Text>
            <NeumorphicButton
              title="+ Build Your First Plan"
              variant="gold"
              size="sm"
              onPress={() => router.push('/(client)/create-plan')}
            />
          </View>
        ) : (
          <View>
            <Text className="text-xl font-black text-white mb-1">{activePlan.name || activePlan.title || 'Workout Plan'}</Text>
            <Text className="text-xs text-sage mb-4">{activePlan.description || 'Assigned Workout Plan Routine'}</Text>

            <Text className="text-xs font-bold text-gold-light uppercase tracking-wider mb-2">Plan Days & Routines:</Text>
            {activePlan.days?.map((day, idx) => (
              <TouchableOpacity
                key={day.id || idx}
                onPress={() => handleStartWorkout(day)}
                className="py-3 px-4 mb-2.5 rounded-2xl bg-deepGreen-elevated border border-deepGreen-border flex-row justify-between items-center"
              >
                <View>
                  <Text className="font-bold text-white text-sm">Day {idx + 1}: {day.day_label || day.day_name}</Text>
                  <Text className="text-xs text-sage">{day.exercises?.length || 0} Scheduled Exercises</Text>
                </View>
                <Text className="text-xs text-gold-light font-bold">Start →</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </NeumorphicView>

      {/* Section 3: History of Completed Workouts */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className="text-base font-bold text-white mb-3">Workout History ({completedSessions.length})</Text>

        {completedSessions.length === 0 ? (
          <Text className="text-xs text-sage text-center py-4">No completed workouts recorded yet.</Text>
        ) : (
          completedSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              onPress={() => setSelectedWorkout(session)}
              activeOpacity={0.8}
              className="py-3 border-b border-deepGreen-border flex-row justify-between items-center"
            >
              <View style={{ flex: 1 }}>
                <Text className="font-bold text-white text-sm mb-0.5">{session.title}</Text>
                <Text className="text-xs text-sage">
                  {session.date} • {session.duration_minutes} mins
                </Text>
              </View>
              <View className="bg-gold-dark/30 px-3 py-1 rounded-full border border-gold-bright/30 flex-row items-center space-x-1">
                <Text className="text-xs font-bold text-gold-light">{session.exercises_count} Exercises</Text>
                <Text className="text-gold-light text-xs font-bold"> ➔</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      <CompletedWorkoutDetailModal workout={selectedWorkout} visible={!!selectedWorkout} onClose={() => setSelectedWorkout(null)} />
    </ScrollView>
  );
}
