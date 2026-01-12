# EarnLoop Setup Guide

This guide walks you through setting up the EarnLoop development environment.

## Prerequisites

- Node.js 18+ 
- npm or yarn
- PostgreSQL 14+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator
- AdMob account (for ads)

## Quick Start

### 1. Clone and Install Dependencies

```bash
# Backend
cd backend
npm install

# Mobile
cd ../mobile
npm install
```

### 2. Database Setup

```bash
# Create PostgreSQL database
createdb earnloop

# Configure environment
cd backend
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run migrate

# Seed sample data (optional)
npm run seed
```

### 3. Start Development Servers

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Mobile
cd mobile
npx expo start
```

### 4. Run on Device/Simulator

- Press `i` for iOS Simulator
- Press `a` for Android Emulator
- Scan QR code with Expo Go app for physical device

## Environment Configuration

### Backend (.env)

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:password@localhost:5432/earnloop
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

### Mobile (.env)

```env
API_URL=http://localhost:3000/api/v1
ADMOB_APP_ID_IOS=ca-app-pub-xxx
ADMOB_REWARDED_AD_UNIT_IOS=ca-app-pub-xxx/xxx
```

## AdMob Setup

### 1. Create AdMob Account
1. Go to [AdMob](https://admob.google.com)
2. Create an account
3. Create a new app for iOS and Android

### 2. Create Ad Units
1. Create a "Rewarded" ad unit for each platform
2. Copy the ad unit IDs

### 3. Configure in App
1. Update `app.json` with your AdMob App IDs:
```json
{
  "expo": {
    "plugins": [
      [
        "react-native-google-mobile-ads",
        {
          "iosAppId": "ca-app-pub-xxx~xxx",
          "androidAppId": "ca-app-pub-xxx~xxx"
        }
      ]
    ]
  }
}
```

2. Update `mobile/src/services/adMob.ts` with your rewarded ad unit ID

### 4. Server-Side Verification (SSV)
For production, implement SSV to verify ad completions:
1. Enable SSV in AdMob console
2. Set your callback URL to `https://your-api.com/earn/admob-ssv`
3. Verify the signature in `backend/src/routes/earn.ts`

## Project Structure

```
EarnLoop/
├── backend/           # Express.js API server
│   ├── src/
│   │   ├── server.ts      # App entry point
│   │   ├── db/            # Database migrations & queries
│   │   ├── middleware/    # Auth, rate limiting, errors
│   │   ├── routes/        # API endpoints
│   │   └── utils/         # Fraud detection, trust system
│   └── package.json
│
├── mobile/            # React Native (Expo) app
│   ├── App.tsx           # App entry point
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── context/      # React Context (Auth)
│   │   ├── hooks/        # Custom hooks
│   │   ├── navigation/   # React Navigation setup
│   │   ├── screens/      # Screen components
│   │   ├── services/     # API client, AdMob
│   │   └── utils/        # Theme, constants, helpers
│   └── package.json
│
└── docs/              # Documentation
    ├── API_SPEC.md       # API documentation
    ├── COMPLIANCE.md     # App store compliance
    └── DATABASE.md       # Schema documentation
```

## Development Tips

### Testing Ads
- Use test ad unit IDs during development
- Test on real devices for production ads
- AdMob test devices can be configured in the AdMob console

### API Testing
Use tools like Postman or Insomnia:
```bash
# Signup
POST http://localhost:3000/api/v1/auth/signup
{
  "email": "test@example.com",
  "password": "password123"
}

# Login
POST http://localhost:3000/api/v1/auth/login
{
  "email": "test@example.com", 
  "password": "password123"
}

# Use the returned token in Authorization header
GET http://localhost:3000/api/v1/me
Authorization: Bearer <token>
```

### Database Debugging
```bash
# Connect to database
psql earnloop

# View tables
\dt

# Query users
SELECT * FROM users;

# Query earn events
SELECT * FROM earn_events ORDER BY created_at DESC LIMIT 10;
```

## Production Deployment

### Backend
1. Use a managed PostgreSQL service (Supabase, Railway, AWS RDS)
2. Deploy to a Node.js hosting platform (Railway, Render, AWS)
3. Set up proper environment variables
4. Enable HTTPS
5. Configure CORS for your domain

### Mobile
1. Build standalone apps:
```bash
# iOS
eas build --platform ios

# Android  
eas build --platform android
```

2. Submit to app stores
3. Configure production AdMob ad units

## Troubleshooting

### "Cannot find module" errors
Run `npm install` in both backend and mobile directories.

### Database connection errors
Check your PostgreSQL is running and credentials are correct.

### AdMob not showing ads
- Ensure you're using test IDs in development
- Check AdMob console for policy violations
- Verify app.json plugin configuration

### Authentication issues
- Check JWT_SECRET is set
- Verify token is being sent in Authorization header
- Check token hasn't expired

## Support

For issues or questions:
1. Check the docs/ folder
2. Review error logs
3. Open an issue on GitHub
