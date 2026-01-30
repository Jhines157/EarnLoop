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
            
            {/* Milestone markers positioned around ring */}
            {[5000, 10000, 15000, 20000, 25000, 30000].map((milestone) => {
              const progress = milestone / STEP_CONFIG.MAX_DAILY_STEPS;
              const angleRad = (progress * 2 * Math.PI) - (Math.PI / 2); // Start from top
              const markerRadius = RING_SIZE / 2 + 25; // Outside the ring
              const x = RING_SIZE / 2 + Math.cos(angleRad) * markerRadius;
              const y = RING_SIZE / 2 + Math.sin(angleRad) * markerRadius;
              const reached = todaySteps >= milestone;
              
              return (
                <View
                  key={milestone}
                  style={[
                    styles.milestoneMarker,
                    {
                      left: x - 18,
                      top: y - 12,
                    },
                  ]}
                >
                  <View style={[styles.milestoneBadge, reached && styles.milestoneBadgeReached]}>
                    <Text style={[styles.milestoneText, reached && styles.milestoneTextReached]}>
                      {reached ? '✓' : `${milestone / 1000}k`}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
          
          {/* Center content */}
          <View style={styles.ringCenter}>
            <Text style={styles.stepsEmoji}>👟</Text>
            <Text style={styles.stepCount}>{todaySteps.toLocaleString()}</Text>
            <Text style={styles.stepLabel}>steps today</Text>
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>Goal: {(STEP_CONFIG.MAX_DAILY_STEPS / 1000).toFixed(0)}k</Text>
            </View>
          </View>
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
            <ExpoGradient
              colors={adsAvailable > 0 ? ['#10B981', '#059669'] : [colors.backgroundCard, colors.backgroundCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.convertButtonGradient}
            >
              <Text style={[styles.convertButtonText, adsAvailable <= 0 && { color: colors.textSecondary }]}>
                {converting ? '⏳ Loading...' : adsAvailable > 0 
                  ? `👟 Convert Steps → +${creditsAvailable} credits` 
                  : `🚶 Walk ${stepsToNextAd.toLocaleString()} more steps`}
              </Text>
            </ExpoGradient>
          </TouchableOpacity>
          
          {adsAvailable > 0 && (
            <View style={styles.convertInfo}>
              <Text style={styles.convertInfoText}>
                🎬 {adsAvailable} {adsAvailable === 1 ? 'ad' : 'ads'} ready to convert
              </Text>
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
                  <View style={styles.goalIconContainer}>
                    <Text style={styles.goalIcon}>{reached ? '✅' : '🎯'}</Text>
                  </View>
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

        {/* HealthKit Status */}
        {!healthKitReady && (
          <Animated.View entering={FadeIn.delay(600)} style={styles.healthKitWarning}>
            <View style={styles.warningHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>HealthKit Not Connected</Text>
            </View>
            <Text style={styles.warningText}>
              Enable HealthKit to start tracking your steps and earning credits!
            </Text>
            <TouchableOpacity style={styles.enableButton} onPress={openHealthKitSettings}>
              <ExpoGradient
                colors={['#10B981', '#059669']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.enableButtonGradient}
              >
                <Text style={styles.enableButtonText}>🔓 Enable HealthKit</Text>
              </ExpoGradient>
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
      color: colors.textPrimarySecondary,
      marginTop: 4,
    },
    ringContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
      paddingVertical: spacing.lg,
    },
    ringWrapper: {
      position: 'relative',
      width: RING_SIZE + 60,
      height: RING_SIZE + 60,
      alignItems: 'center',
      justifyContent: 'center',
    },
    ringCenter: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepsEmoji: {
      fontSize: 28,
      marginBottom: 4,
    },
    stepCount: {
      fontSize: 44,
      fontWeight: '800',
      color: colors.textPrimary,
      letterSpacing: -1,
    },
    stepLabel: {
      fontSize: 14,
      color: colors.textPrimarySecondary,
      marginTop: 2,
    },
    goalBadge: {
      marginTop: 8,
      backgroundColor: colors.backgroundCard,
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
    },
    goalBadgeText: {
      fontSize: 12,
      color: colors.textPrimarySecondary,
      fontWeight: '600',
    },
    milestoneMarker: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
    },
    milestoneBadge: {
      backgroundColor: colors.backgroundCard,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: borderRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
    },
    milestoneBadgeReached: {
      backgroundColor: '#10B98120',
      borderColor: '#10B981',
    },
    milestoneText: {
      fontSize: 10,
      color: colors.textPrimarySecondary,
      fontWeight: '700',
    },
    milestoneTextReached: {
      color: '#10B981',
    },
    convertSection: {
      alignItems: 'center',
      marginBottom: spacing.xl,
    },
    convertButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      minWidth: '90%',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    convertButtonGradient: {
      paddingVertical: spacing.md + 2,
      paddingHorizontal: spacing.xl,
      alignItems: 'center',
      justifyContent: 'center',
    },
    convertButtonDisabled: {
      shadowOpacity: 0,
    },
    convertButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700',
    },
    convertInfo: {
      marginTop: spacing.sm,
      backgroundColor: colors.backgroundCard,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: borderRadius.full,
    },
    convertInfoText: {
      fontSize: 12,
      color: colors.textPrimarySecondary,
      fontWeight: '500',
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
    goalIconContainer: {
      marginBottom: 4,
    },
    goalIcon: {
      fontSize: 16,
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
      color: colors.textPrimarySecondary,
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
      color: colors.textPrimarySecondary,
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
      color: colors.textPrimarySecondary,
      textAlign: 'center',
      marginTop: spacing.md,
      backgroundColor: colors.backgroundCard,
      padding: spacing.sm,
      borderRadius: borderRadius.md,
    },
    healthKitWarning: {
      backgroundColor: '#F59E0B15',
      padding: spacing.lg,
      borderRadius: borderRadius.lg,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#F59E0B40',
    },
    warningHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },
    warningIcon: {
      fontSize: 20,
      marginRight: 8,
    },
    warningTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: '#F59E0B',
    },
    warningText: {
      color: colors.textPrimarySecondary,
      textAlign: 'center',
      marginBottom: spacing.md,
      fontSize: 14,
    },
    enableButton: {
      borderRadius: borderRadius.full,
      overflow: 'hidden',
      shadowColor: '#10B981',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 4,
    },
    enableButtonGradient: {
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.xl,
    },
    enableButtonText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 15,
    },
  });

export default StepsScreen;
