import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { CompletedWorkoutSummary } from '@/types/workout';

interface CompletedWorkoutDetailModalProps {
  workout: CompletedWorkoutSummary | null;
  visible: boolean;
  onClose: () => void;
}

export function CompletedWorkoutDetailModal({
  workout,
  visible,
  onClose,
}: CompletedWorkoutDetailModalProps) {
  if (!workout) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/80 justify-center items-center p-5"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-full max-w-sm"
          onPress={(e) => e.stopPropagation()}
        >
          <NeumorphicView variant="goldAccent" className="p-6 rounded-3xl">
            {/* Header */}
            <View className="flex-row justify-between items-start mb-4">
              <View style={{ flex: 1 }}>
                <Text className="text-xs text-gold-light font-bold uppercase tracking-widest mb-0.5">
                  COMPLETED WORKOUT SESSION
                </Text>
                <Text className="text-xl font-black text-white">{workout.title}</Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Text className="text-sage font-bold text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View className="flex-row space-x-3 mb-4">
              <View className="flex-1 bg-deepGreen-dark/50 p-3 rounded-2xl border border-deepGreen-border">
                <Text className="text-[10px] text-sage font-bold uppercase">Date</Text>
                <Text className="text-xs font-bold text-white mt-0.5" numberOfLines={1}>
                  {workout.date}
                </Text>
              </View>

              <View className="flex-1 bg-deepGreen-dark/50 p-3 rounded-2xl border border-deepGreen-border">
                <Text className="text-[10px] text-sage font-bold uppercase">Duration</Text>
                <Text className="text-xs font-bold text-gold-bright mt-0.5">
                  {workout.duration_minutes} Mins
                </Text>
              </View>

              <View className="flex-1 bg-deepGreen-dark/50 p-3 rounded-2xl border border-deepGreen-border">
                <Text className="text-[10px] text-sage font-bold uppercase">Exercises</Text>
                <Text className="text-xs font-bold text-white mt-0.5">
                  {workout.exercises_count} Movements
                </Text>
              </View>
            </View>

            {/* Exercise Details List */}
            <Text className="text-xs font-bold text-sage mb-2 uppercase tracking-wider">
              Recorded Exercises Summary:
            </Text>
            <ScrollView className="max-h-56 mb-4">
              <NeumorphicView variant="inset" className="p-4 rounded-2xl">
                <View className="py-2 border-b border-deepGreen-border flex-row justify-between items-center">
                  <View style={{ flex: 1 }}>
                    <Text className="font-bold text-white text-sm">Bench Press</Text>
                    <Text className="text-xs text-sage">3 sets • 8-10 reps @ 60kg</Text>
                  </View>
                  <View className="bg-gold-dark/40 px-2 py-0.5 rounded">
                    <Text className="text-[10px] text-gold-light font-bold">1RM PR ⭐</Text>
                  </View>
                </View>

                <View className="py-2 border-b border-deepGreen-border flex-row justify-between items-center">
                  <View style={{ flex: 1 }}>
                    <Text className="font-bold text-white text-sm">Incline Dumbbell Press</Text>
                    <Text className="text-xs text-sage">3 sets • 10-12 reps @ 24kg</Text>
                  </View>
                  <Text className="text-xs text-sage font-medium">Completed</Text>
                </View>

                <View className="py-2 flex-row justify-between items-center">
                  <View style={{ flex: 1 }}>
                    <Text className="font-bold text-white text-sm">Tricep Rope Pushdowns</Text>
                    <Text className="text-xs text-sage">4 sets • 12-15 reps @ 25kg</Text>
                  </View>
                  <Text className="text-xs text-sage font-medium">Completed</Text>
                </View>
              </NeumorphicView>
            </ScrollView>

            <NeumorphicButton title="Close Window" variant="gold" size="md" className="w-full" onPress={onClose} />
          </NeumorphicView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
