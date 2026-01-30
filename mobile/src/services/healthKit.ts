import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  queryStatisticsForQuantity,
  HKQuantityTypeIdentifier,
} from '@kingstinct/react-native-healthkit';

// Step tracking configuration
export const STEP_CONFIG = {
  STEPS_PER_AD: 1000,        // 1000 steps = 1 ad to watch
  CREDITS_PER_AD: 10,        // Each ad = 10 credits
  MAX_DAILY_STEPS: 30000,    // Max 30k steps per day
  MAX_DAILY_ADS: 30,         // Max 30 ads from steps per day
  MAX_DAILY_CREDITS: 300,    // Max 300 credits from steps per day
};

class HealthKitService {
  private isInitialized = false;
  private isAvailable = false;
  private hasPermission = false;

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    try {
      // Check if HealthKit is available on this device
      const available = await isHealthDataAvailable();
      if (!available) {
        console.log('HealthKit not available on this device');
        this.isAvailable = false;
        return false;
      }

      this.isAvailable = true;

      // Request authorization to read step count
      await requestAuthorization([HKQuantityTypeIdentifier.stepCount]);

      // iOS doesn't tell us if permission was actually granted
      // So we try to read steps - if we get a result, we have permission
      const hasAccess = await this.checkActualPermission();
      this.hasPermission = hasAccess;
      this.isInitialized = hasAccess;
      
      console.log('HealthKit initialized, hasPermission:', hasAccess);
      return hasAccess;
    } catch (error) {
      console.log('HealthKit init error:', error);
      return false;
    }
  }

  // Actually try to read steps to check if we have permission
  async checkActualPermission(): Promise<boolean> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const result = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.stepCount,
        {
          from: startOfDay,
          to: now,
        }
      );

      // If we get here without error, we have permission
      // Note: result might be 0 steps, but that's okay - we have access
      return true;
    } catch (error) {
      console.log('No HealthKit permission:', error);
      return false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.isAvailable && this.hasPermission;
  }

  // Re-check permission status (call after user returns from Settings)
  async recheckPermission(): Promise<boolean> {
    if (!this.isAvailable) {
      return false;
    }
    
    const hasAccess = await this.checkActualPermission();
    this.hasPermission = hasAccess;
    this.isInitialized = hasAccess;
    return hasAccess;
  }

  // Get today's step count
  async getTodaySteps(): Promise<number> {
    if (!this.isReady()) {
      console.log('HealthKit not ready, returning 0 steps');
      return 0;
    }

    try {
      // Get start of today
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      const result = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.stepCount,
        {
          from: startOfDay,
          to: now,
        }
      );

      const steps = Math.floor(result?.sumQuantity?.quantity || 0);
      console.log('Today steps:', steps);
      return steps;
    } catch (error) {
      console.log('Error getting step count:', error);
      return 0;
    }
  }

  // Get steps for a specific date
  async getStepsForDate(date: Date): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    try {
      const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

      const result = await queryStatisticsForQuantity(
        HKQuantityTypeIdentifier.stepCount,
        {
          from: startOfDay,
          to: endOfDay,
        }
      );

      return Math.floor(result?.sumQuantity?.quantity || 0);
    } catch (error) {
      console.log('Error getting steps for date:', error);
      return 0;
    }
  }

  // Calculate how many ads can be unlocked from steps
  calculateAdsAvailable(steps: number, alreadyConverted: number): number {
    const totalPossibleAds = Math.floor(steps / STEP_CONFIG.STEPS_PER_AD);
    const remainingAds = Math.max(0, totalPossibleAds - alreadyConverted);
    const cappedAds = Math.min(remainingAds, STEP_CONFIG.MAX_DAILY_ADS - alreadyConverted);
    return Math.max(0, cappedAds);
  }

  // Calculate credits that can be earned
  calculateCreditsAvailable(steps: number, alreadyConverted: number): number {
    const adsAvailable = this.calculateAdsAvailable(steps, alreadyConverted);
    return adsAvailable * STEP_CONFIG.CREDITS_PER_AD;
  }

  // Get progress to next milestone
  getProgressToNextMilestone(steps: number): { current: number; next: number; progress: number } {
    const currentMilestone = Math.floor(steps / STEP_CONFIG.STEPS_PER_AD) * STEP_CONFIG.STEPS_PER_AD;
    const nextMilestone = currentMilestone + STEP_CONFIG.STEPS_PER_AD;
    const stepsInCurrentMilestone = steps - currentMilestone;
    const progress = stepsInCurrentMilestone / STEP_CONFIG.STEPS_PER_AD;
    
    return {
      current: currentMilestone,
      next: nextMilestone,
      progress: Math.min(1, progress),
    };
  }

  // Daily step goals
  getDailyGoals(): { goal: number; rewards: number }[] {
    return [
      { goal: 1000, rewards: 10 },
      { goal: 3000, rewards: 30 },
      { goal: 5000, rewards: 50 },
      { goal: 10000, rewards: 100 },
      { goal: 15000, rewards: 150 },
      { goal: 20000, rewards: 200 },
      { goal: 25000, rewards: 250 },
      { goal: 30000, rewards: 300 },
    ];
  }
}

export const healthKitService = new HealthKitService();
export default healthKitService;
