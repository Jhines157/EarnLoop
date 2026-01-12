import pool from '../db';

export interface FraudCheckResult {
  allowed: boolean;
  reason?: string;
  riskScore: number;
}

// List of known VPN/datacenter IP ranges (sample - use a real database in production)
const DATACENTER_RANGES = [
  '104.16.', '172.64.', '141.101.', // Cloudflare
  '54.', '52.', '35.', '34.', // AWS ranges (simplified)
];

export class FraudDetector {
  // Check if IP is from a datacenter/VPN
  static isDatacenterIP(ip: string): boolean {
    if (!ip) return false;
    return DATACENTER_RANGES.some(range => ip.startsWith(range));
  }

  // Count accounts per device
  static async getAccountsPerDevice(deviceFingerprint: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as count 
       FROM devices WHERE device_fingerprint = $1`,
      [deviceFingerprint]
    );
    return parseInt(result.rows[0].count);
  }

  // Check earn velocity (suspicious if too fast)
  static async getRecentEarnCount(userId: string, minutes: number = 5): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM earn_events 
       WHERE user_id = $1 AND created_at > NOW() - INTERVAL '${minutes} minutes'`,
      [userId]
    );
    return parseInt(result.rows[0].count);
  }

  // Get device risk score
  static async getDeviceRiskScore(deviceId: string): Promise<number> {
    const result = await pool.query(
      'SELECT risk_score FROM devices WHERE id = $1',
      [deviceId]
    );
    return result.rows[0]?.risk_score || 0;
  }

  // Increment device risk score
  static async incrementRiskScore(deviceId: string, amount: number): Promise<void> {
    await pool.query(
      'UPDATE devices SET risk_score = risk_score + $1 WHERE id = $2',
      [amount, deviceId]
    );
  }

  // Log fraud flag
  static async logFraudFlag(
    userId: string,
    deviceId: string | null,
    flagType: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    reason: string,
    metadata?: object
  ): Promise<void> {
    await pool.query(
      `INSERT INTO fraud_flags (user_id, device_id, flag_type, severity, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, deviceId, flagType, severity, reason, metadata ? JSON.stringify(metadata) : null]
    );
  }

  // Comprehensive fraud check before allowing earn action
  static async checkEarnEligibility(
    userId: string,
    deviceId: string | null,
    ip: string
  ): Promise<FraudCheckResult> {
    let riskScore = 0;
    
    // Check datacenter IP
    if (this.isDatacenterIP(ip)) {
      riskScore += 30;
      await this.logFraudFlag(
        userId, deviceId, 'datacenter_ip', 'medium',
        'Earn attempt from datacenter/VPN IP', { ip }
      );
    }

    // Check device risk score
    if (deviceId) {
      const deviceRisk = await this.getDeviceRiskScore(deviceId);
      riskScore += deviceRisk;

      if (deviceRisk >= 50) {
        return {
          allowed: false,
          reason: 'Device flagged for suspicious activity',
          riskScore,
        };
      }
    }

    // Check earn velocity
    const recentEarns = await this.getRecentEarnCount(userId, 5);
    if (recentEarns >= 10) {
      riskScore += 20;
      await this.logFraudFlag(
        userId, deviceId, 'velocity_abuse', 'high',
        'Too many earn events in short time', { recentEarns }
      );
      
      // Increment device risk
      if (deviceId) {
        await this.incrementRiskScore(deviceId, 10);
      }

      return {
        allowed: false,
        reason: 'Too many requests. Please try again later.',
        riskScore,
      };
    }

    // Check if user is banned
    const userResult = await pool.query(
      'SELECT is_banned FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows[0]?.is_banned) {
      return {
        allowed: false,
        reason: 'Account suspended',
        riskScore: 100,
      };
    }

    return {
      allowed: true,
      riskScore,
    };
  }
}

export default FraudDetector;
