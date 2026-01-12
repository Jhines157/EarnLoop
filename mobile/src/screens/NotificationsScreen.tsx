import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../utils/theme';

const NOTIFICATION_SETTINGS_KEY = '@notification_settings';

interface NotificationSettings {
  dailyReminder: boolean;
  streakWarning: boolean;
  giveawayResults: boolean;
  specialOffers: boolean;
}

const defaultSettings: NotificationSettings = {
  dailyReminder: true,
  streakWarning: true,
  giveawayResults: true,
  specialOffers: false,
};

const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    setHasPermission(status === 'granted');
  };

  const requestPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    setHasPermission(status === 'granted');
    
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please enable notifications in your device settings to receive alerts.',
        [{ text: 'OK' }]
      );
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
      if (stored) {
        setSettings(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: NotificationSettings) => {
    try {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Schedule/cancel notifications based on settings
      await updateNotificationSchedules(newSettings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
    }
  };

  const updateNotificationSchedules = async (newSettings: NotificationSettings) => {
    // Cancel all existing scheduled notifications
    await Notifications.cancelAllScheduledNotificationsAsync();

    if (!hasPermission) return;

    // Schedule daily reminder at 10 AM
    if (newSettings.dailyReminder) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '💰 Daily Reminder',
          body: "Don't forget to check in and earn your daily credits!",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 10,
          minute: 0,
        },
      });
    }

    // Schedule streak warning at 8 PM
    if (newSettings.streakWarning) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🔥 Streak Warning',
          body: "You haven't checked in today! Don't lose your streak!",
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: 20,
          minute: 0,
        },
      });
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    if (!hasPermission && !settings[key]) {
      // If trying to enable without permission, request it first
      requestPermissions();
      return;
    }

    const newSettings = { ...settings, [key]: !settings[key] };
    saveSettings(newSettings);
  };

  const NotificationRow = ({
    icon,
    title,
    description,
    settingKey,
  }: {
    icon: string;
    title: string;
    description: string;
    settingKey: keyof NotificationSettings;
  }) => (
    <View style={styles.settingRow}>
      <Text style={styles.settingIcon}>{icon}</Text>
      <View style={styles.settingInfo}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={settings[settingKey]}
        onValueChange={() => toggleSetting(settingKey)}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.white}
        ios_backgroundColor={colors.border}
      />
    </View>
  );

  const styles = createStyles(colors);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Permission Banner */}
      {hasPermission === false && (
        <TouchableOpacity style={styles.permissionBanner} onPress={requestPermissions}>
          <Text style={styles.permissionIcon}>🔔</Text>
          <View style={styles.permissionInfo}>
            <Text style={styles.permissionTitle}>Notifications Disabled</Text>
            <Text style={styles.permissionDescription}>
              Tap to enable notifications
            </Text>
          </View>
          <Text style={styles.permissionArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Settings */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reminders</Text>
        
        <NotificationRow
          icon="☀️"
          title="Daily Reminder"
          description="Get reminded to check in each morning at 10 AM"
          settingKey="dailyReminder"
        />

        <NotificationRow
          icon="🔥"
          title="Streak Warning"
          description="Alert if you haven't checked in by 8 PM"
          settingKey="streakWarning"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Updates</Text>
        
        <NotificationRow
          icon="🎉"
          title="Giveaway Results"
          description="Get notified when giveaway winners are announced"
          settingKey="giveawayResults"
        />

        <NotificationRow
          icon="⭐"
          title="Special Offers"
          description="Bonus earning opportunities and promotions"
          settingKey="specialOffers"
        />
      </View>

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoIcon}>ℹ️</Text>
        <Text style={styles.infoText}>
          Notifications help you maintain your streak and never miss earning opportunities. 
          You can change these settings anytime.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    padding: spacing.xs,
  },
  backButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  placeholder: {
    width: 60,
  },
  permissionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}20`,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: `${colors.warning}40`,
  },
  permissionIcon: {
    fontSize: 24,
    marginRight: spacing.sm,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionTitle: {
    ...typography.body,
    color: colors.warning,
    fontWeight: '700',
  },
  permissionDescription: {
    ...typography.caption,
    color: colors.warning,
  },
  permissionArrow: {
    fontSize: 18,
    color: colors.warning,
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    ...typography.caption,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: 2,
  },
  settingDescription: {
    ...typography.caption,
    color: colors.textMuted,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.backgroundSecondary,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    ...typography.caption,
    color: colors.textMuted,
    flex: 1,
  },
});

export default NotificationsScreen;
