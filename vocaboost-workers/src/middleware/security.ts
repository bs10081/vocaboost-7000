import type { Context } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

// Configuration
const RATE_LIMIT_WINDOW = 60 // 1 minute in seconds
const RATE_LIMIT_MAX_REQUESTS = 10 // Max 10 requests per minute per IP
const LOCK_THRESHOLD = 5 // Lock after 5 failed attempts
const LOCK_DURATION = 15 * 60 // 15 minutes in seconds

/**
 * Get client IP address from request
 */
function getClientIP(c: Context): string {
  // Try Cloudflare headers first
  const cfIP = c.req.header('CF-Connecting-IP')
  if (cfIP) return cfIP

  // Fallback to X-Forwarded-For
  const forwarded = c.req.header('X-Forwarded-For')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  // Last resort
  return c.req.header('X-Real-IP') || 'unknown'
}

/**
 * Check if IP is rate limited
 * Returns true if rate limit exceeded
 */
export async function checkRateLimit(c: Context, db: D1Database): Promise<boolean> {
  const ip = getClientIP(c)
  const now = Math.floor(Date.now() / 1000) // Unix timestamp in seconds

  // Clean up expired records first (optional optimization)
  await db.prepare(`
    DELETE FROM rate_limits WHERE expires_at < ?
  `).bind(now).run()

  // Get current rate limit record
  const record = await db.prepare(`
    SELECT request_count, window_start FROM rate_limits WHERE ip = ?
  `).bind(ip).first()

  if (!record) {
    // First request from this IP - create new record
    await db.prepare(`
      INSERT INTO rate_limits (ip, request_count, window_start, expires_at)
      VALUES (?, 1, ?, ?)
    `).bind(ip, now, now + RATE_LIMIT_WINDOW).run()
    return false
  }

  const windowStart = record.window_start as number
  const requestCount = record.request_count as number

  // Check if we're still in the same time window
  if (now - windowStart < RATE_LIMIT_WINDOW) {
    // Same window - check if limit exceeded
    if (requestCount >= RATE_LIMIT_MAX_REQUESTS) {
      return true // Rate limit exceeded
    }

    // Increment counter
    await db.prepare(`
      UPDATE rate_limits SET request_count = request_count + 1 WHERE ip = ?
    `).bind(ip).run()
    return false
  } else {
    // New window - reset counter
    await db.prepare(`
      UPDATE rate_limits
      SET request_count = 1, window_start = ?, expires_at = ?
      WHERE ip = ?
    `).bind(now, now + RATE_LIMIT_WINDOW, ip).run()
    return false
  }
}

/**
 * Check if account is locked
 * Returns error message if locked, null if not locked
 */
export async function checkAccountLock(
  db: D1Database,
  username: string,
  tag: string
): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000)

  const record = await db.prepare(`
    SELECT failed_attempts, locked_until FROM account_locks
    WHERE username = ? AND tag = ?
  `).bind(username, tag).first()

  if (!record) {
    return null // No lock record
  }

  const lockedUntil = record.locked_until as number | null

  if (lockedUntil && lockedUntil > now) {
    const remainingMinutes = Math.ceil((lockedUntil - now) / 60)
    return `帳號已被鎖定，請在 ${remainingMinutes} 分鐘後再試`
  }

  return null
}

/**
 * Record a failed login attempt
 * Locks account if threshold is reached
 */
export async function recordFailedAttempt(
  db: D1Database,
  username: string,
  tag: string
): Promise<void> {
  const now = Math.floor(Date.now() / 1000)

  const record = await db.prepare(`
    SELECT failed_attempts, locked_until FROM account_locks
    WHERE username = ? AND tag = ?
  `).bind(username, tag).first()

  if (!record) {
    // First failed attempt - create record
    await db.prepare(`
      INSERT INTO account_locks (username, tag, failed_attempts, last_attempt)
      VALUES (?, ?, 1, ?)
    `).bind(username, tag, now).run()
    return
  }

  const failedAttempts = (record.failed_attempts as number) + 1
  const lockedUntil = record.locked_until as number | null

  // Check if already locked
  if (lockedUntil && lockedUntil > now) {
    // Still locked, just update last_attempt
    await db.prepare(`
      UPDATE account_locks
      SET last_attempt = ?
      WHERE username = ? AND tag = ?
    `).bind(now, username, tag).run()
    return
  }

  // Check if we should lock the account
  if (failedAttempts >= LOCK_THRESHOLD) {
    const lockUntil = now + LOCK_DURATION
    await db.prepare(`
      UPDATE account_locks
      SET failed_attempts = ?, locked_until = ?, last_attempt = ?
      WHERE username = ? AND tag = ?
    `).bind(failedAttempts, lockUntil, now, username, tag).run()
  } else {
    // Just increment failed attempts
    await db.prepare(`
      UPDATE account_locks
      SET failed_attempts = ?, last_attempt = ?
      WHERE username = ? AND tag = ?
    `).bind(failedAttempts, now, username, tag).run()
  }
}

/**
 * Reset failed attempts on successful login
 */
export async function resetFailedAttempts(
  db: D1Database,
  username: string,
  tag: string
): Promise<void> {
  await db.prepare(`
    DELETE FROM account_locks WHERE username = ? AND tag = ?
  `).bind(username, tag).run()
}
