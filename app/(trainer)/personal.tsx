import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNutritionStore } from '@/store/nutritionStore';
import { useWorkoutStore } from '@/store/workoutStore';
import { useAuthStore } from '@/store/authStore';
import { fetchUserProfileData, linkClientToTrainerByCode, removeClientTrainerLink } from '@/services/authService';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

export default function TrainerPersonalModeScreen() {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
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
      className="flex-1 bg-deepGreen p-5"
      contentContainerStyle={{
        paddingTop: Math.max(insets.top, 20) + 10,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      }}
    >
      <View className="flex-row items-center space-x-2.5 mb-2">
        <Text className="text-2xl font-black text-white tracking-wide">My Self-Track</Text>
        <View className="bg-gold-muted border border-gold-border px-2.5 py-0.5 rounded-full">
          <Text className="text-[10px] font-bold text-gold-light">🔒 PRIVATE</Text>
        </View>
      </View>
      <Text className="text-xs text-sage mb-6">
        Your own personal fitness logging & mentor coach setup.
      </Text>

      {/* Coach Management Card */}
      {profile?.linked_trainer ? (
        <NeumorphicView variant="goldAccent" className="p-5 mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <View>
              <Text className="text-xs font-bold text-gold-light uppercase">My Coach / Mentor</Text>
              <Text className="text-xl font-black text-white mt-0.5">
                {profile.linked_trainer.full_name || profile.linked_trainer.email}
              </Text>
              <Text className="text-xs text-sage">{profile.linked_trainer.email}</Text>
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
          <Text className="text-base font-bold text-white mb-1">My Coach / Mentor</Text>
          <Text className="text-xs text-sage mb-3">
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
        <Text className="text-base font-bold text-white mb-2">Personal Nutrition Today</Text>
        <Text className="text-sm text-gold-light font-semibold mb-1">
          {totalCalories} / {target.calories} kcal
        </Text>
        <Text className="text-xs text-emerald-400 font-medium">Protein: {totalProtein} / {target.protein_g}g</Text>
      </NeumorphicView>

      {/* Personal PRs */}
      <NeumorphicView variant="extruded" className="p-5 mb-6">
        <Text className="text-base font-bold text-gold-light mb-3">My Personal Records (1RM)</Text>
        {Object.keys(historical1RMs).length === 0 ? (
          <Text className="text-xs text-sage">No personal records logged yet.</Text>
        ) : (
          Object.entries(historical1RMs).map(([exId, weight]) => {
            const ex = exercises.find((e) => e.id === exId);
            return (
              <View key={exId} className="flex-row justify-between py-2.5 border-b border-deepGreen-border">
                <Text className="text-xs font-semibold text-white">{ex?.name || exId}</Text>
                <Text className="text-xs font-bold text-gold-light">{weight} kg 1RM</Text>
              </View>
            );
          })
        )}
      </NeumorphicView>
    </ScrollView>
  );
}

