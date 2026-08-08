import React from 'react';
import { View, Text } from 'react-native';
import { NeumorphicView } from './NeumorphicView';

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
  const percentage = Math.min(100, Math.round((current / target) * 100)) || 0;

  return (
    <NeumorphicView variant="extruded" className="flex-1 p-3.5 m-1">
      <Text className="text-[11px] text-sage font-semibold uppercase tracking-wider mb-1">{label}</Text>
      <Text className="text-base font-bold text-white">
        {current} <Text className="text-xs font-normal text-sage-light">/ {target}{unit}</Text>
      </Text>
      <View className="h-2 w-full rounded-full bg-deepGreen-inset mt-2.5 overflow-hidden border border-deepGreen-border">
        <View
          className={`h-full ${colorBar} rounded-full`}
          style={{ width: `${percentage}%` }}
        />
      </View>
    </NeumorphicView>
  );
};

