// AdMob Service for EarnLoop
// Publisher ID: pub-8186263051960596

import { Platform } from 'react-native';

// Test Ad Unit IDs (use these during development)
// Replace with your real Ad Unit IDs from AdMob console for production
const TEST_AD_UNITS = {
  ios: {
    rewarded: 'ca-app-pub-3940256099942544/1712485313', // Google test ad
    interstitial: 'ca-app-pub-3940256099942544/4411468910',
    banner: 'ca-app-pub-3940256099942544/2934735716',
  },
  android: {
    rewarded: 'ca-app-pub-3940256099942544/5224354917', // Google test ad
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
    banner: 'ca-app-pub-3940256099942544/6300978111',
  },
};

// Production Ad Unit IDs - EarnLoop
// App ID: ca-app-pub-8186263051960596~6781669729
const PRODUCTION_AD_UNITS = {
  ios: {
    rewarded: 'ca-app-pub-8186263051960596/2549908533',
    interstitial: 'ca-app-pub-8186263051960596/2549908533', // Use rewarded for now
    banner: 'ca-app-pub-8186263051960596/2549908533',
  },
  android: {
    rewarded: 'ca-app-pub-8186263051960596/2549908533',
    interstitial: 'ca-app-pub-8186263051960596/2549908533',
    banner: 'ca-app-pub-8186263051960596/2549908533',
  },
};

// Use test ads in development, production ads when published
const isDev = __DEV__;
const adUnits = isDev ? TEST_AD_UNITS : PRODUCTION_AD_UNITS;

import trackingService from '../utils/trackingTransparency';

class AdMobService {
  private isInitialized = false;
  private rewardedAd: any = null;
  private isAdLoading = false;
  private isAdReady = false;
  private usePersonalizedAds = false;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Initialize ATT first (iOS 14.5+ requirement)
      await trackingService.initialize();
      
      // Request tracking permission before loading ads
      // This MUST happen before AdMob initialization for proper ATT compliance
      if (Platform.OS === 'ios') {
        const status = await trackingService.requestPermission();
        this.usePersonalizedAds = trackingService.canShowPersonalizedAds();
        console.log(`📱 ATT Status: ${status}, Personalized Ads: ${this.usePersonalizedAds}`);
      }

      // Note: react-native-google-mobile-ads requires a development build
      // It won't work in Expo Go - you need to run: npx expo prebuild && npx expo run:ios
      const { default: mobileAds } = await import('react-native-google-mobile-ads');
      
      await mobileAds().initialize();
      console.log('✅ AdMob initialized');
      this.isInitialized = true;
      
      // Preload a rewarded ad
      this.loadRewardedAd();
    } catch (error) {
      console.log('⚠️ AdMob not available (requires development build):', error);
      // In Expo Go, we'll simulate ads
      this.isInitialized = true;
    }
  }

  async loadRewardedAd() {
    if (this.isAdLoading || this.isAdReady) return;
    
    this.isAdLoading = true;

    try {
      const { RewardedAd, RewardedAdEventType, TestIds } = await import('react-native-google-mobile-ads');
      
      const adUnitId = Platform.select({
        ios: adUnits.ios.rewarded,
        android: adUnits.android.rewarded,
      }) || TestIds.REWARDED;

      this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
        // Respect user's ATT choice - show non-personalized if tracking denied
        requestNonPersonalizedAdsOnly: !this.usePersonalizedAds,
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        console.log('✅ Rewarded ad loaded');
        this.isAdReady = true;
        this.isAdLoading = false;
      });

      this.rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward: any) => {
        console.log('🎉 User earned reward:', reward);
      });

      this.rewardedAd.load();
    } catch (error) {
      console.log('⚠️ Could not load rewarded ad:', error);
      this.isAdLoading = false;
    }
  }

  async showRewardedAd(): Promise<{ success: boolean; reward?: number }> {
    // In Expo Go, simulate ad watching
    if (!this.rewardedAd) {
      console.log('📺 Simulating ad watch (Expo Go mode)');
      // Simulate a 2-second ad
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { success: true, reward: 10 };
    }

    if (!this.isAdReady) {
      console.log('⏳ Ad not ready, loading...');
      await this.loadRewardedAd();
      return { success: false };
    }

    try {
      await this.rewardedAd.show();
      this.isAdReady = false;
      
      // Preload next ad
      setTimeout(() => this.loadRewardedAd(), 1000);
      
      return { success: true, reward: 10 };
    } catch (error) {
      console.log('❌ Failed to show ad:', error);
      this.isAdReady = false;
      this.loadRewardedAd();
      return { success: false };
    }
  }

  isRewardedAdReady(): boolean {
    // In Expo Go, always return true (we'll simulate)
    if (!this.rewardedAd) return true;
    return this.isAdReady;
  }

  // Alias for compatibility with EarnScreen
  isAdReadyFn(): boolean {
    return this.isRewardedAdReady();
  }

  // Load ad alias
  loadAd() {
    return this.loadRewardedAd();
  }

  // Show ad with callbacks (for EarnScreen compatibility)
  async showAd(callbacks: {
    onEarnedReward?: (reward: { type: string; amount: number }) => void;
    onAdClosed?: () => void;
    onAdFailedToLoad?: (error: any) => void;
  }): Promise<void> {
    const result = await this.showRewardedAd();
    
    if (result.success && result.reward) {
      callbacks.onEarnedReward?.({ type: 'credits', amount: result.reward });
    } else if (!result.success) {
      callbacks.onAdFailedToLoad?.('Ad not available');
    }
    
    callbacks.onAdClosed?.();
  }
}

// Export singleton instance
const adMobService = new AdMobService();

// Add isAdReady as a method reference for compatibility
(adMobService as any).isAdReady = () => adMobService.isRewardedAdReady();

export default adMobService;
