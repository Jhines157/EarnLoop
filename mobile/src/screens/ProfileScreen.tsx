import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography } from '../utils/theme';
import { getUserLevel, getLevelProgress, USER_LEVELS } from '../data/gamification';

interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  itemType: string;
  isActive: boolean;
}

interface ActiveBoost {
  name: string;
  expiresAt: string;
  multiplier: number;
}

const ProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, balance, streak, logout } = useAuth();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [streakSavers, setStreakSavers] = useState(0);
  const [activeBoost, setActiveBoost] = useState<ActiveBoost | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Calculate level info
  const levelInfo = getLevelProgress(balance.lifetimeEarned);

  useEffect(() => {
    loadInventory();
  }, []);

  const loadInventory = async () => {
    try {
      const response = await api.getInventory();
      if (response.success && response.data) {
        setInventory(response.data.inventory || []);
        setStreakSavers(response.data.streakSavers || 0);
        setActiveBoost(response.data.activeXpBoost);
      }
    } catch (error) {
      console.error('Failed to load inventory:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadInventory();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: () => logout() },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      '⚠️ Delete Account',
      'This will permanently delete your account and all data. This action cannot be undone.\n\nAre you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Type DELETE to confirm account deletion.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete Forever',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const response = await api.deleteAccount();
                      if (response.success) {
                        logout();
                        Alert.alert('Account Deleted', 'Your account has been deleted.');
                      } else {
                        Alert.alert('Error', response.error?.message || 'Failed to delete account');
                      }
                    } catch (error) {
                      Alert.alert('Error', 'Something went wrong');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleSupport = () => {
    Linking.openURL('mailto:support@earnloop.app');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatBoostExpiry = (expiresAt: string) => {
    const expiry = new Date(expiresAt);
    const now = new Date();
    const hoursLeft = Math.max(0, Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60)));
    
    if (hoursLeft < 1) return 'Less than 1 hour';
    if (hoursLeft < 24) return `${hoursLeft} hours left`;
    const daysLeft = Math.floor(hoursLeft / 24);
    return `${daysLeft} day${daysLeft > 1 ? 's' : ''} left`;
  };

  // Get owned badges
  const ownedBadges = inventory.filter(i => i.itemType === 'badge' || i.itemType === 'cosmetic');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {/* User Card with Level */}
        <View style={[styles.userCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.userHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: levelInfo.currentLevel.color }]}>
              <Text style={styles.avatarText}>
                {levelInfo.currentLevel.emoji}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.email, { color: colors.textPrimary }]}>{user?.email}</Text>
              <Text style={[styles.levelName, { color: colors.primary }]}>
                {levelInfo.currentLevel.name} Member
              </Text>
              <Text style={[styles.memberSince, { color: colors.textMuted }]}>
                Since {user?.createdAt ? formatDate(user.createdAt) : 'Unknown'}
              </Text>
            </View>
          </View>

          {/* Level Progress */}
          {levelInfo.nextLevel && (
            <View style={styles.levelProgress}>
              <View style={styles.levelProgressHeader}>
                <Text style={styles.levelProgressLabel}>
                  Progress to {levelInfo.nextLevel.emoji} {levelInfo.nextLevel.name}
                </Text>
                <Text style={styles.levelProgressValue}>
                  {levelInfo.creditsToNext.toLocaleString()} to go
                </Text>
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      width: `${levelInfo.progress}%`,
                      backgroundColor: levelInfo.nextLevel.color,
                    }
                  ]} 
                />
              </View>
            </View>
          )}

          {/* Perks */}
          <View style={styles.perksContainer}>
            <Text style={styles.perksLabel}>Your Perks:</Text>
            <View style={styles.perksList}>
              {levelInfo.currentLevel.perks.map((perk, i) => (
                <Text key={i} style={styles.perkItem}>✓ {perk}</Text>
              ))}
            </View>
          </View>
        </View>

        {/* Active Boosts & Items */}
        {(activeBoost || streakSavers > 0 || ownedBadges.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🎒 Active Items</Text>
            
            {/* XP Boost */}
            {activeBoost && (
              <View style={[styles.activeItem, styles.boostItem]}>
                <Text style={styles.activeItemIcon}>⚡</Text>
                <View style={styles.activeItemInfo}>
                  <Text style={styles.activeItemName}>2x XP Boost Active!</Text>
                  <Text style={styles.activeItemDetail}>
                    {formatBoostExpiry(activeBoost.expiresAt)}
                  </Text>
                </View>
                <View style={styles.boostBadge}>
                  <Text style={styles.boostBadgeText}>2X</Text>
                </View>
              </View>
            )}

            {/* Streak Savers */}
            {streakSavers > 0 && (
              <View style={[styles.activeItem, styles.saverItem]}>
                <Text style={styles.activeItemIcon}>🛡️</Text>
                <View style={styles.activeItemInfo}>
                  <Text style={styles.activeItemName}>Streak Savers</Text>
                  <Text style={styles.activeItemDetail}>
                    Auto-protects your streak if you miss a day
                  </Text>
                </View>
                <View style={styles.quantityBadge}>
                  <Text style={styles.quantityText}>×{streakSavers}</Text>
                </View>
              </View>
            )}

            {/* Owned Badges */}
            {ownedBadges.length > 0 && (
              <View style={styles.badgesRow}>
                {ownedBadges.slice(0, 5).map((badge) => (
                  <View key={badge.id} style={styles.badgeItem}>
                    <Text style={styles.badgeIcon}>{badge.icon}</Text>
                    <Text style={styles.badgeName} numberOfLines={1}>{badge.name}</Text>
                  </View>
                ))}
                {ownedBadges.length > 5 && (
                  <View style={styles.badgeItem}>
                    <Text style={styles.badgeMore}>+{ownedBadges.length - 5}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Your Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{balance.lifetimeEarned.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{balance.lifetimeSpent.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Spent</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak.current}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak.longest}</Text>
              <Text style={styles.statLabel}>Best Streak</Text>
            </View>
          </View>
        </View>

        {/* All Levels Preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏆 All Levels</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.levelsRow}>
              {USER_LEVELS.map((level) => {
                const isCurrentOrPast = balance.lifetimeEarned >= level.minCredits;
                return (
                  <View 
                    key={level.id} 
                    style={[
                      styles.levelCard,
                      isCurrentOrPast && styles.levelCardUnlocked,
                      levelInfo.currentLevel.id === level.id && styles.levelCardCurrent,
                    ]}
                  >
                    <Text style={styles.levelEmoji}>{level.emoji}</Text>
                    <Text style={[
                      styles.levelCardName,
                      isCurrentOrPast && styles.levelCardNameUnlocked,
                    ]}>
                      {level.name}
                    </Text>
                    <Text style={styles.levelCardCredits}>
                      {level.minCredits.toLocaleString()}+
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Menu Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ Settings</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.menuItemIcon}>🔔</Text>
            <Text style={styles.menuItemText}>Notifications</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Appearance')}
          >
            <Text style={styles.menuItemIcon}>🎨</Text>
            <Text style={styles.menuItemText}>Appearance</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('ChangePassword')}
          >
            <Text style={styles.menuItemIcon}>🔑</Text>
            <Text style={styles.menuItemText}>Change Password</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💬 Support</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSupport}>
            <Text style={styles.menuItemIcon}>📧</Text>
            <Text style={styles.menuItemText}>Contact Support</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert(
              'Frequently Asked Questions',
              '📱 How do I earn credits?\nWatch ads, complete daily check-ins, and maintain your streak!\n\n💰 What can I spend credits on?\nVisit the Rewards Store to redeem credits for badges, XP boosts, streak savers, and giveaway entries!\n\n🔥 What happens if I miss a day?\nYour streak resets unless you have a Streak Saver active.\n\n📧 Need more help?\nContact support via email!'
            )}
          >
            <Text style={styles.menuItemIcon}>❓</Text>
            <Text style={styles.menuItemText}>FAQ</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📜 Legal</Text>
          
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Terms')}
          >
            <Text style={styles.menuItemIcon}>📄</Text>
            <Text style={styles.menuItemText}>Terms of Service</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('Privacy')}
          >
            <Text style={styles.menuItemIcon}>🔐</Text>
            <Text style={styles.menuItemText}>Privacy Policy</Text>
            <Text style={styles.menuItemArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>EarnLoop v1.0.0</Text>
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
  userCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontSize: 32,
  },
  userInfo: {
    flex: 1,
  },
  email: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  levelName: {
    ...typography.bodySmall,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 2,
  },
  memberSince: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  levelProgress: {
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  levelProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  levelProgressLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  levelProgressValue: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  perksContainer: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
  },
  perksLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  perksList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  perkItem: {
    ...typography.caption,
    color: colors.success,
    backgroundColor: colors.success + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  activeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  boostItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  saverItem: {
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  activeItemIcon: {
    fontSize: 28,
    marginRight: spacing.md,
  },
  activeItemInfo: {
    flex: 1,
  },
  activeItemName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  activeItemDetail: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  boostBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  boostBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
  },
  quantityBadge: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  quantityText: {
    ...typography.body,
    color: colors.info,
    fontWeight: '700',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  badgeItem: {
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    minWidth: 60,
  },
  badgeIcon: {
    fontSize: 24,
  },
  badgeName: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    fontSize: 10,
  },
  badgeMore: {
    ...typography.body,
    color: colors.textSecondary,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  levelsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  levelCard: {
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    minWidth: 80,
    opacity: 0.5,
  },
  levelCardUnlocked: {
    opacity: 1,
  },
  levelCardCurrent: {
    borderWidth: 2,
    borderColor: colors.primary,
  },
  levelEmoji: {
    fontSize: 28,
  },
  levelCardName: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    fontWeight: '600',
  },
  levelCardNameUnlocked: {
    color: colors.textPrimary,
  },
  levelCardCredits: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  menuItem: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  menuItemIcon: {
    fontSize: 20,
    marginRight: spacing.md,
  },
  menuItemText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
  },
  menuItemArrow: {
    ...typography.h2,
    color: colors.textMuted,
  },
  logoutButton: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  deleteText: {
    ...typography.bodySmall,
    color: colors.error,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
});

export default ProfileScreen;
