import { Request, Response, NextFunction } from 'express';
import pool from '../db';

// Get client IP
function getClientIP(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket.remoteAddress || '';
}

// Log all API requests for audit trail
export const auditLogger = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  // Capture response
  const originalSend = res.send;
  let responseBody: any;
  
  res.send = function(body) {
    responseBody = body;
    return originalSend.call(this, body);
  };

  res.on('finish', async () => {
    // Skip logging for health checks and static assets
    if (req.path === '/health' || req.path.startsWith('/static')) {
      return;
    }

    const duration = Date.now() - startTime;
    const userId = (req as any).userId || null;
    
    // Parse response for status
    let responseStatus = 'success';
    try {
      const parsed = typeof responseBody === 'string' ? JSON.parse(responseBody) : responseBody;
      if (parsed && parsed.success === false) {
        responseStatus = 'error';
      }
    } catch {}

    // Don't log sensitive data
    const sanitizedBody = { ...req.body };
    if (sanitizedBody.password) sanitizedBody.password = '[REDACTED]';
    if (sanitizedBody.newPassword) sanitizedBody.newPassword = '[REDACTED]';
    if (sanitizedBody.giftCardCode) sanitizedBody.giftCardCode = '[REDACTED]';

    try {
      await pool.query(`
        INSERT INTO audit_logs (
          method, path, ip_address, user_id, 
          user_agent, request_body, response_status, 
          status_code, duration_ms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [
        req.method,
        req.path,
        getClientIP(req),
        userId,
        req.headers['user-agent'] || null,
        Object.keys(sanitizedBody).length > 0 ? JSON.stringify(sanitizedBody) : null,
        responseStatus,
        res.statusCode,
        duration
      ]);
    } catch (err) {
      // Don't fail the request if logging fails
      console.error('Audit log failed:', err);
    }
  });

  next();
};

// Get recent audit logs (for admin)
export async function getAuditLogs(options: {
  userId?: string;
  path?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { userId, path, limit = 100, offset = 0 } = options;
  
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;

  if (userId) {
    query += ` AND user_id = $${paramIndex++}`;
    params.push(userId);
  }
  if (path) {
    query += ` AND path LIKE $${paramIndex++}`;
    params.push(`%${path}%`);
  }

  query += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
  params.push(limit, offset);

  const result = await pool.query(query, params);
  return result.rows;
}

// Get suspicious activity summary
export async function getSuspiciousActivity(): Promise<any[]> {
  const result = await pool.query(`
    SELECT 
      ip_address,
      COUNT(*) as request_count,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
      MAX(created_at) as last_seen
    FROM audit_logs
    WHERE created_at > NOW() - INTERVAL '24 hours'
    GROUP BY ip_address
    HAVING COUNT(*) > 100 OR COUNT(DISTINCT user_id) > 3
    ORDER BY request_count DESC
    LIMIT 50
  `);
  return result.rows;
}
