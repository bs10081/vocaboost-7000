---
name: deploy-workers
description: 部署 VocaBoost Workers 排行榜後端到 Cloudflare
---

# 部署 Workers 後端

部署 VocaBoost 排行榜後端到 Cloudflare Workers。

## 步驟

1. **切換到 workers 目錄**
   ```bash
   cd vocaboost-workers
   ```

2. **確認已登入 Cloudflare**
   ```bash
   npx wrangler whoami
   ```

   如果未登入，執行 `npx wrangler login`

3. **部署到 Cloudflare Workers**
   ```bash
   npx wrangler deploy
   ```

## 驗證

部署完成後測試 API：

```bash
curl https://vocaboost-leaderboard.bs10081.workers.dev/
```

預期回應：
```json
{
  "service": "VocaBoost Leaderboard API",
  "version": "1.0.0",
  "status": "healthy"
}
```

## 常見問題

- **D1 Database 未綁定**: 確認 `wrangler.toml` 中的 `database_id` 正確
- **環境變數缺失**: 使用 `npx wrangler secret put ADMIN_TOKEN` 設定管理員 token
