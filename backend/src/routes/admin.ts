import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { Resend } from 'resend';
import pool from '../db';
import { createError } from '../middleware/errorHandler';

// Lazy initialize Resend
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

const router = Router();

import rateLimit from 'express-rate-limit';

// Strict rate limiter for admin endpoints
const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes
  message: {
    success: false,
    error: {
      message: 'Too many admin requests. Try again later.',
      code: 'ADMIN_RATE_LIMITED'
    }
  }
});

// Track failed admin auth attempts
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION = 30 * 60 * 1000; // 30 minutes

// Strict admin API key authentication (header only, no query params)
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const clientIP = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || '';
  
  // Check if IP is locked out
  const attempts = failedAttempts.get(clientIP);
  if (attempts && attempts.count >= MAX_FAILED_ATTEMPTS) {
    const timeSinceLockout = Date.now() - attempts.lastAttempt;
    if (timeSinceLockout < LOCKOUT_DURATION) {
      console.log(`Admin auth blocked - IP locked out: ${clientIP}`);
      return res.status(429).json({ 
        success: false, 
        error: { message: 'Too many failed attempts. Try again later.', code: 'LOCKED_OUT' } 
      });
    } else {
      // Reset after lockout period
      failedAttempts.delete(clientIP);
    }
  }

  // Only accept API key from header (not query params for security)
  const apiKey = req.headers['x-admin-key'];
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    // Track failed attempt
    const current = failedAttempts.get(clientIP) || { count: 0, lastAttempt: 0 };
    failedAttempts.set(clientIP, { count: current.count + 1, lastAttempt: Date.now() });
    
    console.log(`Admin auth failed from IP: ${clientIP} (attempt ${current.count + 1})`);
    
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Unauthorized', code: 'INVALID_ADMIN_KEY' } 
    });
  }
  
  // Clear failed attempts on success
  failedAttempts.delete(clientIP);
  next();
};

router.use(adminRateLimiter);
router.use(adminAuth);

// ============================================
// TEST EMAIL ENDPOINT
// ============================================

router.post('/test-gift-card-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, giftCardCode = 'TEST-1234-ABCD-5678', giftCardValue = '5', giftCardType = 'Amazon' } = req.body;

    if (!email) {
      return next(createError('Email is required', 400, 'MISSING_EMAIL'));
    }

    if (!process.env.RESEND_API_KEY) {
      return next(createError('RESEND_API_KEY not configured', 500, 'EMAIL_NOT_CONFIGURED'));
    }

    const itemName = `$${giftCardValue} ${giftCardType} Gift Card`;

    await sendEmail(
      email,
      `🎉 Your ${giftCardType} Gift Card from EarnLoop!`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎁 You've Got a Gift Card!</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Congratulations!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for being an amazing EarnLoop user! Here's your reward:
            </p>
            
            <div style="background: white; border: 2px dashed #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">${itemName}</p>
              <p style="font-size: 28px; font-weight: bold; color: #4F46E5; margin: 0 0 10px 0;">$${giftCardValue}</p>
              <p style="font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 10px; border-radius: 4px; color: #1f2937;">
                ${giftCardCode}
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              To redeem, visit ${giftCardType.toLowerCase() === 'amazon' ? 'amazon.com/gc/redeem' : 
                giftCardType.toLowerCase() === 'apple' ? 'apple.com/redeem' :
                giftCardType.toLowerCase() === 'google' ? 'play.google.com/redeem' :
                'the appropriate redemption page'} and enter the code above.
            </p>
          </div>
          
          <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center;">
            <p style="color: #92400E; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
              ⭐ Enjoying EarnLoop? ⭐
            </p>
            <p style="color: #B45309; font-size: 14px; margin: 0 0 15px 0;">
              We'd love to hear from you! Your feedback helps us improve and helps other users discover EarnLoop.
            </p>
            <div style="display: inline-block;">
              <a href="https://apps.apple.com/app/earnloop/id123456789" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                Rate on App Store 🍎
              </a>
              <a href="https://play.google.com/store/apps/details?id=com.earnloop.app" style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                Rate on Google Play 🤖
              </a>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af;">
            <p style="margin: 0;">Keep earning with EarnLoop! 🚀</p>
          </div>
        </div>
      `
    );

    res.json({
      success: true,
      data: {
        message: 'Test gift card email sent successfully',
        email,
        giftCardType,
        giftCardValue,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// DATABASE MIGRATIONS (run once)
// ============================================

router.post('/run-migrations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const results: string[] = [];

    // Add unique constraint on store_items name
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'store_items_name_key'
        ) THEN
          ALTER TABLE store_items ADD CONSTRAINT store_items_name_key UNIQUE (name);
        END IF;
      END $$;
    `);
    results.push('store_items name unique constraint');

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
    results.push('user_inventory table');

    // Add streak_savers column to streaks table
    await pool.query(`
      ALTER TABLE streaks 
      ADD COLUMN IF NOT EXISTS streak_savers INTEGER DEFAULT 0;
    `);
    results.push('streak_savers column');

    // Add gift card columns to redemptions table
    await pool.query(`
      ALTER TABLE redemptions 
      ADD COLUMN IF NOT EXISTS delivery_email VARCHAR(255),
      ADD COLUMN IF NOT EXISTS gift_card_code VARCHAR(255),
      ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE;
    `);
    results.push('redemptions gift card columns');

    // IP Blacklist table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ip_blacklist (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        ip_address VARCHAR(45) UNIQUE NOT NULL,
        reason TEXT,
        user_id UUID,
        expires_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    results.push('ip_blacklist table');

    // Audit logs table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        method VARCHAR(10) NOT NULL,
        path VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_id UUID,
        user_agent TEXT,
        request_body JSONB,
        response_status VARCHAR(20),
        status_code INTEGER,
        duration_ms INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    results.push('audit_logs table');

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
    results.push('giveaway_entries table');

    // Add unique constraint on store_items name for upsert
    await pool.query(`
      ALTER TABLE store_items 
      ADD CONSTRAINT IF NOT EXISTS store_items_name_unique UNIQUE (name);
    `).catch(() => {
      // Constraint might already exist or syntax not supported
    });
    results.push('store_items unique constraint');

    // Indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_ip ON audit_logs (ip_address);
    `);
    results.push('indexes');

    res.json({ success: true, data: { message: 'Migrations completed successfully', tables: results } });
  } catch (error) {
    next(error);
  }
});

// Get store items status
router.get('/store-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await pool.query(`
      SELECT id, name, item_type, category, credits_cost, is_active, sort_order
      FROM store_items 
      ORDER BY category, sort_order
    `);
    
    res.json({ 
      success: true, 
      data: { 
        items: result.rows,
        count: result.rows.length
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Seed store items
router.post('/seed-store', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Use upsert to add/update store items without deleting existing ones (keeps foreign key references)
    // Only include items that ACTUALLY WORK
    await pool.query(`
      INSERT INTO store_items (name, description, credits_cost, item_type, category, duration_days, max_per_user, icon, sort_order, is_active)
      VALUES 
        -- Gift Cards (manually fulfilled)
        ('$5 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 1, true),
        ('$10 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🛒', 2, true),
        ('$25 Amazon Gift Card', 'Digital Amazon gift card code sent to your email within 24-48 hours', 23000, 'giftcard', 'giftcards', NULL, NULL, '🛒', 3, true),
        ('$5 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 4, true),
        ('$10 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🍎', 5, true),
        ('$25 Apple Gift Card', 'Digital Apple gift card code sent to your email within 24-48 hours', 23000, 'giftcard', 'giftcards', NULL, NULL, '🍎', 6, true),
        ('$5 Google Play Gift Card', 'Digital Google Play gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '🎮', 7, true),
        ('$10 Google Play Gift Card', 'Digital Google Play gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '🎮', 8, true),
        ('$5 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email within 24-48 hours', 5000, 'giftcard', 'giftcards', NULL, NULL, '☕', 9, true),
        ('$10 Starbucks Gift Card', 'Digital Starbucks gift card code sent to your email within 24-48 hours', 9500, 'giftcard', 'giftcards', NULL, NULL, '☕', 10, true),
        
        -- Power-ups that ACTUALLY WORK
        ('Streak Saver', 'Automatically protects your streak if you miss a day. Used automatically when needed!', 150, 'consumable', 'powerups', NULL, NULL, '🛡️', 20, true),
        ('Streak Freeze', 'Same as Streak Saver - protects your streak once when you miss a day', 150, 'consumable', 'powerups', NULL, NULL, '❄️', 21, true),
        ('2x Credits Boost (24h)', 'Double your credits from watching ads for 24 hours! Activates immediately.', 200, 'boost', 'powerups', 1, NULL, '⚡', 22, true),
        ('2x Credits Boost (7 days)', 'Double your credits from watching ads for a full week! Best value.', 800, 'boost', 'powerups', 7, NULL, '🚀', 23, true),
        
        -- Disable items that don't work yet (cosmetics, themes, badges, premium content, giveaway perks)
        ('Dark Mode Pro', 'Coming soon! Unlock the sleek dark theme', 100, 'cosmetic', 'coming_soon', NULL, 1, '🌙', 100, false),
        ('Neon Theme Pack', 'Coming soon! Vibrant neon colors', 250, 'cosmetic', 'coming_soon', NULL, 1, '💜', 101, false),
        ('Gold Theme', 'Coming soon! Luxurious gold accents', 300, 'cosmetic', 'coming_soon', NULL, 1, '✨', 102, false),
        ('Custom App Icon - Bitcoin', 'Coming soon! Custom app icon', 150, 'cosmetic', 'coming_soon', NULL, 1, '🟠', 103, false),
        ('Custom App Icon - Diamond', 'Coming soon! Custom app icon', 200, 'cosmetic', 'coming_soon', NULL, 1, '💎', 104, false),
        ('Bonus Giveaway Entry', 'Coming soon! Extra giveaway entries', 200, 'giveaway', 'coming_soon', NULL, 5, '🎟️', 105, false),
        ('Early Access Pass', 'Coming soon! Early access to giveaways', 400, 'feature', 'coming_soon', 30, NULL, '🔔', 106, false),
        ('Advanced Bitcoin Lessons', 'Coming soon! Premium lessons', 500, 'content', 'coming_soon', NULL, 1, '📖', 107, false),
        ('Trading Strategies Guide', 'Coming soon! Trading guide', 600, 'content', 'coming_soon', NULL, 1, '📈', 108, false),
        ('DeFi Masterclass', 'Coming soon! DeFi lessons', 700, 'content', 'coming_soon', NULL, 1, '🏦', 109, false),
        ('VIP Badge', 'Coming soon! VIP status badge', 1000, 'badge', 'coming_soon', NULL, 1, '👑', 110, false),
        ('Founder Badge', 'Coming soon! Founder badge', 2000, 'badge', 'coming_soon', NULL, 1, '🏆', 111, false),
        ('Pro Member (30 days)', 'Coming soon! Pro membership', 1500, 'subscription', 'coming_soon', 30, NULL, '⭐', 112, false),
        -- Disable old items with different names
        ('2x XP Boost (24h)', 'Replaced by 2x Credits Boost', 100, 'boost', 'coming_soon', 1, NULL, '⚡', 200, false),
        ('2x XP Boost (7 days)', 'Replaced by 2x Credits Boost', 500, 'boost', 'coming_soon', 7, NULL, '🚀', 201, false)
      ON CONFLICT (name) DO UPDATE SET 
        description = EXCLUDED.description,
        credits_cost = EXCLUDED.credits_cost,
        item_type = EXCLUDED.item_type,
        category = EXCLUDED.category,
        duration_days = EXCLUDED.duration_days,
        max_per_user = EXCLUDED.max_per_user,
        icon = EXCLUDED.icon,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active;
    `);

    const count = await pool.query('SELECT COUNT(*) FROM store_items WHERE is_active = true');
    
    res.json({ 
      success: true, 
      data: { 
        message: 'Store items seeded successfully',
        activeItemCount: parseInt(count.rows[0].count)
      } 
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with optional filters
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days, search, limit = 10000, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        u.id, 
        u.email, 
        u.created_at,
        u.email_verified,
        u.is_banned,
        u.ban_reason,
        b.credits_balance,
        b.lifetime_earned,
        s.current_streak,
        s.longest_streak
      FROM users u
      LEFT JOIN balances b ON u.id = b.user_id
      LEFT JOIN streaks s ON u.id = s.user_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by days (new users)
    if (days) {
      query += ` AND u.created_at > NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }

    // Search by email
    if (search) {
      query += ` AND u.email ILIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY u.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit as string), parseInt(offset as string));

    const result = await pool.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM users WHERE 1=1';
    if (days) {
      countQuery += ` AND created_at > NOW() - INTERVAL '${parseInt(days as string)} days'`;
    }
    const countResult = await pool.query(countQuery);

    res.json({
      success: true,
      data: {
        users: result.rows,
        total: parseInt(countResult.rows[0].count),
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single user details
router.get('/users/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const userResult = await pool.query(`
      SELECT 
        u.*,
        b.credits_balance,
        b.lifetime_earned,
        b.lifetime_spent,
        s.current_streak,
        s.longest_streak,
        s.last_checkin_date
      FROM users u
      LEFT JOIN balances b ON u.id = b.user_id
      LEFT JOIN streaks s ON u.id = s.user_id
      WHERE u.id = $1
    `, [id]);

    if (userResult.rows.length === 0) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Get devices
    const devicesResult = await pool.query(
      'SELECT * FROM devices WHERE user_id = $1 ORDER BY last_seen_at DESC',
      [id]
    );

    // Get recent activity
    const activityResult = await pool.query(`
      SELECT * FROM earn_events 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 20
    `, [id]);

    // Get redemptions
    const redemptionsResult = await pool.query(`
      SELECT r.*, si.name as item_name 
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [id]);

    const user = userResult.rows[0];
    delete user.password_hash; // Don't expose password hash

    res.json({
      success: true,
      data: {
        user,
        devices: devicesResult.rows,
        recentActivity: activityResult.rows,
        redemptions: redemptionsResult.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PASSWORD MANAGEMENT
// ============================================

// Reset user's password (generate new random password)
router.post('/users/:id/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { newPassword, sendEmail = true } = req.body;

    // Get user
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const user = userResult.rows[0];

    // Generate or use provided password
    const password = newPassword || crypto.randomBytes(8).toString('hex');
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, id]
    );

    // Optionally send email
    if (sendEmail && process.env.SMTP_HOST) {
      await sendPasswordResetEmail(user.email, password);
    }

    res.json({
      success: true,
      data: {
        message: 'Password reset successfully',
        email: user.email,
        newPassword: password, // Show admin the new password
        emailSent: sendEmail && !!process.env.SMTP_HOST,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// EMAIL FUNCTIONS
// ============================================

// Send email using Resend
const sendEmail = async (to: string, subject: string, html: string) => {
  const resendClient = getResend();
  if (!resendClient) {
    throw new Error('RESEND_API_KEY not configured');
  }
  
  const { data, error } = await resendClient.emails.send({
    from: 'EarnLoop <support@earnloop.app>',
    to: [to],
    subject,
    html,
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return data;
};

// Send password reset email
const sendPasswordResetEmail = async (email: string, newPassword: string) => {
  await sendEmail(
    email,
    'Your EarnLoop Password Has Been Reset',
    `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset</h2>
        <p>Your EarnLoop password has been reset.</p>
        <p>Your new password is: <strong>${newPassword}</strong></p>
        <p>Please log in and change your password immediately.</p>
        <br>
        <p>- The EarnLoop Team</p>
      </div>
    `
  );
};

// Send gift card email
router.post('/users/:id/send-gift-card', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { 
      giftCardCode, 
      giftCardValue, 
      giftCardType = 'Amazon',
      customMessage 
    } = req.body;

    if (!giftCardCode || !giftCardValue) {
      return next(createError('Gift card code and value are required', 400, 'MISSING_FIELDS'));
    }

    // Get user
    const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }

    const user = userResult.rows[0];

    if (!process.env.RESEND_API_KEY) {
      return next(createError('Email not configured. Set RESEND_API_KEY environment variable.', 500, 'EMAIL_NOT_CONFIGURED'));
    }

    await sendEmail(
      user.email,
      `🎉 Your ${giftCardType} Gift Card from EarnLoop!`,
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0;">🎁 You've Got a Gift Card!</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Congratulations!</h2>
            <p style="color: #4b5563; font-size: 16px;">
              Thank you for being an amazing EarnLoop user! Here's your reward:
            </p>
            
            <div style="background: white; border: 2px dashed #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">${giftCardType} Gift Card</p>
              <p style="font-size: 28px; font-weight: bold; color: #4F46E5; margin: 0 0 10px 0;">$${giftCardValue}</p>
              <p style="font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 10px; border-radius: 4px; color: #1f2937;">
                ${giftCardCode}
              </p>
            </div>
            
            ${customMessage ? `<p style="color: #4b5563; font-style: italic;">"${customMessage}"</p>` : ''}
            
            <p style="color: #6b7280; font-size: 14px;">
              To redeem, visit ${giftCardType === 'Amazon' ? 'amazon.com/gc/redeem' : 'the appropriate redemption page'} and enter the code above.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af;">
            <p style="margin: 0;">Keep earning with EarnLoop! 🚀</p>
          </div>
        </div>
      `
    );

    // Log the gift card send
    await pool.query(`
      INSERT INTO admin_logs (action, admin_note, user_id, metadata)
      VALUES ($1, $2, $3, $4)
    `, [
      'gift_card_sent',
      `Sent $${giftCardValue} ${giftCardType} gift card`,
      id,
      JSON.stringify({ giftCardType, giftCardValue, giftCardCode: giftCardCode.substring(0, 4) + '****' })
    ]);

    res.json({
      success: true,
      data: {
        message: 'Gift card email sent successfully',
        email: user.email,
        giftCardType,
        giftCardValue,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Bulk send gift cards
router.post('/bulk-send-gift-cards', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { recipients } = req.body;
    // recipients: [{ userId, giftCardCode, giftCardValue, giftCardType }]

    if (!recipients || !Array.isArray(recipients)) {
      return next(createError('Recipients array is required', 400, 'MISSING_FIELDS'));
    }

    const results = [];
    
    for (const recipient of recipients) {
      try {
        const userResult = await pool.query('SELECT id, email FROM users WHERE id = $1', [recipient.userId]);
        if (userResult.rows.length === 0) {
          results.push({ userId: recipient.userId, success: false, error: 'User not found' });
          continue;
        }

        const user = userResult.rows[0];

        await sendEmail(
          user.email,
          `🎉 Your ${recipient.giftCardType || 'Amazon'} Gift Card from EarnLoop!`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">🎁 You've Got a Gift Card!</h1>
              </div>
              <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
                <h2 style="color: #1f2937;">Congratulations!</h2>
                <div style="background: white; border: 2px dashed #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="color: #6b7280; margin: 0 0 10px 0;">${recipient.giftCardType || 'Amazon'} Gift Card</p>
                  <p style="font-size: 28px; font-weight: bold; color: #4F46E5; margin: 0 0 10px 0;">$${recipient.giftCardValue}</p>
                  <p style="font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 10px; border-radius: 4px;">
                    ${recipient.giftCardCode}
                  </p>
                </div>
              </div>
            </div>
          `
        );

        results.push({ userId: recipient.userId, email: user.email, success: true });
      } catch (err: any) {
        results.push({ userId: recipient.userId, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: recipients.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// GIFT CARD REDEMPTIONS MANAGEMENT
// ============================================

// Get all gift card redemptions (pending, completed, etc.)
router.get('/gift-card-redemptions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status } = req.query;
    
    let query = `
      SELECT 
        r.id,
        r.user_id,
        r.credits_spent,
        r.status,
        r.delivery_email,
        r.gift_card_code,
        r.fulfilled_at,
        r.created_at,
        u.email as user_email,
        u.username,
        si.name as item_name,
        si.credits_cost,
        si.icon
      FROM redemptions r
      JOIN users u ON r.user_id = u.id
      JOIN store_items si ON r.item_id = si.id
      WHERE si.item_type = 'giftcard'
    `;
    
    const params: any[] = [];
    
    if (status) {
      params.push(status);
      query += ` AND r.status = $${params.length}`;
    }
    
    query += ` ORDER BY r.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    // Get summary counts
    const summaryResult = await pool.query(`
      SELECT 
        r.status,
        COUNT(*) as count
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE si.item_type = 'giftcard'
      GROUP BY r.status
    `);
    
    const summary: Record<string, number> = {
      pending: 0,
      completed: 0,
      failed: 0,
    };
    
    summaryResult.rows.forEach(row => {
      summary[row.status] = parseInt(row.count);
    });

    res.json({
      success: true,
      data: {
        redemptions: result.rows,
        summary,
        total: result.rows.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Fulfill a gift card redemption (mark as completed and optionally send email)
router.post('/gift-card-redemptions/:id/fulfill', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { giftCardCode, sendEmail: shouldSendEmail = true } = req.body;

    if (!giftCardCode) {
      return next(createError('Gift card code is required', 400, 'MISSING_CODE'));
    }

    // Get the redemption details
    const redemptionResult = await pool.query(`
      SELECT 
        r.*,
        u.email as user_email,
        si.name as item_name,
        si.credits_cost
      FROM redemptions r
      JOIN users u ON r.user_id = u.id
      JOIN store_items si ON r.item_id = si.id
      WHERE r.id = $1
    `, [id]);

    if (redemptionResult.rows.length === 0) {
      return next(createError('Redemption not found', 404, 'REDEMPTION_NOT_FOUND'));
    }

    const redemption = redemptionResult.rows[0];

    if (redemption.status === 'completed') {
      return next(createError('This redemption has already been fulfilled', 400, 'ALREADY_FULFILLED'));
    }

    // Update redemption status
    await pool.query(`
      UPDATE redemptions 
      SET status = 'completed', 
          gift_card_code = $1,
          fulfilled_at = NOW()
      WHERE id = $2
    `, [giftCardCode, id]);

    // Extract gift card type and value from item name (e.g., "$5 Amazon Gift Card")
    const match = redemption.item_name.match(/\$(\d+)\s+(\w+)/);
    const giftCardValue = match ? match[1] : '5';
    const giftCardType = match ? match[2] : 'Gift Card';

    // Send email if requested
    let emailSent = false;
    const deliveryEmail = redemption.delivery_email || redemption.user_email;
    
    if (shouldSendEmail && process.env.RESEND_API_KEY) {
      try {
        await sendEmail(
          deliveryEmail,
          `🎉 Your ${giftCardType} Gift Card from EarnLoop!`,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">🎁 You've Got a Gift Card!</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
                <h2 style="color: #1f2937; margin-top: 0;">Congratulations!</h2>
                <p style="color: #4b5563; font-size: 16px;">
                  Thank you for being an amazing EarnLoop user! Here's your reward:
                </p>
                
                <div style="background: white; border: 2px dashed #4F46E5; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
                  <p style="color: #6b7280; margin: 0 0 10px 0;">${redemption.item_name}</p>
                  <p style="font-size: 28px; font-weight: bold; color: #4F46E5; margin: 0 0 10px 0;">$${giftCardValue}</p>
                  <p style="font-family: monospace; font-size: 18px; background: #f3f4f6; padding: 10px; border-radius: 4px; color: #1f2937;">
                    ${giftCardCode}
                  </p>
                </div>
                
                <p style="color: #6b7280; font-size: 14px;">
                  To redeem, visit ${giftCardType.toLowerCase() === 'amazon' ? 'amazon.com/gc/redeem' : 
                    giftCardType.toLowerCase() === 'apple' ? 'apple.com/redeem' :
                    giftCardType.toLowerCase() === 'google' ? 'play.google.com/redeem' :
                    'the appropriate redemption page'} and enter the code above.
                </p>
              </div>
              
              <div style="background: #FEF3C7; border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center;">
                <p style="color: #92400E; font-size: 18px; font-weight: bold; margin: 0 0 10px 0;">
                  ⭐ Enjoying EarnLoop? ⭐
                </p>
                <p style="color: #B45309; font-size: 14px; margin: 0 0 15px 0;">
                  We'd love to hear from you! Your feedback helps us improve and helps other users discover EarnLoop.
                </p>
                <div style="display: inline-block;">
                  <a href="https://apps.apple.com/app/earnloop/id123456789" style="display: inline-block; background: #4F46E5; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                    Rate on App Store 🍎
                  </a>
                  <a href="https://play.google.com/store/apps/details?id=com.earnloop.app" style="display: inline-block; background: #10B981; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; margin: 5px;">
                    Rate on Google Play 🤖
                  </a>
                </div>
              </div>
              
              <div style="text-align: center; padding: 20px; color: #9ca3af;">
                <p style="margin: 0;">Keep earning with EarnLoop! 🚀</p>
              </div>
            </div>
          `
        );
        emailSent = true;
      } catch (emailError) {
        console.error('Failed to send gift card email:', emailError);
      }
    }

    // Log the fulfillment
    await pool.query(`
      INSERT INTO admin_logs (action, admin_note, user_id, metadata)
      VALUES ($1, $2, $3, $4)
    `, [
      'gift_card_fulfilled',
      `Fulfilled ${redemption.item_name}`,
      redemption.user_id,
      JSON.stringify({ 
        redemptionId: id,
        itemName: redemption.item_name,
        giftCardCode: giftCardCode.substring(0, 4) + '****',
        emailSent,
        deliveryEmail,
      })
    ]);

    res.json({
      success: true,
      data: {
        message: 'Gift card redemption fulfilled successfully',
        redemptionId: id,
        itemName: redemption.item_name,
        deliveryEmail,
        emailSent,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Mark a gift card redemption as failed/cancelled
router.post('/gift-card-redemptions/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason, refundCredits = true } = req.body;

    // Get the redemption details
    const redemptionResult = await pool.query(`
      SELECT r.*, si.name as item_name
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE r.id = $1
    `, [id]);

    if (redemptionResult.rows.length === 0) {
      return next(createError('Redemption not found', 404, 'REDEMPTION_NOT_FOUND'));
    }

    const redemption = redemptionResult.rows[0];

    if (redemption.status === 'completed') {
      return next(createError('Cannot cancel a completed redemption', 400, 'ALREADY_COMPLETED'));
    }

    // Update status to failed
    await pool.query(`
      UPDATE redemptions 
      SET status = 'failed'
      WHERE id = $1
    `, [id]);

    // Refund credits if requested
    if (refundCredits) {
      await pool.query(`
        UPDATE balances 
        SET credits_balance = credits_balance + $1,
            lifetime_spent = lifetime_spent - $1,
            updated_at = NOW()
        WHERE user_id = $2
      `, [redemption.credits_spent, redemption.user_id]);
    }

    // Log the cancellation
    await pool.query(`
      INSERT INTO admin_logs (action, admin_note, user_id, metadata)
      VALUES ($1, $2, $3, $4)
    `, [
      'gift_card_cancelled',
      `Cancelled ${redemption.item_name}: ${reason || 'No reason provided'}`,
      redemption.user_id,
      JSON.stringify({ 
        redemptionId: id,
        itemName: redemption.item_name,
        refunded: refundCredits,
        creditsRefunded: refundCredits ? redemption.credits_spent : 0,
        reason,
      })
    ]);

    res.json({
      success: true,
      data: {
        message: refundCredits 
          ? `Redemption cancelled and ${redemption.credits_spent} credits refunded`
          : 'Redemption cancelled (no refund)',
        redemptionId: id,
        creditsRefunded: refundCredits ? redemption.credits_spent : 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// CREDIT ADJUSTMENTS
// ============================================

// Adjust user credits (add or subtract)
router.post('/users/:id/adjust-credits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (typeof amount !== 'number') {
      return next(createError('Amount must be a number', 400, 'INVALID_AMOUNT'));
    }

    // Get current balance
    const balanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [id]
    );

    if (balanceResult.rows.length === 0) {
      return next(createError('User balance not found', 404, 'BALANCE_NOT_FOUND'));
    }

    const currentBalance = balanceResult.rows[0].credits_balance;
    const newBalance = currentBalance + amount;

    if (newBalance < 0) {
      return next(createError('Cannot reduce balance below 0', 400, 'INSUFFICIENT_BALANCE'));
    }

    // Update balance
    await pool.query(
      `UPDATE balances 
       SET credits_balance = $1, 
           lifetime_earned = lifetime_earned + GREATEST($2, 0),
           updated_at = NOW() 
       WHERE user_id = $3`,
      [newBalance, amount, id]
    );

    res.json({
      success: true,
      data: {
        previousBalance: currentBalance,
        adjustment: amount,
        newBalance,
        reason: reason || 'Admin adjustment',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Bulk adjust credits for all users
router.post('/bulk-adjust-credits', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { amount, reason } = req.body;

    if (typeof amount !== 'number' || amount <= 0) {
      return next(createError('Amount must be a positive number', 400, 'INVALID_AMOUNT'));
    }

    // Get all users
    const usersResult = await pool.query('SELECT id FROM users');
    const results = [];

    for (const user of usersResult.rows) {
      try {
        await pool.query(
          `UPDATE balances 
           SET credits_balance = credits_balance + $1, 
               lifetime_earned = lifetime_earned + $1,
               updated_at = NOW() 
           WHERE user_id = $2`,
          [amount, user.id]
        );
        results.push({ userId: user.id, success: true });
      } catch (err: any) {
        results.push({ userId: user.id, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: usersResult.rows.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        amount,
        reason: reason || 'Bulk admin adjustment',
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Send bulk apology/announcement email
router.post('/bulk-send-email', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subject, message, creditsToAdd } = req.body;

    if (!subject || !message) {
      return next(createError('Subject and message are required', 400, 'MISSING_FIELDS'));
    }

    if (!process.env.RESEND_API_KEY) {
      return next(createError('Email not configured', 500, 'EMAIL_NOT_CONFIGURED'));
    }

    // Get all users
    const usersResult = await pool.query('SELECT u.id, u.email FROM users u');
    const results = [];

    for (const user of usersResult.rows) {
      try {
        // Add credits if specified
        if (creditsToAdd && creditsToAdd > 0) {
          await pool.query(
            `UPDATE balances 
             SET credits_balance = credits_balance + $1, 
                 lifetime_earned = lifetime_earned + $1,
                 updated_at = NOW() 
             WHERE user_id = $2`,
            [creditsToAdd, user.id]
          );
        }

        // Send email
        await sendEmail(
          user.email,
          subject,
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #F7931A 0%, #FF6B35 100%); padding: 30px; border-radius: 12px; text-align: center;">
                <h1 style="color: white; margin: 0;">📢 Message from EarnLoop</h1>
              </div>
              
              <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
                <div style="color: #4b5563; font-size: 16px; line-height: 1.6;">
                  ${message.replace(/\n/g, '<br>')}
                </div>
                
                ${creditsToAdd ? `
                <div style="background: #10B981; color: white; padding: 15px; border-radius: 8px; margin-top: 20px; text-align: center;">
                  <p style="margin: 0; font-size: 18px; font-weight: bold;">
                    🎁 We've added ${creditsToAdd} credits to your account!
                  </p>
                </div>
                ` : ''}
                
                <p style="color: #6b7280; margin-top: 20px;">
                  Thank you for being part of EarnLoop!<br>
                  - The EarnLoop Team
                </p>
              </div>
            </div>
          `
        );

        results.push({ userId: user.id, email: user.email, success: true });
      } catch (err: any) {
        results.push({ userId: user.id, email: user.email, success: false, error: err.message });
      }
    }

    res.json({
      success: true,
      data: {
        total: usersResult.rows.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        creditsAdded: creditsToAdd || 0,
        results,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// BAN/UNBAN USERS
// ============================================

router.post('/users/:id/ban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    await pool.query(
      'UPDATE users SET is_banned = true, ban_reason = $1, updated_at = NOW() WHERE id = $2',
      [reason || 'Banned by admin', id]
    );

    res.json({ success: true, message: 'User banned successfully' });
  } catch (error) {
    next(error);
  }
});

router.post('/users/:id/unban', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await pool.query(
      'UPDATE users SET is_banned = false, ban_reason = NULL, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({ success: true, message: 'User unbanned successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// STATS & DASHBOARD
// ============================================

router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Total users
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    
    // New users today
    const newToday = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at::date = CURRENT_DATE"
    );
    
    // New users this week
    const newThisWeek = await pool.query(
      "SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '7 days'"
    );
    
    // Active users (earned something in last 7 days)
    const activeUsers = await pool.query(`
      SELECT COUNT(DISTINCT user_id) FROM earn_events 
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);
    
    // Total credits in circulation
    const totalCredits = await pool.query('SELECT SUM(credits_balance) FROM balances');
    
    // Signups per day (last 14 days)
    const signupTrend = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM users
      WHERE created_at > NOW() - INTERVAL '14 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      success: true,
      data: {
        totalUsers: parseInt(totalUsers.rows[0].count),
        newToday: parseInt(newToday.rows[0].count),
        newThisWeek: parseInt(newThisWeek.rows[0].count),
        activeUsersLast7Days: parseInt(activeUsers.rows[0].count),
        totalCreditsInCirculation: parseInt(totalCredits.rows[0].sum || 0),
        signupTrend: signupTrend.rows,
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SECURITY - IP BLACKLIST
// ============================================

import { addToBlacklist, removeFromBlacklist, getBlacklist } from '../middleware/ipBlacklist';
import { getAuditLogs, getSuspiciousActivity } from '../middleware/auditLogger';

// Get all blacklisted IPs
router.get('/security/blacklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blacklist = await getBlacklist();
    res.json({ success: true, data: { blacklist } });
  } catch (error) {
    next(error);
  }
});

// Add IP to blacklist
router.post('/security/blacklist', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ip, reason, userId, expiresInHours } = req.body;
    
    if (!ip) {
      return next(createError('IP address is required', 400, 'MISSING_IP'));
    }

    await addToBlacklist(ip, reason || 'Manual block by admin', userId, expiresInHours);
    
    await pool.query(`
      INSERT INTO admin_logs (action, admin_note, metadata)
      VALUES ($1, $2, $3)
    `, ['ip_blacklisted', `Blocked IP: ${ip}`, JSON.stringify({ ip, reason, expiresInHours })]);

    res.json({ success: true, data: { message: `IP ${ip} has been blacklisted` } });
  } catch (error) {
    next(error);
  }
});

// Remove IP from blacklist
router.delete('/security/blacklist/:ip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { ip } = req.params;
    await removeFromBlacklist(ip);
    
    await pool.query(`
      INSERT INTO admin_logs (action, admin_note, metadata)
      VALUES ($1, $2, $3)
    `, ['ip_unblacklisted', `Unblocked IP: ${ip}`, JSON.stringify({ ip })]);

    res.json({ success: true, data: { message: `IP ${ip} has been removed from blacklist` } });
  } catch (error) {
    next(error);
  }
});

// ============================================
// SECURITY - AUDIT LOGS
// ============================================

// Get audit logs
router.get('/security/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, path, limit, offset } = req.query;
    const logs = await getAuditLogs({
      userId: userId as string,
      path: path as string,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0,
    });
    res.json({ success: true, data: { logs, count: logs.length } });
  } catch (error) {
    next(error);
  }
});

// Get suspicious activity report
router.get('/security/suspicious', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const suspicious = await getSuspiciousActivity();
    res.json({ success: true, data: { suspicious } });
  } catch (error) {
    next(error);
  }
});

export default router;
