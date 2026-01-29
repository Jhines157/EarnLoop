import { Platform } from 'react-native';
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
} from 'react-native-health';

// Step tracking configuration
export const STEP_CONFIG = {
  STEPS_PER_AD: 1000,        // 1000 steps = 1 ad to watch
  CREDITS_PER_AD: 10,        // Each ad = 10 credits
  MAX_DAILY_STEPS: 30000,    // Max 30k steps per day
  MAX_DAILY_ADS: 30,         // Max 30 ads from steps per day
  MAX_DAILY_CREDITS: 300,    // Max 300 credits from steps per day
};

// HealthKit permissions
const permissions: HealthKitPermissions = {
  permissions: {
    read: [AppleHealthKit.Constants.Permissions.StepCount],
    write: [],
  },
};

class HealthKitService {
  private isInitialized = false;
  private isAvailable = false;

  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'ios') {
      console.log('HealthKit is only available on iOS');
      return false;
    }

    return new Promise((resolve) => {
      AppleHealthKit.isAvailable((err, available) => {
        if (err || !available) {
          console.log('HealthKit not available:', err);
          this.isAvailable = false;
          resolve(false);
          return;
        }

        this.isAvailable = true;

        AppleHealthKit.initHealthKit(permissions, (initErr) => {
          if (initErr) {
            console.log('HealthKit init error:', initErr);
            resolve(false);
            return;
          }

          this.isInitialized = true;
          console.log('HealthKit initialized successfully');
          resolve(true);
        });
      });
    });
  }

  isReady(): boolean {
    return this.isInitialized && this.isAvailable;
  }

  // Get today's step count
  async getTodaySteps(): Promise<number> {
    if (!this.isReady()) {
      console.log('HealthKit not ready, returning 0 steps');
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        date: new Date().toISOString(),
        includeManuallyAdded: false, // Don't count manually added steps (anti-cheat)
      };

      AppleHealthKit.getStepCount(options, (err, results) => {
        if (err) {
          console.log('Error getting step count:', err);
          resolve(0);
          return;
        }

        const steps = Math.floor(results?.value || 0);
        console.log('Today steps:', steps);
        resolve(steps);
      });
    });
  }

  // Get steps for a specific date
  async getStepsForDate(date: Date): Promise<number> {
    if (!this.isReady()) {
      return 0;
    }

    return new Promise((resolve) => {
      const options: HealthInputOptions = {
        date: date.toISOString(),
        includeManuallyAdded: false,
      };

      AppleHealthKit.getStepCount(options, (err, results) => {
        if (err) {
          resolve(0);
          return;
        }

        resolve(Math.floor(results?.value || 0));
      });
    });
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
