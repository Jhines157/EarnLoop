import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  Linking,
  Platform,
  AlertButton,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp, FadeIn } from 'react-native-reanimated';
import { LinearGradient as ExpoGradient } from 'expo-linear-gradient';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import healthKitService, { STEP_CONFIG } from '../services/healthKit';
import adMobService from '../services/adMob';
import { spacing, borderRadius, typography } from '../utils/theme';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.7;
const STROKE_WIDTH = 16;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

interface StepData {
  todaySteps: number;
  stepsConverted: number;
  adsWatchedFromSteps: number;
  creditsEarnedFromSteps: number;
  currentStreak: number;
  longestStreak: number;
  lastStepDate: string | null;
}

const StepsScreen = () => {
  const { colors } = useTheme();
  const { balance, updateBalance } = useAuth();
  
  const [healthKitReady, setHealthKitReady] = useState(false);
  const [todaySteps, setTodaySteps] = useState(0);
  const [stepData, setStepData] = useState<StepData>({
    todaySteps: 0,
    stepsConverted: 0,
    adsWatchedFromSteps: 0,
    creditsEarnedFromSteps: 0,
    currentStreak: 0,
    longestStreak: 0,
    lastStepDate: null,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  
  // Session tracking
  const [sessionAdsWatched, setSessionAdsWatched] = useState(0);
  const [sessionCreditsEarned, setSessionCreditsEarned] = useState(0);

  useEffect(() => {
    initializeHealthKit();
    loadStepData();
  }, []);

  // Re-check HealthKit when app comes to foreground
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!healthKitReady) {
        const ready = await healthKitService.recheckPermission();
        if (ready) {
          setHealthKitReady(true);
          const steps = await healthKitService.getTodaySteps();
          setTodaySteps(steps);
        }
      }
    }, 3000); // Check every 3 seconds when not ready
    
    return () => clearInterval(interval);
  }, [healthKitReady]);

  const initializeHealthKit = async () => {
    const ready = await healthKitService.initialize();
    setHealthKitReady(ready);
    if (ready) {
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps);
    }
  };

  const openHealthKitSettings = async () => {
    // First try to initialize - this may prompt the permission dialog
    const ready = await healthKitService.initialize();
    if (ready) {
      setHealthKitReady(true);
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps);
      Alert.alert('Success! 🎉', 'HealthKit is now connected. Start walking to earn credits!');
    } else {
      // If still not ready, open Settings
      Alert.alert(
        'Enable HealthKit',
        'To track your steps, please enable HealthKit access in Settings:\n\n1. Tap "Open Settings"\n2. Go to Health → Data Access\n3. Enable all permissions for EarnLoop',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openURL('app-settings:');
            },
          },
        ]
      );
    }
  };

  const loadStepData = async () => {
    try {
      const response = await api.getStepData();
      if (response.success && response.data) {
        setStepData(response.data);
      }
    } catch (error) {
      console.error('Failed to load step data:', error);
    }
  };

  const refreshSteps = async () => {
    if (healthKitReady) {
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps);
    }
    await loadStepData();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshSteps();
    setRefreshing(false);
  };

  // Calculate available ads to convert
  const adsAvailable = healthKitService.calculateAdsAvailable(
    todaySteps,
    stepData.adsWatchedFromSteps
  );
  const creditsAvailable = adsAvailable * STEP_CONFIG.CREDITS_PER_AD;
  
  // Progress calculations
  const dailyGoalProgress = Math.min(1, todaySteps / STEP_CONFIG.MAX_DAILY_STEPS);
  const strokeDashoffset = CIRCUMFERENCE * (1 - dailyGoalProgress);
  
  // Milestone progress
  const milestoneProgress = healthKitService.getProgressToNextMilestone(todaySteps);
  const stepsToNextAd = milestoneProgress.next - todaySteps;

  // Convert steps by watching an ad
  const handleConvertSteps = async () => {
    if (adsAvailable <= 0) {
      Alert.alert(
        'No Steps to Convert',
        `Walk more to unlock ads!\n\n${stepsToNextAd.toLocaleString()} steps until your next reward.`
      );
      return;
    }

    setConverting(true);
    
    try {
      // Check if ad SDK is loaded
      if (!adMobService.isSdkLoaded()) {
        Alert.alert('Ads Not Available', 'Please restart the app and try again.');
        setConverting(false);
        return;
      }

      // Load ad if not ready
      if (!adMobService.isAdReady()) {
        adMobService.loadAd();
        let attempts = 0;
        while (!adMobService.isAdReady() && attempts < 30) {
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }
        
        if (!adMobService.isAdReady()) {
          Alert.alert('Ad Not Available', 'Could not load ad. Please try again.');
          setConverting(false);
          return;
        }
      }

      // Show the ad
      await adMobService.showAd({
        onEarnedReward: async () => {
          try {
            await api.loadToken();
            
            // Record step conversion on backend
            const response = await api.convertSteps(STEP_CONFIG.STEPS_PER_AD);
            
            if (response.success && response.data) {
              updateBalance(response.data.newBalance);
              
              // Update session tracking
              const newSessionAds = sessionAdsWatched + 1;
              const newSessionCredits = sessionCreditsEarned + STEP_CONFIG.CREDITS_PER_AD;
              setSessionAdsWatched(newSessionAds);
              setSessionCreditsEarned(newSessionCredits);
              
              // Update local step data
              setStepData(prev => ({
                ...prev,
                adsWatchedFromSteps: prev.adsWatchedFromSteps + 1,
                creditsEarnedFromSteps: prev.creditsEarnedFromSteps + STEP_CONFIG.CREDITS_PER_AD,
                stepsConverted: prev.stepsConverted + STEP_CONFIG.STEPS_PER_AD,
              }));
              
              // Calculate remaining after this conversion
              const remainingAds = adsAvailable - 1;
              
              const sessionMsg = newSessionAds > 1
                ? `\n\n📊 Session: ${newSessionAds} ads = ${newSessionCredits} credits`
                : '';
              
              const remainingMsg = remainingAds > 0
                ? `\n\n🚶 ${remainingAds} more ads available from steps!`
                : `\n\n🚶 Walk ${stepsToNextAd.toLocaleString()} more steps for your next reward!`;
              
              Alert.alert(
                '🚶 +10 Credits from Steps!',
                `Your walking paid off!${sessionMsg}${remainingMsg}`,
                [
                  {
                    text: 'Done',
                    style: 'cancel' as const,
                    onPress: () => {
                      setSessionAdsWatched(0);
                      setSessionCreditsEarned(0);
                      loadStepData();
                    },
                  },
                  remainingAds > 0 ? {
                    text: '▶️ Convert Another',
                    style: 'default' as const,
                    onPress: () => {
                      loadStepData();
                      setTimeout(() => handleConvertSteps(), 300);
                    },
                  } : {
                    text: 'Keep Walking! 🚶',
                    style: 'default' as const,
                    onPress: () => loadStepData(),
                  },
                ].filter(Boolean) as AlertButton[]
              );
            } else {
              Alert.alert('Error', response.error?.message || 'Failed to convert steps');
            }
          } catch (error: any) {
            Alert.alert('Error', error?.message || 'Network error');
          }
        },
        onAdClosed: () => {},
        onAdFailedToLoad: () => {
          Alert.alert('Ad Error', 'Could not load ad. Please try again.');
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setConverting(false);
    }
  };

  const styles = createStyles(colors);

  // Daily goals with checkmarks
  const dailyGoals = healthKitService.getDailyGoals();

  // If HealthKit not ready, show setup screen
  if (!healthKitReady) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={styles.setupContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          <View style={styles.setupIconContainer}>
            <Text style={styles.setupIcon}>🚶‍♂️</Text>
          </View>
          <Text style={styles.setupTitle}>Enable Step Tracking</Text>
          <Text style={styles.setupSubtitle}>
            Walk your way to rewards! Connect HealthKit to convert your daily steps into credits.
          </Text>
          
          <View style={styles.setupSteps}>
            <View style={styles.setupStepItem}>
              <View style={styles.setupStepNumber}><Text style={styles.setupStepNumberText}>1</Text></View>
              <Text style={styles.setupStepText}>Tap "Enable HealthKit" below</Text>
            </View>
            <View style={styles.setupStepItem}>
              <View style={styles.setupStepNumber}><Text style={styles.setupStepNumberText}>2</Text></View>
              <Text style={styles.setupStepText}>Allow EarnLoop to read Steps</Text>
            </View>
            <View style={styles.setupStepItem}>
              <View style={styles.setupStepNumber}><Text style={styles.setupStepNumberText}>3</Text></View>
              <Text style={styles.setupStepText}>Walk and earn up to 300 credits daily!</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.setupButton} onPress={openHealthKitSettings}>
            <ExpoGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.setupButtonGradient}
            >
              <Text style={styles.setupButtonText}>🔓 Enable HealthKit</Text>
            </ExpoGradient>
          </TouchableOpacity>
          
          <Text style={styles.setupNote}>
            Your step data stays on your device. We only track totals for rewards.
          </Text>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* Header Stats */}
        <Animated.View entering={FadeInDown.delay(100)} style={styles.headerStats}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stepData.currentStreak}</Text>
            <Text style={styles.statLabel}>🔥 Streak</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stepData.adsWatchedFromSteps}/{STEP_CONFIG.MAX_DAILY_ADS}</Text>
            <Text style={styles.statLabel}>Today's Converts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stepData.creditsEarnedFromSteps}</Text>
            <Text style={styles.statLabel}>Credits Today</Text>
          </View>
        </Animated.View>

        {/* Progress Ring */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.ringContainer}>
          <View style={styles.ringWrapper}>
            <Svg width={RING_SIZE} height={RING_SIZE}>
              <Defs>
                <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="#10B981" />
                  <Stop offset="50%" stopColor="#22C55E" />
                  <Stop offset="100%" stopColor="#4ADE80" />
                </LinearGradient>
              </Defs>
              <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
                {/* Background circle */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke={colors.backgroundCard}
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  opacity={0.5}
                />
                {/* Progress circle with gradient */}
                <Circle
                  cx={RING_SIZE / 2}
                  cy={RING_SIZE / 2}
                  r={RADIUS}
                  stroke="url(#progressGradient)"
                  strokeWidth={STROKE_WIDTH}
                  fill="none"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                />
              </G>
            </Svg>
            
            {/* Center content */}
            <View style={styles.ringCenter}>
              <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
              <Text style={styles.stepLabel}>steps today</Text>
              <Text style={styles.goalText}>Goal: {(STEP_CONFIG.MAX_DAILY_STEPS / 1000).toFixed(0)}k</Text>
            </View>
          </View>
        </Animated.View>

        {/* Convert Button - Main CTA */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.convertSection}>
          {adsAvailable > 0 ? (
            <>
              <View style={styles.adsAvailableBadge}>
                <Text style={styles.adsAvailableText}>
                  🎬 {adsAvailable} {adsAvailable === 1 ? 'ad' : 'ads'} available from your steps!
                </Text>
              </View>
              <TouchableOpacity
                style={styles.convertButton}
                onPress={handleConvertSteps}
                disabled={converting}
              >
                <ExpoGradient
                  colors={['#10B981', '#059669']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.convertButtonGradient}
                >
                  <Text style={styles.convertButtonEmoji}>🎬</Text>
                  <Text style={styles.convertButtonText}>
                    {converting ? 'Loading Ad...' : `Watch Ad → +${STEP_CONFIG.CREDITS_PER_AD} Credits`}
                  </Text>
                </ExpoGradient>
              </TouchableOpacity>
              <Text style={styles.convertHint}>
                Convert {STEP_CONFIG.STEPS_PER_AD.toLocaleString()} steps per ad watched
              </Text>
            </>
          ) : (
            <View style={styles.noAdsContainer}>
              <Text style={styles.noAdsIcon}>🚶</Text>
              <Text style={styles.noAdsTitle}>Keep Walking!</Text>
              <Text style={styles.noAdsText}>
                {stepsToNextAd.toLocaleString()} more steps until your next ad
              </Text>
              <View style={styles.nextAdProgress}>
                <View style={[styles.nextAdProgressBar, { width: `${milestoneProgress.progress * 100}%` }]} />
              </View>
            </View>
          )}
        </Animated.View>

        {/* Daily Goals */}
        <Animated.View entering={FadeInUp.delay(400)} style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>🎯 Daily Goals</Text>
          <View style={styles.goalsGrid}>
            {dailyGoals.map((goal) => {
              const reached = todaySteps >= goal.goal;
              const progress = Math.min(1, todaySteps / goal.goal);
              return (
                <View key={goal.goal} style={[styles.goalItem, reached && styles.goalItemReached]}>
                  <Text style={styles.goalIcon}>{reached ? '✅' : '🎯'}</Text>
                  <Text style={[styles.goalSteps, reached && styles.goalTextReached]}>
                    {(goal.goal / 1000).toFixed(0)}k
                  </Text>
                  <Text style={[styles.goalReward, reached && styles.goalTextReached]}>
                    +{goal.rewards} 💰
                  </Text>
                  <View style={styles.goalProgress}>
                    <View style={[styles.goalProgressBar, { width: `${progress * 100}%`, backgroundColor: reached ? '#10B981' : colors.primary }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>

        {/* Streak Info */}
        <Animated.View entering={FadeInUp.delay(500)} style={styles.streakSection}>
          <Text style={styles.sectionTitle}>🔥 Step Streak</Text>
          <View style={styles.streakCard}>
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{stepData.currentStreak}</Text>
              <Text style={styles.streakLabel}>Current Streak</Text>
            </View>
            <View style={styles.streakDivider} />
            <View style={styles.streakInfo}>
              <Text style={styles.streakNumber}>{stepData.longestStreak}</Text>
              <Text style={styles.streakLabel}>Longest Streak</Text>
            </View>
          </View>
          <Text style={styles.streakHint}>
            💡 Convert at least 1 ad from steps daily to maintain your streak!
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: spacing.md,
      paddingBottom: 100,
    },
    // Setup screen styles
    setupContent: {
      flex: 1,
      padding: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 600,
    },
    setupIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#10B98120',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    setupIcon: {
      fontSize: 60,
    },
    setupTitle: {
      fontSize: 28,
      fontWeight: '800',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    setupSubtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.md,
      lineHeight: 24,
    },
    setupSteps: {
      width: '100%',
      marginBottom: spacing.xl,
    },
    setupStepItem: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
      backgroundColor: colors.backgroundCard,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    setupStepNumber: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#10B981',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    setupStepNumberText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 16,
    },
    setupStepText: {
      flex: 1,
      fontSize: 15,
      color: colors.textPrimary,
    },
    setupButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      marginBottom: spacing.lg,
    },
    setupButtonGradient: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl * 2,
    },
    setupButtonText: {
      color: '#fff',
      fontSize: 18,
      fontWeight: '700',
    },
    setupNote: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      paddingHorizontal: spacing.lg,
    },
    // Main screen styles
    headerStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.lg,
      backgroundColor: colors.backgroundCard,
      padding: spacing.md,
      borderRadius: borderRadius.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.textPrimary,
    },
    statLabel: {
      fontSize: 11,
      color: colors.textSecondary,
      marginTop: 4,
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    ringWrapper: {
      width: RING_SIZE,
      height: RING_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepCount: {
      fontSize: 48,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    stepLabel: {
      fontSize: 14,
      color: colors.textSecondary,
      marginTop: 2,
    },
    goalText: {
      fontSize: 13,
      color: colors.textSecondary,
      marginTop: 8,
    },
    convertSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.sm,
    },
    adsAvailableBadge: {
      backgroundColor: '#10B98120',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.full,
      marginBottom: spacing.md,
    },
    adsAvailableText: {
      color: '#10B981',
      fontWeight: '600',
      fontSize: 14,
    },
    convertButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
      width: '100%',
    },
    convertButtonGradient: {
      paddingVertical: spacing.md + 4,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
    },
    convertButtonEmoji: {
      fontSize: 20,
      marginRight: spacing.sm,
    },
    convertButtonText: {
      color: '#fff',
      fontSize: 17,
      fontWeight: '700',
    },
    convertHint: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    noAdsContainer: {
      backgroundColor: colors.backgroundCard,
      borderRadius: borderRadius.xl,
      padding: spacing.xl,
      alignItems: 'center',
      width: '100%',
    },
    noAdsIcon: {
      fontSize: 48,
      marginBottom: spacing.sm,
    },
    noAdsTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.xs,
    },
    noAdsText: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.md,
    },
    nextAdProgress: {
      width: '80%',
      height: 8,
      backgroundColor: colors.border,
      borderRadius: 4,
      overflow: 'hidden',
    },
    nextAdProgressBar: {
      height: '100%',
      backgroundColor: '#10B981',
      borderRadius: 4,
    },
    goalsSection: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    goalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    goalItem: {
      width: '23%',
      backgroundColor: colors.backgroundCard,
      borderRadius: borderRadius.lg,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      alignItems: 'center',
    },
    goalItemReached: {
      backgroundColor: '#10B98115',
      borderWidth: 1.5,
      borderColor: '#10B981',
    },
    goalIcon: {
      fontSize: 16,
      marginBottom: 4,
    },
    goalProgress: {
      width: '100%',
      height: 3,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginTop: 6,
      overflow: 'hidden',
    },
    goalProgressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    goalSteps: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.textPrimary,
    },
    goalReward: {
      fontSize: 10,
      color: colors.textSecondary,
      marginTop: 2,
    },
    goalTextReached: {
      color: '#10B981',
    },
    streakSection: {
      marginBottom: spacing.xl,
    },
    streakCard: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundCard,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    streakInfo: {
      flex: 1,
      alignItems: 'center',
    },
    streakNumber: {
      fontSize: 40,
      fontWeight: '800',
      color: '#10B981',
    },
    streakLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    streakDivider: {
      width: 1,
      height: 50,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    streakHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.md,
      backgroundColor: colors.backgroundCard,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
    },
  });

export default StepsScreen;
