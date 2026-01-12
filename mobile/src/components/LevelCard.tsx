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
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import { getLevelProgress, UserLevel } from '../data/gamification';
import { useTheme } from '../context/ThemeContext';

interface LevelCardProps {
  lifetimeEarned: number;
}

const LevelCard: React.FC<LevelCardProps> = ({ lifetimeEarned }) => {
  const { colors } = useTheme();
  const { currentLevel, nextLevel, progress, creditsToNext } = getLevelProgress(lifetimeEarned);
  const emojiScale = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const shimmer = useSharedValue(0);
  const styles = createStyles(colors);

  useEffect(() => {
    // Emoji bounce
    emojiScale.value = withRepeat(
      withSequence(
        withSpring(1.1, { damping: 8 }),
        withSpring(1, { damping: 8 })
      ),
      -1,
      true
    );

    // Progress bar animation
    progressWidth.value = withTiming(progress, {
      duration: 1000,
      easing: Easing.out(Easing.cubic),
    });

    // Shimmer effect
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress]);

  const emojiStyle = useAnimatedStyle(() => ({
    transform: [{ scale: emojiScale.value }],
  }));

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.levelInfo}>
          <View style={styles.emojiBg}>
            <Animated.Text style={[styles.levelEmoji, emojiStyle]}>
              {currentLevel.emoji}
            </Animated.Text>
          </View>
          <View style={styles.levelTextContainer}>
            <Text style={styles.levelName}>{currentLevel.name}</Text>
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>LEVEL {currentLevel.level}</Text>
            </View>
          </View>
        </View>
        {nextLevel && (
          <View style={styles.nextLevel}>
            <Text style={styles.nextEmoji}>{nextLevel.emoji}</Text>
            <Text style={styles.creditsToNext}>{creditsToNext.toLocaleString()}</Text>
            <Text style={styles.creditsLabel}>to go!</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {nextLevel && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, progressStyle]}>
              <View style={styles.progressShimmer} />
            </Animated.View>
          </View>
          <View style={styles.progressLabel}>
            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
          </View>
        </View>
      )}

      {/* Perks */}
      <View style={styles.perks}>
        <View style={styles.perksHeader}>
          <Text style={styles.perksIcon}>🎁</Text>
          <Text style={styles.perksTitle}>Your Perks</Text>
        </View>
        <View style={styles.perksList}>
          {currentLevel.perks.map((perk, index) => (
            <View key={index} style={styles.perkItem}>
              <Text style={styles.perkCheck}>✓</Text>
              <Text style={styles.perkText}>{perk}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emojiBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: `${colors.primary}20`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  levelEmoji: {
    fontSize: 28,
  },
  levelTextContainer: {
    gap: 4,
  },
  levelName: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  levelBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  levelBadgeText: {
    ...typography.micro,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  nextLevel: {
    alignItems: 'center',
    backgroundColor: colors.backgroundSecondary,
    padding: spacing.sm,
    borderRadius: borderRadius.lg,
    minWidth: 70,
  },
  nextEmoji: {
    fontSize: 20,
    marginBottom: 2,
  },
  creditsToNext: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  creditsLabel: {
    ...typography.micro,
    color: colors.textMuted,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 10,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
    position: 'relative',
    overflow: 'hidden',
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressLabel: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    minWidth: 48,
    alignItems: 'center',
  },
  progressText: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  perks: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  perksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  perksIcon: {
    fontSize: 14,
  },
  perksTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  perksList: {
    gap: spacing.xs,
  },
  perkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  perkCheck: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '700',
  },
  perkText: {
    ...typography.bodySmall,
    color: colors.textPrimary,
  },
});

export default LevelCard;
