import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { usePathname } from 'expo-router';
import { useAuthStore } from '../store/authStore';

interface HeaderBarProps {
  onOpenSettings: () => void;
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenSettings, title }) => {
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const pathname = usePathname();

  const fullName = profile?.fullName ? profile.fullName.toUpperCase() : 'USER';
  const firstName = fullName.split(' ')[0] || 'USER';

  const getDynamicTitle = () => {
    if (title) return title;
    if (!pathname || pathname === '/' || pathname.includes('dashboard')) {
      return `HEY, ${firstName}!`;
    }
    if (pathname.includes('nutrition')) return 'NUTRITION';
    if (pathname.includes('workout')) return 'WORKOUT';
    if (pathname.includes('clients')) return 'CLIENT ROSTER';
    if (pathname.includes('profile')) return 'PROFILE';
    return `HEY, ${firstName}!`;
  };

  const displayTitle = getDynamicTitle();

  return (
    <View style={styles.container}>
      {/* LEFT: PROFILE AVATAR */}
      <View style={styles.leftSection}>
        <View style={styles.avatarTouchable}>
          {profile?.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatar, role === 'TRAINER' ? styles.avatarTrainer : styles.avatarClient]}>
              <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* CENTER: DYNAMIC TITLE */}
      <View style={styles.centerSection}>
        <Text style={styles.greetingText} numberOfLines={1}>
          {displayTitle}
        </Text>
      </View>

      {/* RIGHT: HAMBURGER MENU */}
      <View style={styles.rightSection}>
        <TouchableOpacity style={styles.menuButton} onPress={onOpenSettings} activeOpacity={0.7}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  leftSection: {
    width: 46,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  centerSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  avatarClient: {
    backgroundColor: '#10B981',
  },
  avatarTrainer: {
    backgroundColor: '#F59E0B',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  greetingText: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  rightSection: {
    width: 46,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
