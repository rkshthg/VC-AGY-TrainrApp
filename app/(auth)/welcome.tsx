import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';

export default function Welcome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-1 bg-deepGreen justify-between p-6"
      style={{ paddingTop: Math.max(insets.top, 24) + 16, paddingBottom: Math.max(insets.bottom, 20) + 16 }}
    >
      <View className="flex-1 justify-center items-center">
        <NeumorphicView variant="goldAccent" className="p-8 items-center w-full max-w-sm">
          <Text className="text-5xl font-black text-gold-light tracking-wider mb-2">TRAINR</Text>
          <Text className="text-sm font-semibold text-sage text-center uppercase tracking-widest mb-4">
            Elite Performance Coaching
          </Text>
          <Text className="text-xs text-sage-light text-center leading-relaxed">
            Elevate your training, AI nutrition scanning, and client management in one unified space.
          </Text>
        </NeumorphicView>
      </View>

      <View className="w-full space-y-4">
        <NeumorphicButton
          title="Sign In"
          variant="gold"
          size="lg"
          onPress={() => router.push('/(auth)/sign-in')}
        />
        <View className="mt-3">
          <NeumorphicButton
            title="Create Account"
            variant="green"
            size="lg"
            onPress={() => router.push('/(auth)/sign-up')}
          />
        </View>
      </View>
    </View>
  );
}

