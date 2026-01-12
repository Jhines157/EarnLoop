import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import { UI_TEXT } from '../utils/constants';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const SignupScreen = () => {
  const navigation = useNavigation<any>();
  const { signup } = useAuth();
  const { colors } = useTheme();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; confirm?: string }>({});

  // Animations
  const rocketY = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const checkScale = useSharedValue(1);

  useEffect(() => {
    // Floating rocket
    rocketY.value = withRepeat(
      withSequence(
        withTiming(-8, { duration: 1500 }),
        withTiming(0, { duration: 1500 })
      ),
      -1,
      true
    );
  }, []);

  const rocketStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: rocketY.value }],
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  const handleButtonPressIn = () => {
    buttonScale.value = withSpring(0.95, { damping: 15 });
  };

  const handleButtonPressOut = () => {
    buttonScale.value = withSpring(1, { damping: 10 });
  };

  const handleCheckPress = () => {
    setAgreed(!agreed);
    checkScale.value = withSequence(
      withSpring(1.3, { damping: 8 }),
      withSpring(1, { damping: 8 })
    );
  };

  const checkAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const validate = () => {
    const newErrors: { email?: string; password?: string; confirm?: string } = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (password !== confirmPassword) {
      newErrors.confirm = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validate()) return;
    
    if (!agreed) {
      Alert.alert('One More Thing! 📋', 'Please agree to the Terms of Service and Privacy Policy');
      return;
    }
    
    setLoading(true);
    const result = await signup(email, password);
    setLoading(false);
    
    if (!result.success) {
      Alert.alert('Oops! 😅', result.error || 'Please try again');
    }
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View 
            style={styles.header}
            entering={FadeInDown.duration(600).delay(100)}
          >
            <Animated.View style={[styles.logoContainer, rocketStyle]}>
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoImage}
                resizeMode="contain"
              />
            </Animated.View>
            <Text style={styles.title}>Join EarnLoop!</Text>
            <Text style={styles.subtitle}>Start earning credits in minutes ✨</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View 
            style={styles.form}
            entering={FadeInUp.duration(600).delay(200)}
          >
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrapper, errors.email && styles.inputError]}>
                <Text style={styles.inputIcon}>📧</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={email}
                  onChangeText={(text: string) => {
                    setEmail(text);
                    if (errors.email) setErrors({ ...errors, email: undefined });
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                />
              </View>
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrapper, errors.password && styles.inputError]}>
                <Text style={styles.inputIcon}>🔒</Text>
                <TextInput
                  style={styles.input}
                  placeholder="At least 8 characters"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={password}
                  onChangeText={(text: string) => {
                    setPassword(text);
                    if (errors.password) setErrors({ ...errors, password: undefined });
                  }}
                  secureTextEntry
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>Confirm Password</Text>
              <View style={[styles.inputWrapper, errors.confirm && styles.inputError]}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textMuted}
                  selectionColor={colors.primary}
                  value={confirmPassword}
                  onChangeText={(text: string) => {
                    setConfirmPassword(text);
                    if (errors.confirm) setErrors({ ...errors, confirm: undefined });
                  }}
                  secureTextEntry
                  autoCorrect={false}
                  textContentType="oneTimeCode"
                />
              </View>
              {errors.confirm && <Text style={styles.errorText}>{errors.confirm}</Text>}
            </View>

            {/* Terms checkbox */}
            <TouchableOpacity style={styles.checkboxRow} onPress={handleCheckPress} activeOpacity={0.7}>
              <Animated.View style={[styles.checkbox, agreed && styles.checkboxChecked, checkAnimStyle]}>
                {agreed && <Text style={styles.checkmark}>✓</Text>}
              </Animated.View>
              <Text style={styles.checkboxLabel}>
                I agree to the{' '}
                <Text 
                  style={styles.linkInline}
                  onPress={() => navigation.navigate('Terms' as never)}
                >
                  Terms
                </Text>
                {' '}and{' '}
                <Text 
                  style={styles.linkInline}
                  onPress={() => navigation.navigate('Privacy' as never)}
                >
                  Privacy Policy
                </Text>
              </Text>
            </TouchableOpacity>

            <AnimatedTouchable 
              style={[styles.button, buttonStyle, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              onPressIn={handleButtonPressIn}
              onPressOut={handleButtonPressOut}
              disabled={loading}
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <Text style={styles.buttonText}>Create Account</Text>
                  <Text style={styles.buttonEmoji}>🎉</Text>
                </>
              )}
            </AnimatedTouchable>
          </Animated.View>

          {/* Disclaimer */}
          <Animated.View 
            style={styles.disclaimer}
            entering={FadeInUp.duration(600).delay(300)}
          >
            <Text style={styles.disclaimerIcon}>💡</Text>
            <Text style={styles.disclaimerText}>
              {UI_TEXT.CREDITS_ONLY}
            </Text>
          </Animated.View>

          {/* Footer */}
          <Animated.View 
            style={styles.footer}
            entering={FadeInUp.duration(600).delay(400)}
          >
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.linkText}>Sign In 👋</Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    marginBottom: spacing.md,
  },
  logoImage: {
    width: 80,
    height: 80,
  },
  headerEmoji: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  form: {
    marginBottom: spacing.lg,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    color: colors.textPrimary,
    fontSize: 16,
  },
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: borderRadius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.backgroundCard,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  checkboxLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  linkInline: {
    color: colors.primary,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    ...shadows.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    ...typography.bodyBold,
    color: colors.textPrimary,
    fontSize: 18,
  },
  buttonEmoji: {
    fontSize: 20,
  },
  disclaimer: {
    backgroundColor: `${colors.warning}15`,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  disclaimerIcon: {
    fontSize: 16,
  },
  disclaimerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  footerText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  linkText: {
    ...typography.bodyBold,
    color: colors.primary,
  },
});

export default SignupScreen;
