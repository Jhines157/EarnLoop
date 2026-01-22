import React, { useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, Image, Dimensions } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withSequence,
  withTiming,
  withSpring,
  withDelay,
  FadeIn,
  FadeInUp,
  FadeInDown,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { colors as staticColors } from '../utils/theme';

// Screens
import HomeScreen from '../screens/HomeScreen';
import EarnScreen from '../screens/EarnScreen';
import RewardsScreen from '../screens/RewardsScreen';
import RaffleScreen from '../screens/RaffleScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import LearnScreen from '../screens/LearnScreen';
import TermsScreen from '../screens/TermsScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import AppearanceScreen from '../screens/AppearanceScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';

// Styles defined early to avoid reference errors
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: staticColors.backgroundSecondary,
    borderTopColor: staticColors.border,
    borderTopWidth: 1,
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
  },
  tabBarLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  tabIconFocused: {
    opacity: 1,
  },
  header: {
    backgroundColor: staticColors.background,
  },
  headerTitle: {
    fontWeight: '600',
    fontSize: 18,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  loadingContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowOuter: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  logoGlowInner: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  loadingLogo: {
    width: 200,
    height: 200,
  },
  loadingText: {
    fontSize: 64,
    marginBottom: 16,
  },
  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 2,
    marginTop: 32,
  },
  loadingSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '500',
    marginTop: 8,
    letterSpacing: 4,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    marginTop: 48,
    gap: 8,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    fontSize: 20,
  },
  loadingHint: {
    color: staticColors.textMuted,
    fontSize: 14,
    marginTop: 16,
  },
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

// Tab icon component
const TabIcon = ({ name, focused }: { name: string; focused: boolean }) => {
  const icons: Record<string, string> = {
    Home: '🏠',
    Earn: '💰',
    Rewards: '🎁',
    Raffles: '🎰',
    Profile: '👤',
  };

  return (
    <View style={styles.tabIconContainer}>
      <Text style={[styles.tabIcon, focused && styles.tabIconFocused]}>
        {icons[name] || '📱'}
      </Text>
    </View>
  );
};

// Main tab navigator
const MainTabs = () => {
  const { colors } = useTheme();
  
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <TabIcon name={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.backgroundCard,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 8,
          paddingBottom: 8,
          height: 60,
        },
        tabBarLabelStyle: styles.tabBarLabel,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.textPrimary,
        headerTitleStyle: styles.headerTitle,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Earn" 
        component={EarnScreen}
        options={{ title: 'Earn Credits' }}
      />
      <Tab.Screen 
        name="Rewards" 
        component={RewardsScreen}
        options={{ title: 'Rewards Store' }}
      />
      <Tab.Screen 
        name="Raffles" 
        component={RaffleScreen}
        options={{ title: 'Raffles' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Main stack with tabs + modals
const MainStack = () => {
  return (
    <RootStack.Navigator>
      <RootStack.Screen 
        name="MainTabs" 
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <RootStack.Screen 
        name="Learn" 
        component={LearnScreen}
        options={{ 
          title: 'Learn & Earn',
          headerStyle: styles.header,
          headerTintColor: staticColors.textPrimary,
          headerTitleStyle: styles.headerTitle,
          presentation: 'modal',
        }}
      />
      <RootStack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <RootStack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <RootStack.Screen 
        name="Notifications" 
        component={NotificationsScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <RootStack.Screen 
        name="Appearance" 
        component={AppearanceScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
      <RootStack.Screen 
        name="ChangePassword" 
        component={ChangePasswordScreen}
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }}
      />
    </RootStack.Navigator>
  );
};

// Auth stack
const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: styles.header,
        headerTintColor: staticColors.textPrimary,
        headerTitleStyle: styles.headerTitle,
      }}
    >
      <Stack.Screen 
        name="Onboarding" 
        component={OnboardingScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Login" 
        component={LoginScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen 
        name="Signup" 
        component={SignupScreen}
        options={{ title: 'Create Account' }}
      />
      <Stack.Screen 
        name="ForgotPassword" 
        component={ForgotPasswordScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Terms" 
        component={TermsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="Privacy" 
        component={PrivacyScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

// Floating particle for splash screen
const SplashParticle = ({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 800 }));
    scale.value = withDelay(delay, withSpring(1));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.particle, { left: x, top: y }, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
};

// Animated loading dot
const LoadingDot = ({ delay }: { delay: number }) => {
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 400 }),
          withTiming(0.5, { duration: 400 })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 400 }),
          withTiming(0.3, { duration: 400 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return <Animated.View style={[styles.loadingDot, animatedStyle]} />;
};

// Loading screen with premium animation
const LoadingScreen = () => {
  const logoScale = useSharedValue(0.3);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(-10);
  const glowScale = useSharedValue(0.5);
  const glowOpacity = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const shimmer = useSharedValue(0);

  useEffect(() => {
    // Logo entrance - scale up with rotation
    logoOpacity.value = withTiming(1, { duration: 400 });
    logoScale.value = withSpring(1, { damping: 8, stiffness: 100 });
    logoRotate.value = withSpring(0, { damping: 8 });
    
    // Glow entrance
    glowOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    glowScale.value = withDelay(300, withSpring(1, { damping: 10 }));
    
    // Continuous pulse animation
    pulseScale.value = withDelay(
      700,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      )
    );

    // Shimmer effect
    shimmer.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: logoScale.value * pulseScale.value },
      { rotate: `${logoRotate.value}deg` },
    ],
    opacity: logoOpacity.value,
  }));

  const glowOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * 1.3 }],
    opacity: interpolate(glowOpacity.value, [0, 1], [0, 0.3 + shimmer.value * 0.2]),
  }));

  const glowInnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * 1.1 }],
    opacity: interpolate(glowOpacity.value, [0, 1], [0, 0.5 + shimmer.value * 0.3]),
  }));

  return (
    <View style={styles.loadingContainer}>
      {/* Background - matches logo background */}
      <LinearGradient
        colors={['#1a1a1a', '#1a1a1a', '#1a1a1a', '#1a1a1a']}
        style={styles.loadingGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {/* Main content */}
      <View style={styles.loadingContent}>
        {/* Glow effects */}
        <Animated.View style={[styles.logoGlowOuter, glowOuterStyle]} />
        <Animated.View style={[styles.logoGlowInner, glowInnerStyle]} />

        {/* Logo */}
        <Animated.View style={logoStyle}>
          <Image
            source={require('../../assets/logo.png')}
            style={styles.loadingLogo}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Tagline */}
        <Animated.Text
          entering={FadeInUp.delay(400).duration(600)}
          style={styles.loadingSubtext}
        >
          EARN • PLAY • WIN
        </Animated.Text>

        {/* Loading dots */}
        <Animated.View
          entering={FadeIn.delay(800).duration(400)}
          style={styles.loadingDotsContainer}
        >
          <LoadingDot delay={0} />
          <LoadingDot delay={150} />
          <LoadingDot delay={300} />
        </Animated.View>
      </View>
    </View>
  );
};

// Main app navigator
export const AppNavigator = () => {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  return isAuthenticated ? <MainStack /> : <AuthStack />;
};

export default AppNavigator;
