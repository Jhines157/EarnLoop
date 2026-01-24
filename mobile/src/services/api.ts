import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS, API_URL } from '../utils/constants';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
  };
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async loadToken(): Promise<boolean> {
    this.token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);
    return !!this.token; // Return true if token exists
  }

  setToken(token: string) {
    this.token = token;
    SecureStore.setItemAsync(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  clearToken() {
    this.token = null;
    SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeout: number = 60000 // 60 second timeout - very generous for debugging
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
      ...options.headers,
    };

    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      // Check if response is JSON before parsing
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error(`❌ Non-JSON response from ${endpoint}:`, contentType);
        return {
          success: false,
          error: {
            message: 'Server returned non-JSON response. Try opening the API URL in browser first.',
            code: 'INVALID_RESPONSE',
          },
        };
      }

      const data = await response.json();
      
      console.log(`✅ API Response: ${response.status}`, data.success ? 'success' : data.error);

      if (!response.ok) {
        return {
          success: false,
          error: data.error || { message: 'Request failed', code: 'REQUEST_FAILED' },
        };
      }

      return data;
    } catch (error) {
      console.error(`❌ API Error: ${endpoint}`, error);
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'Network error',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }

  // Auth endpoints
  async signup(email: string, password: string, deviceFingerprint?: string) {
    return this.request<{ user: any; token: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceFingerprint }),
    });
  }

  async login(email: string, password: string, deviceFingerprint?: string) {
    return this.request<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, deviceFingerprint }),
    });
  }

  // User endpoints
  async getMe() {
    return this.request<{
      user: any;
      balance: { current: number; lifetimeEarned: number; lifetimeSpent: number; tokens: number };
      streak: { current: number; longest: number; lastCheckin: string | null };
    }>('/me');
  }

  async getHistory(limit = 50, offset = 0) {
    return this.request<{ history: any[] }>(`/me/history?limit=${limit}&offset=${offset}`);
  }

  // Earn endpoints
  async checkin() {
    return this.request<{
      creditsEarned: number;
      newBalance: number;
      streak: { current_streak: number; longest_streak: number };
    }>('/earn/checkin', { method: 'POST' });
  }

  async completeRewardedAd(adUnitId: string, rewardToken?: string) {
    return this.request<{
      creditsEarned: number;
      newBalance: number;
      adsRemainingToday: number;
    }>('/earn/rewarded-ad-complete', {
      method: 'POST',
      body: JSON.stringify({ adUnitId, rewardToken, timestamp: Date.now() }),
    });
  }

  async completeLearnModule(moduleId: string, quizScore: number) {
    return this.request<{
      creditsEarned: number;
      newBalance: number;
      moduleId: string;
      quizScore: number;
    }>('/earn/learn-complete', {
      method: 'POST',
      body: JSON.stringify({ moduleId, quizScore }),
    });
  }

  async getEarnStatus() {
    return this.request<{
      todayEarned: number;
      dailyCap: number;
      remaining: number;
      percentUsed: number;
      adsWatchedToday: number;
      maxAdsPerDay: number;
      adsRemaining: number;
      checkedInToday: boolean;
    }>('/earn/status');
  }

  // Store endpoints
  async getStoreItems() {
    return this.request<{
      items: any[];
      balance: number;
    }>('/store/items');
  }

  async redeemItem(itemId: string, email?: string) {
    return this.request<{
      message: string;
      item: any;
      creditsSpent: number;
      newBalance: number;
    }>('/store/redeem', {
      method: 'POST',
      body: JSON.stringify({ itemId, email }),
    });
  }

  async getMyRewards() {
    return this.request<{ rewards: any[] }>('/store/my-rewards');
  }

  async getInventory() {
    return this.request<{
      inventory: any[];
      streakSavers: number;
      activeXpBoost: {
        name: string;
        expiresAt: string;
        multiplier: number;
      } | null;
    }>('/store/inventory');
  }

  async deleteAccount() {
    return this.request<{ message: string }>('/auth/delete-account', {
      method: 'DELETE',
    });
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Giveaway endpoints
  async getGiveawayEntries() {
    return this.request<{
      entries: Record<string, { free: boolean; bonus: number; paid: number }>;
    }>('/giveaway/entries');
  }

  async claimFreeEntry(giveawayId: string) {
    return this.request<{
      message: string;
      giveawayId: string;
      entryType: string;
    }>('/giveaway/claim-free', {
      method: 'POST',
      body: JSON.stringify({ giveawayId }),
    });
  }

  async buyGiveawayEntry(giveawayId: string) {
    return this.request<{
      message: string;
      giveawayId: string;
      entriesBought: number;
      creditsSpent: number;
      newBalance: number;
    }>('/giveaway/buy-entry', {
      method: 'POST',
      body: JSON.stringify({ giveawayId }),
    });
  }

  async earnBonusEntry(giveawayId: string, engagementType: string) {
    return this.request<{
      message: string;
      giveawayId: string;
      bonusEntries: number;
      engagementType: string;
    }>('/giveaway/earn-bonus', {
      method: 'POST',
      body: JSON.stringify({ giveawayId, engagementType }),
    });
  }

  // Password reset endpoints
  async forgotPassword(email: string) {
    return this.request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    return this.request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  // Token spending endpoints
  async spendTokens(action: 'jackpot_spin' | 'mystery_bag', tokensSpent: number, itemId?: string) {
    return this.request<{
      action: string;
      tokensSpent: number;
      tokensWon: number;
      creditsWon: number;
      multiplier: number;
      message: string;
      newTokenBalance: number;
      newCreditsBalance: number;
    }>('/store/spend-tokens', {
      method: 'POST',
      body: JSON.stringify({ action, tokensSpent, itemId }),
    });
  }
}

// Log the API URL on initialization for debugging
console.log('🔗 API Base URL:', API_URL);

export const api = new ApiClient(API_URL);
export default api;
