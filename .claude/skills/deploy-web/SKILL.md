---
name: deploy-web
description: 構建並提交前端代碼，Cloudflare Pages 會自動部署
---

# 部署前端到 Cloudflare Pages

構建並提交前端代碼，Cloudflare Pages 會自動從 Git 拉取並部署。

## 步驟

1. **切換到 web 目錄**
   ```bash
   cd vocaboost-web
   ```

2. **構建生產版本**
   ```bash
   npm run build
   ```

   這會生成 `dist/` 目錄包含優化後的靜態文件。

3. **提交更改到 Git**
   ```bash
   git add .
   git commit -m "Build for production"
   git push
   ```

4. **等待自動部署**
   Cloudflare Pages 會自動偵測推送並開始構建流程。

## 驗證

訪問生產環境確認更新：
- 生產 URL: https://vocaboost.pages.dev
- 或通過 Cloudflare Dashboard 查看部署狀態

## 部署配置

Cloudflare Pages 使用以下配置：
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Root directory**: `vocaboost-web`

## 常見問題

- **構建失敗**: 檢查 Cloudflare Pages 部署日誌
- **環境變數**: 在 Cloudflare Pages 設定頁面配置環境變數
- **分支部署**: 可配置預覽分支自動部署
