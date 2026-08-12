import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from 'react-native';
import { usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../store/authStore';
import { useTheme } from '../lib/theme';

interface HeaderBarProps {
  onOpenSettings: () => void;
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ onOpenSettings, title }) => {
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const pathname = usePathname();
  const theme = useTheme();

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
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.headerBg,
          borderBottomColor: theme.navBorder,
        },
      ]}
    >
      {/* LEFT: PROFILE AVATAR */}
      <View style={styles.leftSection}>
        <View style={styles.avatarTouchable}>
          {profile?.avatarUrl ? (
            <Image
              source={{ uri: profile.avatarUrl }}
              style={[
                styles.avatarImage,
                { borderColor: theme.isDark ? theme.accentGold : theme.primary },
              ]}
            />
          ) : (
            <View
              style={[
                styles.avatar,
                {
                  backgroundColor:
                    role === 'TRAINER'
                      ? theme.accentGold
                      : theme.isDark
                        ? theme.accentGreen
                        : theme.primary,
                },
              ]}
            >
              <Text style={styles.avatarText}>{fullName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* CENTER: DYNAMIC TITLE */}
      <View style={styles.centerSection}>
        <Text style={[styles.greetingText, { color: theme.text }]} numberOfLines={1}>
          {displayTitle}
        </Text>
      </View>

      {/* RIGHT: HAMBURGER MENU */}
      <View style={styles.rightSection}>
        <TouchableOpacity
          style={[
            styles.menuButton,
            {
              backgroundColor: theme.cardInner,
              borderColor: theme.border,
            },
          ]}
          onPress={onOpenSettings}
          activeOpacity={0.7}
        >
          <Ionicons name="menu-outline" size={22} color={theme.text} />
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
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  leftSection: {
    width: 40,
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
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  menuButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
