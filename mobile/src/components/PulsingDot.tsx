import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../context/ThemeContext';

interface PulsingDotProps {
  color?: string;
  size?: number;
}

const PulsingDot: React.FC<PulsingDotProps> = ({
  color,
  size = 8,
}) => {
  const { colors } = useTheme();
  const dotColor = color || colors.success;
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.5 }],
    opacity: 1 - pulse.value * 0.7,
  }));

  return (
    <View style={[styles.container, { width: size * 3, height: size * 3 }]}>
      <Animated.View
        style={[
          styles.pulse,
          { backgroundColor: dotColor, width: size * 2, height: size * 2 },
          pulseStyle,
        ]}
      />
      <View style={[styles.dot, { backgroundColor: dotColor, width: size, height: size }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    position: 'absolute',
    borderRadius: 9999,
  },
  dot: {
    borderRadius: 9999,
  },
});

export default PulsingDot;
