import { Router, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';
import { GIVEAWAY_CONFIGS } from '../utils/drawSystem';

const router = Router();

router.use(authenticate);

const ENTRY_COST = 50; // Credits per additional entry
const MAX_BONUS_ENTRIES = 5; // Max bonus entries per giveaway
const BONUS_COOLDOWN_HOURS = 12; // Hours between bonus entries
// No limit on paid entries - users can buy as many as they want with credits

// Get user's entries for all giveaways
router.get('/entries', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
      SELECT giveaway_id, entry_type, entries_count, created_at, updated_at
      FROM giveaway_entries
      WHERE user_id = $1
    `, [userId]);

    // Group entries by giveaway
    const entriesByGiveaway: Record<string, { 
      free: boolean; 
      bonus: number; 
      paid: number;
      lastBonusAt: string | null;
      nextBonusAvailable: string | null;
      bonusCooldownRemaining: number | null;
    }> = {};
    
    const now = new Date();
    
    result.rows.forEach(row => {
      if (!entriesByGiveaway[row.giveaway_id]) {
        entriesByGiveaway[row.giveaway_id] = { 
          free: false, 
          bonus: 0, 
          paid: 0,
          lastBonusAt: null,
          nextBonusAvailable: null,
          bonusCooldownRemaining: null,
        };
      }
      
      if (row.entry_type === 'free') {
        entriesByGiveaway[row.giveaway_id].free = true;
      } else if (row.entry_type === 'bonus') {
        entriesByGiveaway[row.giveaway_id].bonus = row.entries_count;
        
        // Calculate cooldown for bonus entries
        if (row.updated_at) {
          const lastBonusDate = new Date(row.updated_at);
          const cooldownEnd = new Date(lastBonusDate.getTime() + BONUS_COOLDOWN_HOURS * 60 * 60 * 1000);
          
          entriesByGiveaway[row.giveaway_id].lastBonusAt = row.updated_at;
          entriesByGiveaway[row.giveaway_id].nextBonusAvailable = cooldownEnd.toISOString();
          
          if (now < cooldownEnd) {
            entriesByGiveaway[row.giveaway_id].bonusCooldownRemaining = cooldownEnd.getTime() - now.getTime();
          } else {
            entriesByGiveaway[row.giveaway_id].bonusCooldownRemaining = 0;
          }
        }
      } else if (row.entry_type === 'paid') {
        entriesByGiveaway[row.giveaway_id].paid = row.entries_count;
      }
    });

    res.json({
      success: true,
      data: { 
        entries: entriesByGiveaway,
        cooldownHours: BONUS_COOLDOWN_HOURS,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Claim free entry (no purchase necessary - iOS compliant)
router.post('/claim-free', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { giveawayId } = req.body;

    if (!giveawayId) {
      return next(createError('Giveaway ID required', 400, 'MISSING_GIVEAWAY_ID'));
    }

    // Check if already claimed
    const existing = await pool.query(
      `SELECT id FROM giveaway_entries WHERE user_id = $1 AND giveaway_id = $2 AND entry_type = 'free'`,
      [userId, giveawayId]
    );

    if (existing.rows.length > 0) {
      return next(createError('Free entry already claimed', 400, 'ALREADY_CLAIMED'));
    }

    // Add free entry
    await pool.query(`
      INSERT INTO giveaway_entries (user_id, giveaway_id, entry_type, entries_count)
      VALUES ($1, $2, 'free', 1)
    `, [userId, giveawayId]);

    res.json({
      success: true,
      data: { 
        message: 'Free entry claimed!',
        giveawayId,
        entryType: 'free',
      },
    });
  } catch (error) {
    next(error);
  }
});

// Buy extra entry with credits
router.post('/buy-entry', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { giveawayId } = req.body;

    if (!giveawayId) {
      return next(createError('Giveaway ID required', 400, 'MISSING_GIVEAWAY_ID'));
    }

    // Check if user has claimed free entry first
    const freeEntry = await pool.query(
      `SELECT id FROM giveaway_entries WHERE user_id = $1 AND giveaway_id = $2 AND entry_type = 'free'`,
      [userId, giveawayId]
    );

    if (freeEntry.rows.length === 0) {
      return next(createError('Claim free entry first', 400, 'NO_FREE_ENTRY'));
    }

    // Check current paid entries
    const paidResult = await pool.query(
      `SELECT entries_count FROM giveaway_entries WHERE user_id = $1 AND giveaway_id = $2 AND entry_type = 'paid'`,
      [userId, giveawayId]
    );
    const currentPaid = paidResult.rows[0]?.entries_count || 0;

    // No limit on paid entries - users can spend as many credits as they want

    // Check balance
    const balanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [userId]
    );
    const balance = balanceResult.rows[0]?.credits_balance || 0;

    if (balance < ENTRY_COST) {
      return next(createError(`Need ${ENTRY_COST} credits. You have ${balance}`, 400, 'INSUFFICIENT_CREDITS'));
    }

    // Deduct credits
    await pool.query(`
      UPDATE balances 
      SET credits_balance = credits_balance - $1, 
          lifetime_spent = lifetime_spent + $1,
          updated_at = NOW()
      WHERE user_id = $2
    `, [ENTRY_COST, userId]);

    // Add or update paid entry
    await pool.query(`
      INSERT INTO giveaway_entries (user_id, giveaway_id, entry_type, entries_count)
      VALUES ($1, $2, 'paid', 1)
      ON CONFLICT (user_id, giveaway_id, entry_type)
      DO UPDATE SET entries_count = giveaway_entries.entries_count + 1
    `, [userId, giveawayId]);

    // Get new balance
    const newBalanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: { 
        message: 'Extra entry purchased!',
        giveawayId,
        entriesBought: currentPaid + 1,
        creditsSpent: ENTRY_COST,
        newBalance: newBalanceResult.rows[0].credits_balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Earn bonus entry through engagement
router.post('/earn-bonus', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { giveawayId, engagementType } = req.body;

    if (!giveawayId) {
      return next(createError('Giveaway ID required', 400, 'MISSING_GIVEAWAY_ID'));
    }

    // Check if user has claimed free entry first
    const freeEntry = await pool.query(
      `SELECT id FROM giveaway_entries WHERE user_id = $1 AND giveaway_id = $2 AND entry_type = 'free'`,
      [userId, giveawayId]
    );

    if (freeEntry.rows.length === 0) {
      return next(createError('Claim free entry first', 400, 'NO_FREE_ENTRY'));
    }

    // Check current bonus entries and last bonus time
    const bonusResult = await pool.query(
      `SELECT entries_count, updated_at FROM giveaway_entries 
       WHERE user_id = $1 AND giveaway_id = $2 AND entry_type = 'bonus'`,
      [userId, giveawayId]
    );
    const currentBonus = bonusResult.rows[0]?.entries_count || 0;
    const lastBonusTime = bonusResult.rows[0]?.updated_at;

    if (currentBonus >= MAX_BONUS_ENTRIES) {
      return next(createError('Maximum bonus entries earned', 400, 'MAX_BONUS_ENTRIES'));
    }

    // Check cooldown (12 hours between bonus entries)
    if (lastBonusTime) {
      const lastBonusDate = new Date(lastBonusTime);
      const cooldownEnd = new Date(lastBonusDate.getTime() + BONUS_COOLDOWN_HOURS * 60 * 60 * 1000);
      const now = new Date();
      
      if (now < cooldownEnd) {
        const remainingMs = cooldownEnd.getTime() - now.getTime();
        const remainingHours = Math.ceil(remainingMs / (1000 * 60 * 60));
        const remainingMins = Math.ceil((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return res.status(400).json({
          success: false,
          error: {
            message: `Next bonus entry available in ${remainingHours > 0 ? remainingHours + 'h ' : ''}${remainingMins}m`,
            code: 'BONUS_COOLDOWN',
          },
          data: {
            cooldownEndsAt: cooldownEnd.toISOString(),
            remainingMs,
          },
        });
      }
    }

    // Add or update bonus entry
    await pool.query(`
      INSERT INTO giveaway_entries (user_id, giveaway_id, entry_type, entries_count, updated_at)
      VALUES ($1, $2, 'bonus', 1, NOW())
      ON CONFLICT (user_id, giveaway_id, entry_type)
      DO UPDATE SET entries_count = giveaway_entries.entries_count + 1, updated_at = NOW()
    `, [userId, giveawayId]);

    // Calculate next cooldown time
    const nextCooldownEnd = new Date(Date.now() + BONUS_COOLDOWN_HOURS * 60 * 60 * 1000);

    res.json({
      success: true,
      data: { 
        message: 'Bonus entry earned!',
        giveawayId,
        bonusEntries: currentBonus + 1,
        engagementType,
        nextBonusAvailable: nextCooldownEnd.toISOString(),
        cooldownHours: BONUS_COOLDOWN_HOURS,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get recent winners (public, for display in app)
router.get('/winners', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    
    const result = await pool.query(`
      SELECT 
        d.giveaway_id,
        d.prize_type,
        d.prize_value,
        d.created_at,
        CONCAT(
          SUBSTRING(u.email FROM 1 FOR 3), 
          '***', 
          SUBSTRING(u.email FROM POSITION('@' IN u.email))
        ) as winner_email_masked
      FROM giveaway_draws d
      JOIN users u ON u.id = d.winner_user_id
      WHERE d.prize_delivered = TRUE
      ORDER BY d.created_at DESC
      LIMIT $1
    `, [limit]);

    const winners = result.rows.map(row => ({
      giveawayId: row.giveaway_id,
      giveawayName: GIVEAWAY_CONFIGS[row.giveaway_id]?.name || row.giveaway_id,
      prizeType: row.prize_type,
      prizeValue: row.prize_value,
      prizeDescription: row.prize_type === 'credits' 
        ? `${row.prize_value} Bonus Credits`
        : `$${row.prize_value} Gift Card`,
      winnerEmail: row.winner_email_masked,
      wonAt: row.created_at,
    }));

    res.json({ success: true, data: { winners } });
  } catch (error) {
    next(error);
  }
});

// Check if current user has won any giveaways
router.get('/my-wins', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
      SELECT 
        d.id,
        d.giveaway_id,
        d.prize_type,
        d.prize_value,
        d.prize_delivered,
        d.created_at
      FROM giveaway_draws d
      WHERE d.winner_user_id = $1
      ORDER BY d.created_at DESC
    `, [userId]);

    const wins = result.rows.map(row => ({
      id: row.id,
      giveawayId: row.giveaway_id,
      giveawayName: GIVEAWAY_CONFIGS[row.giveaway_id]?.name || row.giveaway_id,
      prizeType: row.prize_type,
      prizeValue: row.prize_value,
      prizeDescription: row.prize_type === 'credits' 
        ? `${row.prize_value} Bonus Credits`
        : `$${row.prize_value} Gift Card`,
      delivered: row.prize_delivered,
      wonAt: row.created_at,
    }));

    res.json({ 
      success: true, 
      data: { 
        wins,
        totalWins: wins.length,
      } 
    });
  } catch (error) {
    next(error);
  }
});

// Get current giveaway info (entry counts, time remaining, etc.)
router.get('/current', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const giveaways = [];

    for (const [id, config] of Object.entries(GIVEAWAY_CONFIGS)) {
      // Get total participants and entries for this giveaway
      const statsResult = await pool.query(`
        SELECT 
          COUNT(DISTINCT user_id) as participants,
          SUM(entries_count) as total_entries
        FROM giveaway_entries
        WHERE giveaway_id = $1
      `, [id]);

      const stats = statsResult.rows[0];

      // Get user's entries
      const userResult = await pool.query(`
        SELECT entry_type, entries_count
        FROM giveaway_entries
        WHERE user_id = $1 AND giveaway_id = $2
      `, [userId, id]);

      const userEntries = {
        free: 0,
        bonus: 0,
        paid: 0,
        total: 0,
      };

      for (const row of userResult.rows) {
        if (row.entry_type === 'free') userEntries.free = row.entries_count || 1;
        else if (row.entry_type === 'bonus') userEntries.bonus = row.entries_count;
        else if (row.entry_type === 'paid') userEntries.paid = row.entries_count;
      }
      userEntries.total = userEntries.free + userEntries.bonus + userEntries.paid;

      // Calculate end date
      const now = new Date();
      let endsAt: Date;
      
      if (config.frequency === 'weekly') {
        // Next Sunday at 11 PM
        const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
        endsAt = new Date(now);
        endsAt.setDate(now.getDate() + daysUntilSunday);
        endsAt.setHours(23, 0, 0, 0);
      } else {
        // Last day of month at 11 PM
        endsAt = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endsAt.setHours(23, 0, 0, 0);
      }

      giveaways.push({
        id,
        name: config.name,
        prizeType: config.prizeType,
        prizeValue: config.prizeValue,
        prizeDescription: config.prizeDescription,
        frequency: config.frequency,
        totalParticipants: parseInt(stats.participants) || 0,
        totalEntries: parseInt(stats.total_entries) || 0,
        endsAt: endsAt.toISOString(),
        userEntries,
      });
    }

    res.json({ success: true, data: { giveaways } });
  } catch (error) {
    next(error);
  }
});

export default router;
