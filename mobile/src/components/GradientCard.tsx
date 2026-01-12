import React, { useEffect } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
  Easing,
} from 'react-native-reanimated';
import { borderRadius, shadows } from '../utils/theme';

interface GradientCardProps {
  children: React.ReactNode;
  variant?: 'orange' | 'purple' | 'cyan' | 'fire' | 'gold';
  style?: ViewStyle;
  animated?: boolean;
  glowing?: boolean;
}

const gradientConfigs = {
  orange: { start: '#F7931A', end: '#FF6B35', glow: 'rgba(247, 147, 26, 0.4)' },
  purple: { start: '#A855F7', end: '#6366F1', glow: 'rgba(168, 85, 247, 0.4)' },
  cyan: { start: '#00D9FF', end: '#0EA5E9', glow: 'rgba(0, 217, 255, 0.4)' },
  fire: { start: '#F97316', end: '#EF4444', glow: 'rgba(249, 115, 22, 0.4)' },
  gold: { start: '#FBBF24', end: '#F59E0B', glow: 'rgba(251, 191, 36, 0.4)' },
};

const GradientCard: React.FC<GradientCardProps> = ({
  children,
  variant = 'orange',
  style,
  animated = true,
  glowing = true,
}) => {
  const shimmerProgress = useSharedValue(0);
  const glowPulse = useSharedValue(0);
  const config = gradientConfigs[variant];

  useEffect(() => {
    if (animated) {
      shimmerProgress.value = withRepeat(
        withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
    if (glowing) {
      glowPulse.value = withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [animated, glowing]);

  const animatedBackground = useAnimatedStyle(() => {
    const backgroundColor = interpolateColor(
      shimmerProgress.value,
      [0, 0.5, 1],
      [config.start, config.end, config.start]
    );
    return { backgroundColor };
  });

  const glowStyle = useAnimatedStyle(() => {
    return {
      shadowOpacity: 0.3 + glowPulse.value * 0.3,
      shadowRadius: 15 + glowPulse.value * 10,
    };
  });

  return (
    <Animated.View
      style={[
        styles.container,
        animatedBackground,
        glowing && [
          styles.glowBase,
          { shadowColor: config.start },
          glowStyle,
        ],
        style,
      ]}
    >
      {/* Shimmer overlay */}
      <View style={styles.shimmerOverlay} />
      
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} />
      <View style={[styles.decorCircle, styles.decorCircle2]} />
      
      {/* Content */}
      <View style={styles.content}>{children}</View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    position: 'relative',
  },
  glowBase: {
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  shimmerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  decorCircle1: {
    width: 150,
    height: 150,
    top: -60,
    right: -40,
  },
  decorCircle2: {
    width: 100,
    height: 100,
    bottom: -30,
    left: -30,
  },
  content: {
    position: 'relative',
    zIndex: 1,
  },
});

export default GradientCard;
