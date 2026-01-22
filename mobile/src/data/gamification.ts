/**
 * Gamification data for EarnLoop
 * Levels, badges, and achievements to make earning credits engaging
 */

// User levels based on lifetime credits earned
export interface UserLevel {
  id: string;
  name: string;
  emoji: string;
  minCredits: number;
  perks: string[];
  color: string;
}

export const USER_LEVELS: UserLevel[] = [
  {
    id: 'bronze',
    name: 'Bronze',
    emoji: '🥉',
    minCredits: 0,
    perks: ['Basic access'],
    color: '#CD7F32',
  },
  {
    id: 'silver',
    name: 'Silver',
    emoji: '🥈',
    minCredits: 500,
    perks: ['5% bonus on daily check-in', 'Silver badge'],
    color: '#C0C0C0',
  },
  {
    id: 'gold',
    name: 'Gold',
    emoji: '🥇',
    minCredits: 2000,
    perks: ['10% bonus on all earnings', 'Gold badge', 'Priority support'],
    color: '#FFD700',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    emoji: '💎',
    minCredits: 5000,
    perks: ['15% bonus on all earnings', 'Platinum badge', 'Early access to features', 'Exclusive themes'],
    color: '#E5E4E2',
  },
  {
    id: 'diamond',
    name: 'Diamond',
    emoji: '👑',
    minCredits: 10000,
    perks: ['20% bonus on all earnings', 'Diamond badge', 'VIP support', 'All themes free', '2x raffle entries'],
    color: '#B9F2FF',
  },
];

// Get user's current level based on lifetime earnings
export const getUserLevel = (lifetimeCredits: number): UserLevel => {
  for (let i = USER_LEVELS.length - 1; i >= 0; i--) {
    if (lifetimeCredits >= USER_LEVELS[i].minCredits) {
      return USER_LEVELS[i];
    }
  }
  return USER_LEVELS[0];
};

// Get next level and progress
export const getLevelProgress = (lifetimeCredits: number): { 
  currentLevel: UserLevel; 
  nextLevel: UserLevel | null; 
  progress: number;
  creditsToNext: number;
} => {
  const currentLevel = getUserLevel(lifetimeCredits);
  const currentIndex = USER_LEVELS.findIndex(l => l.id === currentLevel.id);
  const nextLevel = currentIndex < USER_LEVELS.length - 1 ? USER_LEVELS[currentIndex + 1] : null;
  
  if (!nextLevel) {
    return { currentLevel, nextLevel: null, progress: 100, creditsToNext: 0 };
  }
  
  const creditsInLevel = lifetimeCredits - currentLevel.minCredits;
  const creditsNeeded = nextLevel.minCredits - currentLevel.minCredits;
  const progress = Math.min((creditsInLevel / creditsNeeded) * 100, 100);
  const creditsToNext = nextLevel.minCredits - lifetimeCredits;
  
  return { currentLevel, nextLevel, progress, creditsToNext };
};

// Badges/Achievements
export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  requirement: string;
}

export const BADGES: Badge[] = [
  {
    id: 'first_checkin',
    name: 'First Steps',
    emoji: '👶',
    description: 'Complete your first daily check-in',
    requirement: 'checkins >= 1',
  },
  {
    id: 'week_streak',
    name: 'Week Warrior',
    emoji: '🔥',
    description: 'Maintain a 7-day streak',
    requirement: 'streak >= 7',
  },
  {
    id: 'month_streak',
    name: 'Monthly Master',
    emoji: '🌟',
    description: 'Maintain a 30-day streak',
    requirement: 'streak >= 30',
  },
  {
    id: 'first_ad',
    name: 'Ad Explorer',
    emoji: '🎬',
    description: 'Watch your first rewarded ad',
    requirement: 'ads_watched >= 1',
  },
  {
    id: 'ad_enthusiast',
    name: 'Ad Enthusiast',
    emoji: '📺',
    description: 'Watch 50 rewarded ads',
    requirement: 'ads_watched >= 50',
  },
  {
    id: 'first_quiz',
    name: 'Knowledge Seeker',
    emoji: '📚',
    description: 'Complete your first learn module',
    requirement: 'modules_completed >= 1',
  },
  {
    id: 'quiz_master',
    name: 'Quiz Master',
    emoji: '🎓',
    description: 'Complete all learn modules with 90%+ scores',
    requirement: 'all_modules_90',
  },
  {
    id: 'first_redeem',
    name: 'Smart Shopper',
    emoji: '🛍️',
    description: 'Redeem your first reward',
    requirement: 'redemptions >= 1',
  },
  {
    id: 'big_spender',
    name: 'Big Spender',
    emoji: '💰',
    description: 'Spend 1000 credits in the store',
    requirement: 'credits_spent >= 1000',
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    emoji: '🐦',
    description: 'Check in before 7 AM',
    requirement: 'early_checkin',
  },
  {
    id: 'night_owl',
    name: 'Night Owl',
    emoji: '🦉',
    description: 'Check in after 11 PM',
    requirement: 'late_checkin',
  },
  {
    id: 'perfect_week',
    name: 'Perfect Week',
    emoji: '✨',
    description: 'Max out daily earnings for 7 days straight',
    requirement: 'perfect_week',
  },
];

// Promotional Giveaway configuration
// NOTE: These are FREE promotional giveaways - NO PURCHASE NECESSARY
// Users earn entries through engagement, not by spending credits
// This structure is iOS App Store compliant
export interface Giveaway {
  id: string;
  name: string;
  prize: string;
  prizeValue: string;
  // FREE entry - everyone gets 1 entry per period
  freeEntries: number;
  // Bonus entries earned through app engagement (NOT purchase)
  bonusEntriesAvailable: number;
  endsAt: Date;
  totalParticipants: number;
  // How to earn bonus entries (engagement-based, NOT credit-cost)
  bonusRequirements: string;
}

// Helper to generate realistic participant counts based on time remaining
const getRealisticParticipants = (daysLeft: number, baseParticipants: number): number => {
  // More participants as deadline approaches
  const dayFactor = Math.max(1, 30 - daysLeft) / 30;
  const variance = Math.floor(Math.random() * 50) - 25; // ±25 variance
  return Math.floor(baseParticipants * (0.3 + dayFactor * 0.7)) + variance;
};

// Calculate end date for weekly draws (next Sunday at midnight)
const getNextWeeklyDraw = (): Date => {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(23, 59, 59, 999);
  return nextSunday;
};

// Calculate end date for monthly draws (last day of month)
const getNextMonthlyDraw = (): Date => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  lastDay.setHours(23, 59, 59, 999);
  return lastDay;
};

// IMPORTANT: Giveaways are promotional events with NO PURCHASE NECESSARY
// Bonus entries are earned through engagement activities, not by spending credits
export const SAMPLE_GIVEAWAYS: Giveaway[] = [
  {
    id: 'monthly_giveaway',
    name: 'Monthly Gift Card Giveaway',
    prize: 'Gift Card',
    prizeValue: '$50 Gift Card',
    freeEntries: 1, // Everyone gets 1 free entry
    bonusEntriesAvailable: 5, // Up to 5 bonus entries from engagement
    endsAt: getNextMonthlyDraw(),
    totalParticipants: getRealisticParticipants(15, 2500),
    bonusRequirements: 'Complete daily activities for bonus entries',
  },
  {
    id: 'weekly_bonus',
    name: 'Weekly Credit Drop',
    prize: 'Bonus Credits',
    prizeValue: '500 Bonus Credits',
    freeEntries: 1,
    bonusEntriesAvailable: 10,
    endsAt: getNextWeeklyDraw(),
    totalParticipants: getRealisticParticipants(3, 800),
    bonusRequirements: 'Watch ads and complete lessons for bonus entries',
  },
];

// Jackpot configuration - Uses TOKENS (not credits)
// Tokens have NO CASH VALUE and can only be used for cosmetics/mystery bags
export interface JackpotConfig {
  id: string;
  name: string;
  minEntry: number;           // Minimum tokens to enter
  maxEntry: number;           // Maximum tokens per entry
  multipliers: number[];      // Possible win multipliers [0, 0.5, 1, 2, 5, 10]
  multiplierWeights: number[];// Probability weights for each multiplier
  jackpotPool: number;        // Growing jackpot from losses
  jackpotChance: number;      // % chance to win jackpot (0.1 = 0.1%)
}

export const JACKPOT_CONFIG: JackpotConfig = {
  id: 'token_jackpot',
  name: 'Token Jackpot',
  minEntry: 10,
  maxEntry: 500,
  // Multipliers: lose, half back, break even, 2x, 5x, 10x
  multipliers: [0, 0.5, 1, 2, 5, 10],
  // Weights (must sum to 100): 40% lose, 25% half, 20% even, 10% 2x, 4% 5x, 1% 10x
  multiplierWeights: [40, 25, 20, 10, 4, 1],
  jackpotPool: 1000, // Starting jackpot in tokens
  jackpotChance: 0.5, // 0.5% chance to win jackpot on any spin
};

// Token Store Items (cosmetics, mystery bags - NO cash value redemption)
export interface TokenStoreItem {
  id: string;
  name: string;
  description: string;
  tokenCost: number;
  category: 'cosmetic' | 'mystery_bag' | 'boost';
  emoji: string;
}

export const TOKEN_STORE_ITEMS: TokenStoreItem[] = [
  {
    id: 'mystery_bag_small',
    name: 'Small Mystery Bag',
    description: 'Contains 50-200 bonus credits!',
    tokenCost: 50,
    category: 'mystery_bag',
    emoji: '🎁',
  },
  {
    id: 'mystery_bag_medium',
    name: 'Medium Mystery Bag',
    description: 'Contains 100-500 bonus credits!',
    tokenCost: 100,
    category: 'mystery_bag',
    emoji: '🎀',
  },
  {
    id: 'mystery_bag_large',
    name: 'Large Mystery Bag',
    description: 'Contains 250-1000 bonus credits!',
    tokenCost: 200,
    category: 'mystery_bag',
    emoji: '🎊',
  },
];

// Legacy export for backwards compatibility
export type Raffle = Giveaway;
export const SAMPLE_RAFFLES = SAMPLE_GIVEAWAYS;
