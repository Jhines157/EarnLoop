# EarnLoop - Ad Rewards & Giveaway App

A mobile rewards app where users earn credits by watching ads and completing tasks, then enter giveaways for prizes!

## 🎯 How It Works

Users earn in-app credits by:
- ✅ Daily check-ins
- 🎬 Watching rewarded ads
- 📚 Completing learn modules
- 🔥 Maintaining streaks

Credits can be used to:
- 🎁 Unlock premium features & themes
- 🎰 Enter giveaways for real prizes
- ⬆️ Level up for bonus earning rates

---

## 📁 Project Structure

```
EarnLoop/
├── mobile/                 # React Native app
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── screens/        # App screens
│   │   ├── navigation/     # Tab & stack navigators
│   │   ├── hooks/          # Custom React hooks
│   │   ├── services/       # API client
│   │   ├── context/        # Auth & app state
│   │   ├── utils/          # Helpers, constants
│   │   └── assets/         # Images, fonts
│   └── App.tsx
│
├── backend/                # Node.js API
│   ├── src/
│   │   ├── controllers/    # Route handlers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Auth, rate-limit, fraud
│   │   ├── models/         # Database models
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Helpers
│   │   └── db/             # Database setup & migrations
│   └── server.ts
│
└── docs/                   # API specs, compliance docs
```

---

## 🚀 Quick Start

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your database URL & secrets
npm run dev
```

### Mobile Setup

```bash
cd mobile
npm install
npx pod-install ios
npm run ios   # or npm run android
```

---

## 💰 Economics (Configurable)

| Setting | Default | Description |
|---------|---------|-------------|
| Daily credit cap | 100 | Max credits per user per day |
| Check-in reward | 5 | Credits for daily check-in |
| Ad reward | 10 | Credits per rewarded ad view |
| Learn module reward | 15 | Credits for completing a module |
| New user cap multiplier | 0.5x | First 3 days = 50% of normal caps |

---

## 🔒 Anti-Fraud Measures

1. **Device fingerprinting** - One account per device
2. **Rate limiting** - Daily caps per device & IP
3. **Progressive trust** - Lower limits for new users
4. **Server-side verification** - AdMob SSV for ad completions
5. **Abuse detection** - VPN/datacenter IP flagging

---

## 📱 Screens

| Screen | Purpose |
|--------|---------|
| Onboarding | Explain "credits, not crypto" |
| Home | Balance, streak, quick actions |
| Earn | Check-in, ads, learn modules |
| Rewards | Redeem credits for perks |
| Wallet | (Optional) Lightning for promos only |
| Profile | Settings, support, terms |

---

## 🎯 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/signup | Create account |
| POST | /auth/login | Login |
| GET | /me | Current user profile |
| POST | /earn/checkin | Daily check-in |
| POST | /earn/rewarded-ad | Complete ad (with SSV) |
| POST | /earn/learn-complete | Complete learn module |
| GET | /store/items | List redeemable items |
| POST | /store/redeem | Redeem credits |
| GET | /history | Earn/spend history |

---

## ✅ Launch Checklist

- [ ] Legal pages (Terms, Privacy, Disclosures)
- [ ] AdMob account & rewarded ad unit created
- [ ] SSV callback endpoint configured
- [ ] Rate limits tested
- [ ] New user caps tested
- [ ] Redemption flow tested
- [ ] Giveaway/raffle rules documented

---

## 📄 License

Proprietary - All rights reserved.
