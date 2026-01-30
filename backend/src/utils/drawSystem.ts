/**
 * Giveaway Draw System
 * Handles weighted random selection of winners and prize distribution
 */

import pool from '../db';
import { Resend } from 'resend';

// Lazy initialize Resend for winner notifications
let resend: Resend | null = null;
const getResend = () => {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

// Giveaway definitions (must match mobile/src/data/gamification.ts)
export interface GiveawayConfig {
  id: string;
  name: string;
  prizeType: 'credits' | 'gift_card';
  prizeValue: number;  // Credits amount or gift card $ value
  prizeDescription: string;
  frequency: 'weekly' | 'monthly';
}

export const GIVEAWAY_CONFIGS: Record<string, GiveawayConfig> = {
  'monthly_giveaway': {
    id: 'monthly_giveaway',
    name: 'Monthly Gift Card Giveaway',
    prizeType: 'gift_card',
    prizeValue: 50,  // $50 gift card
    prizeDescription: '$50 Gift Card',
    frequency: 'monthly',
  },
  'weekly_bonus': {
    id: 'weekly_bonus',
    name: 'Weekly Credit Drop',
    prizeType: 'credits',
    prizeValue: 500,  // 500 bonus credits
    prizeDescription: '500 Bonus Credits',
    frequency: 'weekly',
  },
};

export interface DrawEntry {
  userId: string;
  email: string;
  totalEntries: number;  // free + bonus + paid
  freeEntries: number;
  bonusEntries: number;
  paidEntries: number;
}

export interface DrawResult {
  success: boolean;
  giveawayId: string;
  giveawayName: string;
  drawId?: string;
  winner?: {
    userId: string;
    email: string;
    totalEntries: number;
  };
  totalParticipants: number;
  totalEntries: number;
  prizeType: 'credits' | 'gift_card';
  prizeValue: number;
  prizeDescription: string;
  prizeDelivered: boolean;
  error?: string;
}

/**
 * Get all entries for a giveaway with weighted totals
 */
export const getGiveawayEntries = async (giveawayId: string): Promise<DrawEntry[]> => {
  const result = await pool.query(`
    SELECT 
      ge.user_id,
      u.email,
      ge.entry_type,
      ge.entries_count
    FROM giveaway_entries ge
    JOIN users u ON u.id = ge.user_id
    WHERE ge.giveaway_id = $1
      AND u.is_banned = FALSE
    ORDER BY ge.user_id
  `, [giveawayId]);

  // Aggregate entries by user
  const entriesMap: Map<string, DrawEntry> = new Map();

  for (const row of result.rows) {
    const existing = entriesMap.get(row.user_id) || {
      userId: row.user_id,
      email: row.email,
      totalEntries: 0,
      freeEntries: 0,
      bonusEntries: 0,
      paidEntries: 0,
    };

    const count = row.entries_count || 1;

    if (row.entry_type === 'free') {
      existing.freeEntries = count;
    } else if (row.entry_type === 'bonus') {
      existing.bonusEntries = count;
    } else if (row.entry_type === 'paid') {
      existing.paidEntries = count;
    }

    existing.totalEntries = existing.freeEntries + existing.bonusEntries + existing.paidEntries;
    entriesMap.set(row.user_id, existing);
  }

  return Array.from(entriesMap.values());
};

/**
 * Weighted random selection - more entries = higher chance
 */
export const selectWinner = (entries: DrawEntry[]): DrawEntry | null => {
  if (entries.length === 0) return null;

  // Calculate total tickets
  const totalTickets = entries.reduce((sum, e) => sum + e.totalEntries, 0);
  
  // Pick a random ticket number
  const winningTicket = Math.floor(Math.random() * totalTickets);
  
  // Find the winner
  let ticketCount = 0;
  for (const entry of entries) {
    ticketCount += entry.totalEntries;
    if (winningTicket < ticketCount) {
      return entry;
    }
  }

  // Fallback (shouldn't happen)
  return entries[0];
};

/**
 * Award credits to a user
 */
export const awardCredits = async (userId: string, amount: number, reason: string): Promise<boolean> => {
  try {
    await pool.query(`
      UPDATE balances 
      SET credits_balance = credits_balance + $1,
          lifetime_earned = lifetime_earned + $1,
          updated_at = NOW()
      WHERE user_id = $2
    `, [amount, userId]);

    // Log the event
    await pool.query(`
      INSERT INTO earn_events (user_id, event_type, credits_amount, metadata)
      VALUES ($1, 'giveaway_win', $2, $3)
    `, [userId, amount, JSON.stringify({ reason })]);

    return true;
  } catch (error) {
    console.error('Failed to award credits:', error);
    return false;
  }
};

/**
 * Create a pending gift card redemption for winner
 */
export const createGiftCardRedemption = async (
  userId: string, 
  giveawayName: string,
  value: number
): Promise<string | null> => {
  try {
    // Get user's email for delivery
    const userResult = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    const email = userResult.rows[0]?.email;

    // Create a pending redemption
    const result = await pool.query(`
      INSERT INTO redemptions (user_id, credits_spent, status, delivery_email, metadata)
      VALUES ($1, 0, 'pending', $2, $3)
      RETURNING id
    `, [userId, email, JSON.stringify({ 
      source: 'giveaway_win',
      giveawayName,
      giftCardValue: value,
    })]);

    return result.rows[0]?.id || null;
  } catch (error) {
    console.error('Failed to create gift card redemption:', error);
    return null;
  }
};

/**
 * Send winner notification email
 */
export const sendWinnerNotification = async (
  email: string,
  giveawayName: string,
  prizeDescription: string,
  prizeType: 'credits' | 'gift_card'
): Promise<boolean> => {
  try {
    const resendClient = getResend();
    if (!resendClient) {
      console.log('📧 Winner notification skipped - Resend not configured');
      return false;
    }

    const isGiftCard = prizeType === 'gift_card';
    const prizeDeliveryInfo = isGiftCard 
      ? 'Your gift card will be delivered to this email within 24-48 hours.'
      : 'The bonus credits have been added to your account!';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f5f5f5;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10B981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
              <div style="font-size: 60px; margin-bottom: 10px;">🎉🏆🎉</div>
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
                Congratulations!
              </h1>
              <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">
                You're a Winner!
              </p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 22px;">
                You won the ${giveawayName}!
              </h2>
              
              <div style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                <p style="color: #166534; margin: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                  Your Prize
                </p>
                <p style="color: #15803d; margin: 10px 0 0 0; font-size: 32px; font-weight: bold;">
                  ${prizeDescription}
                </p>
              </div>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                ${prizeDeliveryInfo}
              </p>
              
              <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
                Thank you for being an active member of the EarnLoop community. Keep earning and entering for more chances to win!
              </p>
              
              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #9ca3af; font-size: 14px; margin: 0;">
                  Open the EarnLoop app to see your updated balance
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                © ${new Date().getFullYear()} EarnLoop. All rights reserved.
              </p>
              <p style="color: #9ca3af; font-size: 12px; margin: 10px 0 0 0;">
                You received this email because you won a giveaway on EarnLoop.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    await resendClient.emails.send({
      from: 'EarnLoop <noreply@earnloop.app>',
      to: email,
      subject: `🎉 You Won the ${giveawayName}!`,
      html: htmlContent,
    });

    console.log(`📧 Winner notification sent to ${email}`);
    return true;
  } catch (error) {
    console.error('Failed to send winner notification:', error);
    return false;
  }
};

/**
 * Run a giveaway draw
 */
export const runDraw = async (giveawayId: string): Promise<DrawResult> => {
  const config = GIVEAWAY_CONFIGS[giveawayId];
  
  if (!config) {
    return {
      success: false,
      giveawayId,
      giveawayName: 'Unknown',
      totalParticipants: 0,
      totalEntries: 0,
      prizeType: 'credits',
      prizeValue: 0,
      prizeDescription: '',
      prizeDelivered: false,
      error: `Unknown giveaway ID: ${giveawayId}`,
    };
  }

  try {
    // Get all entries
    const entries = await getGiveawayEntries(giveawayId);
    const totalParticipants = entries.length;
    const totalEntries = entries.reduce((sum, e) => sum + e.totalEntries, 0);

    if (totalParticipants === 0) {
      return {
        success: false,
        giveawayId,
        giveawayName: config.name,
        totalParticipants: 0,
        totalEntries: 0,
        prizeType: config.prizeType,
        prizeValue: config.prizeValue,
        prizeDescription: config.prizeDescription,
        prizeDelivered: false,
        error: 'No participants in this giveaway',
      };
    }

    // Select winner
    const winner = selectWinner(entries);
    if (!winner) {
      return {
        success: false,
        giveawayId,
        giveawayName: config.name,
        totalParticipants,
        totalEntries,
        prizeType: config.prizeType,
        prizeValue: config.prizeValue,
        prizeDescription: config.prizeDescription,
        prizeDelivered: false,
        error: 'Failed to select winner',
      };
    }

    // Deliver prize
    let prizeDelivered = false;
    let redemptionId: string | null = null;

    if (config.prizeType === 'credits') {
      prizeDelivered = await awardCredits(winner.userId, config.prizeValue, `Won ${config.name}`);
    } else if (config.prizeType === 'gift_card') {
      redemptionId = await createGiftCardRedemption(winner.userId, config.name, config.prizeValue);
      prizeDelivered = redemptionId !== null;
    }

    // Record the draw
    const drawResult = await pool.query(`
      INSERT INTO giveaway_draws (
        giveaway_id, 
        winner_user_id, 
        total_participants, 
        total_entries,
        prize_type,
        prize_value,
        prize_delivered,
        redemption_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
    `, [
      giveawayId,
      winner.userId,
      totalParticipants,
      totalEntries,
      config.prizeType,
      config.prizeValue,
      prizeDelivered,
      redemptionId,
    ]);

    const drawId = drawResult.rows[0]?.id;

    // Clear entries for next period (archive them first if needed)
    await pool.query(`
      INSERT INTO giveaway_entries_archive (user_id, giveaway_id, entry_type, entries_count, draw_id, created_at)
      SELECT user_id, giveaway_id, entry_type, entries_count, $1, created_at
      FROM giveaway_entries
      WHERE giveaway_id = $2
    `, [drawId, giveawayId]);

    await pool.query(`
      DELETE FROM giveaway_entries WHERE giveaway_id = $1
    `, [giveawayId]);

    // Log admin action
    await pool.query(`
      INSERT INTO admin_logs (action, metadata)
      VALUES ('giveaway_draw', $1)
    `, [JSON.stringify({
      giveawayId,
      giveawayName: config.name,
      winnerId: winner.userId,
      winnerEmail: winner.email,
      totalParticipants,
      totalEntries,
      prizeType: config.prizeType,
      prizeValue: config.prizeValue,
      drawId,
    })]);

    // Send winner notification email
    await sendWinnerNotification(winner.email, config.name, config.prizeDescription, config.prizeType);

    return {
      success: true,
      giveawayId,
      giveawayName: config.name,
      drawId,
      winner: {
        userId: winner.userId,
        email: winner.email,
        totalEntries: winner.totalEntries,
      },
      totalParticipants,
      totalEntries,
      prizeType: config.prizeType,
      prizeValue: config.prizeValue,
      prizeDescription: config.prizeDescription,
      prizeDelivered,
    };
  } catch (error) {
    console.error('Draw failed:', error);
    return {
      success: false,
      giveawayId,
      giveawayName: config.name,
      totalParticipants: 0,
      totalEntries: 0,
      prizeType: config.prizeType,
      prizeValue: config.prizeValue,
      prizeDescription: config.prizeDescription,
      prizeDelivered: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};

/**
 * Get past draw results
 */
export const getDrawHistory = async (limit = 20): Promise<any[]> => {
  const result = await pool.query(`
    SELECT 
      d.id,
      d.giveaway_id,
      d.winner_user_id,
      u.email as winner_email,
      d.total_participants,
      d.total_entries,
      d.prize_type,
      d.prize_value,
      d.prize_delivered,
      d.created_at
    FROM giveaway_draws d
    LEFT JOIN users u ON u.id = d.winner_user_id
    ORDER BY d.created_at DESC
    LIMIT $1
  `, [limit]);

  return result.rows.map(row => ({
    id: row.id,
    giveawayId: row.giveaway_id,
    giveawayName: GIVEAWAY_CONFIGS[row.giveaway_id]?.name || row.giveaway_id,
    winner: {
      userId: row.winner_user_id,
      email: row.winner_email,
    },
    totalParticipants: row.total_participants,
    totalEntries: row.total_entries,
    prizeType: row.prize_type,
    prizeValue: row.prize_value,
    prizeDelivered: row.prize_delivered,
    drawnAt: row.created_at,
  }));
};

/**
 * Get giveaway stats (for admin dashboard)
 */
export const getGiveawayStats = async (giveawayId: string): Promise<{
  totalParticipants: number;
  totalEntries: number;
  topEntrants: Array<{ email: string; entries: number }>;
}> => {
  const entries = await getGiveawayEntries(giveawayId);
  
  const sorted = entries.sort((a, b) => b.totalEntries - a.totalEntries);
  const topEntrants = sorted.slice(0, 10).map(e => ({
    email: e.email,
    entries: e.totalEntries,
  }));

  return {
    totalParticipants: entries.length,
    totalEntries: entries.reduce((sum, e) => sum + e.totalEntries, 0),
    topEntrants,
  };
};

/**
 * Check if it's time to run scheduled draws
 */
export const checkScheduledDraws = async (): Promise<void> => {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const dayOfMonth = now.getDate();
  const hour = now.getHours();
  const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // Weekly draw: Sunday at 11 PM (23:00)
  if (dayOfWeek === 0 && hour === 23) {
    const lastWeeklyDraw = await pool.query(`
      SELECT created_at FROM giveaway_draws 
      WHERE giveaway_id = 'weekly_bonus' 
      ORDER BY created_at DESC LIMIT 1
    `);
    
    const lastDraw = lastWeeklyDraw.rows[0]?.created_at;
    const hoursSinceLastDraw = lastDraw 
      ? (now.getTime() - new Date(lastDraw).getTime()) / (1000 * 60 * 60)
      : Infinity;

    // Only run if it's been at least 6 days since last draw
    if (hoursSinceLastDraw > 144) {
      console.log('🎰 Running scheduled weekly draw...');
      const result = await runDraw('weekly_bonus');
      console.log('Weekly draw result:', result);
    }
  }

  // Monthly draw: Last day of month at 11 PM (23:00)
  if (dayOfMonth === lastDayOfMonth && hour === 23) {
    const lastMonthlyDraw = await pool.query(`
      SELECT created_at FROM giveaway_draws 
      WHERE giveaway_id = 'monthly_giveaway' 
      ORDER BY created_at DESC LIMIT 1
    `);
    
    const lastDraw = lastMonthlyDraw.rows[0]?.created_at;
    const daysSinceLastDraw = lastDraw 
      ? (now.getTime() - new Date(lastDraw).getTime()) / (1000 * 60 * 60 * 24)
      : Infinity;

    // Only run if it's been at least 25 days since last draw
    if (daysSinceLastDraw > 25) {
      console.log('🎰 Running scheduled monthly draw...');
      const result = await runDraw('monthly_giveaway');
      console.log('Monthly draw result:', result);
    }
  }
};
