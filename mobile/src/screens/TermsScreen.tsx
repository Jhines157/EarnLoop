import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../utils/theme';

const TermsScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Terms of Service</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: December 17, 2025</Text>

        <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
        <Text style={styles.paragraph}>
          By accessing or using EarnLoop ("the App"), you agree to be bound by these Terms of Service. 
          If you do not agree to these terms, please do not use the App.
        </Text>

        <Text style={styles.sectionTitle}>2. Description of Service</Text>
        <Text style={styles.paragraph}>
          EarnLoop is a rewards application that allows users to earn virtual credits ("Credits") 
          by completing various activities such as watching advertisements, completing surveys, 
          and participating in educational content. Credits are virtual items with no monetary value 
          and cannot be exchanged for real currency.
        </Text>

        <Text style={styles.sectionTitle}>3. Eligibility</Text>
        <Text style={styles.paragraph}>
          You must be at least 13 years of age to use this App. By using the App, you represent 
          and warrant that you meet this age requirement. Users under 18 must have parental consent.
        </Text>

        <Text style={styles.sectionTitle}>4. User Accounts</Text>
        <Text style={styles.paragraph}>
          • You are responsible for maintaining the confidentiality of your account credentials.{'\n'}
          • You agree to provide accurate and complete information when creating an account.{'\n'}
          • You are responsible for all activities that occur under your account.{'\n'}
          • One account per person is permitted. Multiple accounts may result in termination.
        </Text>

        <Text style={styles.sectionTitle}>5. Credits and Rewards</Text>
        <Text style={styles.paragraph}>
          • Credits earned through the App have no cash value and cannot be transferred, sold, or exchanged for real money.{'\n'}
          • Credits may be redeemed for rewards as specified within the App.{'\n'}
          • We reserve the right to modify credit values, rewards, and redemption options at any time.{'\n'}
          • Credits may expire if your account is inactive for 12 consecutive months.{'\n'}
          • Fraudulent activity will result in immediate account termination and forfeiture of all Credits.
        </Text>

        <Text style={styles.sectionTitle}>6. Promotional Giveaways</Text>
        <Text style={styles.paragraph}>
          NO PURCHASE NECESSARY TO ENTER OR WIN. Promotional giveaways are sponsored by EarnLoop.{'\n\n'}
          • Open to legal residents of jurisdictions where permitted, age 18 or older.{'\n'}
          • One free entry per person per giveaway period.{'\n'}
          • Bonus entries may be earned through app engagement activities.{'\n'}
          • Winners selected by random drawing and notified via registered email.{'\n'}
          • Odds depend on number of eligible entries received.{'\n'}
          • Prizes are non-transferable and no cash alternatives.{'\n'}
          • Employees of EarnLoop and their families are not eligible.{'\n'}
          • Void where prohibited by law.
        </Text>

        <Text style={styles.sectionTitle}>7. Prohibited Conduct</Text>
        <Text style={styles.paragraph}>
          You agree not to:{'\n'}
          • Use automated systems, bots, or scripts to earn Credits.{'\n'}
          • Create multiple accounts or share accounts.{'\n'}
          • Engage in fraudulent activities or manipulation.{'\n'}
          • Violate any applicable laws or regulations.{'\n'}
          • Interfere with the App's functionality or security.
        </Text>

        <Text style={styles.sectionTitle}>8. Termination</Text>
        <Text style={styles.paragraph}>
          We reserve the right to suspend or terminate your account at any time, with or without cause, 
          and with or without notice. Upon termination, all Credits in your account will be forfeited.
        </Text>

        <Text style={styles.sectionTitle}>9. Disclaimer of Warranties</Text>
        <Text style={styles.paragraph}>
          THE APP IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. WE DO NOT GUARANTEE THAT THE APP 
          WILL BE AVAILABLE, ERROR-FREE, OR SECURE AT ALL TIMES.
        </Text>

        <Text style={styles.sectionTitle}>10. Limitation of Liability</Text>
        <Text style={styles.paragraph}>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
          SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE APP.
        </Text>

        <Text style={styles.sectionTitle}>11. Changes to Terms</Text>
        <Text style={styles.paragraph}>
          We may update these Terms at any time. Continued use of the App after changes constitutes 
          acceptance of the new Terms. We will notify users of significant changes through the App.
        </Text>

        <Text style={styles.sectionTitle}>12. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about these Terms, please contact us at:{'\n'}
          support@earnloop.app
        </Text>

        <View style={styles.bottomPadding} />
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    marginRight: spacing.md,
  },
  backText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  bottomPadding: {
    height: spacing.xxl,
  },
});

export default TermsScreen;
