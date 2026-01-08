# 7000 單字學習 TUI App

教育部 7000 單字學習輔助工具，使用終端 TUI 介面進行互動式學習。

## ✨ 功能特色

- ✅ 從教育部 7000 單字 PDF 提取資料（5,143 個單字）
- ✅ 使用 SQLite 資料庫快速索引和查詢
- ✅ 支援 Level 1-6 分級學習
- ✅ **SM-2 間隔重複演算法**：科學化的複習時間安排
- ✅ **TUI 互動式學習介面**：現代化終端介面
- ✅ **雙向測驗**：英→中、中→英隨機出題
- ✅ **學習進度追蹤**：連續天數、正確率統計
- ✅ **收藏難詞**：標記並集中複習困難單字

## 專案結構

```
7000-english-vocabulary-trainer/
├── src/                          # 原始碼
│   ├── database.py               # 資料庫管理模組
│   ├── pdf_parser.py             # PDF 解析模組
│   ├── srs_algorithm.py          # SM-2 間隔重複演算法
│   ├── quiz_engine.py            # 測驗引擎
│   └── tui/                      # TUI 介面
│       ├── app.py                # 主應用程式
│       ├── screens/              # 各畫面
│       │   ├── home.py           # 主選單
│       │   ├── study.py          # 學習/測驗畫面
│       │   ├── stats.py          # 統計儀表板
│       │   └── favorites.py      # 收藏管理
│       └── widgets/              # UI 元件
├── data/                         # 資料目錄
│   └── vocabulary.db             # SQLite 資料庫
├── main.py                       # 程式進入點
├── init_database.py              # 資料庫初始化腳本
├── migrate_database.py           # 資料庫遷移腳本
├── requirements.txt              # Python 套件需求
└── README.md                     # 說明文件
```

## 安裝步驟

### 1. 安裝相依套件

```bash
# 建立虛擬環境（建議）
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# venv\Scripts\activate   # Windows

# 安裝套件
pip install -r requirements.txt
```

### 2. 準備 PDF 檔案

將「教育部7000單字(Level1-7).pdf」放在專案根目錄。

### 3. 初始化資料庫

```bash
python3 init_database.py
```

此腳本會：
- 解析 PDF 檔案中的所有單字
- 提取單字、音標、詞性、翻譯、級別資訊
- 建立 SQLite 資料庫並匯入資料

### 4. 啟動 TUI 應用程式

```bash
python3 main.py
```

## 🎮 使用方式

### 主選單

啟動後會看到主選單，提供以下選項：

- **[1] 開始今日學習**：複習到期的單字
- **[2] 學習新單字**：按級別學習新單字
- **[3] 難詞複習**：複習收藏的困難單字
- **[4] 學習統計**：查看學習進度和統計
- **[5] 搜尋單字**：搜尋特定單字（開發中）
- **[Q] 離開**：退出應用程式

### 學習模式

1. **單字卡片模式**
   - 顯示英文單字、音標、詞性
   - 按 `空白鍵` 顯示中文翻譯
   - 評分 0-5：
     - **0**: 完全不會
     - **1**: 很難
     - **2**: 有點難
     - **3**: 普通
     - **4**: 簡單
     - **5**: 已經會了（快速跳過，30天後複習）

2. **SM-2 間隔重複**
   - 根據你的評分自動調整複習間隔
   - 評分越高，下次複習間隔越長
   - 評分低於 3 會重新開始

### 快捷鍵

- `Space`: 顯示答案
- `0-5`: 評分單字熟悉度
- `ESC` / `Q`: 返回上一頁
- `Ctrl+C`: 退出應用程式

## 資料庫結構

### vocabulary 表（單字表）

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵 |
| word | TEXT | 英文單字 |
| phonetic | TEXT | 音標 |
| part_of_speech | TEXT | 詞性（adj, n, v, prep 等）|
| translation | TEXT | 中文翻譯 |
| level | INTEGER | 級別（1-7）|
| created_at | TIMESTAMP | 建立時間 |

### learning_progress 表（學習進度表）

| 欄位 | 型態 | 說明 |
|------|------|------|
| id | INTEGER | 主鍵 |
| vocabulary_id | INTEGER | 關聯的單字 ID |
| familiarity | INTEGER | 熟悉度（0-5）|
| last_reviewed | TIMESTAMP | 最後複習時間 |
| review_count | INTEGER | 複習次數 |
| correct_count | INTEGER | 答對次數 |

## 使用範例

### Python 程式中使用

```python
from src.database import VocabularyDatabase

# 連接資料庫
db = VocabularyDatabase()
db.connect()

# 取得 Level 1 的所有單字
words = db.get_words_by_level(1)
for word in words:
    print(f"{word['word']} [{word['phonetic']}] - {word['translation']}")

# 搜尋單字
results = db.search_word("apple")

# 查看統計
stats = db.get_statistics()
print(f"總單字數：{stats['total']}")

db.close()
```

## 開發計畫

- [x] 資料庫結構設計
- [x] PDF 解析功能
- [x] 資料匯入功能
- [x] SM-2 間隔重複演算法
- [x] 測驗引擎（雙向測驗）
- [x] TUI 學習介面
- [x] 學習進度追蹤
- [x] 統計儀表板
- [x] 收藏難詞功能
- [ ] 中文→英文測驗模式（輸入式）
- [ ] 搜尋功能
- [ ] 級別選擇器
- [ ] 音效和動畫優化

## 🎯 學習建議

1. **每日目標**：建議每天新學 20-50 個單字，複習到期單字
2. **快速篩選**：已經會的單字直接評分 5，會進入 30 天長週期
3. **持續學習**：保持連續天數，養成每日學習習慣
4. **標記難詞**：遇到困難單字可收藏，集中複習
5. **循序漸進**：從 Level 1 開始，逐步提升

## 📚 技術架構

- **TUI 框架**: Textual (現代化 Python TUI 框架)
- **資料庫**: SQLite3
- **演算法**: SM-2 (SuperMemo 2)
- **語言**: Python 3.8+

## 🔗 參考資源

- [Textual 官方文檔](https://textual.textualize.io/)
- [SM-2 演算法說明](https://faqs.ankiweb.net/what-spaced-repetition-algorithm.html)
- [間隔重複最佳實踐](https://www.leonardoenglish.com/blog/spaced-repetition)

## 授權

本專案僅供學習使用。單字資料來源為教育部公開資料。
