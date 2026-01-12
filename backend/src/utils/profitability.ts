/**
 * Profitability Calculator for EarnLoop
 * Ensures giveaway prizes never exceed ad revenue
 */

interface RevenueMetrics {
  totalAdViews: number;
  estimatedEcpm: number; // dollars per 1000 ads
  actualRevenue: number;
  fillRate: number;
}

interface ProfitabilityResult {
  monthlyRevenue: number;
  safePrizeBudget: number;
  maxSinglePrize: number;
  isHealthy: boolean;
  warnings: string[];
  recommendations: string[];
}

// Conservative eCPM estimates by region
export const ECPM_ESTIMATES = {
  US: 15,
  CA: 12,
  GB: 12,
  AU: 10,
  DE: 10,
  GLOBAL_AVG: 8,
  CONSERVATIVE: 6,
} as const;

// Configuration
export const PROFIT_CONFIG = {
  // What % of revenue goes to prizes (20% is safe)
  PRIZE_BUDGET_PERCENTAGE: 0.20,
  
  // Minimum monthly ad views before running cash giveaways
  MIN_ADS_FOR_CASH_PRIZES: 3000,
  
  // Minimum eCPM to run any giveaways
  MIN_HEALTHY_ECPM: 5,
  
  // Maximum single prize as % of monthly budget
  MAX_SINGLE_PRIZE_PERCENTAGE: 0.50,
  
  // Fixed monthly costs (adjust based on your setup)
  MONTHLY_FIXED_COSTS: 20, // Apple fee amortized + any hosting
};

/**
 * Calculate safe prize budget based on ad metrics
 */
export function calculateProfitability(metrics: RevenueMetrics): ProfitabilityResult {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  
  // Calculate actual or estimated revenue
  let monthlyRevenue: number;
  
  if (metrics.actualRevenue > 0) {
    monthlyRevenue = metrics.actualRevenue;
  } else {
    // Estimate from ad views and eCPM
    monthlyRevenue = (metrics.totalAdViews / 1000) * metrics.estimatedEcpm;
  }
  
  // Check health indicators
  if (metrics.estimatedEcpm < PROFIT_CONFIG.MIN_HEALTHY_ECPM) {
    warnings.push(`eCPM ($${metrics.estimatedEcpm}) is below healthy threshold ($${PROFIT_CONFIG.MIN_HEALTHY_ECPM})`);
    recommendations.push('Check ad implementation and test ad units');
  }
  
  if (metrics.fillRate < 0.6) {
    warnings.push(`Fill rate (${(metrics.fillRate * 100).toFixed(0)}%) is below 60%`);
    recommendations.push('Consider adding more ad networks or check regional availability');
  }
  
  if (metrics.totalAdViews < PROFIT_CONFIG.MIN_ADS_FOR_CASH_PRIZES) {
    warnings.push(`Not enough ad views (${metrics.totalAdViews}) for cash prizes`);
    recommendations.push('Use credit-only prizes until reaching 3,000+ monthly ad views');
  }
  
  // Calculate safe prize budget
  const grossProfit = monthlyRevenue - PROFIT_CONFIG.MONTHLY_FIXED_COSTS;
  const safePrizeBudget = Math.max(0, grossProfit * PROFIT_CONFIG.PRIZE_BUDGET_PERCENTAGE);
  const maxSinglePrize = safePrizeBudget * PROFIT_CONFIG.MAX_SINGLE_PRIZE_PERCENTAGE;
  
  // Determine health
  const isHealthy = 
    monthlyRevenue > PROFIT_CONFIG.MONTHLY_FIXED_COSTS &&
    metrics.estimatedEcpm >= PROFIT_CONFIG.MIN_HEALTHY_ECPM &&
    metrics.fillRate >= 0.5;
  
  if (grossProfit < 0) {
    warnings.push('Operating at a loss - pause giveaways immediately');
    recommendations.push('Focus on user acquisition before running promotions');
  }
  
  if (isHealthy && safePrizeBudget > 50) {
    recommendations.push(`Safe to run monthly giveaway up to $${maxSinglePrize.toFixed(0)}`);
  }
  
  return {
    monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
    safePrizeBudget: Math.round(safePrizeBudget * 100) / 100,
    maxSinglePrize: Math.round(maxSinglePrize * 100) / 100,
    isHealthy,
    warnings,
    recommendations,
  };
}

/**
 * Calculate break-even point
 */
export function calculateBreakEven(
  monthlyFixedCosts: number,
  prizeBudget: number,
  ecpm: number
): { adsNeeded: number; usersNeeded: number; adsPerUserPerDay: number } {
  const totalCosts = monthlyFixedCosts + prizeBudget;
  const revenuePerAd = ecpm / 1000;
  const adsNeeded = Math.ceil(totalCosts / revenuePerAd);
  const adsPerUserPerDay = 10; // Assuming power user watches 10 ads
  const usersNeeded = Math.ceil(adsNeeded / 30 / adsPerUserPerDay);
  
  return {
    adsNeeded,
    usersNeeded,
    adsPerUserPerDay,
  };
}

/**
 * Recommend prize tier based on DAU
 */
export function recommendPrizeTier(dailyActiveUsers: number): {
  maxPrize: number;
  frequency: 'none' | 'monthly' | 'biweekly' | 'weekly';
  type: 'credits' | 'gift_card' | 'cash';
} {
  if (dailyActiveUsers < 20) {
    return { maxPrize: 0, frequency: 'none', type: 'credits' };
  }
  
  if (dailyActiveUsers < 50) {
    return { maxPrize: 100, frequency: 'monthly', type: 'credits' }; // 100 credits = free
  }
  
  if (dailyActiveUsers < 200) {
    return { maxPrize: 10, frequency: 'monthly', type: 'gift_card' };
  }
  
  if (dailyActiveUsers < 500) {
    return { maxPrize: 25, frequency: 'monthly', type: 'gift_card' };
  }
  
  if (dailyActiveUsers < 1000) {
    return { maxPrize: 50, frequency: 'biweekly', type: 'gift_card' };
  }
  
  return { maxPrize: 100, frequency: 'weekly', type: 'gift_card' };
}

/**
 * Daily revenue estimate
 */
export function estimateDailyRevenue(
  dailyAdViews: number,
  ecpm: number = ECPM_ESTIMATES.CONSERVATIVE
): number {
  return (dailyAdViews / 1000) * ecpm;
}

/**
 * Quick health check - use in admin dashboard
 */
export function quickHealthCheck(
  last30DaysAdViews: number,
  last30DaysRevenue: number,
  currentPrizeBudget: number
): 'healthy' | 'warning' | 'critical' {
  const actualEcpm = (last30DaysRevenue / last30DaysAdViews) * 1000;
  const profitAfterPrizes = last30DaysRevenue - PROFIT_CONFIG.MONTHLY_FIXED_COSTS - currentPrizeBudget;
  
  if (profitAfterPrizes < 0) return 'critical';
  if (actualEcpm < PROFIT_CONFIG.MIN_HEALTHY_ECPM) return 'warning';
  if (currentPrizeBudget > last30DaysRevenue * 0.3) return 'warning';
  
  return 'healthy';
}

// Example usage and tests
if (require.main === module) {
  console.log('=== EarnLoop Profitability Calculator ===\n');
  
  // Scenario 1: New app, low traffic
  const scenario1 = calculateProfitability({
    totalAdViews: 1000,
    estimatedEcpm: ECPM_ESTIMATES.CONSERVATIVE,
    actualRevenue: 0,
    fillRate: 0.7,
  });
  console.log('Scenario 1 - New App (1,000 ads/month):');
  console.log(`  Revenue: $${scenario1.monthlyRevenue}`);
  console.log(`  Safe Prize Budget: $${scenario1.safePrizeBudget}`);
  console.log(`  Max Single Prize: $${scenario1.maxSinglePrize}`);
  console.log(`  Healthy: ${scenario1.isHealthy}`);
  console.log(`  Warnings: ${scenario1.warnings.join(', ') || 'None'}`);
  console.log();
  
  // Scenario 2: Growing app
  const scenario2 = calculateProfitability({
    totalAdViews: 10000,
    estimatedEcpm: ECPM_ESTIMATES.GLOBAL_AVG,
    actualRevenue: 0,
    fillRate: 0.75,
  });
  console.log('Scenario 2 - Growing App (10,000 ads/month):');
  console.log(`  Revenue: $${scenario2.monthlyRevenue}`);
  console.log(`  Safe Prize Budget: $${scenario2.safePrizeBudget}`);
  console.log(`  Max Single Prize: $${scenario2.maxSinglePrize}`);
  console.log(`  Healthy: ${scenario2.isHealthy}`);
  console.log();
  
  // Scenario 3: Established app
  const scenario3 = calculateProfitability({
    totalAdViews: 50000,
    estimatedEcpm: ECPM_ESTIMATES.US,
    actualRevenue: 750,
    fillRate: 0.85,
  });
  console.log('Scenario 3 - Established App (50,000 ads/month):');
  console.log(`  Revenue: $${scenario3.monthlyRevenue}`);
  console.log(`  Safe Prize Budget: $${scenario3.safePrizeBudget}`);
  console.log(`  Max Single Prize: $${scenario3.maxSinglePrize}`);
  console.log(`  Healthy: ${scenario3.isHealthy}`);
  console.log(`  Recommendations: ${scenario3.recommendations.join(', ')}`);
  console.log();
  
  // Break-even calculation
  const breakEven = calculateBreakEven(20, 50, ECPM_ESTIMATES.GLOBAL_AVG);
  console.log('Break-Even (with $50 prize budget):');
  console.log(`  Ads needed/month: ${breakEven.adsNeeded}`);
  console.log(`  Active users needed: ${breakEven.usersNeeded} (at ${breakEven.adsPerUserPerDay} ads/day)`);
}
