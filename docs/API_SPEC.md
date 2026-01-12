# EarnLoop API Specification

Base URL: `https://api.earnloop.app` (production) or `http://localhost:3000` (development)

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## Endpoints

### Auth

#### POST /auth/signup
Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "deviceFingerprint": "abc123...",
  "deviceName": "iPhone 15 Pro",
  "platform": "ios"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    "token": "jwt-token-here"
  }
}
```

#### POST /auth/login
Login to existing account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "deviceFingerprint": "abc123...",
  "deviceName": "iPhone 15 Pro",
  "platform": "ios"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com"
    },
    "token": "jwt-token-here"
  }
}
```

---

### User

#### GET /me
Get current user profile and balance. **Requires Auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "emailVerified": false
    },
    "balance": {
      "current": 150,
      "lifetimeEarned": 500,
      "lifetimeSpent": 350
    },
    "streak": {
      "current": 5,
      "longest": 12,
      "lastCheckin": "2024-01-15"
    },
    "devices": 1
  }
}
```

#### GET /me/history
Get earn/spend history. **Requires Auth.**

**Query Parameters:**
- `limit` (optional): Max results (default: 50, max: 100)
- `offset` (optional): Pagination offset

**Response (200):**
```json
{
  "success": true,
  "data": {
    "history": [
      {
        "id": "uuid",
        "type": "checkin",
        "amount": 5,
        "category": "earn",
        "created_at": "2024-01-15T10:00:00.000Z"
      },
      {
        "id": "uuid",
        "type": "Pro Mode (7 days)",
        "amount": 500,
        "category": "spend",
        "created_at": "2024-01-14T15:00:00.000Z"
      }
    ]
  }
}
```

---

### Earn

#### GET /earn/status
Get today's earning status. **Requires Auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "todayEarned": 25,
    "dailyCap": 100,
    "remaining": 75,
    "percentUsed": 25,
    "adsWatchedToday": 2,
    "maxAdsPerDay": 5,
    "adsRemaining": 3,
    "checkedInToday": true
  }
}
```

#### POST /earn/checkin
Daily check-in. **Requires Auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "creditsEarned": 5,
    "newBalance": 155,
    "streak": {
      "current_streak": 6,
      "longest_streak": 12
    }
  }
}
```

**Error Responses:**
- `409 ALREADY_CHECKED_IN` - Already checked in today
- `429 DAILY_CAP_REACHED` - Daily credit cap reached

#### POST /earn/rewarded-ad-complete
Complete a rewarded ad. **Requires Auth.**

**Request Body:**
```json
{
  "adUnitId": "ca-app-pub-xxx/xxx",
  "rewardToken": "unique-token-from-admob-ssv",
  "timestamp": 1705312800000
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "creditsEarned": 10,
    "newBalance": 165,
    "adsRemainingToday": 2
  }
}
```

**Error Responses:**
- `400 INVALID_AD_DATA` - Missing or invalid ad data
- `400 INVALID_REWARD` - Replay attack detected
- `429 MAX_ADS_REACHED` - Max ads for today
- `429 DAILY_CAP_REACHED` - Daily credit cap reached

#### POST /earn/learn-complete
Complete a learn module. **Requires Auth.**

**Request Body:**
```json
{
  "moduleId": "bitcoin-basics-101",
  "quizScore": 85
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "creditsEarned": 15,
    "newBalance": 180,
    "moduleId": "bitcoin-basics-101",
    "quizScore": 85
  }
}
```

**Error Responses:**
- `400 MISSING_MODULE_ID` - No module ID provided
- `400 QUIZ_FAILED` - Quiz score below 70%
- `409 MODULE_ALREADY_COMPLETED` - Already completed today
- `429 DAILY_CAP_REACHED` - Daily credit cap reached

---

### Store

#### GET /store/items
Get available store items. **Requires Auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Pro Mode (7 days)",
        "description": "Unlock all premium features for 7 days",
        "creditsCost": 500,
        "itemType": "subscription",
        "durationDays": 7,
        "maxPerUser": null,
        "userRedemptions": 0,
        "canAfford": false,
        "canRedeem": true
      }
    ],
    "balance": 180
  }
}
```

#### POST /store/redeem
Redeem a store item. **Requires Auth.**

**Request Body:**
```json
{
  "itemId": "uuid"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "message": "Successfully redeemed Pro Mode (7 days)!",
    "item": {
      "id": "uuid",
      "name": "Pro Mode (7 days)",
      "itemType": "subscription",
      "expiresAt": "2024-01-22T00:00:00.000Z"
    },
    "creditsSpent": 500,
    "newBalance": 0
  }
}
```

**Error Responses:**
- `400 MISSING_ITEM_ID` - No item ID provided
- `400 INSUFFICIENT_CREDITS` - Not enough credits
- `400 MAX_REDEMPTIONS` - Max redemptions for item reached
- `404 ITEM_NOT_FOUND` - Item doesn't exist or inactive

#### GET /store/my-rewards
Get user's redeemed rewards. **Requires Auth.**

**Response (200):**
```json
{
  "success": true,
  "data": {
    "rewards": [
      {
        "id": "uuid",
        "name": "Pro Mode (7 days)",
        "itemType": "subscription",
        "description": "Unlock all premium features for 7 days",
        "creditsSpent": 500,
        "status": "completed",
        "expiresAt": "2024-01-22T00:00:00.000Z",
        "redeemedAt": "2024-01-15T00:00:00.000Z",
        "isActive": true
      }
    ]
  }
}
```

---

## Error Response Format

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | No token provided |
| `INVALID_TOKEN` | 401 | Token expired or invalid |
| `ACCOUNT_BANNED` | 403 | Account suspended |
| `DEVICE_BLOCKED` | 403 | Device blocked |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Rate Limits

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| Auth endpoints | 5 requests | 15 minutes |
| Earn endpoints | 10 requests | 1 minute |
| General API | 100 requests | 15 minutes |
