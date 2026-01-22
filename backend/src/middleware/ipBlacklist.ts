import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// In-memory cache for blacklisted IPs (refresh every 5 minutes)
let blacklistedIPs: Set<string> = new Set();
let lastRefresh = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Refresh blacklist from database
async function refreshBlacklist(): Promise<void> {
  try {
    const result = await pool.query(`
      SELECT DISTINCT ip_address FROM ip_blacklist 
      WHERE expires_at IS NULL OR expires_at > NOW()
    `);
    blacklistedIPs = new Set(result.rows.map(r => r.ip_address));
    lastRefresh = Date.now();
    console.log(`IP blacklist refreshed: ${blacklistedIPs.size} IPs blocked`);
  } catch (err) {
    console.error('Failed to refresh IP blacklist:', err);
  }
}

// Get client IP (handles proxies)
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}

// Middleware to block blacklisted IPs
export const ipBlacklistMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Refresh cache if expired
  if (Date.now() - lastRefresh > CACHE_TTL) {
    await refreshBlacklist();
  }

  const clientIP = getClientIP(req);
  
  if (blacklistedIPs.has(clientIP)) {
    console.log(`Blocked request from blacklisted IP: ${clientIP}`);
    return res.status(403).json({
      success: false,
      error: {
        message: 'Access denied',
        code: 'IP_BLOCKED'
      }
    });
  }

  next();
};

// Add IP to blacklist
export async function addToBlacklist(
  ip: string, 
  reason: string, 
  userId?: string,
  expiresInHours?: number
): Promise<void> {
  const expiresAt = expiresInHours 
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null;

  await pool.query(`
    INSERT INTO ip_blacklist (ip_address, reason, user_id, expires_at)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (ip_address) DO UPDATE SET
      reason = EXCLUDED.reason,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
  `, [ip, reason, userId, expiresAt]);

  // Immediately add to cache
  blacklistedIPs.add(ip);
}

// Remove IP from blacklist
export async function removeFromBlacklist(ip: string): Promise<void> {
  await pool.query('DELETE FROM ip_blacklist WHERE ip_address = $1', [ip]);
  blacklistedIPs.delete(ip);
}

// Get all blacklisted IPs
export async function getBlacklist(): Promise<any[]> {
  const result = await pool.query(`
    SELECT ip_address, reason, user_id, created_at, expires_at 
    FROM ip_blacklist 
    WHERE expires_at IS NULL OR expires_at > NOW()
    ORDER BY created_at DESC
  `);
  return result.rows;
}
