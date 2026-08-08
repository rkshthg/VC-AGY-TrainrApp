import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore, ClientRosterItem } from '@/store/trainerStore';
import { useAuthStore } from '@/store/authStore';
import { fetchUserProfileData } from '@/services/authService';
import { StatusBadge } from '@/components/StatusBadge';
import { AppHeader } from '@/components/AppHeader';
import { useRouter } from 'expo-router';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function TrainerClientsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clients, setSelectedClient, fetchClients, generateInvite, isLoadingClients } = useTrainerStore();
  const { user } = useAuthStore();
  const [filter, setFilter] = useState<'all' | 'needs_attention' | 'on_track'>('all');
  const [trainerCode, setTrainerCode] = useState<string>('');

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (user?.id) {
      fetchClients(user.id);
      fetchUserProfileData(user.id).then((p) => {
        if (p?.trainer_code) {
          setTrainerCode(p.trainer_code);
        }
      });
    }
  }, [user?.id]);

  const filteredClients = clients.filter((c) => {
    if (filter === 'all') return true;
    return c.status_badge === filter;
  });

  const handleClientTap = (client: ClientRosterItem) => {
    setSelectedClient(client.id);
    router.push('/(trainer)/client-detail');
  };

  const handleCreateInvite = async () => {
    if (!clientEmail.trim() || !user?.id) return;
    setIsGenerating(true);
    const res = await generateInvite(user.id, clientEmail);
    setIsGenerating(false);
    if (res?.inviteCode) {
      setGeneratedCode(res.inviteCode);
    } else {
      Alert.alert('Error', 'Failed to generate invite code.');
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-deepGreen px-6 py-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Client Roster" subtitle="Manage & Monitor Client Compliance" />

      {/* Trainer Code Banner */}
      {trainerCode ? (
        <NeumorphicView variant="goldAccent" className="p-4 mb-5 flex-row justify-between items-center">
          <View>
            <Text className="text-[10px] text-gold-light font-bold uppercase tracking-wider">Your Trainer Code</Text>
            <Text className="text-xl font-black text-white mt-0.5 tracking-widest">{trainerCode}</Text>
          </View>
          <TouchableOpacity
            className="bg-gold-dark/60 border border-gold-bright/40 px-3 py-1.5 rounded-xl"
            onPress={() => Alert.alert('Your Trainer Code', `Clients can use code: ${trainerCode}`)}
          >
            <Text className="text-xs font-bold text-gold-light">Copy Code</Text>
          </TouchableOpacity>
        </NeumorphicView>
      ) : null}

      {/* Top Controls */}
      <View className="flex-row justify-between items-center mb-6">
        <Text className="text-sm font-black text-white">Clients ({clients.length})</Text>
        <NeumorphicButton
          title="+ Invite Client"
          variant="gold"
          size="sm"
          onPress={() => {
            setGeneratedCode(null);
            setClientEmail('');
            setInviteModalVisible(true);
          }}
        />
      </View>


      {/* Filter Tabs */}
      <View className="flex-row space-x-2 mb-4">
        <TouchableOpacity
          className={`px-4 py-2 rounded-xl border ${
            filter === 'all' ? 'bg-gold-light border-gold-bright' : 'bg-deepGreen-elevated border-deepGreen-border'
          }`}
          onPress={() => setFilter('all')}
        >
          <Text className={`text-xs font-bold ${filter === 'all' ? 'text-deepGreen-dark' : 'text-sage'}`}>
            All ({clients.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-xl border ${
            filter === 'needs_attention' ? 'bg-gold-light border-gold-bright' : 'bg-deepGreen-elevated border-deepGreen-border'
          }`}
          onPress={() => setFilter('needs_attention')}
        >
          <Text className={`text-xs font-bold ${filter === 'needs_attention' ? 'text-deepGreen-dark' : 'text-sage'}`}>
            Needs Attention
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`px-4 py-2 rounded-xl border ${
            filter === 'on_track' ? 'bg-gold-light border-gold-bright' : 'bg-deepGreen-elevated border-deepGreen-border'
          }`}
          onPress={() => setFilter('on_track')}
        >
          <Text className={`text-xs font-bold ${filter === 'on_track' ? 'text-deepGreen-dark' : 'text-sage'}`}>
            On Track
          </Text>
        </TouchableOpacity>
      </View>

      {isLoadingClients && <ActivityIndicator color="#E5C158" className="my-4" />}

      {/* Client List Cards */}
      {filteredClients.map((client) => (
        <TouchableOpacity
          key={client.id}
          activeOpacity={0.8}
          className="mb-4"
          onPress={() => handleClientTap(client)}
        >
          <NeumorphicView variant="extruded" className="p-5">
            <View className="flex-row justify-between items-start mb-3">
              <View className="flex-row items-center space-x-3">
                {/* Status Indicator Dot */}
                <View
                  className={`w-3.5 h-3.5 rounded-full ${
                    client.status_badge === 'on_track' ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
                <View>
                  <Text className="text-base font-bold text-white mb-0.5">{client.name}</Text>
                  <Text className="text-xs text-sage font-medium">{client.goal}</Text>
                </View>
              </View>

              <StatusBadge status={client.status_badge} />
            </View>

            <NeumorphicView variant="inset" className="p-3 flex-row justify-between mb-3">
              <View>
                <Text className="text-[10px] uppercase text-sage font-bold tracking-wider">Today's Calories</Text>
                <Text className="text-xs font-bold text-white mt-0.5">
                  {client.calories_logged} / {client.calorie_target} kcal
                </Text>
              </View>
              <View>
                <Text className="text-[10px] uppercase text-sage font-bold tracking-wider">Protein Target</Text>
                <Text className="text-xs font-bold text-gold-light mt-0.5">
                  {client.protein_logged} / {client.protein_target}g
                </Text>
              </View>
            </NeumorphicView>

            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-xs text-sage">Last Workout: {client.last_workout}</Text>
              <Text className="text-xs text-gold-light font-bold">Open Client Dashboard →</Text>
            </View>
          </NeumorphicView>
        </TouchableOpacity>
      ))}

      {/* Invite Modal */}
      <Modal visible={inviteModalVisible} transparent animationType="fade">
        <View className="flex-1 justify-center items-center bg-black/80 p-5">
          <NeumorphicView variant="goldAccent" className="p-6 w-full max-w-sm rounded-3xl">
            <Text className="text-xl font-bold text-white mb-2 text-center">Invite New Client</Text>
            <Text className="text-xs text-sage text-center mb-5">
              Enter client's email to generate an invite code.
            </Text>

            {!generatedCode ? (
              <>
                <NeumorphicInput
                  label="Client Email"
                  placeholder="client@example.com"
                  value={clientEmail}
                  onChangeText={setClientEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
                <View className="flex-row space-x-3 mt-4">
                  <View className="flex-1">
                    <NeumorphicButton title="Cancel" variant="green" onPress={() => setInviteModalVisible(false)} />
                  </View>
                  <View className="flex-1">
                    <NeumorphicButton title={isGenerating ? 'Generating...' : 'Generate'} variant="gold" onPress={handleCreateInvite} disabled={isGenerating} />
                  </View>
                </View>
              </>
            ) : (
              <View className="items-center py-2">
                <Text className="text-xs text-sage mb-2">Share this invite code with your client:</Text>
                <NeumorphicView variant="inset" className="p-4 rounded-2xl mb-4 w-full items-center">
                  <Text className="text-3xl font-black text-gold-light tracking-widest">{generatedCode}</Text>
                </NeumorphicView>
                <NeumorphicButton title="Done" variant="gold" className="w-full" onPress={() => setInviteModalVisible(false)} />
              </View>
            )}
          </NeumorphicView>
        </View>
      </Modal>
    </ScrollView>
  );
}
