import React from 'react';
import { View, Text } from 'react-native';

interface StatusBadgeProps {
  status: 'on_track' | 'needs_attention' | 'off_track' | 'no_data';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = {
    on_track: {
      bg: 'bg-emerald-950/60 border-emerald-500/40',
      dot: 'bg-emerald-400',
      text: 'text-emerald-400',
      label: 'On Track',
    },
    needs_attention: {
      bg: 'bg-amber-950/60 border-gold-light/40',
      dot: 'bg-gold-light',
      text: 'text-gold-light',
      label: 'Needs Attention',
    },
    off_track: {
      bg: 'bg-rose-950/60 border-rose-500/40',
      dot: 'bg-rose-400',
      text: 'text-rose-400',
      label: 'Off Track',
    },
    no_data: {
      bg: 'bg-deepGreen-inset border-deepGreen-border',
      dot: 'bg-sage',
      text: 'text-sage',
      label: 'No Data',
    },
  };

  const style = config[status] || config.no_data;

  return (
    <View className={`px-3 py-1 rounded-full border ${style.bg} flex-row items-center space-x-1.5 shadow-sm`}>
      <View className={`w-2 h-2 rounded-full ${style.dot} mr-1.5`} />
      <Text className={`text-xs font-semibold ${style.text}`}>{style.label}</Text>
    </View>
  );
};
