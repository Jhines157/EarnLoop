import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

export default router;
