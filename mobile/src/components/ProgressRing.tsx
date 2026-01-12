import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { spacing, typography, borderRadius } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

interface ProgressRingProps {
  percent: number;
  label: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const ProgressRing: React.FC<ProgressRingProps> = ({ percent, label }) => {
  const { colors } = useTheme();
  const clampedPercent = Math.min(Math.max(percent, 0), 100);
  const pulseScale = useSharedValue(1);
  const styles = createStyles(colors);
  
  const size = 90;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clampedPercent / 100);

  useEffect(() => {
    if (clampedPercent >= 80) {
      pulseScale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800 }),
          withTiming(1, { duration: 800 })
        ),
        -1,
        true
      );
    }
  }, [clampedPercent]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const getColor = () => {
    if (clampedPercent >= 90) return { main: colors.error, light: colors.errorLight };
    if (clampedPercent >= 70) return { main: colors.warning, light: colors.warningLight };
    return { main: colors.success, light: colors.successLight };
  };

  const colorConfig = getColor();
  const emoji = clampedPercent >= 100 ? '🎯' : clampedPercent >= 80 ? '⚡' : '💪';

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ringContainer, pulseStyle]}>
        <Svg width={size} height={size}>
          <Defs>
            <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colorConfig.light} />
              <Stop offset="100%" stopColor={colorConfig.main} />
            </LinearGradient>
          </Defs>
          
          {/* Background circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colors.backgroundSecondary}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          
          {/* Progress circle */}
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            origin={`${size / 2}, ${size / 2}`}
          />
        </Svg>
        
        {/* Center content */}
        <View style={styles.centerContent}>
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={[styles.percentText, { color: colorConfig.main }]}>{clampedPercent}%</Text>
        </View>
      </Animated.View>
      
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.statusBadge, { backgroundColor: `${colorConfig.main}20` }]}>
        <Text style={[styles.statusText, { color: colorConfig.main }]}>
          {clampedPercent >= 100 ? 'Maxed! 🎉' : `${100 - clampedPercent}% left`}
        </Text>
      </View>
    </View>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: spacing.xs,
  },
  ringContainer: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  centerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 16,
    marginBottom: 2,
  },
  percentText: {
    ...typography.bodyBold,
    fontWeight: '800',
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  statusBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    ...typography.micro,
    fontWeight: '700',
  },
});

export default ProgressRing;
