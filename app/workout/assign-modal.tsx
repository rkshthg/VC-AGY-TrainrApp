import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTrainerStore } from '../../store/trainerStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useTheme } from '../../lib/theme';

export default function AssignModalScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const clients = useTrainerStore((state) => state.clients);
  const { savedPlans, updatePlan } = useWorkoutStore();
  const theme = useTheme();

  const targetPlan = savedPlans.find((p) => p.id === planId) || savedPlans[0];

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(
    targetPlan?.assignedClientIds || []
  );

  const toggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter((cId) => cId !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  const handleConfirmAssignment = () => {
    const isUnassigning = selectedClientIds.length === 0;

    if (targetPlan) {
      updatePlan(targetPlan.id, {
        assignedClientIds: selectedClientIds,
        isAssignedToClient: !isUnassigning,
      });
    }

    if (isUnassigning) {
      Alert.alert(
        'Assignment Cleared',
        `Removed client assignments for "${targetPlan?.title || 'Workout Plan'}". Routine is now under Self.`
      );
    } else {
      Alert.alert(
        'Plan Assigned',
        `Successfully assigned "${targetPlan?.title || 'Workout Plan'}" to ${selectedClientIds.length} client(s)!`
      );
    }
    router.back();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Assign Plan to Clients</Text>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.closeBtn,
            { backgroundColor: theme.cardInner, borderColor: theme.border },
          ]}
        >
          <Ionicons name="close-outline" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              ...theme.shadow,
            },
          ]}
        >
          <Text
            style={[
              styles.planName,
              { color: theme.isDark ? theme.accentGold : theme.primary },
            ]}
          >
            Plan: {targetPlan?.title || 'Workout Plan'}
          </Text>
          <Text style={[styles.planSub, { color: theme.textSecondary }]}>
            Select the clients who should receive this workout plan on their Workout tab:
          </Text>

          <View style={styles.clientList}>
            {clients.map((client) => {
              const isSelected = selectedClientIds.includes(client.clientId);
              return (
                <TouchableOpacity
                  key={client.clientId}
                  style={[
                    styles.clientRow,
                    {
                      backgroundColor: isSelected
                        ? theme.isDark
                          ? theme.badgeBg
                          : '#E8F5E9'
                        : theme.cardInner,
                      borderColor: isSelected
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.border,
                    },
                  ]}
                  onPress={() => toggleClient(client.clientId)}
                >
                  <View>
                    <Text style={[styles.clientName, { color: theme.text }]}>{client.fullName}</Text>
                    <Text style={[styles.clientEmail, { color: theme.textMuted }]}>{client.email}</Text>
                  </View>
                  <Ionicons
                    name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={20}
                    color={
                      isSelected
                        ? theme.isDark
                          ? theme.accentGold
                          : theme.primary
                        : theme.textMuted
                    }
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={[
          styles.confirmBtn,
          {
            backgroundColor: theme.isDark ? theme.accentGold : theme.primary,
            ...theme.shadowButton,
          },
        ]}
        onPress={handleConfirmAssignment}
      >
        <Text
          style={[
            styles.confirmBtnText,
            { color: theme.isDark ? '#0A1A12' : '#FFFFFF' },
          ]}
        >
          Confirm Assignment
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 16,
  },
  scrollContent: {
    flex: 1,
  },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },
  clientList: {
    gap: 10,
  },
  clientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  clientEmail: {
    fontSize: 12,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 18,
  },
  confirmBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
