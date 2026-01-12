---
name: dev
description: 啟動本地開發環境（前端 + Workers）
---

# 本地開發環境

啟動 VocaBoost 本地開發環境，包含前端和 Workers 後端。

## 啟動前端開發伺服器

```bash
cd vocaboost-web
npm install           # 首次需要安裝依賴
npm run dev
```

前端將在以下地址可用：
- 本地: http://localhost:5173
- 網路: http://192.168.x.x:5173

特性：
- HMR (Hot Module Replacement) 即時更新
- TypeScript 類型檢查
- Vite 快速構建

## 啟動 Workers 開發伺服器（可選）

**在另一個終端視窗：**

```bash
cd vocaboost-workers
npm install           # 首次需要安裝依賴
npm run dev
```

Workers 將在以下地址可用：
- 本地: http://localhost:8787

特性：
- 本地 D1 資料庫模擬
- 即時重載
- 完整的 Workers API 支援

## 開發工作流

1. **修改前端代碼** → 瀏覽器自動刷新
2. **修改 Workers 代碼** → Workers 自動重新載入
3. **測試整合** → 前端調用本地 Workers API

## 常見指令

### 前端
- `npm run build` - 構建生產版本
- `npm run preview` - 預覽構建結果
- `npm run lint` - 檢查代碼風格

### Workers
- `npm run deploy` - 部署到生產環境
- `npx wrangler d1 execute ...` - 執行 D1 指令

## 環境配置

如果需要使用本地 Workers，修改前端 API 基礎URL：

```typescript
// vocaboost-web/src/services/leaderboardApi.ts
const API_BASE = 'http://localhost:8787'  // 本地開發
// const API_BASE = 'https://vocaboost-leaderboard.bs10081.workers.dev'  // 生產
```
