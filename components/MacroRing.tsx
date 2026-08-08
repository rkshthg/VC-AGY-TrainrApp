import React from 'react';
import { View, Text } from 'react-native';
import { NeumorphicView } from './NeumorphicView';
import { useThemeStore } from '@/store/themeStore';

interface MacroRingProps {
  label: string;
  current: number;
  target: number;
  unit?: string;
  colorBg?: string;
  colorBar?: string;
}

export const MacroRing: React.FC<MacroRingProps> = ({
  label,
  current,
  target,
  unit = 'g',
  colorBar = 'bg-gold-light',
}) => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';
  const percentage = Math.min(100, Math.round((current / target) * 100)) || 0;

  return (
    <NeumorphicView variant="extruded" className="flex-1 p-3.5 m-1">
      <Text className={`text-[11px] font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-[#476355]' : 'text-sage'}`}>
        {label}
      </Text>
      <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
        {current} <Text className={`text-xs font-normal ${isLight ? 'text-slate-500' : 'text-sage-light'}`}>/ {target}{unit}</Text>
      </Text>
      <View className={`h-2 w-full rounded-full mt-2.5 overflow-hidden border ${
        isLight ? 'bg-slate-100 border-slate-200' : 'bg-deepGreen-inset border-deepGreen-border'
      }`}>
        <View
          className={`h-full ${colorBar} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </NeumorphicView>
  );
};


