import { Router, Request, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { earnRateLimiter } from '../middleware/rateLimiter';
import { createError } from '../middleware/errorHandler';
import crypto from 'crypto';

const router = Router();

// ============================================
// AdMob SSV Callback - NO AUTH REQUIRED
// This must be defined BEFORE the authenticate middleware
// ============================================
router.get('/admob-ssv', async (req: Request, res: Response) => {
  try {
    // Log incoming SSV request for debugging
    console.log('📺 AdMob SSV callback received:', {
      query: req.query,
      headers: req.headers['user-agent'],
    });

    // Extract parameters from the callback
    const {
      ad_network,
      ad_unit,
      custom_data,
      reward_amount,
      reward_item,
      timestamp,
      transaction_id,
      user_id,
      signature,
      key_id,
    } = req.query;

    // For verification request from AdMob console (no parameters), just return 200
    if (!transaction_id && !user_id) {
      console.log('✅ AdMob SSV verification ping - returning 200');
      return res.status(200).send('OK');
    }

    // Validate required parameters
    if (!transaction_id || !user_id) {
      console.warn('⚠️ AdMob SSV missing required parameters');
      return res.status(400).send('Missing required parameters');
    }

    // Check for duplicate transaction
    const existingTx = await pool.query(
      'SELECT id FROM earn_events WHERE ad_transaction_id = $1',
      [transaction_id]
    );

    if (existingTx.rows.length > 0) {
      console.log('⚠️ Duplicate SSV transaction:', transaction_id);
      return res.status(200).send('OK'); // Return 200 to prevent retries
    }

    // Parse custom_data to get internal user ID
    let internalUserId: string;
    try {
      const customData = JSON.parse(decodeURIComponent(custom_data as string || '{}'));
      internalUserId = customData.userId;
    } catch {
      // If custom_data parsing fails, use user_id directly
      internalUserId = user_id as string;
    }

    if (!internalUserId) {
      console.warn('⚠️ AdMob SSV could not determine user ID');
      return res.status(400).send('Invalid user ID');
    }

    // Verify user exists
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [internalUserId]);
    if (userCheck.rows.length === 0) {
      console.warn('⚠️ AdMob SSV user not found:', internalUserId);
      return res.status(400).send('User not found');
    }

    // Calculate credits to award
    const creditsToAward = parseInt(reward_amount as string) || 10;

    // Record the earn event
    await pool.query(
      `INSERT INTO earn_events (user_id, event_type, credits_amount, metadata, ad_transaction_id)
       VALUES ($1, 'ad_watch', $2, $3, $4)`,
      [
        internalUserId,
        creditsToAward,
        JSON.stringify({
          ad_network,
          ad_unit,
          reward_item,
          timestamp,
          verified: true,
        }),
        transaction_id,
      ]
    );

    // Update user's credit balance
    await pool.query(
      'UPDATE users SET credits = credits + $1, total_earned = total_earned + $1, lifetime_earnings = lifetime_earnings + $1 WHERE id = $2',
      [creditsToAward, internalUserId]
    );

    console.log(`✅ AdMob SSV credited ${creditsToAward} to user ${internalUserId}, tx: ${transaction_id}`);

    // Return 200 to acknowledge receipt
    res.status(200).send('OK');
  } catch (error) {
    console.error('❌ AdMob SSV error:', error);
    // Return 200 even on error to prevent retries that might cause duplicates
    res.status(200).send('OK');
  }
});

// ============================================
// Protected routes - Require authentication
// ============================================
router.use(authenticate);
router.use(earnRateLimiter);

// Get today's credits earned (helper)
const getTodayEarned = async (userId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COALESCE(SUM(credits_amount), 0) as today_earned
     FROM earn_events 
     WHERE user_id = $1 AND created_at >= CURRENT_DATE`,
    [userId]
  );
  return parseInt(result.rows[0].today_earned);
};

// Get user's daily cap (considers progressive trust)
const getDailyCap = async (userId: string): Promise<number> => {
  const baseCap = parseInt(process.env.DAILY_CREDIT_CAP || '100');
  const newUserDays = parseInt(process.env.NEW_USER_DAYS || '3');
  const newUserMultiplier = parseFloat(process.env.NEW_USER_CAP_MULTIPLIER || '0.5');

  const result = await pool.query(
    'SELECT created_at FROM users WHERE id = $1',
    [userId]
  );

  if (result.rows.length === 0) return baseCap;

  const daysSinceSignup = Math.floor(
    (Date.now() - new Date(result.rows[0].created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceSignup < newUserDays) {
    return Math.floor(baseCap * newUserMultiplier);
  }

  return baseCap;
};

// No daily cap - unlimited earning!
// Keeping function signature for backward compatibility
const canEarnMore = async (userId: string, amount: number): Promise<{ canEarn: boolean; remaining: number }> => {
  return {
    canEarn: true,
    remaining: Infinity,
  };
};

// Daily check-in
router.post('/checkin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const rewardAmount = parseInt(process.env.CHECKIN_REWARD || '5');

    // Check daily cap
    const { canEarn, remaining } = await canEarnMore(userId, rewardAmount);
    if (!canEarn) {
      return next(createError(`Daily cap reached. Remaining: ${remaining} credits`, 429, 'DAILY_CAP_REACHED'));
    }

    // Check if already checked in today
    const existingCheckin = await pool.query(
      `SELECT id FROM earn_events 
       WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= CURRENT_DATE`,
      [userId]
    );

    if (existingCheckin.rows.length > 0) {
      return next(createError('Already checked in today', 409, 'ALREADY_CHECKED_IN'));
    }

    // Check if user missed a day and has streak savers
    const streakCheck = await pool.query(
      `SELECT current_streak, last_checkin_date, streak_savers FROM streaks WHERE user_id = $1`,
      [userId]
    );
    
    let streakSaverUsed = false;
    if (streakCheck.rows.length > 0) {
      const { current_streak, last_checkin_date, streak_savers } = streakCheck.rows[0];
      const lastCheckin = new Date(last_checkin_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      lastCheckin.setHours(0, 0, 0, 0);
      
      const daysSinceCheckin = Math.floor((today.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24));
      
      // If missed exactly 1 day and has streak savers, use one
      if (daysSinceCheckin === 2 && current_streak > 0 && streak_savers > 0) {
        await pool.query(
          `UPDATE streaks SET streak_savers = streak_savers - 1 WHERE user_id = $1`,
          [userId]
        );
        streakSaverUsed = true;
      }
    }

    // Record earn event
    await pool.query(
      `INSERT INTO earn_events (user_id, device_id, event_type, credits_amount, ip_address)
       VALUES ($1, $2, 'checkin', $3, $4)`,
      [userId, req.deviceId, rewardAmount, req.ip]
    );

    // Update balance (credits + tokens)
    const tokenReward = 5; // Tokens for daily check-in
    await pool.query(
      `UPDATE balances 
       SET credits_balance = credits_balance + $1, 
           lifetime_earned = lifetime_earned + $1,
           tokens = COALESCE(tokens, 100) + $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [rewardAmount, tokenReward, userId]
    );

    // Update streak (considering streak saver)
    const streakResult = await pool.query(
      `UPDATE streaks 
       SET current_streak = CASE 
         WHEN last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
         WHEN last_checkin_date = CURRENT_DATE THEN current_streak
         WHEN $2 = true THEN current_streak + 1
         ELSE 1
       END,
       longest_streak = GREATEST(longest_streak, CASE 
         WHEN last_checkin_date = CURRENT_DATE - INTERVAL '1 day' THEN current_streak + 1
         WHEN $2 = true THEN current_streak + 1
         ELSE 1
       END),
       last_checkin_date = CURRENT_DATE,
       updated_at = NOW()
       WHERE user_id = $1
       RETURNING current_streak, longest_streak, streak_savers`,
      [userId, streakSaverUsed]
    );

    // Get updated balance including tokens
    const balanceResult = await pool.query(
      'SELECT credits_balance, COALESCE(tokens, 100) as tokens FROM balances WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        creditsEarned: rewardAmount,
        tokensEarned: 5,
        newBalance: balanceResult.rows[0].credits_balance,
        newTokenBalance: balanceResult.rows[0].tokens,
        streak: streakResult.rows[0],
        streakSaverUsed,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Rewarded ad completion
router.post('/rewarded-ad-complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { adUnitId, rewardToken, timestamp } = req.body;
    let rewardAmount = parseInt(process.env.AD_REWARD || '10');

    // TODO: Implement AdMob SSV verification here
    // For now, we'll do basic validation
    if (!adUnitId) {
      return next(createError('Invalid ad completion data', 400, 'INVALID_AD_DATA'));
    }

    // Check for active XP boost
    const boostCheck = await pool.query(`
      SELECT ui.*, si.name FROM user_inventory ui
      JOIN store_items si ON ui.item_id = si.id
      WHERE ui.user_id = $1 
        AND ui.item_type = 'boost' 
        AND ui.is_active = true 
        AND (ui.expires_at IS NULL OR ui.expires_at > NOW())
    `, [userId]);
    
    let xpBoostApplied = false;
    if (boostCheck.rows.length > 0) {
      rewardAmount = rewardAmount * 2; // 2x boost!
      xpBoostApplied = true;
    }

    // No daily cap on ads - users can watch unlimited ads
    // This maximizes revenue while keeping users engaged
    // Get today's ad count for tracking purposes only
    const todayAds = await pool.query(
      `SELECT COUNT(*) as count FROM earn_events 
       WHERE user_id = $1 AND event_type = 'rewarded_ad' AND created_at >= CURRENT_DATE`,
      [userId]
    );

    // Check for replay attack (same token) - temporarily disabled for testing
    // TODO: Re-enable after app update with unique tokens
    /*
    if (rewardToken) {
      const existingToken = await pool.query(
        `SELECT id FROM earn_events 
         WHERE metadata->>'rewardToken' = $1`,
        [rewardToken]
      );

      if (existingToken.rows.length > 0) {
        // Flag potential abuse
        await pool.query(
          `INSERT INTO fraud_flags (user_id, device_id, flag_type, severity, reason, metadata)
           VALUES ($1, $2, 'replay_attack', 'high', 'Duplicate reward token submitted', $3)`,
          [userId, req.deviceId, JSON.stringify({ rewardToken, adUnitId })]
        );
        return next(createError('Invalid reward claim', 400, 'INVALID_REWARD'));
      }
    }
    */

    // Record earn event
    await pool.query(
      `INSERT INTO earn_events (user_id, device_id, event_type, credits_amount, ip_address, metadata)
       VALUES ($1, $2, 'rewarded_ad', $3, $4, $5)`,
      [userId, req.deviceId, rewardAmount, req.ip, JSON.stringify({ adUnitId, rewardToken, timestamp })]
    );

    // Update balance (credits + 1 token per ad)
    const tokenReward = 1;
    await pool.query(
      `UPDATE balances 
       SET credits_balance = credits_balance + $1, 
           lifetime_earned = lifetime_earned + $1,
           tokens = COALESCE(tokens, 100) + $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [rewardAmount, tokenReward, userId]
    );

    // Get updated balance including tokens
    const balanceResult = await pool.query(
      'SELECT credits_balance, COALESCE(tokens, 100) as tokens FROM balances WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        creditsEarned: rewardAmount,
        tokensEarned: tokenReward,
        newBalance: balanceResult.rows[0].credits_balance,
        newTokenBalance: balanceResult.rows[0].tokens,
        adsWatchedToday: parseInt(todayAds.rows[0].count) + 1,
        xpBoostApplied,
        baseReward: parseInt(process.env.AD_REWARD || '10'),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Learn module completion
router.post('/learn-complete', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { moduleId, quizScore } = req.body;
    const rewardAmount = parseInt(process.env.LEARN_REWARD || '15');

    if (!moduleId) {
      return next(createError('Module ID required', 400, 'MISSING_MODULE_ID'));
    }

    // Check if quiz passed (minimum 70%)
    if (quizScore !== undefined && quizScore < 70) {
      return next(createError('Quiz not passed. Score at least 70% to earn credits.', 400, 'QUIZ_FAILED'));
    }

    // Check daily cap
    const { canEarn, remaining } = await canEarnMore(userId, rewardAmount);
    if (!canEarn) {
      return next(createError(`Daily cap reached. Remaining: ${remaining} credits`, 429, 'DAILY_CAP_REACHED'));
    }

    // Check if module already completed today
    const existingModule = await pool.query(
      `SELECT id FROM earn_events 
       WHERE user_id = $1 AND event_type = 'learn_module' 
       AND metadata->>'moduleId' = $2 AND created_at >= CURRENT_DATE`,
      [userId, moduleId]
    );

    if (existingModule.rows.length > 0) {
      return next(createError('Module already completed today', 409, 'MODULE_ALREADY_COMPLETED'));
    }

    // Record earn event
    await pool.query(
      `INSERT INTO earn_events (user_id, device_id, event_type, credits_amount, ip_address, metadata)
       VALUES ($1, $2, 'learn_module', $3, $4, $5)`,
      [userId, req.deviceId, rewardAmount, req.ip, JSON.stringify({ moduleId, quizScore })]
    );

    // Update balance (credits + 10 tokens for learning)
    const tokenReward = 10;
    await pool.query(
      `UPDATE balances 
       SET credits_balance = credits_balance + $1, 
           lifetime_earned = lifetime_earned + $1,
           tokens = COALESCE(tokens, 100) + $2,
           updated_at = NOW()
       WHERE user_id = $3`,
      [rewardAmount, tokenReward, userId]
    );

    // Get updated balance including tokens
    const balanceResult = await pool.query(
      'SELECT credits_balance, COALESCE(tokens, 100) as tokens FROM balances WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        creditsEarned: rewardAmount,
        tokensEarned: tokenReward,
        newBalance: balanceResult.rows[0].credits_balance,
        newTokenBalance: balanceResult.rows[0].tokens,
        moduleId,
        quizScore,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get earn status
router.get('/status', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const todayEarned = await getTodayEarned(userId);

    // Get today's ad count
    const todayAds = await pool.query(
      `SELECT COUNT(*) as count FROM earn_events 
       WHERE user_id = $1 AND event_type = 'rewarded_ad' AND created_at >= CURRENT_DATE`,
      [userId]
    );

    // Get total earned all time
    const totalEarnedResult = await pool.query(
      `SELECT COALESCE(SUM(credits_amount), 0) as total FROM earn_events WHERE user_id = $1`,
      [userId]
    );

    // Check if checked in today
    const todayCheckin = await pool.query(
      `SELECT id FROM earn_events 
       WHERE user_id = $1 AND event_type = 'checkin' AND created_at >= CURRENT_DATE`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        todayEarned,
        totalEarned: parseInt(totalEarnedResult.rows[0].total),
        adsWatchedToday: parseInt(todayAds.rows[0].count),
        checkedInToday: todayCheckin.rows.length > 0,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
