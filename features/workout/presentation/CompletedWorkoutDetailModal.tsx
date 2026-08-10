import React from 'react';
import { View, Text, Modal, ScrollView, TouchableOpacity } from 'react-native';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { CompletedWorkoutSummary } from '../domain/workout';

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
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

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
                <Text className={`text-xs font-bold uppercase tracking-widest mb-0.5 ${
                  isLight ? 'text-[#8B6E14]' : 'text-gold-light'
                }`}>
                  COMPLETED WORKOUT SESSION
                </Text>
                <Text className={`text-xl font-black ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                  {workout.title}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-1">
                <Text className={`font-bold text-lg ${isLight ? 'text-[#476355]' : 'text-sage'}`}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Metrics */}
            <View className="flex-row space-x-3 mb-4">
              <View className={`flex-1 p-3 rounded-2xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/50 border-deepGreen-border'
              }`}>
                <Text className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Date</Text>
                <Text className={`text-xs font-bold mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`} numberOfLines={1}>
                  {workout.date}
                </Text>
              </View>

              <View className={`flex-1 p-3 rounded-2xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/50 border-deepGreen-border'
              }`}>
                <Text className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Duration</Text>
                <Text className={`text-xs font-bold mt-0.5 ${isLight ? 'text-[#C5A028]' : 'text-gold-bright'}`}>
                  {workout.duration_minutes} Mins
                </Text>
              </View>

              <View className={`flex-1 p-3 rounded-2xl border ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-dark/50 border-deepGreen-border'
              }`}>
                <Text className={`text-[10px] font-bold uppercase ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Exercises</Text>
                <Text className={`text-xs font-bold mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                  {workout.exercises_count} Movements
                </Text>
              </View>
            </View>

            {/* Exercise Details List */}
            <Text className={`text-xs font-bold mb-2 uppercase tracking-wider ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              Recorded Exercises Summary:
            </Text>
            <ScrollView className="max-h-56 mb-4">
              <NeumorphicView variant="inset" className="p-4 rounded-2xl">
                <View className={`py-2 flex-row justify-between items-center border-b ${
                  isLight ? 'border-slate-200' : 'border-deepGreen-border'
                }`}>
                  <View style={{ flex: 1 }}>
                    <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Bench Press</Text>
                    <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>3 sets • 8-10 reps @ 60kg</Text>
                  </View>
                  <View className={`px-2 py-0.5 rounded ${isLight ? 'bg-amber-100' : 'bg-gold-dark/40'}`}>
                    <Text className={`text-[10px] font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>1RM PR ⭐</Text>
                  </View>
                </View>

                <View className={`py-2 flex-row justify-between items-center border-b ${
                  isLight ? 'border-slate-200' : 'border-deepGreen-border'
                }`}>
                  <View style={{ flex: 1 }}>
                    <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Incline Dumbbell Press</Text>
                    <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>3 sets • 10-12 reps @ 24kg</Text>
                  </View>
                  <Text className={`text-xs font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Completed</Text>
                </View>

                <View className="py-2 flex-row justify-between items-center">
                  <View style={{ flex: 1 }}>
                    <Text className={`font-bold text-sm ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Tricep Rope Pushdowns</Text>
                    <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>4 sets • 12-15 reps @ 25kg</Text>
                  </View>
                  <Text className={`text-xs font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Completed</Text>
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

