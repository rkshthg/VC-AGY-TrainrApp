import React from 'react';
import { TouchableOpacity, Text, TouchableOpacityProps, StyleSheet, Platform, View } from 'react-native';

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
  const getVariantStyles = () => {
    switch (variant) {
      case 'green':
        return { container: styles.btnGreen, text: styles.textGreen };
      case 'outline':
        return { container: styles.btnOutline, text: styles.textOutline };
      case 'danger':
        return { container: styles.btnDanger, text: styles.textDanger };
      case 'gold':
      default:
        return { container: styles.btnGold, text: styles.textGold };
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
  btnGold: {
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
        boxShadow: '0px 4px 14px rgba(229, 193, 88, 0.4), 3px 3px 8px #040A07',
      },
    }),
  },
  textGold: {
    color: '#0A1913',
    fontWeight: '700',
  },
  btnGreen: {
    backgroundColor: '#18362B',
    borderWidth: 1,
    borderColor: '#D4AF3760',
    ...Platform.select({
      ios: {
        shadowColor: '#040A07',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 0.7,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '4px 4px 10px #040A07, -3px -3px 8px #224D3E',
      },
    }),
  },
  textGreen: {
    color: '#E5C158',
    fontWeight: '600',
  },
  btnOutline: {
    backgroundColor: '#0E2119',
    borderWidth: 1.5,
    borderColor: '#E5C158',
  },
  textOutline: {
    color: '#E5C158',
    fontWeight: '600',
  },
  btnDanger: {
    backgroundColor: '#2A1215',
    borderWidth: 1,
    borderColor: '#EF444460',
  },
  textDanger: {
    color: '#F87171',
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
