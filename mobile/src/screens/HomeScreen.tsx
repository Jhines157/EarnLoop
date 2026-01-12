import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import { UI_TEXT } from '../utils/constants';

// Components
import BalanceCard from '../components/BalanceCard';
import StreakMeter from '../components/StreakMeter';
// ProgressRing removed - no daily cap
import QuickActionButton from '../components/QuickActionButton';
import LevelCard from '../components/LevelCard';

const HomeScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { user, balance, streak, refreshUser } = useAuth();
  const styles = createStyles(colors);
  const [earnStatus, setEarnStatus] = useState({
    todayEarned: 0,
    totalEarned: 0,
    adsWatchedToday: 0,
    checkedInToday: false,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Animated greeting
  const waveRotate = useSharedValue(0);

  useEffect(() => {
    loadData();
    
    // Wave animation
    waveRotate.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 150 }),
        withTiming(-15, { duration: 150 }),
        withTiming(15, { duration: 150 }),
        withTiming(-15, { duration: 150 }),
        withTiming(0, { duration: 150 })
      ),
      -1,
      false
    );
  }, []);

  const waveStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${waveRotate.value}deg` }],
  }));

  const loadData = async () => {
    try {
      const [earnResponse] = await Promise.all([
        api.getEarnStatus(),
        refreshUser(),
      ]);

      if (earnResponse.success && earnResponse.data) {
        setEarnStatus(earnResponse.data);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
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
        {/* Header */}
        <Animated.View 
          style={styles.header}
          entering={FadeInDown.duration(600).delay(100)}
        >
          <View style={styles.greetingRow}>
            <Text style={[styles.greeting, { color: colors.textPrimary }]}>{getGreeting()}</Text>
            <Animated.Text style={[styles.waveEmoji, waveStyle]}>👋</Animated.Text>
          </View>
          <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
          
          {/* Status pill */}
          <View style={[styles.statusPill, { backgroundColor: `${colors.success}20` }]}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.statusText, { color: colors.success }]}>Account Active</Text>
          </View>
        </Animated.View>

        {/* Balance Card */}
        <Animated.View entering={FadeInUp.duration(600).delay(200)}>
          <BalanceCard
            balance={balance.current}
            todayEarned={earnStatus.todayEarned}
          />
        </Animated.View>

        {/* Level Progress */}
        <Animated.View entering={FadeInUp.duration(600).delay(300)}>
          <LevelCard lifetimeEarned={balance.lifetimeEarned} />
        </Animated.View>

        {/* Today's Earnings & Streak Row */}
        <Animated.View 
          style={styles.statsRow}
          entering={FadeInUp.duration(600).delay(400)}
        >
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <View style={styles.todayEarningsCard}>
              <Text style={[styles.todayEarningsLabel, { color: colors.textMuted }]}>Today's Earnings</Text>
              <Text style={[styles.todayEarningsValue, { color: colors.primary }]}>{earnStatus.todayEarned}</Text>
              <Text style={[styles.todayEarningsSubtext, { color: colors.textMuted }]}>🎬 {earnStatus.adsWatchedToday} ads watched</Text>
            </View>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <StreakMeter
              currentStreak={streak.current}
              longestStreak={streak.longest}
            />
          </View>
        </Animated.View>

        {/* Quick Actions */}
        <Animated.View 
          style={styles.section}
          entering={FadeInUp.duration(600).delay(500)}
        >
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionEmoji}>⚡</Text>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Actions</Text>
          </View>
          <View style={styles.actionsRow}>
            <QuickActionButton
              icon="✅"
              label="Check In"
              sublabel={earnStatus.checkedInToday ? 'Done!' : '+5 credits'}
              disabled={earnStatus.checkedInToday}
              variant={earnStatus.checkedInToday ? 'success' : 'default'}
              onPress={() => navigation.navigate('Earn')}
            />
            <QuickActionButton
              icon="🎬"
              label="Watch Ad"
              sublabel="Unlimited!"
              disabled={false}
              variant="default"
              onPress={() => navigation.navigate('Earn')}
            />
            <QuickActionButton
              icon="📚"
              label="Learn"
              sublabel="+15 credits"
              onPress={() => navigation.navigate('Earn')}
            />
          </View>
        </Animated.View>

        {/* Fun tip card */}
        <Animated.View 
          style={styles.tipCard}
          entering={FadeInUp.duration(600).delay(600)}
        >
          <View style={styles.tipHeader}>
            <Text style={styles.tipEmoji}>💡</Text>
            <Text style={styles.tipTitle}>Pro Tip</Text>
          </View>
          <Text style={styles.tipText}>
            Check in daily to build your streak and earn bonus credits! 🔥
          </Text>
        </Animated.View>

        {/* Disclaimer */}
        <Animated.View 
          style={styles.disclaimer}
          entering={FadeInUp.duration(600).delay(700)}
        >
          <Text style={styles.disclaimerIcon}>ℹ️</Text>
          <Text style={styles.disclaimerText}>
            {UI_TEXT.APP_DISCLAIMER}
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    marginBottom: spacing.lg,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  greeting: {
    ...typography.h1,
    color: colors.textPrimary,
  },
  waveEmoji: {
    fontSize: 28,
  },
  email: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.success}20`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  statusText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  todayEarningsCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
  },
  todayEarningsLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  todayEarningsValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  todayEarningsSubtext: {
    ...typography.caption,
    color: colors.textMuted,
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
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipCard: {
    backgroundColor: `${colors.accent}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: `${colors.accent}30`,
  },
  tipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  tipEmoji: {
    fontSize: 16,
  },
  tipTitle: {
    ...typography.caption,
    color: colors.accent,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tipText: {
    ...typography.body,
    color: colors.textPrimary,
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

export default HomeScreen;
