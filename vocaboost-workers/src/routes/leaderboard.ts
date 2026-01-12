import { Hono } from 'hono'
import type { D1Database } from '@cloudflare/workers-types'

type Bindings = {
  DB: D1Database
}

const leaderboard = new Hono<{ Bindings: Bindings }>()

// GET /api/leaderboard - 獲取排行榜（支援分頁）
leaderboard.get('/', async (c) => {
  const page = parseInt(c.req.query('page') || '1')
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100)
  const offset = (page - 1) * limit

  try {
    // 查詢排行榜資料
    const { results } = await c.env.DB.prepare(
      `SELECT
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

    // 添加排名
    const data = results.map((item, index) => ({
      rank: offset + index + 1,
      ...item,
    }))

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Error fetching leaderboard:', error)
    return c.json({ error: 'Failed to fetch leaderboard' }, 500)
  }
})

// GET /api/leaderboard/:userId - 獲取特定使用者排名
leaderboard.get('/:userId', async (c) => {
  const userId = c.req.param('userId')

  try {
    // 查詢使用者資料
    const { results } = await c.env.DB.prepare(
      `SELECT
        user_id as userId,
        username,
        score,
        words_learned as wordsLearned,
        streak_days as streakDays,
        created_at as createdAt,
        updated_at as updatedAt
      FROM leaderboard
      WHERE user_id = ?`
    )
      .bind(userId)
      .all()

    if (results.length === 0) {
      return c.json({ error: 'User not found' }, 404)
    }

    const user = results[0]

    // 計算排名（比該使用者分數高的人數 + 1）
    const { results: rankResult } = await c.env.DB.prepare(
      `SELECT COUNT(*) + 1 as rank
      FROM leaderboard
      WHERE score > ? OR (score = ? AND words_learned > ?)`
    )
      .bind((user as any).score, (user as any).score, (user as any).wordsLearned)
      .all()

    const rank = (rankResult[0] as any)?.rank || 1

    return c.json({
      rank,
      ...user,
    })
  } catch (error) {
    console.error('Error fetching user rank:', error)
    return c.json({ error: 'Failed to fetch user rank' }, 500)
  }
})

// POST /api/score - 提交/更新分數
leaderboard.post('/score', async (c) => {
  try {
    const body = await c.req.json()
    const { userId, username, score, wordsLearned, streakDays } = body

    // 驗證必要欄位
    if (!userId || !username || score === undefined) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    // 使用 INSERT OR REPLACE 更新分數
    await c.env.DB.prepare(
      `INSERT INTO leaderboard (user_id, username, score, words_learned, streak_days, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        username = excluded.username,
        score = excluded.score,
        words_learned = excluded.words_learned,
        streak_days = excluded.streak_days,
        updated_at = datetime('now')`
    )
      .bind(userId, username, score || 0, wordsLearned || 0, streakDays || 0)
      .run()

    // 查詢更新後的排名
    const { results: rankResult } = await c.env.DB.prepare(
      `SELECT COUNT(*) + 1 as rank
      FROM leaderboard
      WHERE score > ? OR (score = ? AND words_learned > ?)`
    )
      .bind(score, score, wordsLearned || 0)
      .all()

    const rank = (rankResult[0] as any)?.rank || 1

    return c.json({
      success: true,
      rank,
    })
  } catch (error) {
    console.error('Error updating score:', error)
    return c.json({ error: 'Failed to update score' }, 500)
  }
})

export default leaderboard
