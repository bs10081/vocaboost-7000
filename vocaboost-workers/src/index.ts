import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { D1Database } from '@cloudflare/workers-types'
import leaderboard from './routes/leaderboard'
import admin from './routes/admin'
import sync from './routes/sync'

type Bindings = {
  DB: D1Database
  ADMIN_TOKEN: string
  CORS_ORIGIN: string
}

const app = new Hono<{ Bindings: Bindings }>()

// CORS 中間件
app.use('*', async (c, next) => {
  const corsOrigin = c.env.CORS_ORIGIN || 'https://vocaboost.pages.dev'
  const requestOrigin = c.req.header('Origin') || ''

  // 允許配置的來源 + 所有 localhost
  const allowedOrigins = [corsOrigin]
  if (requestOrigin.startsWith('http://localhost:') || requestOrigin.startsWith('http://127.0.0.1:')) {
    allowedOrigins.push(requestOrigin)
  }

  return cors({
    origin: allowedOrigins,
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    maxAge: 600,
  })(c, next)
})

// 健康檢查端點
app.get('/', (c) => {
  return c.json({
    service: 'VocaBoost Leaderboard API',
    version: '1.0.0',
    status: 'healthy',
  })
})

// 註冊路由
app.route('/api/leaderboard', leaderboard)
app.route('/api/sync', sync)
app.route('/admin', admin)

// 404 處理
app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404)
})

// 錯誤處理
app.onError((err, c) => {
  console.error('Unhandled error:', err)
  return c.json({ error: 'Internal server error' }, 500)
})

export default app
