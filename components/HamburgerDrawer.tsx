import React from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/store/themeStore';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'expo-router';
import { run3MonthDataCleanup } from '@/services/dataCleanupService';
import { purgeUserData } from '@/services/authService';
import { NeumorphicView } from '@/components/NeumorphicView';
import { NeumorphicButton } from '@/components/NeumorphicButton';

interface HamburgerDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function HamburgerDrawer({ visible, onClose }: HamburgerDrawerProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { role, setRole, signOut, user } = useAuthStore();
  const router = useRouter();

  const handleOpenCalendar = () => {
    onClose();
    router.push('/calendar');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? All your metrics, photos, workouts, and trainer links will be permanently lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed to Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation ⚠️',
              'This action cannot be undone. Are you absolutely certain you want to permanently purge your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Permanently Delete Account',
                  style: 'destructive',
                  onPress: async () => {
                    if (user?.id) {
                      onClose();
                      const res = await purgeUserData(user.id);
                      if (res.success) {
                        signOut();
                        router.replace('/(auth)/welcome');
                      } else {
                        Alert.alert('Error', res.error || 'Failed to delete account.');
                      }
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleRunCleanup = async () => {
    Alert.alert(
      'Database Storage Cleanup',
      'Clean unstarred progress photos, old meal logs, and completed workouts older than 90 days?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clean Now',
          style: 'destructive',
          onPress: async () => {
            const res = await run3MonthDataCleanup();
            Alert.alert('Data Retention Cleanup', res.message);
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/70 justify-center items-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="w-4/5 max-w-xs h-full bg-[#0A1913] border-l border-[#1C4033] p-6 justify-between"
        >
          <View>
            <View className="flex-row justify-between items-center mb-6 pt-6">
              <View>
                <Text className="text-2xl font-black text-white tracking-wide">Trainr</Text>
                <Text className="text-[10px] text-gold-light font-bold uppercase tracking-widest mt-0.5">
                  Menu & Settings
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Text className="text-sage font-bold text-lg">✕</Text>
              </TouchableOpacity>
            </View>

            {/* Account Info */}
            <NeumorphicView variant="inset" className="p-4 mb-6">
              <Text className="text-xs text-sage font-medium">Signed in as</Text>
              <Text className="text-sm font-bold text-white mb-1" numberOfLines={1}>{user?.email || 'User'}</Text>
              <View className="bg-gold-dark/40 px-2.5 py-0.5 rounded self-start border border-gold-bright/30">
                <Text className="text-[10px] text-gold-light font-black uppercase">
                  Role: {role === 'trainer' ? 'Trainer' : 'User / Client'}
                </Text>
              </View>
            </NeumorphicView>

            {/* Menu Items */}
            <View className="space-y-4">
              {/* Dark / Light Mode Switch */}
              <View className="flex-row justify-between items-center py-3 border-b border-deepGreen-border">
                <View className="flex-row items-center space-x-3">
                  <Ionicons name={theme === 'dark' ? 'moon-outline' : 'sunny-outline'} size={20} color="#E5C158" />
                  <Text className="text-sm font-bold text-white">
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#3B594C', true: '#E5C158' }}
                  thumbColor={theme === 'dark' ? '#0A1913' : '#FFFFFF'}
                />
              </View>

              {/* Calendar Button */}
              <TouchableOpacity
                onPress={handleOpenCalendar}
                className="flex-row justify-between items-center py-3 border-b border-deepGreen-border"
              >
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="calendar-outline" size={20} color="#E5C158" />
                  <Text className="text-sm font-bold text-white">History Calendar</Text>
                </View>
                <Text className="text-sage text-xs">→</Text>
              </TouchableOpacity>

              {/* Data Storage Cleanup */}
              <TouchableOpacity
                onPress={handleRunCleanup}
                className="flex-row justify-between items-center py-3 border-b border-deepGreen-border"
              >
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="trash-outline" size={20} color="#E5C158" />
                  <Text className="text-sm font-bold text-white">Clean 90+ Day Storage</Text>
                </View>
                <Text className="text-sage text-xs">Purge</Text>
              </TouchableOpacity>

              {/* Delete Account Button */}
              <TouchableOpacity
                onPress={handleDeleteAccount}
                className="flex-row justify-between items-center py-3 border-b border-deepGreen-border"
              >
                <View className="flex-row items-center space-x-3">
                  <Ionicons name="alert-circle-outline" size={20} color="#EF4444" />
                  <Text className="text-sm font-bold text-red-400">Delete Account</Text>
                </View>
                <Text className="text-red-400 text-xs font-bold">Purge All</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer Sign Out */}
          <View className="mb-6">
            <NeumorphicButton
              title="Sign Out"
              variant="green"
              className="w-full"
              onPress={() => {
                onClose();
                signOut();
              }}
            />
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}
