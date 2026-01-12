import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const APPEARANCE_KEY = '@appearance_mode';

export type AppearanceMode = 'system' | 'light' | 'dark';
export type ActiveTheme = 'light' | 'dark';

// Light theme colors
const lightColors = {
  // Backgrounds
  background: '#F5F5F7',
  backgroundSecondary: '#FFFFFF',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#FFFFFF',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#4A4A6A',
  textMuted: '#8E8E9A',
  textInverse: '#FFFFFF',

  // Brand colors
  primary: '#FF6B35',
  primaryLight: '#FF8F5C',
  primaryDark: '#E55A2B',
  secondary: '#2EC4B6',
  accent: '#9B5DE5',

  // Status colors
  success: '#00C853',
  warning: '#FFB300',
  error: '#FF5252',
  info: '#448AFF',

  // Neutral
  border: '#E5E5EA',
  divider: '#F0F0F5',
  overlay: 'rgba(0, 0, 0, 0.5)',
  white: '#FFFFFF',
  black: '#000000',

  // Gradients (as arrays for LinearGradient)
  gradientPrimary: ['#FF6B35', '#FF8F5C'],
  gradientSecondary: ['#2EC4B6', '#38E8D8'],
  gradientAccent: ['#9B5DE5', '#C77DFF'],
  gradientDark: ['#1A1A2E', '#2D2D44'],
  gradientGold: ['#FFD700', '#FFA500'],
};

// Dark theme colors
const darkColors = {
  // Backgrounds
  background: '#0D0D1A',
  backgroundSecondary: '#1A1A2E',
  backgroundCard: '#1E1E32',
  backgroundElevated: '#2A2A42',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#B0B0C0',
  textMuted: '#6E6E8A',
  textInverse: '#1A1A2E',

  // Brand colors (slightly brighter for dark mode)
  primary: '#FF7A4D',
  primaryLight: '#FF9F75',
  primaryDark: '#E55A2B',
  secondary: '#3DD9C9',
  accent: '#AD75F0',

  // Status colors
  success: '#00E676',
  warning: '#FFC107',
  error: '#FF6B6B',
  info: '#64B5F6',

  // Neutral
  border: '#3A3A52',
  divider: '#2A2A42',
  overlay: 'rgba(0, 0, 0, 0.7)',
  white: '#FFFFFF',
  black: '#000000',

  // Gradients
  gradientPrimary: ['#FF7A4D', '#FF9F75'],
  gradientSecondary: ['#3DD9C9', '#4AEEE0'],
  gradientAccent: ['#AD75F0', '#D4A5FF'],
  gradientDark: ['#1A1A2E', '#2D2D44'],
  gradientGold: ['#FFD700', '#FFA500'],
};

interface ThemeContextType {
  mode: AppearanceMode;
  activeTheme: ActiveTheme;
  colors: typeof lightColors;
  setMode: (mode: AppearanceMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [isLoaded, setIsLoaded] = useState(false);

  // Determine active theme based on mode
  const activeTheme: ActiveTheme = 
    mode === 'system' 
      ? (systemColorScheme || 'light') 
      : mode;

  const isDark = activeTheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  useEffect(() => {
    loadMode();
  }, []);

  const loadMode = async () => {
    try {
      const stored = await AsyncStorage.getItem(APPEARANCE_KEY);
      if (stored && ['system', 'light', 'dark'].includes(stored)) {
        setModeState(stored as AppearanceMode);
      }
    } catch (error) {
      console.error('Failed to load appearance mode:', error);
    } finally {
      setIsLoaded(true);
    }
  };

  const setMode = async (newMode: AppearanceMode) => {
    try {
      await AsyncStorage.setItem(APPEARANCE_KEY, newMode);
      setModeState(newMode);
    } catch (error) {
      console.error('Failed to save appearance mode:', error);
    }
  };

  if (!isLoaded) {
    return null; // Or a loading screen
  }

  return (
    <ThemeContext.Provider value={{ mode, activeTheme, colors, setMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

// Export color types for components that need them
export type ThemeColors = typeof lightColors;
