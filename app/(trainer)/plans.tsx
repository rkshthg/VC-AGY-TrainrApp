import React, { useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function PlanBuilderScreen() {
  const insets = useSafeAreaInsets();
  const [planName, setPlanName] = useState('');
  const [plans, setPlans] = useState([
    { id: 'p1', name: 'Hypertrophy 4-Day Split', exercisesCount: 16, goal: 'Hypertrophy' },
    { id: 'p2', name: 'Fat Loss & Conditioning 3-Day', exercisesCount: 12, goal: 'Fat Loss' },
  ]);

  const handleCreate = () => {
    if (!planName) return;
    setPlans([
      ...plans,
      { id: Math.random().toString(), name: planName, exercisesCount: 8, goal: 'Strength' },
    ]);
    setPlanName('');
  };

  return (
    <ScrollView
      className="flex-1 bg-deepGreen p-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <Text className="text-2xl font-black text-white mb-1 tracking-wide">Workout Plan Builder</Text>
      <Text className="text-xs text-sage mb-6">Create workout routines and assign them to clients</Text>

      {/* Builder Form */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className="text-base font-bold text-white mb-3">+ Create New Routine Template</Text>
        <NeumorphicInput
          label="Routine Name"
          placeholder="e.g. Push/Pull/Legs 6-Day Split"
          value={planName}
          onChangeText={setPlanName}
        />
        <NeumorphicButton
          title="Save Plan Template"
          variant="gold"
          size="md"
          onPress={handleCreate}
        />
      </NeumorphicView>

      {/* Routine Templates */}
      <Text className="text-sm font-bold text-sage uppercase tracking-wider mb-3">Saved Routines</Text>
      {plans.map((p) => (
        <NeumorphicView key={p.id} variant="extruded" className="p-4 mb-3 flex-row justify-between items-center">
          <View>
            <Text className="font-bold text-white text-sm">{p.name}</Text>
            <Text className="text-xs text-sage mt-0.5">
              {p.exercisesCount} Exercises • {p.goal}
            </Text>
          </View>
          <NeumorphicButton
            title="Assign →"
            variant="green"
            size="sm"
          />
        </NeumorphicView>
      ))}
    </ScrollView>
  );
}

