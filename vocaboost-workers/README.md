# VocaBoost Leaderboard Backend

VocaBoost 排行榜後端服務，部署在 Cloudflare Workers 上。

## 技術棧

- **Cloudflare Workers** - 無伺服器運算平台
- **D1 Database** - Cloudflare 的 SQLite 資料庫
- **Hono** - 輕量級 Web 框架
- **TypeScript** - 型別安全

## 功能特色

- 排行榜查詢（支援分頁）
- 使用者排名查詢
- 分數提交/更新
- 管理員介面（刪除作弊者）

## 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 登入 Cloudflare

```bash
npx wrangler login
```

### 3. 建立 D1 資料庫

```bash
npm run db:create
```

執行後，複製輸出的 `database_id` 並更新 `wrangler.toml` 中的 `database_id` 欄位。

### 4. 初始化資料庫結構

```bash
npm run db:init
```

### 5. 設定管理員 Token

```bash
npx wrangler secret put ADMIN_TOKEN
# 輸入你的管理員 token（建議使用強密碼生成器）
```

### 6. 啟動本地開發伺服器

```bash
npm run dev
```

伺服器將在 `http://localhost:8787` 啟動。

## 部署

```bash
npm run deploy
```

## API 文件

### 公開端點

#### GET /api/leaderboard

獲取排行榜列表。

**Query Parameters:**
- `page` (optional): 頁碼，預設為 1
- `limit` (optional): 每頁數量，預設為 20，最大 100

**Response:**
```json
{
  "data": [
    {
      "rank": 1,
      "userId": "user_abc123",
      "username": "學霸小明",
      "score": 9500,
      "wordsLearned": 1200,
      "streakDays": 45
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

#### GET /api/leaderboard/:userId

獲取特定使用者的排名。

**Response:**
```json
{
  "rank": 1,
  "userId": "user_abc123",
  "username": "學霸小明",
  "score": 9500,
  "wordsLearned": 1200,
  "streakDays": 45
}
```

#### POST /api/leaderboard/score

提交或更新使用者分數。

**Request Body:**
```json
{
  "userId": "user_abc123",
  "username": "學霸小明",
  "score": 9500,
  "wordsLearned": 1200,
  "streakDays": 45
}
```

**Response:**
```json
{
  "success": true,
  "rank": 1
}
```

### 管理員端點

需要在 Header 中提供 Bearer Token：
```
Authorization: Bearer YOUR_ADMIN_TOKEN
```

#### GET /admin/users

列出所有使用者。

**Query Parameters:**
- `page` (optional): 頁碼，預設為 1
- `limit` (optional): 每頁數量，預設為 50，最大 100

#### DELETE /admin/users/:userId

刪除特定使用者（用於移除作弊者）。

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

## 環境變數

在 `wrangler.toml` 中配置：

- `CORS_ORIGIN`: 允許的前端來源（預設：`https://vocaboost.pages.dev`）
- `ADMIN_TOKEN`: 管理員認證 token（使用 `wrangler secret put` 設定）

## 資料庫結構

```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  words_learned INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## 測試 API

### 查詢排行榜

```bash
curl https://your-worker.workers.dev/api/leaderboard
```

### 提交分數

```bash
curl -X POST https://your-worker.workers.dev/api/leaderboard/score \
  -H "Content-Type: application/json" \
  -d '{"userId":"test_user","username":"測試用戶","score":1000,"wordsLearned":100,"streakDays":5}'
```

### 管理員刪除使用者

```bash
curl -X DELETE https://your-worker.workers.dev/admin/users/test_user \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## 授權

MIT
