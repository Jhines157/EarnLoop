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

const PrivacyScreen = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Privacy Policy</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.lastUpdated}>Last Updated: December 17, 2025</Text>

        <Text style={styles.sectionTitle}>1. Introduction</Text>
        <Text style={styles.paragraph}>
          EarnLoop ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy 
          explains how we collect, use, disclose, and safeguard your information when you use our mobile 
          application.
        </Text>

        <Text style={styles.sectionTitle}>2. Information We Collect</Text>
        <Text style={styles.subTitle}>Account Information</Text>
        <Text style={styles.paragraph}>
          • Email address{'\n'}
          • Password (encrypted){'\n'}
          • Account creation date
        </Text>

        <Text style={styles.subTitle}>Usage Information</Text>
        <Text style={styles.paragraph}>
          • Activities completed within the App{'\n'}
          • Credits earned and redeemed{'\n'}
          • App feature usage and preferences{'\n'}
          • Time spent in the App
        </Text>

        <Text style={styles.subTitle}>Device Information</Text>
        <Text style={styles.paragraph}>
          • Device type and model{'\n'}
          • Operating system version{'\n'}
          • Unique device identifiers{'\n'}
          • IP address
        </Text>

        <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
        <Text style={styles.paragraph}>
          We use the information we collect to:{'\n'}
          • Provide and maintain the App{'\n'}
          • Process your rewards and credits{'\n'}
          • Detect and prevent fraud{'\n'}
          • Improve and personalize your experience{'\n'}
          • Send important notifications about your account{'\n'}
          • Comply with legal obligations
        </Text>

        <Text style={styles.sectionTitle}>4. Information Sharing</Text>
        <Text style={styles.paragraph}>
          We do not sell your personal information. We may share information with:{'\n'}
          • Service providers who assist in App operations{'\n'}
          • Advertising partners (aggregated, non-personal data only){'\n'}
          • Legal authorities when required by law{'\n'}
          • Business partners for reward fulfillment
        </Text>

        <Text style={styles.sectionTitle}>5. Advertising</Text>
        <Text style={styles.paragraph}>
          Our App displays advertisements to provide free services. Our advertising partners may collect 
          device information to serve relevant ads. You can limit ad tracking in your device settings.
        </Text>

        <Text style={styles.sectionTitle}>6. App Tracking Transparency (iOS)</Text>
        <Text style={styles.paragraph}>
          On iOS 14.5 and later, we request your permission before tracking your activity across apps 
          and websites owned by other companies. This tracking helps us:{'\n'}
          • Show you more relevant advertisements{'\n'}
          • Measure the effectiveness of ad campaigns{'\n'}
          • Improve our services based on usage patterns{'\n\n'}
          You can change your tracking preferences at any time in your device's Settings under 
          Privacy &amp; Security → Tracking. If you choose not to allow tracking, you will still 
          see ads, but they may be less relevant to your interests.
        </Text>

        <Text style={styles.sectionTitle}>7. Data Security</Text>
        <Text style={styles.paragraph}>
          We implement industry-standard security measures to protect your information, including:{'\n'}
          • Encryption of sensitive data{'\n'}
          • Secure server infrastructure{'\n'}
          • Regular security audits{'\n'}
          • Access controls for employee data access
        </Text>

        <Text style={styles.sectionTitle}>8. Data Retention</Text>
        <Text style={styles.paragraph}>
          We retain your information for as long as your account is active or as needed to provide services. 
          You may request deletion of your account and data at any time by contacting us.
        </Text>

        <Text style={styles.sectionTitle}>9. Your Rights</Text>
        <Text style={styles.paragraph}>
          Depending on your location, you may have the right to:{'\n'}
          • Access your personal data{'\n'}
          • Correct inaccurate data{'\n'}
          • Delete your data{'\n'}
          • Object to data processing{'\n'}
          • Data portability{'\n'}
          • Withdraw consent
        </Text>

        <Text style={styles.sectionTitle}>10. Children's Privacy</Text>
        <Text style={styles.paragraph}>
          Our App is not intended for children under 13. We do not knowingly collect information from 
          children under 13. If we discover such collection, we will delete the information immediately.
        </Text>

        <Text style={styles.sectionTitle}>11. Third-Party Links</Text>
        <Text style={styles.paragraph}>
          The App may contain links to third-party websites or services. We are not responsible for 
          the privacy practices of these third parties. We encourage you to review their privacy policies.
        </Text>

        <Text style={styles.sectionTitle}>12. Changes to This Policy</Text>
        <Text style={styles.paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of significant changes 
          through the App or via email. Your continued use after changes constitutes acceptance.
        </Text>

        <Text style={styles.sectionTitle}>13. Contact Us</Text>
        <Text style={styles.paragraph}>
          If you have questions about this Privacy Policy or your data, please contact us at:{'\n'}
          privacy@earnloop.app{'\n\n'}
          For data deletion requests:{'\n'}
          privacy@earnloop.app
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
  subTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
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

export default PrivacyScreen;
