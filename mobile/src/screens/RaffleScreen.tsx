import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography } from '../utils/theme';
import { SAMPLE_GIVEAWAYS, Giveaway } from '../data/gamification';

const ENTRY_COST = 50; // Credits per additional entry
const BONUS_COOLDOWN_HOURS = 12; // Hours between bonus entries
// No limit on paid entries - users can buy as many as they want

interface EntryData {
  free: boolean;
  bonus: number;
  paid: number;
  lastBonusAt?: string | null;
  nextBonusAvailable?: string | null;
  bonusCooldownRemaining?: number | null;
}

const RaffleScreen = () => {
  const { balance, updateBalance, refreshUser } = useAuth();
  const { colors } = useTheme();
  // Track user's entries with cooldown info
  const [myEntries, setMyEntries] = useState<Record<string, EntryData>>({});
  const [cooldownTimers, setCooldownTimers] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  // Update cooldown timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      const now = Date.now();
      
      Object.entries(myEntries).forEach(([giveawayId, entry]) => {
        if (entry.nextBonusAvailable) {
          const cooldownEnd = new Date(entry.nextBonusAvailable).getTime();
          const remaining = cooldownEnd - now;
          
          if (remaining > 0) {
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const secs = Math.floor((remaining % (1000 * 60)) / 1000);
            
            if (hours > 0) {
              newTimers[giveawayId] = `${hours}h ${mins}m`;
            } else if (mins > 0) {
              newTimers[giveawayId] = `${mins}m ${secs}s`;
            } else {
              newTimers[giveawayId] = `${secs}s`;
            }
          }
        }
      });
      
      setCooldownTimers(newTimers);
    }, 1000);
    
    return () => clearInterval(interval);
  }, [myEntries]);

  const loadEntries = async () => {
    try {
      const response = await api.getGiveawayEntries();
      if (response.success && response.data) {
        setMyEntries(response.data.entries || {});
      }
    } catch (error) {
      console.error('Failed to load giveaway entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadEntries();
    await refreshUser();
    setRefreshing(false);
  };

  // Claim FREE entry (no purchase necessary - iOS compliant)
  const handleClaimFreeEntry = async (giveaway: Giveaway) => {
    const entries = myEntries[giveaway.id] || { free: false, bonus: 0, paid: 0 };
    
    if (entries.free) {
      Alert.alert('Already Entered', 'You already have your free entry for this giveaway!');
      return;
    }

    Alert.alert(
      'Claim Free Entry',
      `Get your FREE entry to win ${giveaway.prizeValue}! No purchase necessary.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Claim Free Entry',
          onPress: async () => {
            try {
              const response = await api.claimFreeEntry(giveaway.id);
              if (response.success) {
                setMyEntries(prev => ({
                  ...prev,
                  [giveaway.id]: { ...entries, free: true },
                }));
                Alert.alert(
                  'Entry Confirmed! 🎉', 
                  'Good luck! You can also spend credits for extra entries.'
                );
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to claim entry');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  // Buy extra entries with credits - no limit!
  const handleBuyEntry = async (giveaway: Giveaway) => {
    const entries = myEntries[giveaway.id] || { free: false, bonus: 0, paid: 0 };
    
    if (!entries.free) {
      Alert.alert('Claim Free Entry First', 'Claim your free entry before buying additional entries.');
      return;
    }

    if (balance.current < ENTRY_COST) {
      Alert.alert(
        'Not Enough Credits', 
        `You need ${ENTRY_COST} credits for an extra entry. You have ${balance.current} credits. Watch more ads to earn credits!`
      );
      return;
    }

    Alert.alert(
      'Buy Extra Entry',
      `Spend ${ENTRY_COST} credits for +1 entry to win ${giveaway.prizeValue}?\n\nYour balance: ${balance.current} credits\nYou can buy as many entries as you want!`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Buy Entry (${ENTRY_COST} credits)`,
          onPress: async () => {
            try {
              const response = await api.buyGiveawayEntry(giveaway.id);
              if (response.success && response.data) {
                // Update balance from server response
                updateBalance(response.data.newBalance);
                
                // Update local entries
                setMyEntries(prev => ({
                  ...prev,
                  [giveaway.id]: { ...entries, paid: response.data!.entriesBought },
                }));
                
                Alert.alert(
                  'Entry Added! 🎟️', 
                  `You now have ${(entries.free ? 1 : 0) + entries.bonus + response.data.entriesBought} total entries!\n\nBuy more to increase your chances!`
                );
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to buy entry');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  // Earn bonus entries through engagement (NOT by spending credits)
  const handleEarnBonusEntry = async (giveaway: Giveaway) => {
    const entries = myEntries[giveaway.id] || { free: false, bonus: 0, paid: 0 };
    
    if (!entries.free) {
      Alert.alert('Claim Free Entry First', 'You need to claim your free entry before earning bonus entries.');
      return;
    }

    if (entries.bonus >= giveaway.bonusEntriesAvailable) {
      Alert.alert('Max Bonus Entries', 'You\'ve earned all available bonus entries!');
      return;
    }

    // Check if on cooldown
    if (cooldownTimers[giveaway.id]) {
      Alert.alert(
        'Cooldown Active ⏳',
        `You can earn another bonus entry in ${cooldownTimers[giveaway.id]}.\n\nBonus entries refresh every ${BONUS_COOLDOWN_HOURS} hours.`
      );
      return;
    }

    // For now, simulate earning a bonus entry after watching an ad
    Alert.alert(
      'Earn Bonus Entry',
      `Complete activities like watching ads or lessons to earn bonus entries. ${giveaway.bonusRequirements}\n\n⏳ After earning, you'll need to wait ${BONUS_COOLDOWN_HOURS} hours for the next one.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Earn +1 Entry',
          onPress: async () => {
            try {
              const response = await api.earnBonusEntry(giveaway.id, 'ad_watch');
              if (response.success && response.data) {
                // Update entries with cooldown info
                setMyEntries(prev => ({
                  ...prev,
                  [giveaway.id]: { 
                    ...entries, 
                    bonus: response.data!.bonusEntries,
                    nextBonusAvailable: response.data!.nextBonusAvailable,
                  },
                }));
                Alert.alert(
                  'Bonus Entry Earned! 🎉', 
                  `You now have ${response.data.bonusEntries} bonus entries!\n\n⏳ Next bonus available in ${BONUS_COOLDOWN_HOURS} hours.`
                );
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to earn bonus entry');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            }
          },
        },
      ]
    );
  };

  const formatTimeLeft = (endDate: Date): string => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h left`;
    return 'Ending soon!';
  };

  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🎰 Giveaways</Text>
          <Text style={styles.subtitle}>
            Free promotional giveaways - no purchase necessary!
          </Text>
        </View>

        {/* Info Banner - iOS Compliant Messaging */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoIcon}>🆓</Text>
          <Text style={styles.infoText}>
            Everyone gets FREE entries! Spend credits for extra entries or earn bonus entries through activities. No purchase necessary.
          </Text>
        </View>

        {/* Credits Balance */}
        <View style={styles.creditsCard}>
          <Text style={styles.creditsLabel}>Your Credit Balance</Text>
          <Text style={styles.creditsAmount}>{balance.current.toLocaleString()}</Text>
          <Text style={styles.creditsSubtext}>= {Math.floor(balance.current / ENTRY_COST)} extra entries available</Text>
        </View>

        {/* Active Giveaways */}
        <Text style={styles.sectionTitle}>Active Giveaways</Text>

        {SAMPLE_GIVEAWAYS.map((giveaway) => {
          const entries = myEntries[giveaway.id] || { free: false, bonus: 0, paid: 0 };
          const totalEntries = (entries.free ? 1 : 0) + entries.bonus + entries.paid;
          const maxFreeEntries = giveaway.freeEntries + giveaway.bonusEntriesAvailable;
          
          return (
            <View key={giveaway.id} style={styles.raffleCard}>
              <View style={styles.raffleHeader}>
                <View>
                  <Text style={styles.raffleName}>{giveaway.name}</Text>
                  <Text style={styles.rafflePrize}>🏆 {giveaway.prizeValue}</Text>
                </View>
                <View style={styles.timeLeft}>
                  <Text style={styles.timeLeftText}>{formatTimeLeft(giveaway.endsAt)}</Text>
                </View>
              </View>

              <View style={styles.raffleStats}>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{giveaway.totalParticipants.toLocaleString()}</Text>
                  <Text style={styles.statLabel}>Participants</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{ENTRY_COST}</Text>
                  <Text style={styles.statLabel}>Credits/Entry</Text>
                </View>
                <View style={styles.stat}>
                  <Text style={styles.statValue}>{totalEntries}</Text>
                  <Text style={styles.statLabel}>Your Entries</Text>
                </View>
              </View>

              {/* Free Entry Button */}
              {!entries.free ? (
                <TouchableOpacity
                  style={styles.enterButton}
                  onPress={() => handleClaimFreeEntry(giveaway)}
                >
                  <Text style={styles.enterButtonText}>🆓 Claim Free Entry</Text>
                </TouchableOpacity>
              ) : (
                <View>
                  <View style={styles.enteredBadge}>
                    <Text style={styles.enteredBadgeText}>✅ You're Entered!</Text>
                  </View>
                  
                  {/* Buy More Entries with Credits - Unlimited! */}
                  <TouchableOpacity
                    style={[styles.enterButton, styles.buyButton]}
                    onPress={() => handleBuyEntry(giveaway)}
                  >
                    <Text style={styles.enterButtonText}>
                      💰 Buy Entry ({ENTRY_COST} credits) • {entries.paid} bought
                    </Text>
                  </TouchableOpacity>
                  
                  {/* Bonus Entry Timer Banner */}
                  {entries.bonus < giveaway.bonusEntriesAvailable && cooldownTimers[giveaway.id] && (
                    <View style={styles.timerBanner}>
                      <Text style={styles.timerIcon}>🎁</Text>
                      <View style={styles.timerContent}>
                        <Text style={styles.timerLabel}>Your Next Free Bonus In</Text>
                        <Text style={styles.timerValue}>{cooldownTimers[giveaway.id]}</Text>
                      </View>
                    </View>
                  )}
                  
                  {/* Earn Free Bonus Entries */}
                  {entries.bonus < giveaway.bonusEntriesAvailable && (
                    <TouchableOpacity
                      style={[
                        styles.enterButton, 
                        styles.bonusButton,
                        cooldownTimers[giveaway.id] && styles.cooldownButton,
                      ]}
                      onPress={() => handleEarnBonusEntry(giveaway)}
                      disabled={!!cooldownTimers[giveaway.id]}
                    >
                      <Text style={[
                        styles.enterButtonText,
                        cooldownTimers[giveaway.id] && styles.cooldownButtonText
                      ]}>
                        {cooldownTimers[giveaway.id] 
                          ? `⏳ Come Back Soon! (${entries.bonus}/${giveaway.bonusEntriesAvailable})` 
                          : `🎯 Earn Free Bonus (${entries.bonus}/${giveaway.bonusEntriesAvailable})`
                        }
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* How It Works */}
        <View style={styles.howItWorks}>
          <Text style={styles.howItWorksTitle}>How It Works</Text>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>1</Text>
            <Text style={styles.stepText}>Claim your FREE entry - no purchase necessary</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>2</Text>
            <Text style={styles.stepText}>Buy unlimited entries with credits ({ENTRY_COST} credits each)</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>3</Text>
            <Text style={styles.stepText}>Earn free bonus entries every {BONUS_COOLDOWN_HOURS} hours</Text>
          </View>
          <View style={styles.step}>
            <Text style={styles.stepNumber}>4</Text>
            <Text style={styles.stepText}>Winners are selected randomly and notified via email</Text>
          </View>
        </View>

        {/* Legal Disclaimer - iOS Compliant */}
        <Text style={styles.disclaimer}>
          NO PURCHASE NECESSARY. Promotional giveaways are sponsored by EarnLoop. 
          Open to eligible users. Void where prohibited. See Official Rules in Terms of Service.
        </Text>
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
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  infoBanner: {
    backgroundColor: colors.primary + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  infoIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  creditsCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  creditsLabel: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    opacity: 0.8,
  },
  creditsAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  creditsSubtext: {
    ...typography.caption,
    color: colors.textPrimary,
    opacity: 0.7,
    marginTop: spacing.xs,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  raffleCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  raffleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  raffleName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  rafflePrize: {
    ...typography.h3,
    color: colors.success,
    marginTop: spacing.xs,
  },
  timeLeft: {
    backgroundColor: colors.warning + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  timeLeftText: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '600',
  },
  raffleStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  enterButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  enterButtonDisabled: {
    backgroundColor: colors.textMuted,
  },
  buyButton: {
    backgroundColor: colors.primary,
    marginTop: spacing.sm,
  },
  bonusButton: {
    backgroundColor: colors.secondary || colors.accent,
    marginTop: spacing.sm,
  },
  cooldownButton: {
    backgroundColor: colors.textMuted,
    opacity: 0.7,
  },
  cooldownButtonText: {
    color: colors.textMuted,
  },
  timerBanner: {
    backgroundColor: colors.warning + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.warning,
  },
  timerIcon: {
    fontSize: 28,
    marginRight: spacing.sm,
  },
  timerContent: {
    flex: 1,
  },
  timerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timerValue: {
    ...typography.h3,
    color: colors.warning,
    fontWeight: '700',
  },
  enteredBadge: {
    backgroundColor: colors.success + '20',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.success,
  },
  enteredBadgeText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '600',
  },
  enterButtonText: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  howItWorks: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  howItWorksTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: '700',
    marginRight: spacing.sm,
  },
  stepText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    flex: 1,
  },
  disclaimer: {
    ...typography.caption,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
  },
});

export default RaffleScreen;
