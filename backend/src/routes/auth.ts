import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Resend } from 'resend';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db';
import { authRateLimiter } from '../middleware/rateLimiter';
import { createError } from '../middleware/errorHandler';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Apply strict rate limiting to auth routes
router.use(authRateLimiter);

// Signup
router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, deviceFingerprint, deviceName, platform } = req.body;

    if (!email || !password) {
      return next(createError('Email and password are required', 400, 'MISSING_FIELDS'));
    }

    if (password.length < 8) {
      return next(createError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD'));
    }

    // Check if user exists
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existingUser.rows.length > 0) {
      return next(createError('Email already registered', 409, 'EMAIL_EXISTS'));
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const userResult = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email.toLowerCase(), passwordHash]
    );
    const user = userResult.rows[0];

    // Create balance record
    await pool.query('INSERT INTO balances (user_id) VALUES ($1)', [user.id]);

    // Create streak record
    await pool.query('INSERT INTO streaks (user_id) VALUES ($1)', [user.id]);

    // Register device if provided
    let deviceId = null;
    if (deviceFingerprint) {
      const deviceResult = await pool.query(
        `INSERT INTO devices (user_id, device_fingerprint, device_name, platform, ip_address)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [user.id, deviceFingerprint, deviceName, platform, req.ip]
      );
      deviceId = deviceResult.rows[0].id;
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, deviceId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, deviceFingerprint, deviceName, platform } = req.body;

    if (!email || !password) {
      return next(createError('Email and password are required', 400, 'MISSING_FIELDS'));
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email, password_hash, is_banned, ban_reason FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    const user = userResult.rows[0];

    // Check if banned
    if (user.is_banned) {
      return next(createError(`Account suspended: ${user.ban_reason || 'Contact support'}`, 403, 'ACCOUNT_BANNED'));
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return next(createError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
    }

    // Handle device
    let deviceId = null;
    if (deviceFingerprint) {
      // Check if device exists for this user
      const existingDevice = await pool.query(
        'SELECT id, is_blocked FROM devices WHERE user_id = $1 AND device_fingerprint = $2',
        [user.id, deviceFingerprint]
      );

      if (existingDevice.rows.length > 0) {
        if (existingDevice.rows[0].is_blocked) {
          return next(createError('This device has been blocked', 403, 'DEVICE_BLOCKED'));
        }
        deviceId = existingDevice.rows[0].id;
        // Update last seen
        await pool.query('UPDATE devices SET last_seen_at = NOW(), ip_address = $1 WHERE id = $2', [req.ip, deviceId]);
      } else {
        // Register new device
        const deviceResult = await pool.query(
          `INSERT INTO devices (user_id, device_fingerprint, device_name, platform, ip_address)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [user.id, deviceFingerprint, deviceName, platform, req.ip]
        );
        deviceId = deviceResult.rows[0].id;
      }
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, deviceId },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete account (iOS App Store requirement)
router.delete('/delete-account', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Delete all user data (cascade will handle related tables)
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);

    res.json({
      success: true,
      data: {
        message: 'Account deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Change password (authenticated user)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return next(createError('Current password and new password are required', 400, 'MISSING_FIELDS'));
    }

    if (newPassword.length < 8) {
      return next(createError('New password must be at least 8 characters', 400, 'PASSWORD_TOO_SHORT'));
    }

    // Get current password hash
    const userResult = await pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return next(createError('User not found', 404, 'USER_NOT_FOUND'));
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isValid) {
      return next(createError('Current password is incorrect', 401, 'INVALID_PASSWORD'));
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newPasswordHash, userId]);

    res.json({
      success: true,
      data: {
        message: 'Password changed successfully',
      },
    });
  } catch (error) {
    next(error);
  }
});

// ============================================
// PASSWORD RESET (User Self-Service)
// ============================================

// Helper function to send emails via Resend
const sendEmail = async (to: string, subject: string, html: string) => {
  if (!process.env.RESEND_API_KEY) {
    console.log('RESEND_API_KEY not set, skipping email');
    return;
  }
  
  const resend = new Resend(process.env.RESEND_API_KEY);
  
  await resend.emails.send({
    from: 'EarnLoop <noreply@earnloop.app>',
    to,
    subject,
    html,
  });
};

// Request password reset - sends email with 6-digit code
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;

    if (!email) {
      return next(createError('Email is required', 400, 'MISSING_FIELDS'));
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always return success to prevent email enumeration
    if (userResult.rows.length === 0) {
      return res.json({
        success: true,
        data: { message: 'If an account exists, a reset code has been sent.' },
      });
    }

    const user = userResult.rows[0];

    // Generate 6-digit code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const resetCodeHash = crypto.createHash('sha256').update(resetCode).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store reset code in database
    await pool.query(`
      INSERT INTO password_resets (user_id, code_hash, expires_at)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) 
      DO UPDATE SET code_hash = $2, expires_at = $3, attempts = 0, created_at = NOW()
    `, [user.id, resetCodeHash, expiresAt]);

    // Send email via Resend
    await sendEmail(
      user.email,
      'Reset Your EarnLoop Password',
      `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F7931A 0%, #FF6B35 100%); padding: 30px; border-radius: 12px; text-align: center;">
            <h1 style="color: white; margin: 0;">🔐 Password Reset</h1>
          </div>
          
          <div style="padding: 30px; background: #f9fafb; border-radius: 12px; margin-top: 20px;">
            <p style="color: #4b5563; font-size: 16px;">
              You requested to reset your password. Use this code in the app:
            </p>
            
            <div style="background: white; border: 2px solid #F7931A; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">
              <p style="font-size: 36px; font-weight: bold; color: #F7931A; letter-spacing: 8px; margin: 0;">
                ${resetCode}
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This code expires in 15 minutes. If you didn't request this, you can ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #9ca3af;">
            <p style="margin: 0;">- The EarnLoop Team</p>
          </div>
        </div>
      `
    );

    res.json({
      success: true,
      data: { 
        message: 'If an account exists, a reset code has been sent.',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Verify reset code and set new password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return next(createError('Email, code, and new password are required', 400, 'MISSING_FIELDS'));
    }

    if (newPassword.length < 8) {
      return next(createError('Password must be at least 8 characters', 400, 'WEAK_PASSWORD'));
    }

    // Find user
    const userResult = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return next(createError('Invalid reset code', 400, 'INVALID_CODE'));
    }

    const userId = userResult.rows[0].id;

    // Find valid reset code
    const resetResult = await pool.query(`
      SELECT id, code_hash, expires_at, attempts 
      FROM password_resets 
      WHERE user_id = $1 AND expires_at > NOW()
    `, [userId]);

    if (resetResult.rows.length === 0) {
      return next(createError('Reset code expired. Please request a new one.', 400, 'CODE_EXPIRED'));
    }

    const reset = resetResult.rows[0];

    // Check attempts (prevent brute force)
    if (reset.attempts >= 5) {
      await pool.query('DELETE FROM password_resets WHERE id = $1', [reset.id]);
      return next(createError('Too many attempts. Please request a new code.', 400, 'TOO_MANY_ATTEMPTS'));
    }

    // Verify code
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    if (codeHash !== reset.code_hash) {
      await pool.query(
        'UPDATE password_resets SET attempts = attempts + 1 WHERE id = $1',
        [reset.id]
      );
      return next(createError('Invalid reset code', 400, 'INVALID_CODE'));
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, userId]
    );

    // Delete used reset code
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);

    res.json({
      success: true,
      data: { message: 'Password reset successfully. You can now log in.' },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
