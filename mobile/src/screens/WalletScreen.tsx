import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../utils/theme';

const WalletScreen = () => {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Coming Soon Banner */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonIcon}>⚡</Text>
          <Text style={styles.comingSoonTitle}>Lightning Wallet</Text>
          <Text style={styles.comingSoonSubtitle}>Coming Soon</Text>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🎯 Promotional Rewards</Text>
          <Text style={styles.infoText}>
            In the future, verified users may be eligible for occasional promotional 
            Bitcoin rewards via Lightning. These will be separate from ad-based credits 
            and subject to availability.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>⚠️ Important Note</Text>
          <Text style={styles.infoText}>
            EarnLoop does NOT mine cryptocurrency. The in-app credits you earn 
            from watching ads or completing tasks are for redeeming in-app rewards only.
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>🔐 How It Will Work</Text>
          <Text style={styles.infoText}>
            1. Complete account verification{'\n'}
            2. Add your Lightning address{'\n'}
            3. Participate in promotional events{'\n'}
            4. Receive BTC directly to your wallet
          </Text>
        </View>

        {/* Placeholder for Lightning Address */}
        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Lightning Address</Text>
          <View style={styles.addressPlaceholder}>
            <Text style={styles.addressPlaceholderText}>
              Feature not yet available
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
  },
  comingSoonCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: colors.primary + '40',
    borderStyle: 'dashed',
  },
  comingSoonIcon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  comingSoonTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  comingSoonSubtitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  addressCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  addressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  addressPlaceholder: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  addressPlaceholderText: {
    ...typography.body,
    color: colors.textMuted,
  },
});

export default WalletScreen;
