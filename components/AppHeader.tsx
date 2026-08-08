import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { HamburgerDrawer } from '@/components/HamburgerDrawer';
import { useThemeStore } from '@/store/themeStore';

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
}

export function AppHeader({ title = 'Trainr', subtitle }: AppHeaderProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

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
            <Text className={`text-2xl font-black tracking-wide ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
              {title}
            </Text>
            {subtitle ? (
              <Text className={`text-xs font-medium tracking-wide ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {/* Hamburger Menu Button */}
        <TouchableOpacity
          onPress={() => setDrawerOpen(true)}
          className={`p-2.5 rounded-xl items-center justify-center border ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-deepGreen-elevated border-deepGreen-border'
          }`}
          activeOpacity={0.7}
        >
          <Text className={`text-xl leading-none ${isLight ? 'text-[#0F291E]' : 'text-gold-light'}`}>☰</Text>
        </TouchableOpacity>
      </View>

      <HamburgerDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

