import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, StyleSheet, Platform, View } from 'react-native';
import { useThemeStore } from '@/core/presentation/theme/themeStore';

export interface NeumorphicButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'gold' | 'green' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  className?: string;
}

export const NeumorphicButton: React.FC<NeumorphicButtonProps> = ({
  title,
  variant = 'gold',
  size = 'md',
  icon,
  className = '',
  style,
  disabled,
  ...props
}) => {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  const getVariantStyles = () => {
    if (isLight) {
      switch (variant) {
        case 'green':
          return { container: styles.btnGreenLight, text: styles.textGreenLight };
        case 'outline':
          return { container: styles.btnOutlineLight, text: styles.textOutlineLight };
        case 'danger':
          return { container: styles.btnDangerLight, text: styles.textDangerLight };
        case 'gold':
        default:
          return { container: styles.btnGoldLight, text: styles.textGoldLight };
      }
    } else {
      switch (variant) {
        case 'green':
          return { container: styles.btnGreenDark, text: styles.textGreenDark };
        case 'outline':
          return { container: styles.btnOutlineDark, text: styles.textOutlineDark };
        case 'danger':
          return { container: styles.btnDangerDark, text: styles.textDangerDark };
        case 'gold':
        default:
          return { container: styles.btnGoldDark, text: styles.textGoldDark };
      }
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { container: styles.sizeSm, text: styles.textSm };
      case 'lg':
        return { container: styles.sizeLg, text: styles.textLg };
      case 'md':
      default:
        return { container: styles.sizeMd, text: styles.textMd };
    }
  };

  const variantStyle = getVariantStyles();
  const sizeStyle = getSizeStyles();

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      disabled={disabled}
      style={[
        styles.base,
        variantStyle.container,
        sizeStyle.container,
        disabled && styles.disabled,
        style,
      ]}
      className={className}
      {...props}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text style={[styles.textBase, variantStyle.text, sizeStyle.text]}>{title}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  sizeSm: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    minHeight: 38,
  },
  sizeMd: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    minHeight: 48,
  },
  sizeLg: {
    paddingVertical: 16,
    paddingHorizontal: 26,
    minHeight: 56,
  },

  // Dark Theme Button Styles
  btnGoldDark: {
    backgroundColor: '#E5C158',
    borderWidth: 1,
    borderColor: '#F5D77F',
    ...Platform.select({
      ios: {
        shadowColor: '#E5C158',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0px 4px 14px rgba(229, 193, 88, 0.4)',
      },
    }),
  },
  textGoldDark: {
    color: '#0A1913',
    fontWeight: '700',
  },
  btnGreenDark: {
    backgroundColor: '#18362B',
    borderWidth: 1,
    borderColor: '#D4AF3760',
  },
  textGreenDark: {
    color: '#E5C158',
    fontWeight: '600',
  },
  btnOutlineDark: {
    backgroundColor: '#0E2119',
    borderWidth: 1.5,
    borderColor: '#E5C158',
  },
  textOutlineDark: {
    color: '#E5C158',
    fontWeight: '600',
  },
  btnDangerDark: {
    backgroundColor: '#2A1215',
    borderWidth: 1,
    borderColor: '#EF444460',
  },
  textDangerDark: {
    color: '#F87171',
    fontWeight: '600',
  },

  // Light Theme Button Styles (Concept 3 Executive)
  btnGoldLight: {
    backgroundColor: '#0F291E',
    borderWidth: 1,
    borderColor: '#D4AF37',
    ...Platform.select({
      ios: {
        shadowColor: '#0F291E',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0px 4px 12px rgba(15, 41, 30, 0.2)',
      },
    }),
  },
  textGoldLight: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  btnGreenLight: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  textGreenLight: {
    color: '#0F291E',
    fontWeight: '600',
  },
  btnOutlineLight: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#0F291E',
  },
  textOutlineLight: {
    color: '#0F291E',
    fontWeight: '600',
  },
  btnDangerLight: {
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  textDangerLight: {
    color: '#DC2626',
    fontWeight: '600',
  },

  textBase: {
    textAlign: 'center',
  },
  textSm: {
    fontSize: 13,
  },
  textMd: {
    fontSize: 15,
  },
  textLg: {
    fontSize: 17,
  },
  iconContainer: {
    marginRight: 8,
  },
  disabled: {
    opacity: 0.5,
  },
});

