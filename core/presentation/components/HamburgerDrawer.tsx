import React from 'react';
import { View, Text, TouchableOpacity, Modal, Switch, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useThemeStore } from '@/core/presentation/theme/themeStore';
import { useAuthStore } from '@/features/auth/presentation/authStore';
import { useRouter } from 'expo-router';
import { run3MonthDataCleanup } from '@/features/trainer/data/dataCleanupService';
import { purgeUserData } from '@/features/auth/data/authService';
import { NeumorphicView } from './NeumorphicView';
import { NeumorphicButton } from './NeumorphicButton';

interface HamburgerDrawerProps {
  visible: boolean;
  onClose: () => void;
}

export function HamburgerDrawer({ visible, onClose }: HamburgerDrawerProps) {
  const { theme, toggleTheme } = useThemeStore();
  const { role, setRole, signOut, user, userName } = useAuthStore();
  const router = useRouter();

  const handleOpenCalendar = () => {
    onClose();
    router.push('/calendar');
  };

  const handleSwitchRole = async () => {
    const newRole = role === 'trainer' ? 'client' : 'trainer';
    await setRole(newRole);
    onClose();
    Alert.alert('Role Updated 🔄', `Switched to ${newRole === 'trainer' ? 'Trainer' : 'Client / User'} mode.`);
    if (newRole === 'trainer') {
      router.replace('/(trainer)');
    } else {
      router.replace('/(client)');
    }
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

  const isLight = theme === 'light';
  const iconColor = isLight ? '#8B6E14' : '#E5C158';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        className="flex-1 bg-black/70 justify-center items-end"
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          className={`w-4/5 max-w-xs h-full border-l p-6 justify-between ${
            isLight ? 'bg-[#F8FAF8] border-slate-200' : 'bg-[#0A1913] border-[#1C4033]'
          }`}
        >
          <View>
            <View className="flex-row justify-between items-center mb-6 pt-6">
              <View>
                <Text className={`text-2xl font-black tracking-wide ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                  Trainr
                </Text>
                <Text className={`text-xs font-bold uppercase tracking-widest mt-0.5 ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                  Menu & Settings
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Feather name="x" size={22} color={isLight ? '#0F291E' : '#E5C158'} />
              </TouchableOpacity>
            </View>

            {/* Account Info */}
            <NeumorphicView variant="inset" className="p-4 mb-6">
              <Text className={`text-xs font-medium ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Signed in as</Text>
              <Text className={`text-base font-bold mb-0.5 ${isLight ? 'text-[#0F291E]' : 'text-white'}`} numberOfLines={1}>
                {userName || user?.email?.split('@')[0] || 'User'}
              </Text>
              <Text className={`text-xs mb-2 ${isLight ? 'text-slate-500' : 'text-sage-light'}`} numberOfLines={1}>
                {user?.email}
              </Text>
              <View className={`px-2.5 py-0.5 rounded self-start border ${
                isLight ? 'bg-amber-100 border-amber-300' : 'bg-gold-dark/40 border-gold-bright/30'
              }`}>
                <Text className={`text-xs font-black uppercase ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>
                  Role: {role === 'trainer' ? 'Trainer' : 'User / Client'}
                </Text>
              </View>
            </NeumorphicView>

            {/* Menu Items */}
            <View className="space-y-4">
              {/* Dark / Light Mode Switch */}
              <View className={`flex-row justify-between items-center py-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}>
                <View className="flex-row items-center space-x-3">
                  <Feather name={theme === 'dark' ? 'moon' : 'sun'} size={18} color={iconColor} />
                  <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                    {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                  </Text>
                </View>
                <Switch
                  value={theme === 'dark'}
                  onValueChange={toggleTheme}
                  trackColor={{ false: '#CBD5E1', true: '#C5A028' }}
                  thumbColor={theme === 'dark' ? '#0A1913' : '#FFFFFF'}
                />
              </View>

              {/* Calendar Button */}
              <TouchableOpacity
                onPress={handleOpenCalendar}
                className={`flex-row justify-between items-center py-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}
              >
                <View className="flex-row items-center space-x-3">
                  <Feather name="calendar" size={18} color={iconColor} />
                  <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Calendar</Text>
                </View>
                <Feather name="chevron-right" size={16} color={isLight ? '#476355' : '#E5C158'} />
              </TouchableOpacity>

              {/* Account Options: Role Switch */}
              <TouchableOpacity
                onPress={handleSwitchRole}
                className={`flex-row justify-between items-center py-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}
              >
                <View className="flex-row items-center space-x-3">
                  <Feather name="repeat" size={18} color={iconColor} />
                  <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>
                    Switch to {role === 'trainer' ? 'Client Mode' : 'Trainer Mode'}
                  </Text>
                </View>
                <Text className={`text-xs font-bold ${isLight ? 'text-[#8B6E14]' : 'text-gold-light'}`}>Change</Text>
              </TouchableOpacity>

              {/* Data Storage Cleanup */}
              <TouchableOpacity
                onPress={handleRunCleanup}
                className={`flex-row justify-between items-center py-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}
              >
                <View className="flex-row items-center space-x-3">
                  <Feather name="archive" size={18} color={iconColor} />
                  <Text className={`text-base font-bold ${isLight ? 'text-[#0F291E]' : 'text-white'}`}>Clean 90+ Day Storage</Text>
                </View>
                <Text className={`text-xs ${isLight ? 'text-[#476355]' : 'text-sage'}`}>Purge</Text>
              </TouchableOpacity>

              {/* Account Options: Delete Account Button */}
              <TouchableOpacity
                onPress={handleDeleteAccount}
                className={`flex-row justify-between items-center py-3 border-b ${isLight ? 'border-slate-200' : 'border-deepGreen-border'}`}
              >
                <View className="flex-row items-center space-x-3">
                  <Feather name="trash-2" size={18} color="#EF4444" />
                  <Text className="text-base font-bold text-red-500">Delete Account</Text>
                </View>
                <Text className="text-red-500 text-xs font-bold">Purge All</Text>
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


