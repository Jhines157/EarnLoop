import { Router, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

// All jackpot routes require authentication
router.use(authenticate);

// Jackpot configuration
const JACKPOT_CONFIG = {
  minBet: 10,
  maxBet: 500,
  houseEdge: 0.05, // 5% house edge
  jackpotContribution: 0.10, // 10% of losses go to jackpot pool
  jackpotChance: 0.001, // 0.1% chance to hit jackpot
};

// Multiplier odds (weighted random)
const MULTIPLIERS = [
  { value: 0, weight: 35 },     // 35% - Lose all
  { value: 0.25, weight: 20 },  // 20% - Lose 75%
  { value: 0.5, weight: 15 },   // 15% - Lose 50%
  { value: 1, weight: 10 },     // 10% - Break even
  { value: 1.5, weight: 8 },    // 8% - Win 50%
  { value: 2, weight: 6 },      // 6% - Double
  { value: 3, weight: 3 },      // 3% - Triple
  { value: 5, weight: 2 },      // 2% - 5x
  { value: 10, weight: 1 },     // 1% - 10x (Jackpot!)
];

function selectMultiplier(): number {
  const totalWeight = MULTIPLIERS.reduce((sum, m) => sum + m.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const mult of MULTIPLIERS) {
    random -= mult.weight;
    if (random <= 0) {
      return mult.value;
    }
  }
  return 0;
}

// Get current jackpot pool info
router.get('/info', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get jackpot pool
    const poolResult = await pool.query(`
      SELECT * FROM jackpot_pool LIMIT 1
    `);

    // Get user's token balance
    const balanceResult = await pool.query(
      'SELECT tokens FROM balances WHERE user_id = $1',
      [userId]
    );
    const userTokens = balanceResult.rows[0]?.tokens || 0;

    // Get recent winners (last 10)
    const winnersResult = await pool.query(`
      SELECT js.*, u.email
      FROM jackpot_spins js
      JOIN users u ON js.user_id = u.id
      WHERE js.multiplier >= 5
      ORDER BY js.created_at DESC
      LIMIT 10
    `);

    // Get user's spin history
    const historyResult = await pool.query(`
      SELECT * FROM jackpot_spins
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 20
    `, [userId]);

    const poolData = poolResult.rows[0] || {
      pool_tokens: 10000,
      total_contributed: 0,
      total_won: 0,
    };

    res.json({
      success: true,
      data: {
        poolTokens: poolData.pool_tokens,
        totalContributed: poolData.total_contributed,
        totalWon: poolData.total_won,
        lastWinner: poolData.last_jackpot_winner_id ? {
          email: poolData.last_jackpot_winner_id, // Will be masked
          amount: poolData.last_jackpot_amount,
          wonAt: poolData.last_jackpot_won_at,
        } : null,
        userTokens,
        config: {
          minBet: JACKPOT_CONFIG.minBet,
          maxBet: JACKPOT_CONFIG.maxBet,
        },
        recentBigWins: winnersResult.rows.map(w => ({
          email: w.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
          multiplier: parseFloat(w.multiplier),
          winAmount: w.win_amount,
          betAmount: w.bet_amount,
          createdAt: w.created_at,
        })),
        myHistory: historyResult.rows.map(h => ({
          betAmount: h.bet_amount,
          multiplier: parseFloat(h.multiplier),
          winAmount: h.win_amount,
          netResult: h.net_result,
          isJackpot: h.is_jackpot,
          createdAt: h.created_at,
        })),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Spin the jackpot
router.post('/spin', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { betAmount } = req.body;

    // Validate bet
    if (!betAmount || betAmount < JACKPOT_CONFIG.minBet || betAmount > JACKPOT_CONFIG.maxBet) {
      return next(createError(
        `Bet must be between ${JACKPOT_CONFIG.minBet} and ${JACKPOT_CONFIG.maxBet} tokens`,
        400,
        'INVALID_BET'
      ));
    }

    // Check user's token balance
    const balanceResult = await pool.query(
      'SELECT tokens FROM balances WHERE user_id = $1',
      [userId]
    );
    const currentTokens = balanceResult.rows[0]?.tokens || 0;

    if (currentTokens < betAmount) {
      return next(createError('Insufficient tokens', 400, 'INSUFFICIENT_TOKENS'));
    }

    // Deduct bet immediately
    await pool.query(
      'UPDATE balances SET tokens = tokens - $1, updated_at = NOW() WHERE user_id = $2',
      [betAmount, userId]
    );

    // Determine result
    const multiplier = selectMultiplier();
    const winAmount = Math.floor(betAmount * multiplier);
    const netResult = winAmount - betAmount;
    const isJackpot = multiplier >= 10;

    // If player lost, add portion to jackpot pool
    if (netResult < 0) {
      const contribution = Math.floor(Math.abs(netResult) * JACKPOT_CONFIG.jackpotContribution);
      await pool.query(`
        UPDATE jackpot_pool 
        SET pool_tokens = pool_tokens + $1, 
            total_contributed = total_contributed + $1,
            updated_at = NOW()
      `, [contribution]);
    }

    // If jackpot hit, award bonus from pool
    let jackpotBonus = 0;
    if (isJackpot) {
      const poolResult = await pool.query('SELECT pool_tokens FROM jackpot_pool LIMIT 1');
      const poolTokens = poolResult.rows[0]?.pool_tokens || 0;
      
      // Award 50% of the pool as bonus
      jackpotBonus = Math.floor(poolTokens * 0.5);
      
      await pool.query(`
        UPDATE jackpot_pool 
        SET pool_tokens = pool_tokens - $1,
            total_won = total_won + $1,
            last_jackpot_winner_id = $2,
            last_jackpot_won_at = NOW(),
            last_jackpot_amount = $3,
            updated_at = NOW()
      `, [jackpotBonus, userId, winAmount + jackpotBonus]);
    }

    const totalWin = winAmount + jackpotBonus;

    // Award winnings
    if (totalWin > 0) {
      await pool.query(
        'UPDATE balances SET tokens = tokens + $1, updated_at = NOW() WHERE user_id = $2',
        [totalWin, userId]
      );
    }

    // Record spin
    await pool.query(`
      INSERT INTO jackpot_spins (user_id, bet_amount, multiplier, win_amount, net_result, is_jackpot)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, betAmount, multiplier, totalWin, totalWin - betAmount, isJackpot]);

    // Get updated balance
    const newBalanceResult = await pool.query(
      'SELECT tokens FROM balances WHERE user_id = $1',
      [userId]
    );
    const newTokens = newBalanceResult.rows[0]?.tokens || 0;

    // Get updated pool
    const newPoolResult = await pool.query('SELECT pool_tokens FROM jackpot_pool LIMIT 1');
    const newPoolTokens = newPoolResult.rows[0]?.pool_tokens || 0;

    res.json({
      success: true,
      data: {
        betAmount,
        multiplier,
        winAmount: totalWin,
        jackpotBonus: jackpotBonus > 0 ? jackpotBonus : undefined,
        netResult: totalWin - betAmount,
        isJackpot,
        newBalance: newTokens,
        newPoolTokens,
        message: isJackpot 
          ? `🎰 JACKPOT! You hit ${multiplier}x and won ${jackpotBonus} bonus tokens!`
          : multiplier === 0 
            ? 'Better luck next time!'
            : multiplier < 1 
              ? `Got ${multiplier}x - partial return`
              : multiplier === 1 
                ? 'Break even!'
                : `🎉 ${multiplier}x WIN!`,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
