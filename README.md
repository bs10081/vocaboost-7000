# VocaBoost 7000 - 教育部 7000 單字學習 PWA

使用 COSS UI + React + TypeScript 重構的現代化單字學習應用程式。

## ✨ 特色功能

### 🎮 學習模式
- **翻牌學習**: 點擊卡片或按空格鍵翻面查看翻譯
- **二元評分**: 簡化為「會」和「不會」兩個選項
- **SM-2 演算法**: 智慧間隔重複系統，優化記憶效果
- **TTS 朗讀**: 按 G 鍵或點擊按鈕朗讀單字

### ⌨️ 鍵盤操控
| 按鍵 | 功能 |
|------|------|
| ← | 不會（標記需複習） |
| → | 會（標記已掌握） |
| ↑ | 上一題 |
| Space | 翻面 |
| G | 朗讀單字 |

### 📱 觸控手勢
- **左滑**: 不會
- **右滑**: 會  
- **上滑**: 上一題
- **點擊**: 翻面

## 🚀 快速開始

```bash
cd vocaboost-web
npm install
npm run dev
```

應用程式會在 http://localhost:5173 啟動

## 🔧 技術棧

- React 19 + TypeScript + Vite
- COSS UI (Base UI + Tailwind CSS)
- Zustand (狀態管理) + React Router
- PWA (vite-plugin-pwa + Workbox)

---

Generated with [Claude Code](https://claude.com/claude-code) via [Happy](https://happy.engineering)
