# EarnLoop Compliance & Legal Guide

## Overview

This document outlines the compliance requirements and legal considerations for EarnLoop to operate within app store guidelines and advertising network policies.

---

## ⚠️ Critical: Ad Network Policies

### Google AdMob

**Rewarded Ads Policy (Key Points):**

1. **Direct Monetary Items are PROHIBITED as rewards:**
   - ❌ Cash
   - ❌ Cryptocurrency (including Bitcoin, satoshis)
   - ❌ Gift cards
   - ❌ Anything with real-world monetary value

2. **Allowed Rewards:**
   - ✅ In-app credits (non-transferable)
   - ✅ Virtual items usable only in your app
   - ✅ Premium features
   - ✅ Cosmetic items

3. **User Opt-In Required:**
   - Users must actively choose to watch ads
   - No forced or mandatory ads
   - Clear indication of reward before watching

4. **Server-Side Verification (SSV):**
   - Must verify ad completions server-side
   - Prevents fraud and fake completions
   - Required for production apps

**Reference:** [Google AdMob Rewarded Ads Policies](https://support.google.com/admob/answer/7313578)

### Unity Ads

Similar restrictions apply:
- No real-world rewards
- No cash/gift cards/cryptocurrency
- Virtual rewards only

---

## App Store Guidelines

### Apple App Store

1. **No misleading claims:**
   - Cannot claim users will "earn Bitcoin"
   - Cannot imply mining functionality
   - Must clearly state credits are in-app only

2. **Virtual currency rules:**
   - In-app currencies must be clearly virtual
   - Cannot be exchanged for real money
   - Purchases/rewards must be clear

3. **Gambling restrictions:**
   - No randomized rewards that feel like gambling
   - Clear odds if any chance-based elements

### Google Play Store

1. **Real-money gaming policies:**
   - Similar restrictions to Apple
   - No deceptive practices
   - Clear disclosure of what users earn

2. **Ad policy compliance:**
   - Must follow AdMob policies
   - No incentivized installs
   - No ad fraud

---

## EarnLoop Implementation

### What We DO:

✅ Users earn **in-app credits** (not cryptocurrency)
✅ Credits are redeemed for **in-app perks only**
✅ Clear disclaimers everywhere:
  - "EarnLoop does NOT mine cryptocurrency"
  - "Credits are non-transferable and have no cash value"
  - "Rewards are in-app features only"

### What We DON'T DO:

❌ Allow credits to be converted to crypto
❌ Claim users can "earn Bitcoin" by watching ads
❌ Tie ad-watching directly to BTC rewards
❌ Use the word "mining" anywhere

### Future BTC Promotions (If Applicable)

If you want to offer BTC rewards in the future:

1. **Separate from ad-watching:**
   - BTC rewards must NOT be tied to watching ads
   - Run as separate promotional events

2. **Manual/giveaway style:**
   - Monthly giveaways to verified users
   - Contest-based rewards
   - Referral bonuses (carefully structured)

3. **Legal review required:**
   - Consult with a lawyer before implementing
   - May have regulatory implications
   - Different rules by jurisdiction

---

## Required Legal Pages

### 1. Terms of Service

Must include:
- Credits have no monetary value
- Credits cannot be transferred or cashed out
- Rewards are in-app features only
- Account termination policies
- User responsibilities

### 2. Privacy Policy

Must include:
- What data you collect
- How you use device identifiers
- Third-party SDKs (AdMob, analytics)
- User rights (GDPR, CCPA if applicable)

### 3. Reward Disclosures

Must include:
- What users can earn (credits)
- Daily/weekly limits
- How to redeem credits
- What happens if service ends

---

## App Store Listing Copy

### DO Say:
- "Earn credits and unlock premium features"
- "Complete tasks to earn in-app rewards"
- "Daily engagement rewards"

### DON'T Say:
- "Earn Bitcoin" or "Earn crypto"
- "Bitcoin mining app"
- "Get paid to watch ads"
- "Make money with your phone"

### Suggested Description:

```
EarnLoop - Earn Credits, Unlock Rewards

Complete daily check-ins, watch videos, and learn new things to earn in-app credits. 
Redeem your credits for premium features, ad-free experiences, and exclusive perks.

Features:
🎯 Daily check-in bonuses
📚 Learn & earn modules
🎁 Premium reward store
🔥 Streak bonuses

Note: Credits are for in-app use only and cannot be exchanged for cash or cryptocurrency.
```

---

## Compliance Checklist

Before launch, verify:

- [ ] All "mining" language removed from app and store listing
- [ ] Disclaimers visible on onboarding, home, and earn screens
- [ ] Terms of Service published and accessible
- [ ] Privacy Policy published and accessible
- [ ] AdMob SSV implemented
- [ ] Rate limiting active
- [ ] Anti-fraud measures tested
- [ ] No direct crypto-for-ads flow
- [ ] Legal review completed (recommended)

---

## Contact

For compliance questions, consult with:
- A lawyer specializing in app monetization
- AdMob support for policy clarifications
- Apple/Google developer support for listing questions
