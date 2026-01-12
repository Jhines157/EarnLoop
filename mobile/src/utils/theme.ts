// Theme colors for EarnLoop - Vibrant & Fun Edition! 🚀
export const colors = {
  // Primary colors - Bitcoin Orange with pizzazz
  primary: '#F7931A',
  primaryDark: '#E8850F',
  primaryLight: '#FFB74D',
  primaryGlow: 'rgba(247, 147, 26, 0.3)',
  
  // Accent colors - Electric & Fun
  accent: '#00D9FF', // Cyan electric
  accentPurple: '#A855F7', // Vibrant purple
  accentPink: '#EC4899', // Hot pink
  accentGreen: '#10B981', // Emerald
  
  // Gradient combinations
  gradientOrange: ['#F7931A', '#FF6B35'],
  gradientPurple: ['#A855F7', '#6366F1'],
  gradientCyan: ['#00D9FF', '#0EA5E9'],
  gradientSuccess: ['#10B981', '#34D399'],
  gradientFire: ['#F97316', '#EF4444'],
  gradientGold: ['#FBBF24', '#F59E0B'],
  
  // Background colors - Deep space vibes
  background: '#0F0F1A',
  backgroundSecondary: '#1A1A2E',
  backgroundCard: '#252542',
  backgroundCardHover: '#2E2E4A',
  backgroundGlow: 'rgba(247, 147, 26, 0.1)',
  
  // Text colors
  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  
  // Status colors
  success: '#10B981',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorLight: '#F87171',
  info: '#3B82F6',
  infoLight: '#60A5FA',
  
  // UI elements
  border: '#3F3F5C',
  borderLight: '#52526E',
  inputBackground: '#1E1E3F',
  disabled: '#4A4A6A',
  
  // Special effects
  shimmer: 'rgba(255, 255, 255, 0.1)',
  glow: 'rgba(247, 147, 26, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.5)',
};

// Spacing scale
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Typography - Bolder and more impactful
export const typography = {
  hero: {
    fontSize: 48,
    fontWeight: '800' as const,
    lineHeight: 56,
    letterSpacing: -1,
  },
  h1: {
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  h2: {
    fontSize: 24,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 28,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 24,
  },
  bodyBold: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 20,
  },
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
  micro: {
    fontSize: 10,
    fontWeight: '600' as const,
    lineHeight: 14,
    letterSpacing: 0.5,
  },
};

// Border radius - More rounded for friendliness
export const borderRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
  full: 9999,
};

// Shadows - Deeper and more dramatic
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#F7931A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  glowCyan: {
    shadowColor: '#00D9FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
};

// Animation configs
export const animations = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  bounce: {
    damping: 8,
    stiffness: 200,
    mass: 0.8,
  },
  smooth: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  quick: {
    duration: 200,
  },
  medium: {
    duration: 300,
  },
  slow: {
    duration: 500,
  },
};

// Fun emojis for gamification
export const emojis = {
  fire: '🔥',
  rocket: '🚀',
  star: '⭐',
  sparkles: '✨',
  lightning: '⚡',
  trophy: '🏆',
  gem: '💎',
  coin: '🪙',
  gift: '🎁',
  celebrate: '🎉',
  muscle: '💪',
  eyes: '👀',
  money: '💰',
  crown: '👑',
  target: '🎯',
  check: '✅',
  video: '🎬',
  book: '📚',
  chart: '📈',
  wave: '👋',
};
