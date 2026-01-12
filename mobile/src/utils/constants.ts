// API Configuration
// Production URL (Railway)
export const API_URL = 'https://earnloop-production.up.railway.app';

// Earn limits (should match backend)
export const EARN_CONFIG = {
  DAILY_CREDIT_CAP: 100, // Only applies to non-ad earnings
  CHECKIN_REWARD: 5,
  AD_REWARD: 10,
  LEARN_REWARD: 15,
  ADS_UNLIMITED: true, // No cap on ads - watch as many as you want!
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_DATA: 'user_data',
  DEVICE_ID: 'device_id',
  ONBOARDING_COMPLETE: 'onboarding_complete',
};

// Screen names
export const SCREENS = {
  // Auth
  ONBOARDING: 'Onboarding',
  LOGIN: 'Login',
  SIGNUP: 'Signup',
  
  // Main tabs
  HOME: 'Home',
  EARN: 'Earn',
  REWARDS: 'Rewards',
  WALLET: 'Wallet',
  PROFILE: 'Profile',
  
  // Sub screens
  LEARN_MODULE: 'LearnModule',
  REWARD_DETAIL: 'RewardDetail',
  SETTINGS: 'Settings',
  SUPPORT: 'Support',
  TERMS: 'Terms',
  PRIVACY: 'Privacy',
};

// Event types (matches backend)
export const EARN_TYPES = {
  CHECKIN: 'checkin',
  REWARDED_AD: 'rewarded_ad',
  LEARN_MODULE: 'learn_module',
};

// Item types
export const ITEM_TYPES = {
  SUBSCRIPTION: 'subscription',
  FEATURE: 'feature',
  COSMETIC: 'cosmetic',
};

// UI text (single source of truth for copy)
export const UI_TEXT = {
  APP_NAME: 'EarnLoop',
  TAGLINE: 'Earn credits. Win prizes.',
  
  // Disclaimers
  APP_DISCLAIMER: 'Earn credits by engaging with the app. Enter giveaways for a chance to win real prizes!',
  CREDITS_ONLY: 'Credits are non-transferable and have no cash value.',
  
  // Buttons
  CHECKIN: 'Daily Check-In',
  WATCH_AD: 'Watch Ad',
  LEARN: 'Learn & Earn',
  REDEEM: 'Redeem',
  
  // Status
  LOADING: 'Loading...',
  ERROR: 'Something went wrong',
  RETRY: 'Try Again',
  
  // Empty states
  NO_REWARDS: 'No rewards yet',
  NO_HISTORY: 'No activity yet',
};
