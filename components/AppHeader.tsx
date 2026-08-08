import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { HamburgerDrawer } from '@/components/HamburgerDrawer';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AppHeader({ title = 'Trainr', subtitle }: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <View className="flex-row justify-between items-center mb-6 pt-2">
        <View className="flex-row items-center gap-3">
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 36, height: 36, borderRadius: 10 }}
            resizeMode="cover"
          />
          <View>
            <Text className="text-2xl font-black text-white tracking-wide">{title}</Text>
            {subtitle ? (
              <Text className="text-xs text-sage font-medium tracking-wide">{subtitle}</Text>
            ) : null}
          </View>
        </View>

        {/* Hamburger Menu Button */}
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          className="p-2.5 bg-deepGreen-elevated rounded-xl border border-deepGreen-border items-center justify-center"
          activeOpacity={0.7}
        >
          <Text className="text-xl leading-none text-gold-light">☰</Text>
        </TouchableOpacity>
      </View>

      <HamburgerDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
