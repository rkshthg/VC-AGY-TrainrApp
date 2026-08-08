import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/authStore';
import { fetchUserProfileData, acceptClientInvite } from '@/services/authService';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';
import { NeumorphicInput } from '@/components/NeumorphicInput';

import { useRouter } from 'expo-router';

export default function RoleSelection() {
  const router = useRouter();
  const { setRole, setOnboardingCompleted, user } = useAuthStore();
  const insets = useSafeAreaInsets();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const checkExistingOnboarding = async (targetRole: 'trainer' | 'client') => {
    if (user?.id) {
      const profile = await fetchUserProfileData(user.id);
      if (profile?.onboarding_completed) {
        setOnboardingCompleted(true);
        if (targetRole === 'trainer') {
          router.replace('/(trainer)');
        } else {
          router.replace('/(client)');
        }
        return true;
      }
    }
    return false;
  };

  const handleSelectTrainer = async () => {
    setIsSubmitting(true);
    await setRole('trainer');
    const isCompleted = await checkExistingOnboarding('trainer');
    setIsSubmitting(false);
    if (!isCompleted) {
      router.replace('/(auth)/onboarding');
    }
  };

  const handleSelectClientPrompt = async () => {
    setIsSubmitting(true);
    await setRole('client');
    const isCompleted = await checkExistingOnboarding('client');
    setIsSubmitting(false);
    if (!isCompleted) {
      router.replace('/(auth)/onboarding');
    }
  };

  return (
    <View
      className="flex-1 items-center justify-center bg-deepGreen p-6"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="w-full max-w-sm">
        <Text className="text-3xl font-black text-white text-center mb-2">Welcome to Trainr</Text>
        <Text className="text-xs text-sage text-center mb-8">
          Choose your account type to customize your workspace dashboard.
        </Text>
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSelectTrainer}
          className="mb-4"
          disabled={isSubmitting}
        >
          <NeumorphicView variant="goldAccent" className="p-6">
            <Text className="text-gold-light font-bold text-xl mb-1.5">I'm a Trainer</Text>
            <Text className="text-xs text-sage leading-5">
              Build custom client workout routines, monitor macro targets, & manage your roster.
            </Text>
          </NeumorphicView>
        </TouchableOpacity>
        
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleSelectClientPrompt}
          className="mb-6"
          disabled={isSubmitting}
        >
          <NeumorphicView variant="extruded" className="p-6">
            <Text className="text-white font-bold text-xl mb-1.5">I'm a Client / Athlete</Text>
            <Text className="text-sage text-xs leading-5">
              Log meals using AI photo scanning, track workouts & PRs, and message your personal coach.
            </Text>
          </NeumorphicView>
        </TouchableOpacity>
      </View>

      {isSubmitting && (
        <View className="absolute inset-0 bg-black/60 items-center justify-center">
          <ActivityIndicator size="large" color="#E5C158" />
        </View>
      )}
    </View>
  );
}



