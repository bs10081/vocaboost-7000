import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
  ADMIN_TOKEN: string
}

const admin = new Hono<{ Bindings: Bindings }>()

// Bearer Token 驗證中間件
admin.use('*', async (c, next) => {
  const token = c.env.ADMIN_TOKEN
  if (!token) {
    return c.json({ error: 'Admin authentication not configured' }, 500)
  }

  const auth = bearerAuth({ token })
  return auth(c, next)
})

// GET /admin/users - 列出所有使用者
admin.get('/users', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '50'), 100)
  const offset = (page - 1) * limit

  try {
    // 查詢所有使用者
    const { results } = await c.env.DB.prepare(
      `SELECT
        id,
        user_id as userId,
        username,
        score,
        words_learned as wordsLearned,
        streak_days as streakDays,
        created_at as createdAt,
        updated_at as updatedAt
      FROM leaderboard
      ORDER BY score DESC, words_learned DESC
      LIMIT ? OFFSET ?`
    )
      .bind(limit, offset)
      .all()

    // 查詢總數
    const { results: countResult } = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM leaderboard'
    ).all()

    const total = (countResult[0] as any)?.total || 0

    return c.json({
      data: results,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

// DELETE /admin/users/:userId - 刪除使用者（作弊者）
admin.delete('/users/:userId', async (c) => {
  const userId = c.req.param('userId')

  try {
    // 檢查使用者是否存在
    const { results } = await c.env.DB.prepare(
      'SELECT user_id FROM leaderboard WHERE user_id = ?'
    )
      .bind(userId)
      .all()

    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    // 刪除使用者
    await c.env.DB.prepare('DELETE FROM leaderboard WHERE user_id = ?')
      .bind(userId)
      .run()

    return c.json({
      success: true,
      message: 'User deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return c.json({ error: 'Failed to delete user' }, 500)
  }
})

export default admin
