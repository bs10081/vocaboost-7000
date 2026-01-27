# 錯詞保存邏輯優化 - 測試指南

## 已實作的改進

### ✅ P0: 修復 Zustand 不可變性 Bug
**檔案**: `vocaboost-web/src/stores/studyStore.ts:141-148`

**修復內容**:
```typescript
// 修復前：直接 push 違反 Zustand 不可變原則
if (!wrongWords.find((w) => w.id === word.id)) {
  wrongWords.push(word)  // ❌ BUG
}

// 修復後：使用不可變方式更新陣列
const newWrongWords = wrongWords.find((w) => w.id === word.id)
  ? wrongWords
  : [...wrongWords, word]  // ✅ 正確
```

### ✅ P1: 添加立即重測錯詞功能
**檔案**:
- `vocaboost-web/src/stores/studyStore.ts:207-219` - `startRetest` action
- `vocaboost-web/src/pages/StudyPage.tsx:108-113` - 重測按鈕 UI

**功能**:
- 完成學習後，若有答錯的單字，顯示「立即重測錯詞」按鈕
- 點擊後自動打亂錯詞順序，開始新一輪測驗
- 重測時 `wrongWords` 清空，可再次追蹤新的錯誤

### ✅ P2: 追蹤連續錯誤次數
**檔案**:
- `vocaboost-web/src/types/vocabulary.ts:21` - 添加 `consecutive_failures` 欄位
- `vocaboost-web/src/lib/storage.ts:153,171` - 更新 `recordAnswer` 邏輯

**邏輯**:
- 答對時：`consecutive_failures` 重置為 0
- 答錯時：`consecutive_failures` 累加 1
- 向後兼容：舊數據欄位為 `undefined`，使用 `|| 0` 處理

---

## 測試步驟

### 1. Bug 修復驗證（React DevTools）
1. 啟動開發模式：`npm run dev`
2. 開啟 React DevTools
3. 開始學習任意模式
4. 連續答錯 3-5 個單字
5. 檢查 `useStudyStore` 狀態中的 `wrongWords` 陣列
6. ✅ 應該看到每次答錯後陣列長度正確增加，React 正確重新渲染

### 2. 重測功能驗證
1. 開始一個學習 session（建議選 Level 1 的 5-10 個單字）
2. 故意答錯其中 3 個單字
3. 完成所有單字後，檢查完成頁面
4. ✅ 應該看到「立即重測錯詞」按鈕（紅色）
5. 點擊按鈕
6. ✅ 應該開始新的測驗，只包含剛才答錯的 3 個單字
7. ✅ 單字順序應該是打亂的

### 3. 連續錯誤追蹤驗證
1. 開啟瀏覽器開發者工具 → Application → Local Storage
2. 開始學習任意單字（例如 ID=100 的單字）
3. 答錯 3 次（可透過重測功能）
4. 檢查 `vocaboost_progress` 項目
5. ✅ 找到該單字的進度（`"100": {...}`）
6. ✅ 應該看到 `consecutive_failures: 3`
7. 答對該單字一次
8. ✅ `consecutive_failures` 應重置為 0

### 4. 向後兼容性測試
1. 使用瀏覽器的 Local Storage 編輯器
2. 找到某個單字的進度記錄
3. 手動刪除 `consecutive_failures` 欄位
4. 重新載入頁面，答對/答錯該單字
5. ✅ 不應該出現任何錯誤
6. ✅ `consecutive_failures` 應該正確初始化（0 或 1）

### 5. 整合測試（完整學習流程）
```bash
cd vocaboost-web
npm run dev
```

**測試流程**:
1. 選擇「新單字」→ Level 1
2. 學習 10 個單字，故意答錯 4 個
3. 完成後點擊「立即重測錯詞」
4. 重測時答錯 2 個
5. 再次完成後點擊「立即重測錯詞」
6. 全部答對
7. ✅ 第三次完成後不應顯示重測按鈕

---

## 預期行為

### 完成頁面 UI
- **有錯詞時**:
  ```
  🎉
  完成學習！
  共學習了 10 個單字
  其中 4 個需要加強複習

  [立即重測錯詞] [返回首頁]
  ```

- **無錯詞時**:
  ```
  🎉
  完成學習！
  共學習了 10 個單字

  [返回首頁]
  ```

### localStorage 數據結構
```json
{
  "100": {
    "vocabulary_id": 100,
    "ease_factor": 1.96,
    "interval_days": 1,
    "next_review": "2026-01-28",
    "review_count": 3,
    "correct_count": 1,
    "is_favorite": false,
    "last_reviewed": "2026-01-27T10:30:00.000Z",
    "consecutive_failures": 2
  }
}
```

---

## 技術亮點

1. **不可變性修復**: 遵循 Zustand 最佳實踐，避免直接修改狀態
2. **立即重測**: 提升學習效率，無需等到隔天
3. **連續錯誤追蹤**: 識別「頑固難詞」，方便未來添加特殊複習策略
4. **向後兼容**: 舊數據無痛升級，使用 `?.` 和 `|| 0` 處理

---

## 已構建驗證
```bash
✓ 667 modules transformed.
✓ built in 1.34s
```

所有 TypeScript 類型檢查通過，無編譯錯誤。
