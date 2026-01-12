# Database Schema

## Entity Relationship Diagram

```
┌─────────────────┐       ┌─────────────────┐
│     users       │       │    devices      │
├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ user_id (FK)    │
│ email           │       │ id (PK)         │
│ password_hash   │       │ device_fingerprint
│ created_at      │       │ device_name     │
│ email_verified  │       │ platform        │
│ is_banned       │       │ ip_address      │
│ ban_reason      │       │ risk_score      │
└────────┬────────┘       │ is_blocked      │
         │                │ created_at      │
         │                │ last_seen_at    │
         │                └─────────────────┘
         │
         ├──────────────────────────────────────────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    balances     │       │    streaks      │       │  earn_events    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │       │ id (PK)         │       │ id (PK)         │
│ user_id (FK)    │       │ user_id (FK)    │       │ user_id (FK)    │
│ credits_balance │       │ current_streak  │       │ device_id (FK)  │
│ lifetime_earned │       │ longest_streak  │       │ event_type      │
│ lifetime_spent  │       │ last_checkin_date       │ credits_amount  │
│ updated_at      │       │ updated_at      │       │ metadata        │
└─────────────────┘       └─────────────────┘       │ ip_address      │
                                                    │ created_at      │
                                                    └─────────────────┘
         │
         ├──────────────────────────────────────────────────────┐
         │                                                      │
         ▼                                                      ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│  store_items    │       │  redemptions    │       │  fraud_flags    │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ item_id (FK)    │       │ id (PK)         │
│ name            │       │ id (PK)         │       │ user_id (FK)    │
│ description     │       │ user_id (FK)    │       │ device_id (FK)  │
│ credits_cost    │       │ credits_spent   │       │ flag_type       │
│ item_type       │       │ status          │       │ severity        │
│ duration_days   │       │ expires_at      │       │ reason          │
│ is_active       │       │ created_at      │       │ metadata        │
│ max_per_user    │       └─────────────────┘       │ resolved        │
│ created_at      │                                 │ created_at      │
└─────────────────┘                                 └─────────────────┘
```

## Table Definitions

### users
Primary user account table.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, DEFAULT gen_random_uuid() | Unique user ID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | User email |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Account creation time |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update time |
| email_verified | BOOLEAN | DEFAULT FALSE | Email verification status |
| is_banned | BOOLEAN | DEFAULT FALSE | Account ban status |
| ban_reason | TEXT | NULL | Reason for ban |

### devices
Tracks devices per user for fraud prevention.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique device ID |
| user_id | UUID | FK → users.id | Owner user |
| device_fingerprint | VARCHAR(255) | NOT NULL | Hashed device identifier |
| device_name | VARCHAR(255) | NULL | Friendly device name |
| platform | VARCHAR(50) | NULL | ios/android |
| ip_address | VARCHAR(45) | NULL | Last known IP |
| risk_score | INTEGER | DEFAULT 0 | Fraud risk score |
| is_blocked | BOOLEAN | DEFAULT FALSE | Device block status |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | First seen |
| last_seen_at | TIMESTAMPTZ | DEFAULT NOW() | Last activity |

### balances
User credit balances.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique balance ID |
| user_id | UUID | FK → users.id, UNIQUE | Owner user |
| credits_balance | INTEGER | DEFAULT 0 | Current balance |
| lifetime_earned | INTEGER | DEFAULT 0 | Total ever earned |
| lifetime_spent | INTEGER | DEFAULT 0 | Total ever spent |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### streaks
Daily check-in streaks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique streak ID |
| user_id | UUID | FK → users.id, UNIQUE | Owner user |
| current_streak | INTEGER | DEFAULT 0 | Current consecutive days |
| longest_streak | INTEGER | DEFAULT 0 | Best streak ever |
| last_checkin_date | DATE | NULL | Last check-in date |
| updated_at | TIMESTAMPTZ | DEFAULT NOW() | Last update |

### earn_events
Audit log of all earning activities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique event ID |
| user_id | UUID | FK → users.id | User who earned |
| device_id | UUID | FK → devices.id, NULL | Device used |
| event_type | VARCHAR(50) | NOT NULL | checkin, rewarded_ad, learn_module |
| credits_amount | INTEGER | NOT NULL | Credits earned |
| metadata | JSONB | NULL | Extra data (ad unit, quiz score, etc.) |
| ip_address | VARCHAR(45) | NULL | IP at time of earn |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Event time |

**Indexes:**
- `idx_earn_events_user_date` ON (user_id, created_at) - For daily cap queries

### store_items
Available rewards in the store.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique item ID |
| name | VARCHAR(255) | NOT NULL | Display name |
| description | TEXT | NULL | Item description |
| credits_cost | INTEGER | NOT NULL | Price in credits |
| item_type | VARCHAR(50) | NOT NULL | subscription, feature, cosmetic |
| duration_days | INTEGER | NULL | Duration if time-limited |
| is_active | BOOLEAN | DEFAULT TRUE | Available for purchase |
| max_per_user | INTEGER | NULL | Limit per user (NULL = unlimited) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |

### redemptions
Record of user redemptions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique redemption ID |
| user_id | UUID | FK → users.id | User who redeemed |
| item_id | UUID | FK → store_items.id | Item redeemed |
| credits_spent | INTEGER | NOT NULL | Credits spent |
| status | VARCHAR(20) | DEFAULT 'completed' | Status of redemption |
| expires_at | TIMESTAMPTZ | NULL | Expiration (if time-limited) |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Redemption time |

### fraud_flags
Suspicious activity log.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique flag ID |
| user_id | UUID | FK → users.id | Flagged user |
| device_id | UUID | FK → devices.id, NULL | Flagged device |
| flag_type | VARCHAR(50) | NOT NULL | Type: velocity_abuse, replay_attack, etc. |
| severity | VARCHAR(20) | NOT NULL | low, medium, high, critical |
| reason | TEXT | NULL | Human description |
| metadata | JSONB | NULL | Extra context |
| resolved | BOOLEAN | DEFAULT FALSE | Has been reviewed |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Flag time |

### admin_actions
Audit log for admin actions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique action ID |
| admin_id | UUID | NULL | Admin who acted |
| target_user_id | UUID | FK → users.id | User affected |
| action_type | VARCHAR(50) | NOT NULL | ban, unban, credit_adjustment, etc. |
| reason | TEXT | NULL | Why action was taken |
| metadata | JSONB | NULL | Extra data |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Action time |

---

## Sample Queries

### Get user's daily earnings
```sql
SELECT COALESCE(SUM(credits_amount), 0) as today_earned
FROM earn_events 
WHERE user_id = $1 AND created_at >= CURRENT_DATE;
```

### Check if user can earn more today
```sql
WITH config AS (
  SELECT 100 as daily_cap
)
SELECT 
  COALESCE(SUM(credits_amount), 0) as earned,
  (SELECT daily_cap FROM config) as cap,
  (SELECT daily_cap FROM config) - COALESCE(SUM(credits_amount), 0) as remaining
FROM earn_events 
WHERE user_id = $1 AND created_at >= CURRENT_DATE;
```

### Get active rewards for user
```sql
SELECT r.*, si.name, si.item_type
FROM redemptions r
JOIN store_items si ON r.item_id = si.id
WHERE r.user_id = $1 
  AND (r.expires_at IS NULL OR r.expires_at > NOW())
ORDER BY r.created_at DESC;
```
