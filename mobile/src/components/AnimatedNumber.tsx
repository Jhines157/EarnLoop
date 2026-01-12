import React, { useEffect } from 'react';
import { Text, TextStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
  useDerivedValue,
} from 'react-native-reanimated';

interface AnimatedNumberProps {
  value: number;
  style?: TextStyle;
  prefix?: string;
  suffix?: string;
  duration?: number;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  style,
  prefix = '',
  suffix = '',
  duration = 800,
}) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic),
    });
  }, [value, duration]);

  const displayValue = useDerivedValue(() => {
    return Math.round(animatedValue.value).toLocaleString();
  });

  // For react-native-reanimated, we'll use a simpler approach
  // since AnimatedText with props isn't always reliable
  return (
    <Text style={style}>
      {prefix}{value.toLocaleString()}{suffix}
    </Text>
  );
};

export default AnimatedNumber;
