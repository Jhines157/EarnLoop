import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

interface User {
  id: string;
  email: string;
  createdAt: string;
  emailVerified: boolean;
}

interface Balance {
  current: number;
  lifetimeEarned: number;
  lifetimeSpent: number;
  tokens: number; // Fun tokens for jackpot/cosmetics (no cash value)
}

interface Streak {
  current: number;
  longest: number;
  lastCheckin: string | null;
}

interface AuthState {
  user: User | null;
  balance: Balance;
  streak: Streak;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
  updateTokens: (newTokens: number) => void;
  updateStreak: (newStreak: { current: number; longest: number }) => void;
}

const defaultBalance: Balance = { current: 0, lifetimeEarned: 0, lifetimeSpent: 0, tokens: 100 };
const defaultStreak: Streak = { current: 0, longest: 0, lastCheckin: null };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    balance: defaultBalance,
    streak: defaultStreak,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check for existing token on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const hasToken = await api.loadToken();
      
      // Fast-track: no token means not authenticated
      if (!hasToken) {
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      const response = await api.getMe();
      
      if (response.success && response.data) {
        setState({
          user: response.data.user,
          balance: response.data.balance,
          streak: response.data.streak,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password);
    
    if (response.success && response.data) {
      api.setToken(response.data.token);
      
      // Fetch full user data
      const meResponse = await api.getMe();
      if (meResponse.success && meResponse.data) {
        setState({
          user: meResponse.data.user,
          balance: meResponse.data.balance,
          streak: meResponse.data.streak,
          isLoading: false,
          isAuthenticated: true,
        });
      }
      
      return { success: true };
    }
    
    return { success: false, error: response.error?.message || 'Login failed' };
  };

  const signup = async (email: string, password: string) => {
    const response = await api.signup(email, password);
    
    if (response.success && response.data) {
      api.setToken(response.data.token);
      
      setState({
        user: response.data.user,
        balance: defaultBalance,
        streak: defaultStreak,
        isLoading: false,
        isAuthenticated: true,
      });
      
      return { success: true };
    }
    
    return { success: false, error: response.error?.message || 'Signup failed' };
  };

  const logout = async () => {
    api.clearToken();
    await SecureStore.deleteItemAsync(STORAGE_KEYS.USER_DATA);
    
    setState({
      user: null,
      balance: defaultBalance,
      streak: defaultStreak,
      isLoading: false,
      isAuthenticated: false,
    });
  };

  const refreshUser = async () => {
    const response = await api.getMe();
    if (response.success && response.data) {
      setState(prev => ({
        ...prev,
        user: response.data!.user,
        balance: response.data!.balance,
        streak: response.data!.streak,
      }));
    }
  };

  const updateBalance = (newBalance: number) => {
    setState(prev => ({
      ...prev,
      balance: { ...prev.balance, current: newBalance },
    }));
  };

  const updateTokens = (newTokens: number) => {
    setState(prev => ({
      ...prev,
      balance: { ...prev.balance, tokens: newTokens },
    }));
  };

  const updateStreak = (newStreak: { current: number; longest: number }) => {
    setState(prev => ({
      ...prev,
      streak: { ...prev.streak, current: newStreak.current, longest: newStreak.longest },
    }));
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        signup,
        logout,
        refreshUser,
        updateBalance,
        updateTokens,
        updateStreak,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
