/**
 * Navigation type definitions for EarnLoop
 */

// Root stack param list (authenticated)
export type RootStackParamList = {
  MainTabs: undefined;
  Learn: undefined;
  ChangePassword: undefined;
};

// Tab navigator param list
export type MainTabParamList = {
  Home: undefined;
  Earn: undefined;
  Steps: undefined;
  Rewards: undefined;
  Raffles: undefined;
  Profile: undefined;
};

// Auth stack param list
export type AuthStackParamList = {
  Onboarding: undefined;
  Login: undefined;
  Signup: undefined;
  ForgotPassword: undefined;
};

// Combined navigation types
export type AppStackParamList = RootStackParamList & AuthStackParamList;
