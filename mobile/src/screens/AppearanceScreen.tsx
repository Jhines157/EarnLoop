import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTheme, AppearanceMode } from '../context/ThemeContext';
import { spacing, borderRadius, typography } from '../utils/theme';

const AppearanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { mode, colors, setMode, isDark } = useTheme();

  const handleModeChange = async (newMode: AppearanceMode) => {
    await setMode(newMode);
  };

  const ModeOption = ({
    optionMode,
    icon,
    title,
    description,
  }: {
    optionMode: AppearanceMode;
    icon: string;
    title: string;
    description: string;
  }) => {
    const isSelected = mode === optionMode;
    
    return (
      <TouchableOpacity
        style={[
          styles.modeOption, 
          { 
            backgroundColor: colors.backgroundCard,
            borderColor: isSelected ? colors.primary : colors.border,
          },
          isSelected && { backgroundColor: `${colors.primary}15` }
        ]}
        onPress={() => handleModeChange(optionMode)}
      >
        <View style={styles.modeContent}>
          <Text style={styles.modeIcon}>{icon}</Text>
          <View style={styles.modeInfo}>
            <Text style={[
              styles.modeTitle, 
              { color: isSelected ? colors.primary : colors.textPrimary }
            ]}>
              {title}
            </Text>
            <Text style={[styles.modeDescription, { color: colors.textMuted }]}>
              {description}
            </Text>
          </View>
        </View>
        <View style={[
          styles.radioOuter, 
          { borderColor: isSelected ? colors.primary : colors.border }
        ]}>
          {isSelected && (
            <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={[styles.backButtonText, { color: colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Appearance</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Theme Preview */}
        <View style={styles.previewContainer}>
          <View style={[
            styles.previewCard,
            { 
              backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
              borderColor: colors.primary,
            }
          ]}>
            <View style={styles.previewHeader}>
              <View style={[
                styles.previewDot,
                { backgroundColor: isDark ? '#fff' : '#000' }
              ]} />
              <View style={[
                styles.previewLine,
                { backgroundColor: isDark ? '#fff' : '#000' }
              ]} />
            </View>
            <View style={styles.previewBody}>
              <View style={[
                styles.previewBlock,
                { backgroundColor: isDark ? '#333' : '#e0e0e0' }
              ]} />
              <View style={[
                styles.previewBlock,
                { backgroundColor: isDark ? '#333' : '#e0e0e0' }
              ]} />
            </View>
          </View>
          <Text style={[styles.previewLabel, { color: colors.textPrimary }]}>
            {isDark ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'}
          </Text>
        </View>

        {/* Options */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Choose Theme</Text>
          
          <ModeOption
            optionMode="system"
            icon="📱"
            title="System"
            description="Matches your device settings"
          />

          <ModeOption
            optionMode="light"
            icon="☀️"
            title="Light"
            description="Always use light theme"
          />

          <ModeOption
            optionMode="dark"
            icon="🌙"
            title="Dark"
            description="Always use dark theme"
          />
        </View>

        {/* Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.backgroundSecondary }]}>
          <Text style={styles.infoIcon}>✅</Text>
          <Text style={[styles.infoText, { color: colors.textMuted }]}>
            Theme changes are applied instantly across the app!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
  },
  placeholder: {
    width: 60,
  },
  previewContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  previewCard: {
    width: 120,
    height: 200,
    borderRadius: borderRadius.xl,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 3,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  previewDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewLine: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  previewBody: {
    flex: 1,
    gap: spacing.sm,
  },
  previewBlock: {
    flex: 1,
    borderRadius: borderRadius.md,
  },
  previewLabel: {
    ...typography.body,
    fontWeight: '600',
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.caption,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 2,
  },
  modeContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modeIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  modeInfo: {
    flex: 1,
  },
  modeTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: 2,
  },
  modeDescription: {
    ...typography.caption,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    ...typography.caption,
    flex: 1,
  },
});

export default AppearanceScreen;
