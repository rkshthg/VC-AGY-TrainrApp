import { useColorScheme } from 'react-native';
import { useAuthStore } from '../store/authStore';

export interface ThemeColors {
  isDark: boolean;
  bg: string;
  card: string;
  cardInner: string;
  cardAlt: string;
  primary: string;
  primaryLight: string;
  secondary: string;
  accentGold: string;
  accentGreen: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  borderGold: string;
  inputBg: string;
  inputBorder: string;
  tabBarBg: string;
  headerBg: string;
  navBorder: string;
  badgeBg: string;
  badgeText: string;
  success: string;
  warning: string;
  danger: string;
  dangerBg: string;
  dangerBorder: string;
  macroProtein: string;
  macroCarbs: string;
  macroFat: string;
  macroRemaining: string;
  shadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  shadowButton: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const lightTheme: ThemeColors = {
  isDark: false,
  bg: '#F9F6F0',
  card: '#FFFFFF',
  cardInner: '#F3ECE1',
  cardAlt: '#ECE4D8',
  primary: '#1B4332',
  primaryLight: '#2D6A4F',
  secondary: '#C5A059',
  accentGold: '#B8860B',
  accentGreen: '#2D6A4F',
  text: '#1A1A1A',
  textSecondary: '#5A6B5C',
  textMuted: '#8A998C',
  border: '#E2DBD0',
  borderStrong: '#D0C6B8',
  borderGold: '#D4AF3766',
  inputBg: '#F3ECE1',
  inputBorder: '#D8D0C5',
  tabBarBg: '#FFFFFF',
  headerBg: '#FFFFFF',
  navBorder: '#E6E0D6',
  badgeBg: '#E8F3EE',
  badgeText: '#1B4332',
  success: '#2D6A4F',
  warning: '#D97706',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  dangerBorder: '#FCA5A5',
  macroProtein: '#2563EB',
  macroCarbs: '#9333EA',
  macroFat: '#D97706',
  macroRemaining: '#E2DBD0',
  shadow: {
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 3,
  },
  shadowButton: {
    shadowColor: '#1B4332',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 6,
    elevation: 2,
  },
};

export const darkTheme: ThemeColors = {
  isDark: true,
  bg: '#0A1A12',
  card: '#132A1E',
  cardInner: '#0D2016',
  cardAlt: '#1A3628',
  primary: '#E5C158',
  primaryLight: '#F3D47A',
  secondary: '#40916C',
  accentGold: '#E5C158',
  accentGreen: '#40916C',
  text: '#F4F1EA',
  textSecondary: '#8FA89B',
  textMuted: '#637D71',
  border: 'rgba(229, 193, 88, 0.22)',
  borderStrong: 'rgba(229, 193, 88, 0.4)',
  borderGold: '#E5C15844',
  inputBg: '#0A1710',
  inputBorder: '#1F3F2E',
  tabBarBg: '#0A1A12',
  headerBg: '#0A1A12',
  navBorder: '#183324',
  badgeBg: '#1C3829',
  badgeText: '#E5C158',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerBg: '#2D1215',
  dangerBorder: '#EF444444',
  macroProtein: '#3B82F6',
  macroCarbs: '#A855F7',
  macroFat: '#F59E0B',
  macroRemaining: '#1E293B',
  shadow: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 14,
    elevation: 5,
  },
  shadowButton: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 3,
  },
};

export function useTheme(): ThemeColors {
  const themeMode = useAuthStore((state) => state.themeMode);
  const systemScheme = useColorScheme();

  if (themeMode === 'LIGHT') {
    return lightTheme;
  }
  if (themeMode === 'DARK') {
    return darkTheme;
  }
  // SYSTEM fallback
  return systemScheme === 'light' ? lightTheme : darkTheme;
}
