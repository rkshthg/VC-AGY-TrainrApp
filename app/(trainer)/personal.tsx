import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNutritionStore } from '@/store/nutritionStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
import { useThemeStore } from '@/store/themeStore';
import { fetchUserProfileData, linkClientToTrainerByCode, removeClientTrainerLink } from '@/services/authService';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function TrainerPersonalModeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const { meals, target } = useNutritionStore();
  const { historical1RMs, exercises } = useWorkoutStore();

  const [profile, setProfile] = useState<any>(null);
  const [coachCodeInput, setCoachCodeInput] = useState('');
  const [linkingCoach, setLinkingCoach] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  const loadProfile = async () => {
    if (user?.id) {
      const data = await fetchUserProfileData(user.id);
      setProfile(data);
    }
  };

  const handleLinkCoach = async () => {
    if (!user?.id || !coachCodeInput.trim()) return;
    setLinkingCoach(true);
    const res = await linkClientToTrainerByCode(user.id, coachCodeInput);
    setLinkingCoach(false);
    if (res.success) {
      Alert.alert('Coach Linked! 🏋️', `You are now paired with coach ${res.trainerName}.`);
      setCoachCodeInput('');
      loadProfile();
    } else {
      Alert.alert('Trainer Code Error', res.error || 'Failed to link coach.');
    }
  };

  const handleRemoveCoach = async () => {
    Alert.alert(
      'Remove Coach',
      'Are you sure you want to remove your coach?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user?.id) return;
            setLinkingCoach(true);
            await removeClientTrainerLink(user.id);
            setLinkingCoach(false);
            Alert.alert('Coach Removed', 'Your coach link has been detached.');
            loadProfile();
          },
        },
      ]
    );
  };

  const totalCalories = meals.reduce((acc, m) => acc + m.calories, 0);
  const totalProtein = meals.reduce((acc, m) => acc + m.protein_g, 0);

  return (
    <ScrollView
      className={`flex-1 p-5 ${isLight ? 'bg-[#F8FAF8]' : 'bg-deepGreen'}`}
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <View className="flex-row items-center space-x-2.5 mb-2">
        <Text className={`text-2xl font-black tracking-wide ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          My Self-Track
        </Text>
        <View className={`px-2.5 py-0.5 rounded-full border ${
          isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-muted border-gold-border'
        }`}>
          <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>🔒 PRIVATE</Text>
        </View>
      </View>
      <Text className={`text-xs mb-6 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
        Your own personal fitness logging & mentor coach setup.
      </Text>

      {/* Coach Management Card */}
      {profile?.linked_trainer ? (
        <NeumorphicView variant="goldAccent" className="p-5 mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text className={`text-xs font-bold uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                My Coach / Mentor
              </Text>
              <Text className={`text-xl font-black mt-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                {profile.linked_trainer.full_name || profile.linked_trainer.email}
              </Text>
              <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>{profile.linked_trainer.email}</Text>
            </View>
            <NeumorphicButton
              title="Remove Coach"
              variant="green"
              size="sm"
              onPress={handleRemoveCoach}
              disabled={linkingCoach}
            />
          </View>
        </NeumorphicView>
      ) : (
        <NeumorphicView variant="extruded" className="p-5 mb-6">
          <Text className={`text-base font-bold mb-1 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
            My Coach / Mentor
          </Text>
          <Text className={`text-xs mb-3 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
            Being coached by a head trainer? Enter their Trainer Code below to pair accounts.
          </Text>
          <View className="flex-row space-x-3 items-end">
            <View className="flex-1">
              <NeumorphicInput
                label="Coach Trainer Code"
                placeholder="e.g. TR-8K92"
                value={coachCodeInput}
                onChangeText={setCoachCodeInput}
                autoCapitalize="characters"
              />
            </View>
            <NeumorphicButton
              title={linkingCoach ? 'Linking...' : '+ Add Coach'}
              variant="gold"
              size="sm"
              onPress={handleLinkCoach}
              disabled={linkingCoach || !coachCodeInput.trim()}
            />
          </View>
        </NeumorphicView>
      )}

      {/* Personal Nutrition */}
      <NeumorphicView variant="goldAccent" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-2 ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
          Personal Nutrition Today
        </Text>
        <Text className={`text-sm font-semibold mb-1 ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>
          {totalCalories} / {target.calories} kcal
        </Text>
        <Text className="text-xs text-emerald-500 font-medium">Protein: {totalProtein} / {target.protein_g}g</Text>
      </NeumorphicView>

      {/* Personal PRs */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className={`text-base font-bold mb-3 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
          My Personal Records (1RM)
        </Text>
        {Object.keys(historical1RMs).length === 0 ? (
          <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>No personal records logged yet.</Text>
        ) : (
          Object.entries(historical1RMs).map(([exId, weight]) => {
            const ex = exercises.find((e) => e.id === exId);
            return (
              <View key={exId} className={`flex-row justify-between py-2.5 border-b ${
                isLight ? 'border-slate-200' : 'border-deepGreen-border'
              }`}>
                <Text className={`text-xs font-semibold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>{ex?.name || exId}</Text>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#C5A028]' : 'text-gold-light'}`}>{weight} kg 1RM</Text>
              </View>
            );
          })
        )}
      </NeumorphicView>
    </ScrollView>
  );
}


