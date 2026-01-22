# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 專案概述

教育部 7000 單字學習輔助工具，使用 Textual 框架實作的終端 TUI 應用程式。支援 SM-2 間隔重複演算法進行科學化學習，包含雙向測驗、進度追蹤、收藏管理等功能。

## 核心架構

### 資料流架構
```
PDF 解析 (pdf_parser.py)
    ↓
SQLite 資料庫 (database.py)
    ↓
SM-2 演算法 (srs_algorithm.py) ←→ 測驗引擎 (quiz_engine.py)
    ↓
TUI 介面 (tui/app.py + screens/)
```

### 關鍵模組職責

- **database.py**: 所有資料庫操作的單一入口，包含單字查詢、學習進度追蹤、統計計算
- **srs_algorithm.py**: SM-2 演算法實作，計算複習間隔和難度因子
- **quiz_engine.py**: 測驗邏輯的中央協調器，整合 database 和 SM-2，處理評分並更新進度
- **tui/app.py**: Textual 應用程式主體，管理畫面切換
- **tui/screens/**: 各功能畫面（home, study, stats, favorites）

### 資料庫設計特點

- **vocabulary 表**: 單字主表，`(word, part_of_speech, level)` 組合唯一
- **learning_progress 表**: 一對一關聯單字，儲存 SM-2 參數（ease_factor, interval_days, next_review）
- **study_sessions 表**: 按日期記錄學習統計，用於計算連續天數和進度

## 常用指令

### 環境設置
```bash
# 啟用虛擬環境
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 安裝相依套件
pip install -r requirements.txt
```

### 資料庫管理
```bash
# 初始化資料庫（首次使用）
# 需要先將「教育部7000單字(Level1-7).pdf」放在專案根目錄
python3 init_database.py

# 資料庫遷移（升級現有資料庫結構）
python3 migrate_database.py

# 測試資料庫連接
python3 test_database.py
```

### 執行應用程式
```bash
# 啟動 TUI 應用程式
python3 main.py
```

### 開發測試
```bash
# 測試個別模組
python3 src/database.py          # 測試資料庫功能
python3 src/srs_algorithm.py     # 測試 SM-2 演算法
python3 src/quiz_engine.py       # 測試測驗引擎
```

## 開發注意事項

### SM-2 評分系統
評分 0-5 對應不同的複習策略：
- **0-2**: 重置間隔為 1 天
- **3**: 首次複習 1 天，後續使用難度因子
- **4**: 首次複習 3 天
- **5**: 快速跳過，直接設為 30 天（適用於已會的單字）

### 資料庫操作模式
- 所有 CRUD 操作都透過 `VocabularyDatabase` 類別
- `quiz_engine.py` 不直接操作 SQL，全部委派給 `database.py`
- 評分更新時同時記錄 `learning_progress` 和 `study_sessions` 兩張表

### TUI 開發規範
- 使用 Textual 框架，畫面繼承自 `Screen` 類別
- 畫面切換透過 `self.app.push_screen()` 或 `self.app.pop_screen()`
- Widget 元件放在 `tui/widgets/` 目錄

### 連續天數計算邏輯
`_calculate_streak()` 方法檢查 study_sessions 表，從今天往回追溯，遇到斷層即停止累計。

## 資料來源

單字資料來自「教育部7000單字(Level1-7).pdf」，使用 pdfplumber 解析提取。PDF 格式預期：
- 每行包含：單字、音標、詞性、中文翻譯、級別
- 使用 `pdf_parser.py` 的正規表達式模式匹配

---

## VocaBoost Web (PWA)

React 19 前端 PWA 應用，提供現代化的學習體驗。

### 技術棧
- **React 19** + TypeScript + Vite
- **Tailwind CSS** + shadcn/ui - 現代化 UI 框架
- **Zustand** - 輕量級狀態管理
- **localStorage** - 本地數據持久化
- **PWA** - 漸進式 Web 應用，支援離線使用

### 專案結構
```
vocaboost-web/
├── src/
│   ├── components/    # UI 組件（Card, Button, Badge 等）
│   ├── hooks/         # 自定義 Hooks (useVocabulary, useKeyboard, useTTS)
│   ├── lib/           # 工具函數 (storage, sm2, utils)
│   ├── pages/         # 頁面組件 (HomePage, StudyPage, StatsPage, LeaderboardPage)
│   ├── stores/        # Zustand stores (studyStore)
│   ├── services/      # API 服務層 (leaderboardApi)
│   └── types/         # TypeScript 類型定義
├── public/            # 靜態資源（vocabulary.json, PWA icons）
└── index.html
```

### 核心功能
- **SM-2 演算法**: 與 Python 版本相同的間隔重複學習演算法
- **多種學習模式**:
  - 複習模式 (review): 復習到期單字
  - 新單字模式 (new): 學習未學過的單字
  - 收藏模式 (favorite): 專注練習收藏的單字
- **級別篩選**: 可指定學習 Level 1-7 任一級別
- **翻牌學習**: 點擊翻面，會/不會按鈕判斷
- **統計追蹤**: 連續天數、學習進度、答對率
- **TTS 語音**: 優先使用 Free Dictionary API 真人發音，失敗時 fallback 到 Web Speech API
- **跨設備同步**: 使用零知識加密（PBKDF2 + AES-256-GCM）同步學習進度

### 常用指令
```bash
cd vocaboost-web
npm install           # 安裝依賴
npm run dev           # 開發模式 (localhost:5173)
npm run build         # 生產構建
npm run preview       # 預覽構建結果
```

### 部署
- **平台**: Cloudflare Pages
- **生產 URL**: https://vocaboost.pages.dev
- **自動部署**: Git push 自動觸發構建

### 資料儲存設計
使用 localStorage 儲存學習進度：
- `vocaboost_progress`: 每個單字的學習進度（ease_factor, interval_days, next_review）
- `vocaboost_sessions`: 每日學習統計
- `vocaboost_settings`: 用戶設定
- `vocaboost_user_id`: 用戶 UUID（用於排行榜）
- `vocaboost_username`: 用戶暱稱（用於排行榜）
- `vocaboost_sync_code`: 跨設備同步碼（加密存儲）
- `vocaboost_sync_pin`: 同步 PIN 碼（PBKDF2 派生加密金鑰）

### 瀏覽器兼容性
專案已針對 Chrome, Safari, Firefox 進行測試和修復：

#### CSS 3D Transform 修復 (Firefox)
Firefox 對 `backface-visibility` 的實作存在 Bug 1201471，需要明確設定初始 transform：

```css
.flip-card-front,
.flip-card-back {
  -webkit-backface-visibility: hidden; /* Safari */
  backface-visibility: hidden;
  /* Firefox 修復：添加初始 transform 讓 backface-visibility 生效 */
  transform: rotateY(0deg);
}
```

#### TTS 實作策略
採用漸進式增強策略，優先使用高品質真人發音：

1. **首選**: Free Dictionary API (`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)
   - 提供真人發音音頻
   - 需要網路連接
   - 載入時顯示旋轉動畫

2. **Fallback**: Web Speech API
   - 離線可用
   - 跨瀏覽器支援
   - Firefox 語音品質較差，但可作為備案

實作位置：`src/hooks/useTTS.ts`

### 同步功能架構
採用零知識加密設計，伺服器無法解密用戶數據：

1. **加密流程**:
   - 使用者輸入 6 位數 PIN 碼
   - PBKDF2 派生加密金鑰 (100,000 次迭代)
   - AES-256-GCM 加密學習數據
   - 上傳加密數據到 Workers KV

2. **衝突解決**: Pull-Merge-Push 策略
   - 下載遠端加密數據
   - 解密並合併本地數據（取較新的 `updated_at`）
   - 重新加密並上傳

3. **安全機制**:
   - PIN 碼錯誤超過 5 次鎖定帳戶 15 分鐘
   - 速率限制：每 IP 每分鐘最多 10 次請求
   - 自動同步：學習完成後觸發

實作位置：`src/hooks/useSync.ts`, `src/lib/crypto.ts`

---

## VocaBoost Workers (排行榜後端)

Cloudflare Workers 無伺服器後端，提供全球排行榜功能。

### 技術棧
- **Cloudflare Workers** - 邊緣運算，全球低延遲
- **D1 Database** - Cloudflare 的 SQLite 資料庫
- **Hono** - 輕量級 Web 框架
- **Bearer Token 認證** - 管理員端點保護

### 專案結構
```
vocaboost-workers/
├── src/
│   ├── index.ts          # Hono 主入口，CORS 和路由註冊
│   ├── routes/
│   │   ├── leaderboard.ts # 排行榜 API（公開）
│   │   └── admin.ts       # 管理員 API（需認證）
│   └── db/
│       └── schema.sql     # D1 資料庫結構
├── wrangler.toml          # Workers 配置
├── package.json
└── tsconfig.json
```

### API 端點

#### 公開端點
- `GET /api/leaderboard?page=1&limit=20` - 獲取排行榜列表（分頁）
- `GET /api/leaderboard/:userId` - 獲取特定使用者排名
- `POST /api/leaderboard/score` - 提交/更新分數

#### 同步端點
- `POST /api/sync/upload` - 上傳加密的學習數據
- `GET /api/sync/download/:syncCode` - 下載加密的學習數據
- `POST /api/sync/verify-pin` - 驗證 PIN 碼（用於帳戶鎖定檢查）

#### 管理員端點（需 Bearer Token）
- `GET /admin/users` - 列出所有使用者
- `DELETE /admin/users/:userId` - 刪除使用者（作弊者）

### 常用指令
```bash
cd vocaboost-workers
npm install                          # 安裝依賴
npm run dev                          # 本地開發 (localhost:8787)
npm run deploy                       # 部署到 Cloudflare
npx wrangler d1 execute ...          # 執行資料庫指令
npx wrangler secret put ADMIN_TOKEN  # 設定管理員 token
```

### 部署資訊
- **Worker URL**: https://vocaboost-leaderboard.bs10081.workers.dev
- **D1 Database ID**: f0f810b4-381a-41ed-9f83-293082727d0a
- **Region**: APAC (Tokyo NRT)

### 資料庫結構
```sql
CREATE TABLE leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,        -- UUID
  username TEXT NOT NULL,              -- 使用者暱稱
  score INTEGER NOT NULL DEFAULT 0,    -- 總分數
  words_learned INTEGER NOT NULL DEFAULT 0,  -- 已學單字數
  streak_days INTEGER NOT NULL DEFAULT 0,    -- 連續天數
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE sync_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_code TEXT NOT NULL UNIQUE,      -- 同步碼（唯一識別碼）
  encrypted_data TEXT NOT NULL,        -- 加密的學習數據
  failed_attempts INTEGER DEFAULT 0,   -- PIN 錯誤次數
  locked_until TEXT,                   -- 鎖定到期時間
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

### 排行規則
- 主要排序：`score` (總分數) 降序
- 次要排序：`words_learned` (已學單字數) 降序

---

## 重要技術細節與修復

### Firefox 翻牌卡片顯示問題
**問題**: Firefox 上卡片翻面時背面文字顯示為上下顛倒
**原因**: Firefox Bug 1201471 - `backface-visibility: hidden` 在某些情況下不生效
**解決方案**: 在 `index.css` 中為 `.flip-card-front` 和 `.flip-card-back` 添加明確的初始 `transform: rotateY(0deg)`

相關檔案: `vocaboost-web/src/index.css:78-96`

### TTS 跨瀏覽器一致性
**問題**: Web Speech API 在 Firefox 上語音品質差，且各瀏覽器實作不一致
**解決方案**: 採用漸進式增強策略

1. 優先使用 Free Dictionary API 獲取真人發音音頻
2. 失敗時 fallback 到 Web Speech API（離線支援）
3. 添加 `isLoading` 狀態，顯示旋轉動畫提升 UX

相關檔案:
- `vocaboost-web/src/hooks/useTTS.ts` - TTS Hook 實作
- `vocaboost-web/src/components/study/TTSButton.tsx` - 載入動畫

### 按鈕 UI 改進
為了提升操作便利性，在學習頁面添加了翻面按鈕（↻），位於「上一題」和「會/不會」之間。所有操作按鈕現在使用統一的 `Button` 組件，確保視覺一致性。

相關檔案:
- `vocaboost-web/src/components/study/AnswerButtons.tsx:28-40`
- `vocaboost-web/src/pages/StudyPage.tsx:158-166`

### 鍵盤快捷鍵
- **Space (空格)**: 翻牌
- **G**: 發音 (TTS)
- **Left Arrow (←)**: 不會
- **Right Arrow (→)**: 會
- **Up Arrow (↑)**: 上一題

實作位置: `vocaboost-web/src/hooks/useKeyboard.ts`

---

## Claude Code Skills

專案提供三個自定義 Skills（在 `.claude/skills/` 目錄）：

### /deploy-workers
部署 Workers 後端到 Cloudflare。

### /deploy-web
構建並提交前端，觸發 Cloudflare Pages 自動部署。

### /dev
啟動本地開發環境（前端 + Workers）。

使用方式：在 Claude Code 中輸入 `/deploy-workers` 即可執行相應指令。
