import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Animated,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../services/api';
import { spacing, borderRadius, typography } from '../utils/theme';

interface StoreItem {
  id: string;
  name: string;
  description: string;
  creditsCost: number;
  itemType: string;
  category: string;
  durationDays: number | null;
  maxPerUser: number | null;
  icon: string;
  userRedemptions: number;
  ownedQuantity: number;
  canAfford: boolean;
  canRedeem: boolean;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

const RewardsScreen = () => {
  const { balance, updateBalance } = useAuth();
  const { colors } = useTheme();
  const [categories, setCategories] = useState<Category[]>([]);
  const [itemsByCategory, setItemsByCategory] = useState<Record<string, StoreItem[]>>({});
  const [selectedCategory, setSelectedCategory] = useState<string>('giftcards');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [giftCardModal, setGiftCardModal] = useState(false);
  const [selectedGiftCard, setSelectedGiftCard] = useState<StoreItem | null>(null);
  const [email, setEmail] = useState('');

  useEffect(() => {
    loadStoreItems();
  }, []);

  const loadStoreItems = async () => {
    try {
      const response = await api.getStoreItems();
      if (response.success && response.data) {
        setCategories(response.data.categories || []);
        setItemsByCategory(response.data.itemsByCategory || {});
        // Select first category with items
        const firstCategoryWithItems = response.data.categories?.find(
          (c: Category) => response.data.itemsByCategory[c.id]?.length > 0
        );
        if (firstCategoryWithItems) {
          setSelectedCategory(firstCategoryWithItems.id);
        }
      }
    } catch (error) {
      console.error('Failed to load store items:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadStoreItems();
    setRefreshing(false);
  };

  const handleRedeem = async (item: StoreItem) => {
    if (!item.canAfford) {
      Alert.alert(
        'Need More Credits! 💪',
        `You need ${(item.creditsCost - balance.current).toLocaleString()} more credits.\n\nWatch ads to earn more!`
      );
      return;
    }

    if (!item.canRedeem) {
      Alert.alert('Already Owned! ✨', 'You already have this item.');
      return;
    }

    // Gift cards need email confirmation
    if (item.itemType === 'giftcard') {
      setSelectedGiftCard(item);
      setEmail('');
      setGiftCardModal(true);
      return;
    }

    Alert.alert(
      `Get ${item.name}?`,
      `This will cost ${item.creditsCost.toLocaleString()} credits.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Buy for ${item.creditsCost}`,
          onPress: async () => {
            setRedeeming(item.id);
            try {
              const response = await api.redeemItem(item.id);
              if (response.success && response.data) {
                updateBalance(response.data.newBalance);
                Alert.alert('Unlocked! 🎉', response.data.message);
                loadStoreItems();
              } else {
                Alert.alert('Error', response.error?.message || 'Redemption failed');
              }
            } catch (error) {
              Alert.alert('Error', 'Something went wrong');
            } finally {
              setRedeeming(null);
            }
          },
        },
      ]
    );
  };

  const handleGiftCardRedeem = async () => {
    if (!selectedGiftCard) return;
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address to receive your gift card code.');
      return;
    }

    setGiftCardModal(false);
    setRedeeming(selectedGiftCard.id);

    try {
      const response = await api.redeemItem(selectedGiftCard.id, email);
      if (response.success && response.data) {
        updateBalance(response.data.newBalance);
        Alert.alert(
          '🎁 Gift Card Requested!',
          `Your ${selectedGiftCard.name} has been requested!\n\nYou'll receive your gift card code at:\n${email}\n\nPlease allow up to 24-48 hours for delivery.`,
          [{ text: 'Awesome!' }]
        );
        loadStoreItems();
      } else {
        Alert.alert('Error', response.error?.message || 'Redemption failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Something went wrong');
    } finally {
      setRedeeming(null);
      setSelectedGiftCard(null);
    }
  };

  const formatDuration = (days: number | null) => {
    if (!days) return 'Forever';
    if (days === 1) return '24h';
    if (days === 7) return '7 days';
    if (days === 30) return '30 days';
    return `${days} days`;
  };

  const getItemBadge = (item: StoreItem) => {
    if (item.ownedQuantity > 0 && item.itemType !== 'consumable') {
      return { text: 'OWNED', color: colors.success };
    }
    if (item.ownedQuantity > 0 && item.itemType === 'consumable') {
      return { text: `×${item.ownedQuantity}`, color: colors.info };
    }
    if (item.itemType === 'boost') {
      return { text: '2X', color: colors.warning };
    }
    if (!item.durationDays) {
      return { text: 'FOREVER', color: colors.primary };
    }
    return null;
  };

  const currentItems = itemsByCategory[selectedCategory] || [];
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
        {/* Balance Banner */}
        <View style={styles.balanceBanner}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceAmount}>{balance.current.toLocaleString()}</Text>
            <Text style={styles.balanceCoin}>🪙</Text>
          </View>
          <Text style={styles.balanceUnit}>credits available</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
          contentContainerStyle={styles.categoryContainer}
        >
          {categories.map((category) => {
            const itemCount = itemsByCategory[category.id]?.length || 0;
            const isSelected = selectedCategory === category.id;
            
            return (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryTab,
                  isSelected && styles.categoryTabSelected,
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={[
                  styles.categoryName,
                  isSelected && styles.categoryNameSelected,
                ]}>
                  {category.name}
                </Text>
                {itemCount > 0 && (
                  <View style={[
                    styles.categoryBadge,
                    isSelected && styles.categoryBadgeSelected,
                  ]}>
                    <Text style={styles.categoryBadgeText}>{itemCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Items Grid */}
        <View style={styles.section}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading store...</Text>
            </View>
          ) : currentItems.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>Nothing here yet!</Text>
              <Text style={styles.emptySubtext}>Check back soon for new items.</Text>
            </View>
          ) : (
            <View style={styles.itemsGrid}>
              {currentItems.map((item) => {
                const badge = getItemBadge(item);
                const isOwned = item.ownedQuantity > 0 && item.itemType !== 'consumable';
                
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.itemCard,
                      !item.canAfford && !isOwned && styles.itemCardDisabled,
                      isOwned && styles.itemCardOwned,
                    ]}
                    onPress={() => handleRedeem(item)}
                    disabled={redeeming === item.id || isOwned}
                  >
                    {/* Badge */}
                    {badge && (
                      <View style={[styles.itemBadge, { backgroundColor: badge.color + '20' }]}>
                        <Text style={[styles.itemBadgeText, { color: badge.color }]}>
                          {badge.text}
                        </Text>
                      </View>
                    )}
                    
                    {/* Icon */}
                    <Text style={styles.itemIcon}>{item.icon}</Text>
                    
                    {/* Name */}
                    <Text style={styles.itemName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    
                    {/* Duration tag */}
                    {item.durationDays && (
                      <View style={styles.durationTag}>
                        <Text style={styles.durationText}>
                          ⏱ {formatDuration(item.durationDays)}
                        </Text>
                      </View>
                    )}
                    
                    {/* Price */}
                    <View style={[
                      styles.priceTag,
                      item.canAfford || isOwned ? styles.priceTagAffordable : styles.priceTagExpensive,
                    ]}>
                      {isOwned ? (
                        <Text style={styles.priceOwned}>✓ Owned</Text>
                      ) : (
                        <>
                          <Text style={[
                            styles.priceAmount,
                            item.canAfford ? styles.priceAffordable : styles.priceExpensive,
                          ]}>
                            {item.creditsCost.toLocaleString()}
                          </Text>
                          <Text style={[
                            styles.priceCoin,
                            item.canAfford ? styles.priceAffordable : styles.priceExpensive,
                          ]}>
                            🪙
                          </Text>
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>ℹ️ About the Store</Text>
          <Text style={styles.infoText}>
            • Gift cards are delivered digitally via email{'\n'}
            • In-app rewards are cosmetic perks only{'\n'}
            • Streak Savers protect your streak automatically{'\n'}
            • Gift cards may take 24-48 hours to process
          </Text>
        </View>
      </ScrollView>

      {/* Gift Card Email Modal */}
      <Modal
        visible={giftCardModal}
        transparent
        animationType="fade"
        onRequestClose={() => setGiftCardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalIcon}>{selectedGiftCard?.icon || '🎁'}</Text>
            <Text style={styles.modalTitle}>Redeem {selectedGiftCard?.name}</Text>
            <Text style={styles.modalSubtitle}>
              Cost: {selectedGiftCard?.creditsCost.toLocaleString()} credits
            </Text>
            
            <Text style={styles.modalLabel}>Enter your email address:</Text>
            <TextInput
              style={styles.emailInput}
              placeholder="your@email.com"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.modalNote}>
              Your gift card code will be sent to this email within 24-48 hours.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setGiftCardModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleGiftCardRedeem}
              >
                <Text style={styles.modalConfirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  balanceBanner: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  balanceLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    opacity: 0.8,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  balanceCoin: {
    fontSize: 36,
  },
  balanceUnit: {
    ...typography.body,
    color: colors.textPrimary,
    opacity: 0.8,
  },
  categoryScroll: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.md,
  },
  categoryContainer: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.backgroundCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  categoryTabSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryIcon: {
    fontSize: 18,
  },
  categoryName: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryNameSelected: {
    color: colors.textPrimary,
  },
  categoryBadge: {
    backgroundColor: colors.backgroundSecondary,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    minWidth: 20,
    alignItems: 'center',
  },
  categoryBadgeSelected: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  categoryBadgeText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 10,
  },
  section: {
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  emptyContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.h3,
    color: colors.textPrimary,
  },
  emptySubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  itemCard: {
    width: '48%',
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    position: 'relative',
    minHeight: 160,
  },
  itemCardDisabled: {
    opacity: 0.6,
  },
  itemCardOwned: {
    borderColor: colors.success,
    backgroundColor: colors.success + '10',
  },
  itemBadge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  itemBadgeText: {
    ...typography.caption,
    fontWeight: '700',
    fontSize: 10,
  },
  itemIcon: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  itemName: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  durationTag: {
    backgroundColor: colors.info + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  durationText: {
    ...typography.caption,
    color: colors.info,
    fontSize: 10,
  },
  priceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    marginTop: 'auto',
    gap: 4,
  },
  priceTagAffordable: {
    backgroundColor: colors.success + '20',
  },
  priceTagExpensive: {
    backgroundColor: colors.error + '20',
  },
  priceAmount: {
    ...typography.body,
    fontWeight: '700',
  },
  priceCoin: {
    fontSize: 14,
  },
  priceAffordable: {
    color: colors.success,
  },
  priceExpensive: {
    color: colors.error,
  },
  priceOwned: {
    ...typography.bodySmall,
    color: colors.success,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.info,
  },
  infoTitle: {
    ...typography.bodySmall,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  infoText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  modalIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.lg,
  },
  modalLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: spacing.xs,
  },
  emailInput: {
    width: '100%',
    backgroundColor: colors.backgroundSecondary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    color: colors.textPrimary,
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  modalNote: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  modalCancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.backgroundSecondary,
    alignItems: 'center',
  },
  modalCancelText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalConfirmButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    ...typography.body,
    color: '#fff',
    fontWeight: '600',
  },
});

export default RewardsScreen;
