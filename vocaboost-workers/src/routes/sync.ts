import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
}

const sync = new Hono<{ Bindings: Bindings }>()

/**
 * Generate a random 6-character alphanumeric tag
 */
function generateTag(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let tag = ''
  for (let i = 0; i < 6; i++) {
    tag += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return tag
}

/**
 * Get a unique tag that doesn't exist in the database
 */
async function getUniqueTag(db: D1Database): Promise<string> {
  let tag: string
  let exists = true
  let attempts = 0
  const maxAttempts = 10

  while (exists && attempts < maxAttempts) {
    tag = generateTag()
    const result = await db
      .prepare('SELECT 1 FROM user_sync WHERE tag = ?')
      .bind(tag)
      .first()
    exists = result !== null
    attempts++
  }

  if (attempts >= maxAttempts) {
    throw new Error('Failed to generate unique tag')
  }

  return tag!
}

/**
 * POST /api/sync/register
 * Register a new sync account
 */
sync.post('/register', async (c) => {
  try {
    const body = await c.req.json()
    const { username, pinHash, encryptedData, encryptionMeta } = body

    // Validate required fields
    if (!username || !pinHash || !encryptedData || !encryptionMeta) {
      return c.json({ error: 'MISSING_FIELDS', message: 'Username, pinHash, encryptedData, and encryptionMeta are required' }, 400)
    }

    // Validate username length
    if (username.length < 2 || username.length > 20) {
      return c.json({ error: 'INVALID_USERNAME', message: 'Username must be between 2 and 20 characters' }, 400)
    }

    // Check for existing accounts with same username + PIN
    const existing = await c.env.DB.prepare(`
      SELECT tag FROM user_sync WHERE username = ? AND pin_hash = ?
    `).bind(username, pinHash).all()

    // Generate unique tag
    const tag = await getUniqueTag(c.env.DB)

    // Insert new sync record
    await c.env.DB.prepare(`
      INSERT INTO user_sync (username, tag, pin_hash, encrypted_data, encryption_meta, data_version)
      VALUES (?, ?, ?, ?, ?, 1)
    `).bind(username, tag, pinHash, encryptedData, JSON.stringify(encryptionMeta)).run()

    const fullId = `${username}#${tag}`

    // Return with warning if duplicate credentials exist
    if (existing.results && existing.results.length > 0) {
      return c.json({
        success: true,
        tag,
        fullId,
        dataVersion: 1,
        warning: 'DUPLICATE_CREDENTIALS',
        warningMessage: '已有其他帳號使用相同名稱和 PIN，登入時需要輸入完整 ID',
      }, 201)
    }

    return c.json({
      success: true,
      tag,
      fullId,
      dataVersion: 1,
    }, 201)
  } catch (error) {
    console.error('Register error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to register sync account' }, 500)
  }
})

/**
 * POST /api/sync/login
 * Validate credentials and return sync info
 */
sync.post('/login', async (c) => {
  try {
    const body = await c.req.json()
    const { username, tag, pinHash } = body

    if (!username || !tag || !pinHash) {
      return c.json({ error: 'MISSING_FIELDS', message: 'Username, tag, and pinHash are required' }, 400)
    }

    // Fetch user record
    const record = await c.env.DB.prepare(`
      SELECT data_version, updated_at, pin_hash
      FROM user_sync
      WHERE username = ? AND tag = ?
    `).bind(username, tag).first()

    if (!record) {
      return c.json({ error: 'USER_NOT_FOUND', message: 'Invalid username or tag' }, 404)
    }

    // Validate PIN hash
    if (record.pin_hash !== pinHash) {
      return c.json({ error: 'INVALID_PIN', message: 'Invalid PIN' }, 401)
    }

    return c.json({
      success: true,
      dataVersion: record.data_version,
      updatedAt: record.updated_at,
    })
  } catch (error) {
    console.error('Login error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to login' }, 500)
  }
})

/**
 * POST /api/sync/login-simple
 * Simplified login with just username + PIN (no tag required)
 */
sync.post('/login-simple', async (c) => {
  try {
    const body = await c.req.json()
    const { username, pinHash } = body

    if (!username || !pinHash) {
      return c.json({ error: 'MISSING_FIELDS', message: 'Username and pinHash are required' }, 400)
    }

    // Query all records matching username + PIN
    const records = await c.env.DB.prepare(`
      SELECT tag, data_version, updated_at
      FROM user_sync
      WHERE username = ? AND pin_hash = ?
    `).bind(username, pinHash).all()

    if (!records.results || records.results.length === 0) {
      return c.json({ error: 'USER_NOT_FOUND', message: '帳號不存在或 PIN 碼錯誤' }, 404)
    }

    if (records.results.length === 1) {
      // Unique match - auto-login successful
      const record = records.results[0]
      return c.json({
        success: true,
        tag: record.tag,
        fullId: `${username}#${record.tag}`,
        dataVersion: record.data_version,
        updatedAt: record.updated_at,
      })
    }

    // Multiple matches - return list for user to choose
    return c.json({
      error: 'MULTIPLE_ACCOUNTS',
      message: '有多個帳號使用相同的名稱和 PIN，請選擇您的帳號',
      accounts: records.results.map(r => ({
        tag: r.tag,
        fullId: `${username}#${r.tag}`,
        updatedAt: r.updated_at,
      }))
    }, 409)
  } catch (error) {
    console.error('Login-simple error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to login' }, 500)
  }
})

/**
 * POST /api/sync/upload
 * Upload encrypted data (update existing record)
 */
sync.post('/upload', async (c) => {
  try {
    const body = await c.req.json()
    const { username, tag, pinHash, encryptedData, encryptionMeta, expectedVersion } = body

    if (!username || !tag || !pinHash || !encryptedData || !encryptionMeta) {
      return c.json({ error: 'MISSING_FIELDS' }, 400)
    }

    // Fetch current record
    const record = await c.env.DB.prepare(`
      SELECT id, pin_hash, data_version
      FROM user_sync
      WHERE username = ? AND tag = ?
    `).bind(username, tag).first()

    if (!record) {
      return c.json({ error: 'USER_NOT_FOUND' }, 404)
    }

    // Validate PIN
    if (record.pin_hash !== pinHash) {
      return c.json({ error: 'INVALID_PIN' }, 401)
    }

    // Check version conflict (optimistic locking)
    if (expectedVersion !== undefined && record.data_version !== expectedVersion) {
      return c.json({
        error: 'VERSION_CONFLICT',
        serverVersion: record.data_version,
        message: 'Data has been modified on another device',
      }, 409)
    }

    // Update record
    const newVersion = (record.data_version as number) + 1
    await c.env.DB.prepare(`
      UPDATE user_sync
      SET encrypted_data = ?,
          encryption_meta = ?,
          data_version = ?,
          updated_at = datetime('now')
      WHERE username = ? AND tag = ?
    `).bind(encryptedData, JSON.stringify(encryptionMeta), newVersion, username, tag).run()

    return c.json({
      success: true,
      dataVersion: newVersion,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /api/sync/download
 * Download encrypted data
 */
sync.post('/download', async (c) => {
  try {
    const body = await c.req.json()
    const { username, tag, pinHash } = body

    if (!username || !tag || !pinHash) {
      return c.json({ error: 'MISSING_FIELDS' }, 400)
    }

    // Fetch record
    const record = await c.env.DB.prepare(`
      SELECT encrypted_data, encryption_meta, data_version, updated_at, pin_hash
      FROM user_sync
      WHERE username = ? AND tag = ?
    `).bind(username, tag).first()

    if (!record) {
      return c.json({ error: 'USER_NOT_FOUND' }, 404)
    }

    // Validate PIN
    if (record.pin_hash !== pinHash) {
      return c.json({ error: 'INVALID_PIN' }, 401)
    }

    return c.json({
      encryptedData: record.encrypted_data,
      encryptionMeta: JSON.parse(record.encryption_meta as string),
      dataVersion: record.data_version,
      updatedAt: record.updated_at,
    })
  } catch (error) {
    console.error('Download error:', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * POST /api/sync/download-simple
 * Simplified download with just username + PIN (no tag required)
 */
sync.post('/download-simple', async (c) => {
  try {
    const body = await c.req.json()
    const { username, pinHash, tag: selectedTag } = body

    if (!username || !pinHash) {
      return c.json({ error: 'MISSING_FIELDS', message: 'Username and pinHash are required' }, 400)
    }

    // If tag is provided (user selected from multiple accounts), use it directly
    if (selectedTag) {
      const record = await c.env.DB.prepare(`
        SELECT encrypted_data, encryption_meta, data_version, updated_at, pin_hash
        FROM user_sync
        WHERE username = ? AND tag = ? AND pin_hash = ?
      `).bind(username, selectedTag, pinHash).first()

      if (!record) {
        return c.json({ error: 'USER_NOT_FOUND' }, 404)
      }

      return c.json({
        tag: selectedTag,
        encryptedData: record.encrypted_data,
        encryptionMeta: JSON.parse(record.encryption_meta as string),
        dataVersion: record.data_version,
        updatedAt: record.updated_at,
      })
    }

    // Query all records matching username + PIN
    const records = await c.env.DB.prepare(`
      SELECT tag, encrypted_data, encryption_meta, data_version, updated_at
      FROM user_sync
      WHERE username = ? AND pin_hash = ?
    `).bind(username, pinHash).all()

    if (!records.results || records.results.length === 0) {
      return c.json({ error: 'USER_NOT_FOUND', message: '帳號不存在或 PIN 碼錯誤' }, 404)
    }

    if (records.results.length === 1) {
      // Unique match - return data directly
      const record = records.results[0]
      return c.json({
        tag: record.tag,
        encryptedData: record.encrypted_data,
        encryptionMeta: JSON.parse(record.encryption_meta as string),
        dataVersion: record.data_version,
        updatedAt: record.updated_at,
      })
    }

    // Multiple matches - return list for user to choose
    return c.json({
      error: 'MULTIPLE_ACCOUNTS',
      message: '有多個帳號使用相同的名稱和 PIN，請選擇您的帳號',
      accounts: records.results.map(r => ({
        tag: r.tag,
        fullId: `${username}#${r.tag}`,
        updatedAt: r.updated_at,
      }))
    }, 409)
  } catch (error) {
    console.error('Download-simple error:', error)
    return c.json({ error: 'INTERNAL_ERROR', message: 'Failed to download data' }, 500)
  }
})

/**
 * GET /api/sync/check/:tag
 * Check if a tag exists (public, no auth)
 */
sync.get('/check/:tag', async (c) => {
  try {
    const tag = c.req.param('tag')

    if (!tag || tag.length !== 6) {
      return c.json({ error: 'INVALID_TAG' }, 400)
    }

    const record = await c.env.DB.prepare(`
      SELECT updated_at FROM user_sync WHERE tag = ?
    `).bind(tag).first()

    if (record) {
      return c.json({
        exists: true,
        updatedAt: record.updated_at,
      })
    } else {
      return c.json({
        exists: false,
      })
    }
  } catch (error) {
    console.error('Check error:', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/**
 * DELETE /api/sync/delete
 * Delete sync account
 */
sync.delete('/delete', async (c) => {
  try {
    const body = await c.req.json()
    const { username, tag, pinHash } = body

    if (!username || !tag || !pinHash) {
      return c.json({ error: 'MISSING_FIELDS' }, 400)
    }

    // Fetch record
    const record = await c.env.DB.prepare(`
      SELECT pin_hash FROM user_sync WHERE username = ? AND tag = ?
    `).bind(username, tag).first()

    if (!record) {
      return c.json({ error: 'USER_NOT_FOUND' }, 404)
    }

    // Validate PIN
    if (record.pin_hash !== pinHash) {
      return c.json({ error: 'INVALID_PIN' }, 401)
    }

    // Delete record
    await c.env.DB.prepare(`
      DELETE FROM user_sync WHERE username = ? AND tag = ?
    `).bind(username, tag).run()

    return c.json({
      success: true,
      message: 'Sync account deleted',
    })
  } catch (error) {
    console.error('Delete error:', error)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

export default sync
