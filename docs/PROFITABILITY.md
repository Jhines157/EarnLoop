# EarnLoop Profitability Guide

## 💰 Revenue Model

### AdMob Rewarded Video Revenue
| Metric | Conservative | Average | Optimistic |
|--------|--------------|---------|------------|
| eCPM | $8 | $12 | $20 |
| Revenue/Ad | $0.008 | $0.012 | $0.020 |

> eCPM = Effective Cost Per Mille (revenue per 1,000 ad impressions)

### Current Earning Config
- **Ad Reward**: 10 credits per ad
- **Check-in**: 5 credits (free, once/day)
- **Daily Cap**: 100 credits

### User Economics
| User Type | Ads/Day | Your Revenue/Day |
|-----------|---------|------------------|
| Casual (20 credits) | 2 | $0.016-$0.04 |
| Regular (50 credits) | 5 | $0.04-$0.10 |
| Power (100 credits) | 10 | $0.08-$0.20 |

---

## 🎁 Giveaway Budget Rules

### Rule #1: Track Actual Revenue
Never promise prizes before knowing real eCPM. Wait 30 days after launch.

### Rule #2: Prize Pool = % of Revenue
**Recommended allocation:**
```
Monthly Prize Budget = (Monthly Ad Revenue × 20%)
```

Example:
- 1,000 ads/day × 30 days = 30,000 ads/month
- At $10 eCPM = $300/month revenue
- Prize budget = $60/month (20%)

### Rule #3: Tiered Giveaway Structure

| User Count (DAU) | Max Monthly Prize | Frequency |
|------------------|-------------------|-----------|
| < 50 | $10 | Monthly |
| 50-200 | $25 | Monthly |
| 200-500 | $50 | Bi-weekly |
| 500-1000 | $100 | Weekly |
| 1000+ | Scale with revenue | Weekly |

### Rule #4: Use Credits, Not Cash (When Possible)
Giving away 500 credits costs you $0 but has perceived value!

---

## ⚠️ Break-Even Calculator

### Monthly Fixed Costs
| Item | Cost |
|------|------|
| Neon PostgreSQL | $0 (free tier) / $19 (pro) |
| Server Hosting | $0 (serverless) / $5-20 |
| Apple Developer | $99/year ($8.25/mo) |
| AdMob | Free |
| **Total Fixed** | **$8-47/month** |

### Break-Even Formula
```
Required Monthly Ads = (Fixed Costs + Prize Budget) / Revenue Per Ad

Example (Conservative):
Fixed: $20/month
Prizes: $50/month  
Revenue/Ad: $0.01

Required Ads = $70 / $0.01 = 7,000 ads/month
= 234 ads/day
= 24 users watching 10 ads/day
```

---

## 🛡️ Profit Protection Strategies

### 1. Dynamic Prize Scaling
```typescript
// Scale prizes based on actual monthly ad views
function calculateMonthlyPrizeBudget(monthlyAdViews: number): number {
  const conservativeEcpm = 8; // $8 per 1000 ads
  const estimatedRevenue = (monthlyAdViews / 1000) * conservativeEcpm;
  const prizePercentage = 0.20; // 20% to prizes
  return estimatedRevenue * prizePercentage;
}
```

### 2. Minimum Threshold for Giveaways
Only run giveaways when you have enough activity:
- **Minimum 100 DAU** before running cash giveaways
- Use credit-only prizes for smaller user bases

### 3. Weekly Revenue Monitoring
Track these metrics weekly:
- Total ad impressions
- Fill rate (% of requests that showed ads)
- Actual eCPM (revenue / impressions × 1000)
- New user signups
- Daily active users (DAU)

### 4. Emergency Pause Conditions
Stop giveaways immediately if:
- eCPM drops below $5
- Fill rate drops below 50%
- Fraud detection triggers
- Month is unprofitable

---

## 📊 Safe Launch Settings

### Phase 1: Soft Launch (First 30 days)
```env
DAILY_CREDIT_CAP=50
AD_REWARD=10
CHECKIN_REWARD=5
```
- NO cash giveaways
- Only credit bonuses as prizes
- Focus on collecting eCPM data

### Phase 2: Validated (30-90 days)
Once you know your real eCPM:
```env
DAILY_CREDIT_CAP=100
AD_REWARD=10
CHECKIN_REWARD=5
```
- Small giveaways ($10-25)
- Monthly frequency only

### Phase 3: Scaling (90+ days)
When profitable and growing:
- Increase prize values with revenue
- More frequent giveaways
- Premium features if desired

---

## 🧮 Quick Reference

### Revenue Targets
| Goal | Ads/Month Needed (at $10 eCPM) |
|------|-------------------------------|
| Cover $50 prize | 5,000 ads |
| Cover $100 costs | 10,000 ads |
| $500 profit | 50,000 ads |
| $1000 profit | 100,000 ads |

### Conversion Rates (Industry Average)
- Download → Open: 70%
- Open → Signup: 30%
- Signup → Watch 1 Ad: 50%
- Watch 1 Ad → Daily Active: 20%

### Red Flags 🚩
- eCPM below $5 (check ad setup)
- Fill rate below 60% (region issues)
- Same users winning giveaways (fraud)
- Rapid signups from same IP (bots)

---

## ✅ Golden Rule

> **Never commit to a prize value until you've seen 30 days of real revenue data.**

Start with credit-only prizes (costs you $0) and scale up based on actual performance.
