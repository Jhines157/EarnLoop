import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import GradientCard from './GradientCard';

interface BalanceCardProps {
  balance: number;
  todayEarned: number;
}

const BalanceCard: React.FC<BalanceCardProps> = ({ balance, todayEarned }) => {
  const { colors } = useTheme();
  const coinRotate = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);
  const balanceScale = useSharedValue(1);

  useEffect(() => {
    // Coin spinning animation
    coinRotate.value = withRepeat(
      withTiming(360, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
    
    // Sparkle animation
    sparkleOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0.3, { duration: 1000 })
      ),
      -1,
      true
    );
  }, []);

  // Pulse when balance changes
  useEffect(() => {
    balanceScale.value = withSequence(
      withTiming(1.05, { duration: 150 }),
      withTiming(1, { duration: 150 })
    );
  }, [balance]);

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ rotateY: `${coinRotate.value}deg` }],
  }));

  const sparkleStyle = useAnimatedStyle(() => ({
    opacity: sparkleOpacity.value,
  }));

  const balanceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: balanceScale.value }],
  }));

  const styles = createStyles(colors);

  return (
    <GradientCard variant="orange" glowing>
      <View style={styles.container}>
        {/* Floating sparkles */}
        <Animated.Text style={[styles.sparkle, styles.sparkle1, sparkleStyle]}>✨</Animated.Text>
        <Animated.Text style={[styles.sparkle, styles.sparkle2, sparkleStyle]}>⭐</Animated.Text>
        <Animated.Text style={[styles.sparkle, styles.sparkle3, sparkleStyle]}>💫</Animated.Text>
        
        {/* Main balance */}
        <View style={styles.mainBalance}>
          <View style={styles.labelRow}>
            <Animated.Text style={[styles.coinEmoji, coinStyle]}>🪙</Animated.Text>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
          </View>
          <Animated.View style={balanceStyle}>
            <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
          </Animated.View>
          <Text style={styles.balanceUnit}>credits</Text>
        </View>
        
        {/* Today's earnings badge */}
        {todayEarned > 0 && (
          <View style={styles.todayBadge}>
            <Text style={styles.todayIcon}>🔥</Text>
            <View>
              <Text style={styles.todayAmount}>+{todayEarned}</Text>
              <Text style={styles.todayLabel}>today</Text>
            </View>
          </View>
        )}

        {/* Bottom decoration */}
        <View style={styles.bottomRow}>
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>📈</Text>
            <Text style={styles.statText}>Keep going!</Text>
          </View>
        </View>
      </View>
    </GradientCard>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    padding: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    position: 'relative',
    minHeight: 180,
  },
  sparkle: {
    position: 'absolute',
    fontSize: 16,
  },
  sparkle1: {
    top: 15,
    left: 20,
  },
  sparkle2: {
    top: 45,
    right: 25,
  },
  sparkle3: {
    bottom: 50,
    left: 30,
  },
  mainBalance: {
    alignItems: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  coinEmoji: {
    fontSize: 18,
  },
  balanceLabel: {
    ...typography.micro,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 2,
  },
  balanceAmount: {
    fontSize: 56,
    fontWeight: '800',
    color: colors.textPrimary,
    lineHeight: 64,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  balanceUnit: {
    ...typography.body,
    color: 'rgba(255,255,255,0.9)',
    marginTop: -4,
  },
  todayBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  todayIcon: {
    fontSize: 16,
  },
  todayAmount: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  todayLabel: {
    ...typography.micro,
    color: 'rgba(255,255,255,0.7)',
  },
  bottomRow: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  statEmoji: {
    fontSize: 14,
  },
  statText: {
    ...typography.caption,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
});

export default BalanceCard;
