// AdMob Service for EarnLoop
// Publisher ID: pub-8186263051960596

import { Platform } from 'react-native';
import mobileAds, {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
} from 'react-native-google-mobile-ads';
import trackingService from '../utils/trackingTransparency';

// Test Ad Unit IDs (use these during development)
const TEST_AD_UNITS = {
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313', // Google test ad
  },
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917', // Google test ad
  },
};

// Production Ad Unit IDs - EarnLoop
// App ID: ca-app-pub-8186263051960596~6781669729
const PRODUCTION_AD_UNITS = {
  ios: {
    rewarded: 'ca-app-pub-8186263051960596/2549908533',
  },
  android: {
    rewarded: 'ca-app-pub-8186263051960596/2549908533',
  },
};

// FORCE TEST ADS for debugging - set to false for production release
const FORCE_TEST_ADS = false;

// Use test ads when forcing OR in dev mode
const useTestAds = FORCE_TEST_ADS || __DEV__;

// Get the correct ad unit ID
const getRewardedAdUnitId = (): string => {
  if (useTestAds) {
    return Platform.OS === 'ios' 
      ? TEST_AD_UNITS.ios.rewarded 
      : TEST_AD_UNITS.android.rewarded;
  }
  return Platform.OS === 'ios'
    ? PRODUCTION_AD_UNITS.ios.rewarded
    : PRODUCTION_AD_UNITS.android.rewarded;
};

class AdMobService {
  private isInitialized = false;
  private rewardedAd: RewardedAd | null = null;
  private isAdLoading = false;
  private _isAdReady = false;
  private usePersonalizedAds = false;
  private loadAttempts = 0;
  private maxLoadAttempts = 3;
  private lastError: string | null = null;
  private sdkLoaded = false;
  
  // Track pending reward to show after ad closes
  private pendingReward: { type: string; amount: number } | null = null;
  private rewardCallback: ((reward: { type: string; amount: number }) => void) | null = null;
  private closedCallback: (() => void) | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('📺 AdMob already initialized');
      return;
    }

    console.log('🚀 Starting AdMob initialization...');
    console.log(`📺 Using ${useTestAds ? 'TEST' : 'PRODUCTION'} ads`);
    console.log(`📺 Ad Unit ID: ${getRewardedAdUnitId()}`);

    try {
      // Initialize ATT first (iOS 14.5+ requirement)
      if (Platform.OS === 'ios') {
        console.log('📱 Initializing tracking transparency...');
        try {
          await trackingService.initialize();
          const status = await trackingService.requestPermission();
          this.usePersonalizedAds = trackingService.canShowPersonalizedAds();
          console.log(`📱 ATT Status: ${status}, Personalized Ads: ${this.usePersonalizedAds}`);
        } catch (attError) {
          console.log('⚠️ ATT request failed, using non-personalized ads:', attError);
          this.usePersonalizedAds = false;
        }
      }

      // Initialize AdMob SDK
      console.log('📺 Initializing AdMob SDK...');
      await mobileAds().initialize();
      console.log('✅ AdMob SDK initialized successfully!');
      
      this.sdkLoaded = true;
      this.isInitialized = true;
      
      // Preload a rewarded ad
      console.log('📺 Preloading first rewarded ad...');
      this.loadRewardedAd();
      
    } catch (error) {
      console.log('❌ AdMob initialization FAILED:', error);
      this.lastError = `SDK init failed: ${String(error)}`;
      this.isInitialized = true;
      this.sdkLoaded = false;
    }
  }

  loadRewardedAd(): void {
    if (!this.sdkLoaded) {
      console.log('❌ Cannot load ad - SDK not loaded');
      this.lastError = 'AdMob SDK not initialized';
      return;
    }

    if (this.isAdLoading) {
      console.log('⏳ Ad already loading, skipping...');
      return;
    }
    
    if (this._isAdReady) {
      console.log('✅ Ad already ready');
      return;
    }
    
    this.isAdLoading = true;
    this.loadAttempts++;

    const adUnitId = getRewardedAdUnitId();
    console.log(`📺 Loading rewarded ad: ${adUnitId} (attempt ${this.loadAttempts}/${this.maxLoadAttempts})`);

    // Clean up previous ad if exists
    if (this.rewardedAd) {
      try {
        this.rewardedAd.removeAllListeners();
      } catch (e) {
        // Ignore cleanup errors
      }
    }

    // Create the rewarded ad
    this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: !this.usePersonalizedAds,
    });

    // Handle ad loaded
    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      console.log('✅ Rewarded ad loaded successfully!');
      this._isAdReady = true;
      this.isAdLoading = false;
      this.loadAttempts = 0;
      this.lastError = null;
    });

    // Handle earned reward - store it, don't trigger callback yet
    this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
      console.log('🎉 User earned reward (storing for after ad closes):', reward);
      this.pendingReward = { type: 'credits', amount: 10 };
    });

    // Handle ad errors
    this.rewardedAd.addAdEventListener(AdEventType.ERROR, (error) => {
      console.log('❌ Ad failed to load:', error);
      this.lastError = error?.message || String(error);
      this.isAdLoading = false;
      this._isAdReady = false;
      
      // Retry loading after a delay
      if (this.loadAttempts < this.maxLoadAttempts) {
        console.log(`🔄 Retrying in 5 seconds... (attempt ${this.loadAttempts + 1})`);
        setTimeout(() => this.loadRewardedAd(), 5000);
      } else {
        console.log('❌ Max attempts reached. Error:', this.lastError);
      }
    });

    // Handle ad closed - NOW trigger the reward callback
    this.rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
      console.log('📺 Ad closed');
      this._isAdReady = false;
      
      // If user earned a reward, trigger the callback now
      if (this.pendingReward && this.rewardCallback) {
        console.log('💰 Triggering reward callback after ad closed');
        this.rewardCallback(this.pendingReward);
        this.pendingReward = null;
      }
      
      // Trigger closed callback
      if (this.closedCallback) {
        this.closedCallback();
      }
      
      // Clear callbacks
      this.rewardCallback = null;
      this.closedCallback = null;
      
      // Preload next ad
      setTimeout(() => {
        this.loadAttempts = 0;
        this.loadRewardedAd();
      }, 1000);
    });

    // Load the ad
    this.rewardedAd.load();
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number; error?: string }> {
    if (!this.sdkLoaded) {
      return { success: false, error: 'AdMob SDK not initialized' };
    }

    if (!this.rewardedAd) {
      return { success: false, error: 'No ad object created' };
    }

    if (!this._isAdReady) {
      console.log('⏳ Ad not ready, triggering load...');
      this.loadAttempts = 0;
      this.loadRewardedAd();
      return { success: false, error: 'Ad is loading. Please wait and try again.' };
    }

    try {
      console.log('📺 Showing rewarded ad...');
      await this.rewardedAd.show();
      this._isAdReady = false;
      return { success: true, reward: 10 };
    } catch (error) {
      console.log('❌ Failed to show ad:', error);
      this._isAdReady = false;
      this.loadAttempts = 0;
      this.loadRewardedAd();
      return { success: false, error: String(error) };
    }
  }

  isRewardedAdReady(): boolean {
    return this._isAdReady && this.rewardedAd !== null;
  }

  getLastError(): string | null {
    return this.lastError;
  }

  getLoadingStatus() {
    return {
      isLoading: this.isAdLoading,
      attempts: this.loadAttempts,
      maxAttempts: this.maxLoadAttempts,
      sdkLoaded: this.sdkLoaded,
    };
  }

  isSdkLoaded(): boolean {
    return this.sdkLoaded;
  }

  // Aliases for EarnScreen compatibility
  isAdReady(): boolean {
    return this.isRewardedAdReady();
  }

  loadAd(): void {
    this.loadRewardedAd();
  }

  async showAd(callbacks: {
    onEarnedReward?: (reward: { type: string; amount: number }) => void;
    onAdClosed?: () => void;
    onAdFailedToLoad?: (error: any) => void;
  }): Promise<void> {
    // Store callbacks to be triggered when ad closes
    this.rewardCallback = callbacks.onEarnedReward || null;
    this.closedCallback = callbacks.onAdClosed || null;
    this.pendingReward = null; // Reset pending reward
    
    const result = await this.showRewardedAd();
    
    // Only trigger failure callback immediately - success is handled on ad close
    if (!result.success) {
      callbacks.onAdFailedToLoad?.(result.error);
      // Clear callbacks on failure
      this.rewardCallback = null;
      this.closedCallback = null;
    }
  }
}

// Export singleton instance
const adMobService = new AdMobService();
export default adMobService;
