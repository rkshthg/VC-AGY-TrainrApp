import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTrainerStore } from '../../store/trainerStore';
import { useWorkoutStore } from '../../store/workoutStore';

export default function AssignModalScreen() {
  const router = useRouter();
  const { planId } = useLocalSearchParams();
  const clients = useTrainerStore((state) => state.clients);
  const savedPlans = useWorkoutStore((state) => state.savedPlans);

  const targetPlan = savedPlans.find((p) => p.id === planId) || savedPlans[0];

  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);

  const toggleClient = (id: string) => {
    if (selectedClientIds.includes(id)) {
      setSelectedClientIds(selectedClientIds.filter((cId) => cId !== id));
    } else {
      setSelectedClientIds([...selectedClientIds, id]);
    }
  };

  const handleConfirmAssignment = () => {
    if (selectedClientIds.length === 0) {
      Alert.alert('No Clients Selected', 'Please select at least one client to assign this workout plan to.');
      return;
    }

    Alert.alert(
      'Plan Assigned',
      `Successfully assigned "${targetPlan?.title || 'Workout Plan'}" to ${selectedClientIds.length} client(s)!`
    );
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assign Plan to Clients</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.planName}>Plan: {targetPlan?.title || 'Workout Plan'}</Text>
          <Text style={styles.planSub}>
            Select the clients who should receive this workout plan on their Workout tab:
          </Text>

          <View style={styles.clientList}>
            {clients.map((client) => {
              const isSelected = selectedClientIds.includes(client.clientId);
              return (
                <TouchableOpacity
                  key={client.clientId}
                  style={[styles.clientRow, isSelected && styles.clientRowActive]}
                  onPress={() => toggleClient(client.clientId)}
                >
                  <View>
                    <Text style={styles.clientName}>{client.fullName}</Text>
                    <Text style={styles.clientEmail}>{client.email}</Text>
                  </View>
                  <Text style={styles.checkIcon}>{isSelected ? '✅' : '⭕'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirmAssignment}>
        <Text style={styles.confirmBtnText}>Confirm Assignment 🎯</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
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
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  scrollContent: {
    flex: 1,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 24,
    padding: 20,
  },
  planName: {
    color: '#10B981',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planSub: {
    color: '#94A3B8',
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
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  clientRowActive: {
    borderColor: '#10B981',
    backgroundColor: '#064E3B',
  },
  clientName: {
    color: '#F8FAFC',
    fontSize: 15,
    fontWeight: 'bold',
  },
  clientEmail: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  checkIcon: {
    fontSize: 18,
  },
  confirmBtn: {
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 10,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
