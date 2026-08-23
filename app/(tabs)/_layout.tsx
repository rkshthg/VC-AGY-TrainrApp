import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../lib/theme';
import { useScreenPrivacy } from '../../lib/useScreenPrivacy';

export default function TabLayout() {
  useScreenPrivacy();
  const role = useAuthStore((state) => state.role);
  const theme = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.tabBarBg,
          borderTopColor: theme.navBorder,
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 10,
          paddingTop: 8,
          ...theme.shadow,
        },
        tabBarActiveTintColor: theme.isDark ? theme.accentGold : theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => <Ionicons name="grid-outline" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Nutrition',
          tabBarIcon: ({ color }) => <Ionicons name="nutrition-outline" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color }) => <Ionicons name="barbell-outline" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="clients"
        options={{
          title: 'Clients',
          href: role === 'TRAINER' ? '/(tabs)/clients' : null,
          tabBarIcon: ({ color }) => <Ionicons name="people-outline" size={20} color={color} />,
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" size={20} color={color} />,
        }}
      />
    </Tabs>
  );
}
