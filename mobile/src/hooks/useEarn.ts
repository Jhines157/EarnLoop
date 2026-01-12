import { useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

interface EarnStatus {
  todayEarned: number;
  dailyCap: number;
  remaining: number;
  percentUsed: number;
  adsWatchedToday: number;
  maxAdsPerDay: number;
  adsRemaining: number;
  checkedInToday: boolean;
}

export const useEarn = () => {
  const { updateBalance, updateStreak } = useAuth();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<EarnStatus | null>(null);

  const loadStatus = useCallback(async () => {
    const response = await api.getEarnStatus();
    if (response.success && response.data) {
      setStatus(response.data);
    }
    return response;
  }, []);

  const checkin = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.checkin();
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        updateStreak({
          current: response.data.streak.current_streak,
          longest: response.data.streak.longest_streak,
        });
        await loadStatus();
      }
      return response;
    } finally {
      setLoading(false);
    }
  }, [updateBalance, updateStreak, loadStatus]);

  const watchAd = useCallback(async (adUnitId: string, rewardToken?: string) => {
    setLoading(true);
    try {
      const response = await api.completeRewardedAd(adUnitId, rewardToken);
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        await loadStatus();
      }
      return response;
    } finally {
      setLoading(false);
    }
  }, [updateBalance, loadStatus]);

  const completeLearnModule = useCallback(async (moduleId: string, quizScore: number) => {
    setLoading(true);
    try {
      const response = await api.completeLearnModule(moduleId, quizScore);
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        await loadStatus();
      }
      return response;
    } finally {
      setLoading(false);
    }
  }, [updateBalance, loadStatus]);

  return {
    loading,
    status,
    loadStatus,
    checkin,
    watchAd,
    completeLearnModule,
  };
};

export default useEarn;
