# PWA Icons 生成指南

這個應用程式需要以下 PWA icons：

## 需要的檔案
- `public/icon-192x192.png` - 192x192 像素
- `public/icon-512x512.png` - 512x512 像素
- `public/favicon.ico` - Favicon

## 如何生成

### 方法 1: 使用線上工具
1. 前往 https://realfavicongenerator.net/ 或 https://www.pwabuilder.com/imageGenerator
2. 上傳一個正方形的 logo 圖片（建議 512x512 或更大）
3. 下載生成的 icons
4. 將檔案放入 `public/` 目錄

### 方法 2: 使用 ImageMagick（命令列）
```bash
# 假設你有一個 logo.png
convert logo.png -resize 192x192 public/icon-192x192.png
convert logo.png -resize 512x512 public/icon-512x512.png
convert logo.png -resize 32x32 public/favicon.ico
```

### 方法 3: 使用 Figma/Sketch/設計工具
1. 建立一個 512x512 的正方形畫布
2. 設計你的 app icon（注意 safe area 和 maskable 規範）
3. 匯出為 PNG（192x192 和 512x512）

## Maskable Icon 設計建議
- 重要內容放在中央 80% 區域（safe zone）
- 背景應該延伸到整個畫布邊緣
- 參考：https://maskable.app/

## 臨時解決方案（開發用）
如果只是測試，可以使用任何正方形圖片：
```bash
# 在 macOS 使用內建工具快速生成單色 icon
sips -z 192 192 -Z 192 some-image.png --out public/icon-192x192.png
sips -z 512 512 -Z 512 some-image.png --out public/icon-512x512.png
```

## 驗證
建置後可以使用 Lighthouse PWA 審計檢查 icons 是否正確。
