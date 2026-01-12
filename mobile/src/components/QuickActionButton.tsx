import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface QuickActionButtonProps {
  icon: string;
  label: string;
  sublabel: string;
  disabled?: boolean;
  onPress: () => void;
  variant?: 'default' | 'success' | 'warning';
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ 
  icon, 
  label, 
  sublabel, 
  disabled = false, 
  onPress,
  variant = 'default',
}) => {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const styles = createStyles(colors);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 400 });
    iconScale.value = withSequence(
      withTiming(1.3, { duration: 100 }),
      withSpring(1, { damping: 8 })
    );
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10, stiffness: 300 });
  };

  const variantColors = {
    default: colors.primary,
    success: colors.success,
    warning: colors.warning,
  };

  const accentColor = variantColors[variant];

  return (
    <AnimatedTouchable 
      style={[
        styles.container, 
        disabled && styles.containerDisabled,
        animatedContainerStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      {/* Top glow accent */}
      <View style={[styles.topAccent, { backgroundColor: accentColor }]} />
      
      {/* Icon */}
      <Animated.Text style={[styles.icon, animatedIconStyle]}>{icon}</Animated.Text>
      
      {/* Label */}
      <Text style={[styles.label, disabled && styles.labelDisabled]}>{label}</Text>
      
      {/* Sublabel badge */}
      <View style={[
        styles.sublabelBadge, 
        disabled && styles.sublabelBadgeDisabled,
        { backgroundColor: disabled ? colors.backgroundSecondary : `${accentColor}20` }
      ]}>
        <Text style={[
          styles.sublabel, 
          disabled ? styles.sublabelDisabled : { color: accentColor }
        ]}>
          {sublabel}
        </Text>
      </View>
    </AnimatedTouchable>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    paddingTop: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  containerDisabled: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  topAccent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  icon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  labelDisabled: {
    color: colors.textMuted,
  },
  sublabelBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  sublabelBadgeDisabled: {
    backgroundColor: colors.backgroundSecondary,
  },
  sublabel: {
    ...typography.micro,
    fontWeight: '700',
  },
  sublabelDisabled: {
    color: colors.textMuted,
  },
});

export default QuickActionButton;
