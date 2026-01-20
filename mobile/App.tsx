import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';

import { AuthProvider } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import adMobService from './src/services/adMob';

// Inner component that can access theme
const AppContent = () => {
  const { isDark } = useTheme();
  
  // Initialize AdMob when app starts
  useEffect(() => {
    const initAds = async () => {
      try {
        console.log('🚀 Initializing AdMob...');
        await adMobService.initialize();
        console.log('✅ AdMob initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize AdMob:', error);
      }
    };
    initAds();
  }, []);
  
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <NavigationContainer>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </NavigationContainer>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
