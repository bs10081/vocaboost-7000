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
