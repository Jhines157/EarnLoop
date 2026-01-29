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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import healthKitService, { STEP_CONFIG } from '../services/healthKit';
import adMobService from '../services/adMob';
import { spacing, borderRadius, typography } from '../utils/theme';

const { width } = Dimensions.get('window');
const RING_SIZE = width * 0.65;
const STROKE_WIDTH = 20;
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

  const initializeHealthKit = async () => {
    const ready = await healthKitService.initialize();
    setHealthKitReady(ready);
    if (ready) {
      const steps = await healthKitService.getTodaySteps();
      setTodaySteps(steps);
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
                    style: 'cancel',
                    onPress: () => {
                      setSessionAdsWatched(0);
                      setSessionCreditsEarned(0);
                      loadStepData();
                    },
                  },
                  remainingAds > 0 ? {
                    text: '▶️ Convert Another',
                    style: 'default',
                    onPress: () => {
                      loadStepData();
                      setTimeout(() => handleConvertSteps(), 300);
                    },
                  } : {
                    text: 'Keep Walking! 🚶',
                    style: 'default',
                    onPress: () => loadStepData(),
                  },
                ].filter(Boolean)
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
          <Svg width={RING_SIZE} height={RING_SIZE}>
            <G rotation="-90" origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}>
              {/* Background circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.surface}
                strokeWidth={STROKE_WIDTH}
                fill="none"
              />
              {/* Progress circle */}
              <Circle
                cx={RING_SIZE / 2}
                cy={RING_SIZE / 2}
                r={RADIUS}
                stroke={colors.primary}
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
            <Text style={styles.goalText}>Goal: {STEP_CONFIG.MAX_DAILY_STEPS.toLocaleString()}</Text>
          </View>

          {/* Milestone markers around ring */}
          {[5000, 10000, 15000, 20000, 25000, 30000].map((milestone, index) => {
            const angle = (milestone / STEP_CONFIG.MAX_DAILY_STEPS) * 360 - 90;
            const reached = todaySteps >= milestone;
            return (
              <View
                key={milestone}
                style={[
                  styles.milestoneMarker,
                  {
                    transform: [
                      { rotate: `${angle}deg` },
                      { translateX: RING_SIZE / 2 - 15 },
                    ],
                  },
                ]}
              >
                <Text style={[styles.milestoneText, reached && styles.milestoneReached]}>
                  {reached ? '✓' : `${milestone / 1000}k`}
                </Text>
              </View>
            );
          })}
        </Animated.View>

        {/* Convert Button */}
        <Animated.View entering={FadeInUp.delay(300)} style={styles.convertSection}>
          <TouchableOpacity
            style={[
              styles.convertButton,
              adsAvailable <= 0 && styles.convertButtonDisabled,
            ]}
            onPress={handleConvertSteps}
            disabled={converting || adsAvailable <= 0}
          >
            <Text style={styles.convertButtonText}>
              {converting ? '⏳ Loading...' : adsAvailable > 0 
                ? `🚶 Convert Steps (+${creditsAvailable} credits)` 
                : `Walk ${stepsToNextAd.toLocaleString()} more steps`}
            </Text>
          </TouchableOpacity>
          
          {adsAvailable > 0 && (
            <Text style={styles.convertSubtext}>
              {adsAvailable} ads available • Watch to earn {creditsAvailable} credits
            </Text>
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
                  <View style={styles.goalProgress}>
                    <View style={[styles.goalProgressBar, { width: `${progress * 100}%` }]} />
                  </View>
                  <Text style={[styles.goalSteps, reached && styles.goalTextReached]}>
                    {reached ? '✓' : ''} {(goal.goal / 1000).toFixed(0)}k
                  </Text>
                  <Text style={[styles.goalReward, reached && styles.goalTextReached]}>
                    +{goal.rewards}
                  </Text>
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
            Convert at least 1 ad from steps daily to maintain your streak!
          </Text>
        </Animated.View>

        {/* HealthKit Status */}
        {!healthKitReady && (
          <Animated.View entering={FadeInUp.delay(600)} style={styles.healthKitWarning}>
            <Text style={styles.warningText}>
              ⚠️ Step tracking requires HealthKit access. Please enable it in Settings.
            </Text>
            <TouchableOpacity style={styles.enableButton} onPress={initializeHealthKit}>
              <Text style={styles.enableButtonText}>Enable HealthKit</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
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
    headerStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: spacing.lg,
    },
    statItem: {
      alignItems: 'center',
    },
    statValue: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.lg,
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
    },
    stepCount: {
      fontSize: 42,
      fontWeight: '800',
      color: colors.text,
    },
    stepLabel: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    goalText: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 4,
    },
    milestoneMarker: {
      position: 'absolute',
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
    },
    milestoneText: {
      fontSize: 10,
      color: colors.textSecondary,
      fontWeight: '600',
    },
    milestoneReached: {
      color: colors.success,
      fontSize: 14,
    },
    convertSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    convertButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.xl,
      borderRadius: borderRadius.full,
      minWidth: '80%',
      alignItems: 'center',
    },
    convertButtonDisabled: {
      backgroundColor: colors.surface,
    },
    convertButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    convertSubtext: {
      marginTop: spacing.sm,
      fontSize: 12,
      color: colors.textSecondary,
    },
    goalsSection: {
      marginBottom: spacing.xl,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },
    goalsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },
    goalItem: {
      width: '23%',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      alignItems: 'center',
    },
    goalItemReached: {
      backgroundColor: colors.success + '20',
      borderWidth: 1,
      borderColor: colors.success,
    },
    goalProgress: {
      width: '100%',
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      marginBottom: 4,
      overflow: 'hidden',
    },
    goalProgressBar: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    goalSteps: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
    },
    goalReward: {
      fontSize: 10,
      color: colors.textSecondary,
    },
    goalTextReached: {
      color: colors.success,
    },
    streakSection: {
      marginBottom: spacing.xl,
    },
    streakCard: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    streakInfo: {
      flex: 1,
      alignItems: 'center',
    },
    streakNumber: {
      fontSize: 36,
      fontWeight: '800',
      color: colors.primary,
    },
    streakLabel: {
      fontSize: 12,
      color: colors.textSecondary,
    },
    streakDivider: {
      width: 1,
      height: 50,
      backgroundColor: colors.border,
    },
    streakHint: {
      fontSize: 12,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
    },
    healthKitWarning: {
      backgroundColor: colors.warning + '20',
      padding: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
    },
    warningText: {
      color: colors.warning,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    enableButton: {
      backgroundColor: colors.primary,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: borderRadius.full,
    },
    enableButtonText: {
      color: '#fff',
      fontWeight: '600',
    },
  });

export default StepsScreen;
