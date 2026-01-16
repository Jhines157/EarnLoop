import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import { EARN_CONFIG, UI_TEXT } from '../utils/constants';
import adMobService from '../services/adMob';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const EarnScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { balance, streak, updateBalance, updateStreak } = useAuth();
  const [earnStatus, setEarnStatus] = useState({
    todayEarned: 0,
    totalEarned: 0,
    adsWatchedToday: 0,
    checkedInToday: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEarnStatus();
  }, []);

  const loadEarnStatus = async () => {
    try {
      const response = await api.getEarnStatus();
      if (response.success && response.data) {
        setEarnStatus(response.data);
      }
    } catch (error) {
      console.error('Failed to load earn status:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEarnStatus();
    setRefreshing(false);
  };

  // Daily check-in
  const handleCheckin = async () => {
    if (earnStatus.checkedInToday) {
      Alert.alert('Already Checked In', 'Come back tomorrow for your next check-in!');
      return;
    }

    setLoading(true);
    try {
      const response = await api.checkin();
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        updateStreak({
          current: response.data.streak.current_streak,
          longest: response.data.streak.longest_streak,
        });
        setEarnStatus(prev => ({ ...prev, checkedInToday: true }));
        Alert.alert('Check-In Complete! ✅', `You earned ${response.data.creditsEarned} credits!`);
      } else {
        Alert.alert('Error', response.error?.message || 'Check-in failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setLoading(false);
      loadEarnStatus();
    }
  };

  // Watch rewarded ad - UNLIMITED!
  const handleWatchAd = async () => {
    setLoading(true);
    
    try {
      // Check if ad is ready
      if (!adMobService.isAdReady()) {
        // Try to load ad first
        adMobService.loadAd();
        Alert.alert('Loading Ad', 'Please wait a moment and try again.');
        setLoading(false);
        return;
      }

      // Show the ad
      await adMobService.showAd({
        onEarnedReward: async (reward) => {
          try {
            // Generate unique token using timestamp + random
            const uniqueToken = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const response = await api.completeRewardedAd(
              'rewarded-ad-unit',
              uniqueToken
            );
            if (response.success && response.data) {
              updateBalance(response.data.newBalance);
              Alert.alert('Ad Complete! 🎬', `You earned ${response.data.creditsEarned} credits!`);
              loadEarnStatus();
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to process ad reward');
            }
          } catch (error) {
            Alert.alert('Error', 'Something went wrong');
          }
        },
        onAdClosed: () => {
          // Ad was closed, possibly without earning reward
        },
        onAdFailedToLoad: (error) => {
          console.error('Ad error:', error);
          Alert.alert('Ad Error', 'Could not load ad. Please try again later.');
        }
      });
    } catch (error) {
      console.error('Failed to show ad:', error);
      Alert.alert('Ad Error', 'Could not load ad. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  // Complete learn module
  const handleLearnModule = () => {
    navigation.navigate('Learn');
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Daily Progress Card */}
        <Animated.View 
          style={styles.progressCard}
          entering={FadeInDown.duration(500).delay(100)}
        >
          <View style={styles.progressHeader}>
            <View style={styles.progressTitleRow}>
              <Text style={styles.progressEmoji}>🎯</Text>
              <Text style={styles.progressTitle}>Today's Earnings</Text>
            </View>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                Unlimited! 🚀
              </Text>
            </View>
          </View>
          
          <View style={styles.progressStats}>
            <View style={styles.progressStat}>
              <Text style={styles.statValue}>{earnStatus.todayEarned}</Text>
              <Text style={styles.statLabel}>Credits Today</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.statValue}>{earnStatus.adsWatchedToday}</Text>
              <Text style={styles.statLabel}>Ads Watched</Text>
            </View>
            <View style={styles.progressDivider} />
            <View style={styles.progressStat}>
              <Text style={styles.statValue}>{earnStatus.totalEarned}</Text>
              <Text style={styles.statLabel}>All Time</Text>
            </View>
          </View>
        </Animated.View>

        {/* Earn Tasks Section */}
        <Animated.View 
          style={styles.section}
          entering={FadeInUp.duration(500).delay(200)}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>💰</Text>
            <Text style={styles.sectionTitle}>Earn Credits</Text>
          </View>

          {/* Daily Check-in */}
          <TaskCard
            icon="✅"
            title="Daily Check-In"
            description={earnStatus.checkedInToday 
              ? "Awesome! You're checked in today! 🎉" 
              : "Tap to check in and start earning!"}
            reward={EARN_CONFIG.CHECKIN_REWARD}
            completed={earnStatus.checkedInToday}
            onPress={handleCheckin}
            disabled={loading || earnStatus.checkedInToday}
            accentColor={colors.success}
            colors={colors}
          />

          {/* Watch Ad - UNLIMITED */}
          <TaskCard
            icon="🎬"
            title="Watch an Ad"
            description={earnStatus.adsWatchedToday > 0
              ? `🔥 ${earnStatus.adsWatchedToday} watched today - keep going!`
              : "Watch unlimited videos to earn credits!"}
            reward={EARN_CONFIG.AD_REWARD}
            completed={false}
            onPress={handleWatchAd}
            disabled={loading}
            accentColor={colors.accent}
            badge="∞ Unlimited"
            colors={colors}
          />

          {/* Learn Module */}
          <TaskCard
            icon="📚"
            title="Learn & Earn"
            description="Complete a quick lesson and ace the quiz!"
            reward={EARN_CONFIG.LEARN_REWARD}
            completed={false}
            onPress={handleLearnModule}
            disabled={loading}
            accentColor={colors.secondary}
            colors={colors}
          />
        </Animated.View>

        {/* Streak Card */}
        <Animated.View 
          style={styles.streakCard}
          entering={FadeInUp.duration(500).delay(300)}
        >
          <View style={styles.streakGlow} />
          <Text style={styles.streakIcon}>🔥</Text>
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>
              {streak.current} Day Streak!
            </Text>
            <Text style={styles.streakDescription}>
              {streak.current > 0 
                ? "Keep it going! You're on fire!" 
                : "Start your streak today!"}
            </Text>
            <View style={styles.streakBadge}>
              <Text style={styles.streakBadgeText}>🏆 Best: {streak.longest} days</Text>
            </View>
          </View>
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View 
          style={styles.disclaimer}
          entering={FadeInUp.duration(500).delay(400)}
        >
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            {UI_TEXT.CREDITS_ONLY}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Task Card Component
interface TaskCardProps {
  icon: string;
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  onPress: () => void;
  disabled: boolean;
  accentColor: string;
  badge?: string;
  colors: any;
}

const TaskCard: React.FC<TaskCardProps> = ({
  icon,
  title,
  description,
  reward,
  completed,
  onPress,
  disabled,
  accentColor,
  badge,
  colors,
}) => {
  const scale = useSharedValue(1);
  const iconScale = useSharedValue(1);
  const styles = createStyles(colors);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled) {
      scale.value = withSpring(0.98, { damping: 15 });
      iconScale.value = withSequence(
        withTiming(1.2, { duration: 100 }),
        withSpring(1, { damping: 8 })
      );
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 10 });
  };

  return (
    <AnimatedTouchable
      style={[
        styles.taskCard,
        completed && styles.taskCardCompleted,
        animatedStyle,
      ]}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
    >
      {/* Accent bar */}
      <View style={[styles.taskAccent, { backgroundColor: accentColor }]} />
      
      <Animated.Text style={[styles.taskIcon, iconAnimatedStyle]}>{icon}</Animated.Text>
      
      <View style={styles.taskInfo}>
        <View style={styles.taskTitleRow}>
          <Text style={styles.taskTitle}>{title}</Text>
          {badge && (
            <View style={[styles.taskBadge, { backgroundColor: `${accentColor}20` }]}>
              <Text style={[styles.taskBadgeText, { color: accentColor }]}>{badge}</Text>
            </View>
          )}
        </View>
        <Text style={styles.taskDescription}>{description}</Text>
      </View>
      
      <View style={[styles.taskReward, { backgroundColor: `${accentColor}15` }]}>
        <Text style={[styles.rewardAmount, { color: accentColor }]}>+{reward}</Text>
        <Text style={[styles.rewardLabel, { color: accentColor }]}>credits</Text>
      </View>
    </AnimatedTouchable>
  );
};

// Create styles function for dynamic theming
const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  progressCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  progressEmoji: {
    fontSize: 24,
  },
  progressTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  progressBadge: {
    backgroundColor: `${colors.primary}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  progressBadgeText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
  progressBarContainer: {
    marginBottom: spacing.md,
  },
  progressBar: {
    height: 14,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressStat: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  statValue: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  progressDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  taskCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.sm,
  },
  taskCardCompleted: {
    opacity: 0.6,
    backgroundColor: colors.backgroundSecondary,
  },
  taskAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  taskIcon: {
    fontSize: 36,
    marginRight: spacing.md,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  taskTitle: {
    ...typography.bodyBold,
    color: colors.textPrimary,
  },
  taskBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  taskBadgeText: {
    ...typography.micro,
    fontWeight: '700',
  },
  taskDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  taskReward: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginLeft: spacing.sm,
  },
  rewardAmount: {
    ...typography.bodyBold,
    fontWeight: '800',
  },
  rewardLabel: {
    ...typography.micro,
  },
  streakCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
    position: 'relative',
    overflow: 'hidden',
    ...shadows.md,
  },
  streakGlow: {
    position: 'absolute',
    left: -20,
    top: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${colors.warning}20`,
  },
  streakIcon: {
    fontSize: 48,
    marginRight: spacing.md,
  },
  streakInfo: {
    flex: 1,
  },
  streakTitle: {
    ...typography.h2,
    color: colors.warning,
  },
  streakDescription: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  streakBadgeText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  disclaimer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  disclaimerIcon: {
    fontSize: 14,
  },
  disclaimerText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
});

export default EarnScreen;
