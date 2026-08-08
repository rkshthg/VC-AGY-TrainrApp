import React from 'react';
import { View, ViewProps, StyleSheet, Platform } from 'react-native';
import { useThemeStore } from '@/store/themeStore';

export interface NeumorphicViewProps extends ViewProps {
  variant?: 'extruded' | 'inset' | 'flat' | 'goldAccent';
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const NeumorphicView: React.FC<NeumorphicViewProps> = ({
  variant = 'extruded',
  glow = false,
  className = '',
  style,
  children,
  ...props
}) => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const getVariantStyles = () => {
    if (isLight) {
      switch (variant) {
        case 'inset':
          return styles.insetLight;
        case 'goldAccent':
          return styles.goldAccentLight;
        case 'flat':
          return styles.flatLight;
        case 'extruded':
        default:
          return styles.extrudedLight;
      }
    } else {
      switch (variant) {
        case 'inset':
          return styles.insetDark;
        case 'goldAccent':
          return styles.goldAccentDark;
        case 'flat':
          return styles.flatDark;
        case 'extruded':
        default:
          return styles.extrudedDark;
      }
    }
  };

  return (
    <View
      style={[
        styles.base,
        getVariantStyles(),
        glow && (isLight ? styles.glowBorderLight : styles.glowBorderDark),
        style,
      ]}
      className={className}
      {...props}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  // Dark Theme Styles
  extrudedDark: {
    backgroundColor: '#122920',
    borderWidth: 1,
    borderColor: '#1D4537',
    ...Platform.select({
      ios: {
        shadowColor: '#040A07',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '6px 6px 14px #040A07, -4px -4px 10px #1E4638',
      },
    }),
  },
  insetDark: {
    backgroundColor: '#08140F',
    borderWidth: 1,
    borderColor: '#0D201A',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 1, height: 2 },
        shadowOpacity: 0.5,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: 'inset 3px 3px 8px #040A07, inset -2px -2px 6px #1A3C2F',
      },
    }),
  },
  goldAccentDark: {
    backgroundColor: '#152C22',
    borderWidth: 1.5,
    borderColor: '#D4AF3770',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '5px 5px 12px #040A07, -3px -3px 8px #1E4638, 0px 0px 8px rgba(212, 175, 55, 0.25)',
      },
    }),
  },
  flatDark: {
    backgroundColor: '#10241C',
    borderWidth: 1,
    borderColor: '#16362B',
  },
  glowBorderDark: {
    borderColor: '#E5C158',
  },

  // Light Theme Styles (Concept 3 Executive Clean Light)
  extrudedLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      ios: {
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 16px rgba(100, 116, 139, 0.08)',
      },
    }),
  },
  insetLight: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  goldAccentLight: {
    backgroundColor: '#FCF9EE',
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    ...Platform.select({
      ios: {
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 14px rgba(212, 175, 55, 0.15)',
      },
    }),
  },
  flatLight: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  glowBorderLight: {
    borderColor: '#C5A028',
  },
});

