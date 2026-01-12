import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { spacing, typography, borderRadius } from '../utils/theme';

interface StreakMeterProps {
  currentStreak: number;
  longestStreak: number;
}

const StreakMeter: React.FC<StreakMeterProps> = ({ currentStreak, longestStreak }) => {
  const { colors } = useTheme();
  const fireScale = useSharedValue(1);
  const fireRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0.5);

  useEffect(() => {
    // Fire wiggle animation
    fireRotate.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 150 }),
        withTiming(5, { duration: 150 }),
        withTiming(-3, { duration: 150 }),
        withTiming(3, { duration: 150 }),
        withTiming(0, { duration: 150 })
      ),
      -1,
      true
    );

    // Fire pulse
    fireScale.value = withRepeat(
      withSequence(
        withSpring(1.15, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );

    // Glow pulse
    glowOpacity.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const fireStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fireScale.value },
      { rotate: `${fireRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value * 0.6,
  }));

  const streakColor = currentStreak >= 7 ? '#EF4444' : currentStreak >= 3 ? '#F97316' : colors.warning;
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Glow effect */}
      <Animated.View style={[styles.glow, { backgroundColor: streakColor }, glowStyle]} />
      
      {/* Fire emoji */}
      <Animated.Text style={[styles.icon, fireStyle]}>🔥</Animated.Text>
      
      {/* Streak number */}
      <Text style={[styles.streakNumber, { color: streakColor }]}>{currentStreak}</Text>
      <Text style={styles.label}>Day Streak!</Text>
      
      {/* Streak days visualization */}
      <View style={styles.dotsContainer}>
        {[...Array(7)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < currentStreak && { backgroundColor: streakColor },
              i < currentStreak && styles.dotActive,
            ]}
          />
        ))}
      </View>
      
      {/* Best streak badge */}
      <View style={styles.bestBadge}>
        <Text style={styles.bestIcon}>🏆</Text>
        <Text style={styles.bestText}>Best: {longestStreak}</Text>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.sm,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    top: 0,
  },
  icon: {
    fontSize: 40,
    marginBottom: spacing.xs,
  },
  streakNumber: {
    fontSize: 42,
    fontWeight: '800',
    lineHeight: 48,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
    marginTop: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    transform: [{ scale: 1.1 }],
  },
  bestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  bestIcon: {
    fontSize: 12,
  },
  bestText: {
    ...typography.micro,
    color: colors.textMuted,
  },
});

export default StreakMeter;
