// Progressive trust levels based on account age
export interface TrustLevel {
  level: 'new' | 'regular' | 'trusted' | 'veteran';
  capMultiplier: number;
  maxAdsPerDay: number;
  checksRequired: boolean;
}

export const getTrustLevel = (daysSinceSignup: number): TrustLevel => {
  if (daysSinceSignup < 3) {
    return {
      level: 'new',
      capMultiplier: 0.5, // 50% of normal cap
      maxAdsPerDay: 2,
      checksRequired: true,
    };
  }
  
  if (daysSinceSignup < 7) {
    return {
      level: 'regular',
      capMultiplier: 0.75, // 75% of normal cap
      maxAdsPerDay: 3,
      checksRequired: true,
    };
  }
  
  if (daysSinceSignup < 30) {
    return {
      level: 'trusted',
      capMultiplier: 1.0, // Full cap
      maxAdsPerDay: 5,
      checksRequired: false,
    };
  }
  
  return {
    level: 'veteran',
    capMultiplier: 1.2, // Bonus cap for loyal users
    maxAdsPerDay: 7,
    checksRequired: false,
  };
};

export const getDaysSinceSignup = (createdAt: Date): number => {
  return Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
};
