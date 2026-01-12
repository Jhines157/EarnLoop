import { Router, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Get current user profile
router.get('/', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get user
    const userResult = await pool.query(
      `SELECT id, email, created_at, email_verified 
       FROM users WHERE id = $1`,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, error: { message: 'User not found' } });
    }

    const user = userResult.rows[0];

    // Get balance
    const balanceResult = await pool.query(
      'SELECT credits_balance, lifetime_earned, lifetime_spent FROM balances WHERE user_id = $1',
      [userId]
    );
    const balance = balanceResult.rows[0] || { credits_balance: 0, lifetime_earned: 0, lifetime_spent: 0 };

    // Get streak
    const streakResult = await pool.query(
      'SELECT current_streak, longest_streak, last_checkin_date FROM streaks WHERE user_id = $1',
      [userId]
    );
    const streak = streakResult.rows[0] || { current_streak: 0, longest_streak: 0, last_checkin_date: null };

    // Get device count
    const deviceCount = await pool.query(
      'SELECT COUNT(*) as count FROM devices WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          createdAt: user.created_at,
          emailVerified: user.email_verified,
        },
        balance: {
          current: balance.credits_balance,
          lifetimeEarned: balance.lifetime_earned,
          lifetimeSpent: balance.lifetime_spent,
        },
        streak: {
          current: streak.current_streak,
          longest: streak.longest_streak,
          lastCheckin: streak.last_checkin_date,
        },
        devices: parseInt(deviceCount.rows[0].count),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get earn/spend history
router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const limit = Math.min(parseInt(req.query?.limit as string) || 50, 100);
    const offset = parseInt(req.query?.offset as string) || 0;

    // Get earn events
    const earnResult = await pool.query(`
      SELECT id, event_type as type, credits_amount as amount, created_at, 'earn' as category
      FROM earn_events
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Get redemptions
    const spendResult = await pool.query(`
      SELECT r.id, si.name as type, r.credits_spent as amount, r.created_at, 'spend' as category
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    // Combine and sort
    const history = [...earnResult.rows, ...spendResult.rows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, limit);

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
