import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTrainerStore } from '@/features/trainer/presentation/trainerStore';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { fetchUserProfileData } from '@/features/auth/data/authService';
import { AppHeader } from '@/core/presentation/components/AppHeader';
import { NeumorphicView } from '@/core/presentation/components/NeumorphicView';
import { NeumorphicButton } from '@/core/presentation/components/NeumorphicButton';
import { useRouter, useFocusEffect } from 'expo-router';

export default function TrainerDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { clients, notifications, fetchClients, fetchNotifications } = useTrainerStore();
  const { user, userName } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const [trainerCode, setTrainerCode] = useState<string>('');

  useFocusEffect(
    React.useCallback(() => {
      if (user?.id) {
        fetchClients(user.id);
        fetchNotifications(user.id);
        fetchUserProfileData(user.id).then((p) => {
          if (p?.trainer_code) {
            setTrainerCode(p.trainer_code);
          }
        });
      }
    }, [user?.id])
  );

  const formatNotificationTime = (rawDate?: string) => {
    if (!rawDate) return 'Today';
    if (['Today', 'Recently', 'Yesterday'].includes(rawDate)) return rawDate;
    try {
      const iso = rawDate.includes('T') ? rawDate : rawDate.replace(' ', 'T');
      const d = new Date(iso);
      if (isNaN(d.getTime())) return 'Today';
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Today';
    }
  };

  const attentionClients = clients.filter((c) => c.status_badge === 'needs_attention');
  const greetingName = userName || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Trainer';

  const todayDateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toUpperCase();

  return (
    <ScrollView
      className={`flex-1 px-6 py-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <AppHeader title="Trainer Dashboard" />

      {/* Greeting & Date Header */}
      <View className="mb-6">
        <Text className={`text-3xl font-black mb-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Hey {greetingName}!
        </Text>
        <Text className={`text-xs font-mono font-bold tracking-widest ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          {todayDateStr}
        </Text>
      </View>

      {/* 1. KPIs Bento Grid */}
      <View className="flex-row space-x-3 mb-6">
        <TouchableOpacity className="flex-1" onPress={() => router.push('/(trainer)/clients')}>
          <NeumorphicView variant="extruded" className="p-4 items-center rounded-2xl">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
              Total Clients
            </Text>
            <Text className={`text-3xl font-black font-mono ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              {clients.length}
            </Text>
          </NeumorphicView>
        </TouchableOpacity>

        <TouchableOpacity className="flex-1" onPress={() => router.push('/(trainer)/clients')}>
          <NeumorphicView variant="goldAccent" className="p-4 items-center rounded-2xl">
            <Text className={`text-xs font-bold uppercase tracking-wider mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              Action Required
            </Text>
            <Text className="text-3xl font-black font-mono text-amber-500">
              {attentionClients.length}
            </Text>
          </NeumorphicView>
        </TouchableOpacity>
      </View>

      {/* 2. Trainer Code Sharing Banner */}
      {trainerCode ? (
        <NeumorphicView variant="goldAccent" className="p-4 mb-6 rounded-2xl flex-row justify-between items-center">
          <View>
            <Text className={`text-[10px] font-bold uppercase tracking-widest ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
              Your Unique Trainer Code
            </Text>
            <Text className={`text-2xl font-black font-mono mt-0.5 tracking-widest ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {trainerCode}
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

      {/* 3. Live Client Activity Stream */}
      <NeumorphicView variant="extruded" className="p-5 mb-6 rounded-2xl">
        <View className="flex-row justify-between items-center mb-3 border-b border-deepGreen-border pb-2">
          <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
            Client Activity Stream
          </Text>
          <TouchableOpacity onPress={() => user?.id && fetchNotifications(user.id)}>
            <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Refresh 🔄</Text>
          </TouchableOpacity>
        </View>

        {notifications.length === 0 ? (
          <Text className={`text-xs py-2 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
            No recent activity notifications from your clients yet.
          </Text>
        ) : (
          notifications.slice(0, 5).map((item) => (
            <TouchableOpacity
              key={item.id}
              className={`py-2.5 px-3 mb-2 rounded-xl border flex-row justify-between items-center ${
                isLight ? 'bg-white border-slate-200' : 'bg-deepGreen-elevated border-deepGreen-border'
              }`}
              onPress={() => router.push('/(trainer)/clients')}
            >
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                  {item.title}
                </Text>
                <Text className={`text-[11px] mt-0.5 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                  {item.message}
                </Text>
              </View>
              <Text className={`text-[10px] font-mono font-semibold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                {formatNotificationTime(item.created_at)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </NeumorphicView>

      {/* 4. Quick Action Programming Banner */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6 rounded-2xl">
        <Text className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
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


