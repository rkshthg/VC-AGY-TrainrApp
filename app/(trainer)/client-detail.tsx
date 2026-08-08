import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/store/trainerStore';
import { StatusBadge } from '@/components/StatusBadge';
import { useRouter } from 'expo-router';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const { clients, selectedClientId, updateClientTarget } = useTrainerStore();
  const router = useRouter();

  const client = clients.find((c) => c.id === selectedClientId) || clients[0];
  const [calInput, setCalInput] = useState(client.calorie_target.toString());
  const [proteinInput, setProteinInput] = useState(client.protein_target.toString());

  const handleUpdate = () => {
    updateClientTarget(client.id, parseFloat(calInput) || 2000, parseFloat(proteinInput) || 160);
    Alert.alert('Success', 'Client macro targets updated successfully!');
  };

  return (
    <ScrollView
      className="flex-1 bg-deepGreen p-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <TouchableOpacity className="mb-4 flex-row items-center" onPress={() => router.back()}>
        <Text className="text-gold-light font-bold text-sm">← Back to Roster</Text>
      </TouchableOpacity>

      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <Text className="text-2xl font-bold text-white mb-0.5">{client.name}</Text>
            <Text className="text-xs text-sage font-medium">{client.goal}</Text>
          </View>
          <StatusBadge status={client.status_badge} />
        </View>

        <Text className="text-xs text-sage mb-5">Last active: {client.last_active}</Text>

        {/* Override Macro Targets */}
        <NeumorphicView variant="inset" className="p-4 mb-5">
          <Text className="text-sm font-bold text-gold-light mb-3">Set Macro & Calorie Targets</Text>
          <View className="flex-row space-x-3 mb-2">
            <View className="flex-1">
              <NeumorphicInput
                label="Calories (kcal)"
                value={calInput}
                onChangeText={setCalInput}
                keyboardType="numeric"
              />
            </View>
            <View className="flex-1">
              <NeumorphicInput
                label="Protein (g)"
                value={proteinInput}
                onChangeText={setProteinInput}
                keyboardType="numeric"
              />
            </View>
          </View>

          <NeumorphicButton
            title="Save Target Updates"
            variant="gold"
            size="md"
            onPress={handleUpdate}
          />
        </NeumorphicView>

        {/* Client Log History */}
        <Text className="text-xs font-bold text-sage uppercase tracking-wider mb-2">Logged Workout History</Text>
        <NeumorphicView variant="extruded" className="p-3.5 mb-4">
          <Text className="text-xs font-semibold text-white">{client.last_workout}</Text>
          <Text className="text-[11px] text-sage mt-0.5">Sets: 4 • Volume: 3,450 kg • Duration: 50m</Text>
        </NeumorphicView>

        <Text className="text-xs font-bold text-sage uppercase tracking-wider mb-2">Logged Nutrition History</Text>
        <NeumorphicView variant="extruded" className="p-3.5">
          <Text className="text-xs font-semibold text-white">
            Intake: {client.calories_logged} kcal / {client.calorie_target} kcal
          </Text>
          <Text className="text-[11px] text-gold-light mt-0.5">Protein: {client.protein_logged}g / {client.protein_target}g</Text>
        </NeumorphicView>
      </NeumorphicView>
    </ScrollView>
  );
}

