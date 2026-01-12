import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  withDelay,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../utils/theme';

const { width, height } = Dimensions.get('window');

interface Slide {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: readonly [string, string, ...string[]];
  particles: string[];
}

const slides: Slide[] = [
  {
    id: '1',
    icon: '💰',
    title: 'Earn Credits',
    description: 'Complete daily tasks, watch short ads, and learn new things to stack those credits! 📈',
    gradient: ['#F7931A', '#FF6B35'] as const,
    particles: ['✨', '💫', '⭐'],
  },
  {
    id: '2',
    icon: '🎁',
    title: 'Unlock Rewards',
    description: 'Use your credits to unlock premium features, sick themes, and exclusive perks! 🔥',
    gradient: ['#A855F7', '#6366F1'] as const,
    particles: ['🎉', '🎊', '💎'],
  },
  {
    id: '3',
    icon: '🎰',
    title: 'Win Prizes',
    description: 'Enter raffles for a chance to win real prizes! More credits = more entries! 🏆',
    gradient: ['#10B981', '#34D399'] as const,
    particles: ['🍀', '🎲', '🌟'],
  },
  {
    id: '4',
    icon: '🚀',
    title: 'Ready to Moon?',
    description: 'Create an account and start your journey to the stars! Let\'s gooo! 🌙',
    gradient: ['#00D9FF', '#0EA5E9'] as const,
    particles: ['🌙', '⚡', '💥'],
  },
];

// Floating particle component
const FloatingParticle = ({ emoji, delay, startX, styles }: { emoji: string; delay: number; startX: number; styles: any }) => {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 500 }));
    scale.value = withDelay(delay, withSpring(1));
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-30, { duration: 2000 }),
          withTiming(0, { duration: 2000 })
        ),
        -1,
        true
      )
    );
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(10, { duration: 1500 }),
          withTiming(-10, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.Text style={[styles.particle, { left: startX }, animatedStyle]}>
      {emoji}
    </Animated.Text>
  );
};

// Animated slide component
const AnimatedSlide = ({ item, isActive, styles }: { item: Slide; isActive: boolean; styles: any }) => {
  const iconScale = useSharedValue(1);
  const iconRotate = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      iconScale.value = withRepeat(
        withSequence(
          withSpring(1.15, { damping: 3 }),
          withSpring(1, { damping: 3 })
        ),
        -1,
        true
      );
      iconRotate.value = withRepeat(
        withSequence(
          withTiming(-8, { duration: 150 }),
          withTiming(8, { duration: 150 }),
          withTiming(0, { duration: 150 })
        ),
        -1,
        false
      );
    }
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  // Calculate centered positions for particles
  const particlePositions = [
    { x: width * 0.2 },   // Left
    { x: width * 0.5 - 14 },  // Center (adjusted for emoji width)
    { x: width * 0.8 - 28 },  // Right
  ];

  return (
    <View style={styles.slide}>
      {/* Particles */}
      <View style={styles.particleContainer}>
        {item.particles.map((emoji, i) => (
          <FloatingParticle
            key={i}
            emoji={emoji}
            delay={i * 300}
            startX={particlePositions[i % 3].x}
            styles={styles}
          />
        ))}
      </View>

      {/* Gradient glow behind icon */}
      <View style={styles.iconGlowContainer}>
        <LinearGradient
          colors={[...item.gradient, 'transparent'] as [string, string, ...string[]]}
          style={styles.iconGlow}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>

      {/* Icon */}
      <Animated.Text style={[styles.slideIcon, iconStyle]}>
        {item.icon}
      </Animated.Text>

      {/* Title with gradient underline */}
      <View style={styles.titleContainer}>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <LinearGradient
          colors={item.gradient}
          style={styles.titleUnderline}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
      </View>

      {/* Description */}
      <Text style={styles.slideDescription}>{item.description}</Text>
    </View>
  );
};

const OnboardingScreen = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.navigate('Signup');
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const currentSlide = slides[currentIndex];
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[colors.background, colors.backgroundSecondary, colors.background]}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Skip button */}
        <Animated.View entering={FadeIn.delay(500)} style={styles.skipButton}>
          <TouchableOpacity onPress={handleSkip}>
            <Text style={styles.skipText}>Skip →</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          renderItem={({ item, index }) => (
            <AnimatedSlide item={item} isActive={index === currentIndex} styles={styles} />
          )}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / width);
            setCurrentIndex(index);
          }}
        />

        {/* Bottom section */}
        <Animated.View 
          entering={FadeInUp.delay(300).springify()}
          style={styles.bottomSection}
        >
          {/* Pagination dots */}
          <View style={styles.pagination}>
            {slides.map((slide, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex && styles.dotActive,
                ]}
              >
                {index === currentIndex && (
                  <LinearGradient
                    colors={slide.gradient}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
              </Animated.View>
            ))}
          </View>

          {/* Primary button */}
          <TouchableOpacity
            style={styles.primaryButtonContainer}
            onPress={handleNext}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={currentSlide.gradient}
              style={styles.primaryButton}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>
                {currentIndex === slides.length - 1 ? '🚀 Let\'s Go!' : 'Next →'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Secondary button */}
          {currentIndex === slides.length - 1 && (
            <Animated.View entering={FadeInDown.delay(200)}>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSkip}>
                <Text style={styles.secondaryButtonText}>
                  Already have an account? <Text style={styles.signInLink}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>
      </SafeAreaView>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    zIndex: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: borderRadius.full,
  },
  skipText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  slide: {
    width,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
  },
  particleContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  particle: {
    position: 'absolute',
    fontSize: 28,
  },
  iconGlowContainer: {
    position: 'absolute',
    top: 120,
    width: 200,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlow: {
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.3,
  },
  slideIcon: {
    fontSize: 100,
    marginBottom: spacing.xl,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  slideTitle: {
    ...typography.hero,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  titleUnderline: {
    width: 80,
    height: 4,
    borderRadius: 2,
  },
  slideDescription: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: spacing.md,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 5,
    overflow: 'hidden',
  },
  dotActive: {
    width: 32,
    borderRadius: 5,
  },
  primaryButtonContainer: {
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  primaryButton: {
    paddingVertical: spacing.md + 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  secondaryButton: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  secondaryButtonText: {
    ...typography.body,
    color: colors.textMuted,
  },
  signInLink: {
    color: colors.accent,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
