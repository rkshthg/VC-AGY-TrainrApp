import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/store/trainerStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { fetchUserProfileData } from '@/services/authService';
import { AppHeader } from '@/components/AppHeader';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { useRouter } from 'expo-router';

export default function TrainerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clients, fetchClients } = useTrainerStore();
  const { user, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [trainerCode, setTrainerCode] = useState<string>('');

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

  const attentionClients = clients.filter((c) => c.status_badge === 'needs_attention');
  const greetingName = userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trainer';

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Trainer Dashboard" subtitle={`WELCOME COACH, ${greetingName.toUpperCase()}`} />


      {/* Trainer Code Sharing Banner */}
      {trainerCode ? (
        <NeumorphicView variant="goldAccent" className="p-4 mb-6 flex-row justify-between items-center">
          <View>
            <Text className={`text-[10px] font-bold uppercase tracking-wider ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              Your Unique Trainer Code
            </Text>
            <Text className={`text-2xl font-black mt-0.5 tracking-widest ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {trainerCode}
            </Text>
            <Text className={`text-[10px] mt-0.5 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              Share with clients to automatically join your roster
            </Text>
          </View>
          <TouchableOpacity
            className={`border px-3 py-2 rounded-xl ${
              isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/60 border-gold-bright/40'
            }`}
            onPress={() => Alert.alert('Trainer Code', `Share your code with clients: ${trainerCode}`)}
          >
            <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Copy Code</Text>
          </TouchableOpacity>
        </NeumorphicView>
      ) : null}

      {/* Client Notifications */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-2">
          <Text className={`font-bold text-base ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
            Client Notifications ({attentionClients.length} Alerts)
          </Text>
          <TouchableOpacity onPress={() => router.push('/(trainer)/clients')}>
            <Text className={`text-xs font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>View Roster →</Text>
          </TouchableOpacity>
        </View>

        {attentionClients.length === 0 ? (
          <Text className={`text-xs ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
            All active clients are currently on track with their workout & nutrition targets!
          </Text>
        ) : (
          attentionClients.map((client) => (
            <View key={client.id} className={`py-1.5 border-b flex-row justify-between items-center ${
              isLight ? 'border-amber-200' : 'border-gold-bright/20'
            }`}>
              <Text className={`text-xs ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                • <Text className="font-bold">{client.name}</Text> needs attention ({client.calories_logged}/{client.calorie_target} kcal logged today).
              </Text>
            </View>
          ))
        )}
      </NeumorphicView>

      {/* Today's Nutrition Dashboard Overview */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <View className="flex-row justify-between items-center mb-3">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Client Roster Overview</Text>
          <NeumorphicButton title="+ Invite Client" variant="gold" size="sm" onPress={() => router.push('/(trainer)/clients')} />
        </View>
        <Text className={`text-xs mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          You currently have {clients.length} active clients paired.
        </Text>

        <View className="flex-row space-x-3">
          <TouchableOpacity className="flex-1" onPress={() => router.push('/(trainer)/clients')}>
            <NeumorphicView variant="inset" className="p-4 items-center">
              <Text className={`text-2xl font-black ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>{clients.length}</Text>
              <Text className={`text-[10px] font-bold uppercase mt-1 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                Total Clients
              </Text>
            </NeumorphicView>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1" onPress={() => router.push('/(trainer)/clients')}>
            <NeumorphicView variant="inset" className="p-4 items-center">
              <Text className="text-2xl font-black text-amber-500">{attentionClients.length}</Text>
              <Text className={`text-[10px] font-bold uppercase mt-1 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                Needs Attention
              </Text>
            </NeumorphicView>
          </TouchableOpacity>
        </View>
      </NeumorphicView>

      {/* Quick Action Plan Builder Banner */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          PROGRAMMING
        </Text>
        <Text className={`text-xl font-black mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Assign & Build Workout Plans
        </Text>
        <Text className={`text-xs mb-4 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
          Create custom training splits and assign them directly to your clients.
        </Text>
        
        <NeumorphicButton title="+ Build Custom Plan Template" variant="gold" onPress={() => router.push('/(trainer)/create-plan')} />
      </NeumorphicView>
    </ScrollView>
  );
}


