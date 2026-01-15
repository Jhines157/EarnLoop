import pool from './index';

const migrate = async () => {
  console.log('🚀 Running migrations...');

  try {
    // Users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        email_verified BOOLEAN DEFAULT FALSE,
        is_banned BOOLEAN DEFAULT FALSE,
        ban_reason TEXT
      );
    `);
    console.log('✅ users table created');

    // Devices table (for fingerprinting)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS devices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_fingerprint VARCHAR(255) NOT NULL,
        device_name VARCHAR(255),
        platform VARCHAR(50),
        ip_address VARCHAR(45),
        risk_score INTEGER DEFAULT 0,
        is_blocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, device_fingerprint)
      );
    `);
    console.log('✅ devices table created');

    // Sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ sessions table created');

    // Balances table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS balances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        credits_balance INTEGER DEFAULT 0,
        lifetime_earned INTEGER DEFAULT 0,
        lifetime_spent INTEGER DEFAULT 0,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ balances table created');

    // Earn events table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS earn_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id),
        event_type VARCHAR(50) NOT NULL,
        credits_amount INTEGER NOT NULL,
        metadata JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ earn_events table created');

    // Create index for daily cap queries
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_earn_events_user_date 
      ON earn_events (user_id, created_at);
    `);

    // Store items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS store_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        credits_cost INTEGER NOT NULL,
        item_type VARCHAR(50) NOT NULL,
        category VARCHAR(50) NOT NULL DEFAULT 'general',
        duration_days INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        max_per_user INTEGER,
        icon VARCHAR(10),
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ store_items table created');

    // Add category and icon columns if they don't exist (for existing DBs)
    await pool.query(`
      ALTER TABLE store_items 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS icon VARCHAR(10),
      ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
    `);

    // User inventory table (for owned items and active boosts)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_inventory (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        item_id UUID REFERENCES store_items(id),
        item_type VARCHAR(50) NOT NULL,
        quantity INTEGER DEFAULT 1,
        is_active BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMP WITH TIME ZONE,
        activated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, item_id)
      );
    `);
    console.log('✅ user_inventory table created');

    // Add streak_savers column to streaks table
    await pool.query(`
      ALTER TABLE streaks 
      ADD COLUMN IF NOT EXISTS streak_savers INTEGER DEFAULT 0;
    `);
    console.log('✅ streak_savers column added');

    // Redemptions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS redemptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        item_id UUID REFERENCES store_items(id),
        credits_spent INTEGER NOT NULL,
        status VARCHAR(20) DEFAULT 'completed',
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ redemptions table created');

    // Fraud flags table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS fraud_flags (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        device_id UUID REFERENCES devices(id),
        flag_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        reason TEXT,
        metadata JSONB,
        resolved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ fraud_flags table created');

    // Streaks table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS streaks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_checkin_date DATE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ streaks table created');

    // Admin actions table (audit log)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_actions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        admin_id UUID,
        target_user_id UUID REFERENCES users(id),
        action_type VARCHAR(50) NOT NULL,
        reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ admin_actions table created');

    // Giveaway entries table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS giveaway_entries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        giveaway_id VARCHAR(100) NOT NULL,
        entry_type VARCHAR(20) NOT NULL,
        entries_count INTEGER DEFAULT 1,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, giveaway_id, entry_type)
      );
    `);
    console.log('✅ giveaway_entries table created');

    // Add updated_at column if it doesn't exist (for existing DBs)
    await pool.query(`
      ALTER TABLE giveaway_entries 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    `);
    console.log('✅ giveaway_entries updated_at column added');

    // Add gift card columns to redemptions table
    await pool.query(`
      ALTER TABLE redemptions 
      ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gift_card_code VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE;
    `);
    console.log('✅ redemptions gift card columns added');

    console.log('🎉 All migrations completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

migrate();
