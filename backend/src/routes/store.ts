import { Router, Response, NextFunction } from 'express';
import pool from '../db';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

const router = Router();

router.use(authenticate);

// Get all store items grouped by category
router.get('/items', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    // Get items with user's redemption count
    const result = await pool.query(`
      SELECT 
        si.*,
        COALESCE(
          (SELECT COUNT(*) FROM redemptions r WHERE r.item_id = si.id AND r.user_id = $1), 0
        ) as user_redemptions,
        COALESCE(
          (SELECT quantity FROM user_inventory ui WHERE ui.item_id = si.id AND ui.user_id = $1), 0
        ) as owned_quantity
      FROM store_items si
      WHERE si.is_active = true
      ORDER BY si.category, si.sort_order ASC
    `, [userId]);

    // Get user's balance
    const balanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [userId]
    );
    const balance = balanceResult.rows[0]?.credits_balance || 0;

    // Group items by category
    const itemsByCategory: Record<string, any[]> = {};
    
    result.rows.forEach(item => {
      const category = item.category || 'general';
      if (!itemsByCategory[category]) {
        itemsByCategory[category] = [];
      }
      
      itemsByCategory[category].push({
        id: item.id,
        name: item.name,
        description: item.description,
        creditsCost: item.credits_cost,
        itemType: item.item_type,
        category: item.category,
        durationDays: item.duration_days,
        maxPerUser: item.max_per_user,
        icon: item.icon || '🎁',
        userRedemptions: parseInt(item.user_redemptions),
        ownedQuantity: parseInt(item.owned_quantity),
        canAfford: balance >= item.credits_cost,
        canRedeem: item.max_per_user === null || parseInt(item.user_redemptions) < item.max_per_user,
      });
    });

    // Category display info - only categories with working items
    const categories = [
      { id: 'giftcards', name: 'Gift Cards', icon: '🎁', description: 'Redeem for real gift cards!' },
      { id: 'powerups', name: 'Power-ups', icon: '⚡', description: 'Boost your earnings!' },
    ];

    res.json({
      success: true,
      data: {
        categories,
        itemsByCategory,
        balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Redeem an item
router.post('/redeem', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;
    const { itemId, email } = req.body;

    if (!itemId) {
      return next(createError('Item ID required', 400, 'MISSING_ITEM_ID'));
    }

    // Get item details
    const itemResult = await pool.query(
      'SELECT * FROM store_items WHERE id = $1 AND is_active = true',
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return next(createError('Item not found', 404, 'ITEM_NOT_FOUND'));
    }

    const item = itemResult.rows[0];

    // Gift cards require email
    if (item.item_type === 'giftcard') {
      if (!email) {
        return next(createError('Email required for gift card redemption', 400, 'EMAIL_REQUIRED'));
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(createError('Invalid email address', 400, 'INVALID_EMAIL'));
      }
    }

    // Get user's balance
    const balanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [userId]
    );
    const balance = balanceResult.rows[0]?.credits_balance || 0;

    // Check if user can afford
    if (balance < item.credits_cost) {
      return next(createError('Insufficient credits', 400, 'INSUFFICIENT_CREDITS'));
    }

    // Check max per user limit
    if (item.max_per_user !== null) {
      const redemptionCount = await pool.query(
        'SELECT COUNT(*) as count FROM redemptions WHERE item_id = $1 AND user_id = $2',
        [itemId, userId]
      );
      if (parseInt(redemptionCount.rows[0].count) >= item.max_per_user) {
        return next(createError('Maximum redemptions reached for this item', 400, 'MAX_REDEMPTIONS'));
      }
    }

    // Calculate expiry if applicable
    let expiresAt = null;
    if (item.duration_days) {
      expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + item.duration_days);
    }

    // Create redemption record (with email for gift cards)
    await pool.query(
      `INSERT INTO redemptions (user_id, item_id, credits_spent, expires_at, delivery_email, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, itemId, item.credits_cost, expiresAt, email || null, item.item_type === 'giftcard' ? 'pending' : 'completed']
    );

    // Deduct credits
    await pool.query(
      `UPDATE balances 
       SET credits_balance = credits_balance - $1, 
           lifetime_spent = lifetime_spent + $1,
           updated_at = NOW()
       WHERE user_id = $2`,
      [item.credits_cost, userId]
    );

    // Handle special item types
    let specialMessage = '';
    
    switch (item.item_type) {
      case 'giftcard':
        // Gift card request - will be fulfilled manually or via API integration
        specialMessage = `Gift card request received! Your ${item.name} code will be sent to ${email} within 24-48 hours.`;
        // TODO: Send notification email to admin or integrate with gift card API
        console.log(`🎁 GIFT CARD REQUEST: ${item.name} for user ${userId}, deliver to: ${email}`);
        break;
        
      case 'consumable':
        // Add to inventory (streak savers, etc.)
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity)
          VALUES ($1, $2, $3, 1)
          ON CONFLICT (user_id, item_id) 
          DO UPDATE SET quantity = user_inventory.quantity + 1
        `, [userId, itemId, item.item_type]);
        
        // If it's a streak saver, also update the streaks table
        if (item.name.toLowerCase().includes('streak saver') || item.name.toLowerCase().includes('streak freeze')) {
          await pool.query(`
            UPDATE streaks 
            SET streak_savers = streak_savers + 1
            WHERE user_id = $1
          `, [userId]);
          specialMessage = 'Streak Saver added! It will automatically protect your streak if you miss a day.';
        }
        break;
        
      case 'boost':
        // Activate XP boost immediately
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity, is_active, activated_at, expires_at)
          VALUES ($1, $2, $3, 1, true, NOW(), $4)
          ON CONFLICT (user_id, item_id) 
          DO UPDATE SET 
            is_active = true, 
            activated_at = NOW(), 
            expires_at = $4
        `, [userId, itemId, item.item_type, expiresAt]);
        specialMessage = `2x XP Boost activated! Expires ${item.duration_days === 1 ? 'in 24 hours' : `in ${item.duration_days} days`}.`;
        break;
        
      case 'giveaway':
        // Add bonus giveaway entry to the active giveaway
        // Find the most recent/active giveaway and add an entry
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity, is_active)
          VALUES ($1, $2, $3, 1, true)
          ON CONFLICT (user_id, item_id) 
          DO UPDATE SET quantity = user_inventory.quantity + 1
        `, [userId, itemId, item.item_type]);
        
        // Also add a bonus entry to any active giveaway with ID 'current'
        await pool.query(`
          INSERT INTO giveaway_entries (user_id, giveaway_id, entry_type, entries_count)
          VALUES ($1, 'current', 'paid', 1)
          ON CONFLICT (user_id, giveaway_id, entry_type)
          DO UPDATE SET entries_count = giveaway_entries.entries_count + 1
        `, [userId]);
        
        specialMessage = 'Bonus giveaway entry added! Check the Giveaways tab to see your entries.';
        break;
        
      case 'feature':
        // Unlock a feature for a duration
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity, is_active, activated_at, expires_at)
          VALUES ($1, $2, $3, 1, true, NOW(), $4)
          ON CONFLICT (user_id, item_id) 
          DO UPDATE SET 
            is_active = true, 
            activated_at = NOW(), 
            expires_at = $4
        `, [userId, itemId, item.item_type, expiresAt]);
        specialMessage = `${item.name} activated! You'll get early access to upcoming giveaways.`;
        break;
        
      case 'subscription':
        // VIP/Pro membership
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity, is_active, activated_at, expires_at)
          VALUES ($1, $2, $3, 1, true, NOW(), $4)
          ON CONFLICT (user_id, item_id) 
          DO UPDATE SET 
            is_active = true, 
            activated_at = NOW(), 
            expires_at = $4
        `, [userId, itemId, item.item_type, expiresAt]);
        specialMessage = `Welcome to Pro! You now have access to all premium features for ${item.duration_days} days.`;
        break;
        
      case 'cosmetic':
      case 'badge':
      case 'content':
        // Add to inventory as permanent unlock
        await pool.query(`
          INSERT INTO user_inventory (user_id, item_id, item_type, quantity, is_active)
          VALUES ($1, $2, $3, 1, true)
          ON CONFLICT (user_id, item_id) DO NOTHING
        `, [userId, itemId, item.item_type]);
        specialMessage = `${item.name} unlocked! Check your profile to see it.`;
        break;
    }

    // Get updated balance
    const newBalanceResult = await pool.query(
      'SELECT credits_balance FROM balances WHERE user_id = $1',
      [userId]
    );

    res.json({
      success: true,
      data: {
        message: specialMessage || `Successfully redeemed ${item.name}!`,
        item: {
          id: item.id,
          name: item.name,
          itemType: item.item_type,
          icon: item.icon,
          expiresAt,
        },
        creditsSpent: item.credits_cost,
        newBalance: newBalanceResult.rows[0].credits_balance,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user's inventory (owned items and active boosts)
router.get('/inventory', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
      SELECT 
        ui.*,
        si.name,
        si.description,
        si.icon,
        si.category
      FROM user_inventory ui
      JOIN store_items si ON ui.item_id = si.id
      WHERE ui.user_id = $1
      ORDER BY ui.created_at DESC
    `, [userId]);

    // Get streak savers count
    const streakResult = await pool.query(
      'SELECT streak_savers FROM streaks WHERE user_id = $1',
      [userId]
    );
    const streakSavers = streakResult.rows[0]?.streak_savers || 0;

    // Check for active XP boost
    const activeBoost = result.rows.find(
      r => r.item_type === 'boost' && r.is_active && (!r.expires_at || new Date(r.expires_at) > new Date())
    );

    const inventory = result.rows.map(r => ({
      id: r.id,
      itemId: r.item_id,
      name: r.name,
      description: r.description,
      icon: r.icon,
      category: r.category,
      itemType: r.item_type,
      quantity: r.quantity,
      isActive: r.is_active,
      expiresAt: r.expires_at,
      activatedAt: r.activated_at,
    }));

    res.json({
      success: true,
      data: {
        inventory,
        streakSavers,
        activeXpBoost: activeBoost ? {
          name: activeBoost.name,
          expiresAt: activeBoost.expires_at,
          multiplier: 2,
        } : null,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user's redemption history
router.get('/history', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.credits_spent,
        r.status,
        r.expires_at,
        r.created_at,
        si.name,
        si.item_type,
        si.icon,
        si.description
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 50
    `, [userId]);

    const history = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      itemType: r.item_type,
      description: r.description,
      creditsSpent: r.credits_spent,
      status: r.status,
      expiresAt: r.expires_at,
      redeemedAt: r.created_at,
      isActive: r.expires_at === null || new Date(r.expires_at) > new Date(),
    }));

    res.json({
      success: true,
      data: { history },
    });
  } catch (error) {
    next(error);
  }
});

// Legacy endpoint for backwards compatibility
router.get('/my-rewards', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const result = await pool.query(`
      SELECT 
        r.id,
        r.credits_spent,
        r.status,
        r.expires_at,
        r.created_at,
        si.name,
        si.item_type,
        si.description
      FROM redemptions r
      JOIN store_items si ON r.item_id = si.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    const rewards = result.rows.map(r => ({
      id: r.id,
      name: r.name,
      itemType: r.item_type,
      description: r.description,
      creditsSpent: r.credits_spent,
      status: r.status,
      expiresAt: r.expires_at,
      redeemedAt: r.created_at,
      isActive: r.expires_at === null || new Date(r.expires_at) > new Date(),
    }));

    res.json({
      success: true,
      data: { rewards },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
