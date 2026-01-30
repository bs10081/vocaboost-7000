# 困難單字管理與重學功能 - 測試指南

## 已實作功能

### ✅ P0: 困難單字自動標記
連續答錯 5 次後自動標記為困難單字。

### ✅ P1: 困難單字學習入口
HomePage 新增「困難單字」按鈕，顯示數量 badge。

### ✅ P2: 重學已完成 Level
已完成的 Level 顯示「重新學習」連結。

### ✅ P3: 手動標記困難
學習時可手動切換困難標記（按鈕 + 快捷鍵 D）。

---

## 測試步驟

### 1. 自動標記測試

1. 啟動開發模式：`cd vocaboost-web && npm run dev`
2. 選擇「學習新單字」→ Level 1
3. 選一個單字，連續答錯 5 次：
   - 第 1 次答錯：點「不會」
   - 完成後點「立即重測錯詞」
   - 第 2-5 次：重複上述流程
4. 開啟瀏覽器 DevTools → Application → Local Storage
5. 查看 `vocaboost_progress` → 找到該單字
6. ✅ 應看到 `is_difficult: true` 和 `marked_difficult_at` 時間戳

**預期結果**：
```json
{
  "100": {
    "vocabulary_id": 100,
    "consecutive_failures": 5,
    "is_difficult": true,
    "marked_difficult_at": "2026-01-30T12:36:43.000Z"
  }
}
```

### 2. 困難單字入口測試

**前置條件**：已有至少 1 個困難單字（完成測試 1）

1. 返回 HomePage
2. ✅ 「困難單字」按鈕應啟用
3. ✅ 右上角應顯示紅色 badge（例如：3）
4. 點擊「困難單字」按鈕
5. ✅ 應進入學習模式，只包含困難單字
6. ✅ URL 應為 `/study/difficult`

### 3. 重學功能測試

**前置條件**：已完成某個 Level 的所有單字

1. 返回 HomePage
2. 找到已完成的 Level（顯示「已完成」）
3. ✅ 主按鈕應顯示「已完成」且禁用（灰色）
4. ✅ 下方應顯示「重新學習 (50)」連結
5. 點擊「重新學習」連結
6. ✅ 應進入學習模式，包含該 Level 已學過的單字
7. ✅ URL 應為 `/study/relearn/1`
8. 答對/答錯時，進度應正常更新

**測試「完成整個級別」模式**：
1. 勾選「完成整個級別」checkbox
2. 點擊「重新學習」
3. ✅ URL 應為 `/study/relearn/1?all=true`
4. ✅ 應包含該 Level 所有已學單字（不受 20 個限制）

### 4. 手動標記困難測試

1. 開始任意學習模式
2. 在學習卡片頁面，TTS 按鈕旁應有「📌 標記困難」按鈕
3. 點擊按鈕
4. ✅ 按鈕應變為「⚠️ 困難」（紅色）
5. 再次點擊
6. ✅ 按鈕應變回「📌 標記困難」（outline 樣式）

**測試快捷鍵**：
1. 在學習頁面按 `D` 鍵
2. ✅ 困難狀態應切換
3. ✅ 按鈕樣式應同步更新

**測試鍵盤提示**：
1. 桌面端（螢幕寬度 > 768px）
2. ✅ 頁面底部應顯示「D 標記困難」提示

### 5. 整合測試流程

**完整學習流程**：
1. 學習 Level 1 新單字 10 個
2. 其中 3 個答錯
3. 選其中 1 個連續答錯 5 次（透過重測）
4. 完成學習
5. 返回 HomePage
6. ✅ 「困難單字」按鈕顯示 badge 1
7. 點擊進入困難單字學習
8. ✅ 只包含剛才連續答錯 5 次的單字
9. 手動標記另一個單字為困難（按 D）
10. 返回 HomePage
11. ✅ 「困難單字」badge 變為 2

**跨設備同步測試**（若已啟用同步）：
1. 在裝置 A 標記 3 個困難單字
2. 手動同步或等待自動同步
3. 在裝置 B 下載同步數據
4. ✅ 裝置 B 的 HomePage 應顯示相同的困難單字數量
5. ✅ 進入困難單字學習，應包含相同的單字

---

## 驗證檢查清單

- [ ] 自動標記：連續答錯 5 次後 `is_difficult: true`
- [ ] 困難入口：HomePage 顯示數量 badge
- [ ] 困難學習：`/study/difficult` 只包含困難單字
- [ ] 重學功能：已完成 Level 可重新學習
- [ ] 手動標記：按鈕和快捷鍵 D 正常切換
- [ ] 鍵盤提示：桌面端顯示「D 標記困難」
- [ ] 構建驗證：`npm run build` 無錯誤
- [ ] 向後兼容：舊數據仍能正常使用
- [ ] 同步兼容：新欄位正確同步（若已啟用）

---

## 技術亮點

### 1. Anki Leech 機制啟發
- 閾值 5（比 Anki 預設 8 低，適合行動端）
- 自動標記 + 手動管理雙重機制
- 不自動暫停，保持學習連續性

### 2. 向後兼容設計
```typescript
is_difficult?: boolean        // 可選欄位
consecutive_failures?: number // 現有欄位

// 讀取時安全處理
const isDifficult = progress?.is_difficult ?? false
```

### 3. 重學機制
- 不影響原有學習進度
- 支援「完成整個級別」模式
- 已學單字仍可更新 SM-2 參數

### 4. UI/UX 改進
- Badge 數量提示（紅色醒目）
- Emoji 視覺化（📌 vs ⚠️）
- 快捷鍵支援（D 鍵）
- Level 按鈕雙層結構（主按鈕 + 次要連結）

---

## 參考資料

- [Anki Leeches Manual](https://docs.ankiweb.net/leeches.html)
- [Polyglossic Leech Strategies](https://www.polyglossic.com/anki-leeches-strategies/)
- [SM-2 Algorithm](https://help.remnote.com/en/articles/6026144-the-anki-sm-2-spaced-repetition-algorithm)
