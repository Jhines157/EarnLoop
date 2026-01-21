import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import pool from '../db';
import { createError } from '../middleware/errorHandler';

const router = Router();

// Simple admin API key authentication
const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-admin-key'] || req.query.adminKey;
  
  if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ 
      success: false, 
      error: { message: 'Unauthorized - Invalid admin key' } 
    });
  }
  next();
};

router.use(adminAuth);

// ============================================
// USER MANAGEMENT
// ============================================

// Get all users with optional filters
router.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { days, search, limit = 50, offset = 0 } = req.query;
    
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

// Create email transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Send password reset email
const sendPasswordResetEmail = async (email: string, newPassword: string) => {
  const transporter = createTransporter();
  
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'EarnLoop <noreply@earnloop.app>',
    to: email,
    subject: 'Your EarnLoop Password Has Been Reset',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Password Reset</h2>
        <p>Your EarnLoop password has been reset.</p>
        <p>Your new password is: <strong>${newPassword}</strong></p>
        <p>Please log in and change your password immediately.</p>
        <br>
        <p>- The EarnLoop Team</p>
      </div>
    `,
  });
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

    if (!process.env.SMTP_HOST) {
      return next(createError('Email not configured. Set SMTP environment variables.', 500, 'EMAIL_NOT_CONFIGURED'));
    }

    const transporter = createTransporter();
    
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'EarnLoop <noreply@earnloop.app>',
      to: user.email,
      subject: `🎉 Your ${giftCardType} Gift Card from EarnLoop!`,
      html: `
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
      `,
    });

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
        const transporter = createTransporter();

        await transporter.sendMail({
          from: process.env.SMTP_FROM || 'EarnLoop <noreply@earnloop.app>',
          to: user.email,
          subject: `🎉 Your ${recipient.giftCardType || 'Amazon'} Gift Card from EarnLoop!`,
          html: `
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
          `,
        });

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

export default router;
