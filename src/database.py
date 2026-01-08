"""
資料庫管理模組
處理 SQLite 資料庫的建立、連接和基本操作
"""

import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional


class VocabularyDatabase:
    """七千單字資料庫管理類別"""

    def __init__(self, db_path: str = "data/vocabulary.db"):
        """初始化資料庫連接

        Args:
            db_path: 資料庫檔案路徑
        """
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self.conn = None
        self.cursor = None

    def connect(self):
        """建立資料庫連接"""
        self.conn = sqlite3.connect(self.db_path)
        self.conn.row_factory = sqlite3.Row  # 讓結果可以用欄位名稱存取
        self.cursor = self.conn.cursor()

    def close(self):
        """關閉資料庫連接"""
        if self.conn:
            self.conn.close()

    def initialize_schema(self):
        """建立資料庫結構"""
        self.connect()

        # 主要單字表
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS vocabulary (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                word TEXT NOT NULL,
                phonetic TEXT,
                part_of_speech TEXT,
                translation TEXT NOT NULL,
                level INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(word, part_of_speech, level)
            )
        """)

        # 學習進度表 (擴充 SM-2 演算法欄位)
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS learning_progress (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                vocabulary_id INTEGER NOT NULL,
                familiarity INTEGER DEFAULT 0,
                last_reviewed TIMESTAMP,
                review_count INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                ease_factor REAL DEFAULT 2.5,
                interval_days INTEGER DEFAULT 0,
                next_review DATE,
                is_favorite BOOLEAN DEFAULT 0,
                FOREIGN KEY (vocabulary_id) REFERENCES vocabulary(id),
                UNIQUE(vocabulary_id)
            )
        """)

        # 每日學習統計表
        self.cursor.execute("""
            CREATE TABLE IF NOT EXISTS study_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date DATE NOT NULL UNIQUE,
                new_words INTEGER DEFAULT 0,
                reviewed_words INTEGER DEFAULT 0,
                correct_count INTEGER DEFAULT 0,
                total_count INTEGER DEFAULT 0,
                study_time_seconds INTEGER DEFAULT 0
            )
        """)

        # 建立索引以加速查詢
        self.cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_level ON vocabulary(level)
        """)

        self.cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_word ON vocabulary(word)
        """)

        self.cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_next_review ON learning_progress(next_review)
        """)

        self.cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_favorite ON learning_progress(is_favorite)
        """)

        self.conn.commit()
        print(f"✓ 資料庫結構建立完成：{self.db_path}")

    def insert_vocabulary(
        self,
        word: str,
        phonetic: str,
        part_of_speech: str,
        translation: str,
        level: int,
    ) -> Optional[int]:
        """插入單字資料

        Args:
            word: 英文單字
            phonetic: 音標
            part_of_speech: 詞性
            translation: 中文翻譯
            level: 級別 (1-7)

        Returns:
            插入的 row id，若已存在則返回 None
        """
        try:
            self.cursor.execute(
                """
                INSERT INTO vocabulary (word, phonetic, part_of_speech, translation, level)
                VALUES (?, ?, ?, ?, ?)
            """,
                (word, phonetic, part_of_speech, translation, level),
            )
            self.conn.commit()
            return self.cursor.lastrowid
        except sqlite3.IntegrityError:
            # 單字已存在
            return None

    def get_words_by_level(self, level: int) -> List[Dict]:
        """取得指定級別的所有單字

        Args:
            level: 級別 (1-7)

        Returns:
            單字列表
        """
        self.cursor.execute(
            """
            SELECT * FROM vocabulary WHERE level = ?
            ORDER BY word
        """,
            (level,),
        )

        return [dict(row) for row in self.cursor.fetchall()]

    def search_word(self, keyword: str) -> List[Dict]:
        """搜尋單字

        Args:
            keyword: 搜尋關鍵字

        Returns:
            符合的單字列表
        """
        self.cursor.execute(
            """
            SELECT * FROM vocabulary
            WHERE word LIKE ? OR translation LIKE ?
            ORDER BY level, word
        """,
            (f"%{keyword}%", f"%{keyword}%"),
        )

        return [dict(row) for row in self.cursor.fetchall()]

    def get_statistics(self) -> Dict:
        """取得資料庫統計資訊

        Returns:
            統計資訊字典
        """
        stats = {}

        # 總單字數
        self.cursor.execute("SELECT COUNT(*) as total FROM vocabulary")
        stats["total"] = self.cursor.fetchone()["total"]

        # 各級別單字數
        self.cursor.execute("""
            SELECT level, COUNT(*) as count
            FROM vocabulary
            GROUP BY level
            ORDER BY level
        """)
        stats["by_level"] = {
            row["level"]: row["count"] for row in self.cursor.fetchall()
        }

        return stats

    # ========== 學習進度管理 ==========

    def get_progress(self, vocabulary_id: int) -> Optional[Dict]:
        """取得單字的學習進度

        Args:
            vocabulary_id: 單字 ID

        Returns:
            學習進度資料，若不存在則返回 None
        """
        self.cursor.execute(
            """
            SELECT * FROM learning_progress WHERE vocabulary_id = ?
        """,
            (vocabulary_id,),
        )

        row = self.cursor.fetchone()
        return dict(row) if row else None

    def update_progress(
        self,
        vocabulary_id: int,
        ease_factor: float,
        interval_days: int,
        next_review: str,
        is_correct: bool = True,
    ):
        """更新單字的學習進度

        Args:
            vocabulary_id: 單字 ID
            ease_factor: 難度因子 (SM-2)
            interval_days: 間隔天數
            next_review: 下次複習日期 (YYYY-MM-DD)
            is_correct: 是否答對
        """
        progress = self.get_progress(vocabulary_id)

        if progress:
            # 更新現有進度
            self.cursor.execute(
                """
                UPDATE learning_progress
                SET ease_factor = ?,
                    interval_days = ?,
                    next_review = ?,
                    last_reviewed = CURRENT_TIMESTAMP,
                    review_count = review_count + 1,
                    correct_count = correct_count + ?
                WHERE vocabulary_id = ?
            """,
                (
                    ease_factor,
                    interval_days,
                    next_review,
                    1 if is_correct else 0,
                    vocabulary_id,
                ),
            )
        else:
            # 建立新進度記錄
            self.cursor.execute(
                """
                INSERT INTO learning_progress
                (vocabulary_id, ease_factor, interval_days, next_review,
                 last_reviewed, review_count, correct_count)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, 1, ?)
            """,
                (
                    vocabulary_id,
                    ease_factor,
                    interval_days,
                    next_review,
                    1 if is_correct else 0,
                ),
            )

        self.conn.commit()

    def get_words_for_review(self, limit: int = 50) -> List[Dict]:
        """取得待複習的單字

        Args:
            limit: 取得數量上限

        Returns:
            待複習的單字列表（包含單字資料和學習進度）
        """
        today = datetime.now().strftime("%Y-%m-%d")

        self.cursor.execute(
            """
            SELECT v.*, lp.ease_factor, lp.interval_days, lp.next_review,
                   lp.review_count, lp.correct_count, lp.is_favorite
            FROM vocabulary v
            INNER JOIN learning_progress lp ON v.id = lp.vocabulary_id
            WHERE lp.next_review <= ?
            ORDER BY lp.next_review ASC, v.level ASC
            LIMIT ?
        """,
            (today, limit),
        )

        return [dict(row) for row in self.cursor.fetchall()]

    def get_new_words(self, level: Optional[int] = None, limit: int = 20) -> List[Dict]:
        """取得尚未學習的新單字

        Args:
            level: 指定級別，None 表示所有級別
            limit: 取得數量上限

        Returns:
            新單字列表
        """
        if level:
            self.cursor.execute(
                """
                SELECT v.* FROM vocabulary v
                LEFT JOIN learning_progress lp ON v.id = lp.vocabulary_id
                WHERE lp.id IS NULL AND v.level = ?
                ORDER BY v.word
                LIMIT ?
            """,
                (level, limit),
            )
        else:
            self.cursor.execute(
                """
                SELECT v.* FROM vocabulary v
                LEFT JOIN learning_progress lp ON v.id = lp.vocabulary_id
                WHERE lp.id IS NULL
                ORDER BY v.level, v.word
                LIMIT ?
            """,
                (limit,),
            )

        return [dict(row) for row in self.cursor.fetchall()]

    def toggle_favorite(self, vocabulary_id: int) -> bool:
        """切換單字的收藏狀態

        Args:
            vocabulary_id: 單字 ID

        Returns:
            新的收藏狀態 (True=已收藏, False=未收藏)
        """
        progress = self.get_progress(vocabulary_id)

        if progress:
            new_status = not bool(progress["is_favorite"])
            self.cursor.execute(
                """
                UPDATE learning_progress
                SET is_favorite = ?
                WHERE vocabulary_id = ?
            """,
                (1 if new_status else 0, vocabulary_id),
            )
        else:
            # 如果沒有學習記錄，建立一個並標記為收藏
            self.cursor.execute(
                """
                INSERT INTO learning_progress (vocabulary_id, is_favorite)
                VALUES (?, 1)
            """,
                (vocabulary_id,),
            )
            new_status = True

        self.conn.commit()
        return new_status

    def get_favorite_words(self) -> List[Dict]:
        """取得所有收藏的單字

        Returns:
            收藏的單字列表
        """
        self.cursor.execute("""
            SELECT v.*, lp.ease_factor, lp.interval_days, lp.next_review,
                   lp.review_count, lp.correct_count
            FROM vocabulary v
            INNER JOIN learning_progress lp ON v.id = lp.vocabulary_id
            WHERE lp.is_favorite = 1
            ORDER BY v.level, v.word
        """)

        return [dict(row) for row in self.cursor.fetchall()]

    def get_random_words_by_level(
        self, level: int, exclude_id: int, limit: int = 10
    ) -> List[Dict]:
        """取得指定級別的隨機單字（用於生成干擾選項）

        Args:
            level: 級別
            exclude_id: 要排除的單字 ID（正確答案）
            limit: 取得數量上限

        Returns:
            隨機單字列表
        """
        self.cursor.execute(
            """
            SELECT * FROM vocabulary
            WHERE level = ? AND id != ?
            ORDER BY RANDOM()
            LIMIT ?
        """,
            (level, exclude_id, limit),
        )

        return [dict(row) for row in self.cursor.fetchall()]

    def get_random_words_nearby_level(
        self, level: int, exclude_id: int, limit: int = 10
    ) -> List[Dict]:
        """取得相鄰級別的隨機單字（level ± 1）

        Args:
            level: 目標級別
            exclude_id: 要排除的單字 ID
            limit: 取得數量上限

        Returns:
            隨機單字列表
        """
        min_level = max(1, level - 1)
        max_level = min(6, level + 1)

        self.cursor.execute(
            """
            SELECT * FROM vocabulary
            WHERE level BETWEEN ? AND ? AND id != ?
            ORDER BY RANDOM()
            LIMIT ?
        """,
            (min_level, max_level, exclude_id, limit),
        )

        return [dict(row) for row in self.cursor.fetchall()]

    def get_learning_statistics(self) -> Dict:
        """取得學習統計資訊

        Returns:
            包含各種統計資訊的字典
        """
        stats = {}

        # 總單字數
        self.cursor.execute("SELECT COUNT(*) as total FROM vocabulary")
        stats["total_words"] = self.cursor.fetchone()["total"]

        # 已學習單字數
        self.cursor.execute("SELECT COUNT(*) as learned FROM learning_progress")
        stats["learned_words"] = self.cursor.fetchone()["learned"]

        # 待複習單字數
        today = datetime.now().strftime("%Y-%m-%d")
        self.cursor.execute(
            """
            SELECT COUNT(*) as due FROM learning_progress
            WHERE next_review <= ?
        """,
            (today,),
        )
        stats["due_words"] = self.cursor.fetchone()["due"]

        # 收藏單字數
        self.cursor.execute("""
            SELECT COUNT(*) as favorites FROM learning_progress
            WHERE is_favorite = 1
        """)
        stats["favorite_words"] = self.cursor.fetchone()["favorites"]

        # 各級別學習進度
        self.cursor.execute("""
            SELECT v.level,
                   COUNT(DISTINCT v.id) as total,
                   COUNT(DISTINCT lp.vocabulary_id) as learned
            FROM vocabulary v
            LEFT JOIN learning_progress lp ON v.id = lp.vocabulary_id
            GROUP BY v.level
            ORDER BY v.level
        """)
        stats["by_level"] = [
            {
                "level": row["level"],
                "total": row["total"],
                "learned": row["learned"] or 0,
                "percentage": round((row["learned"] or 0) * 100 / row["total"], 1),
            }
            for row in self.cursor.fetchall()
        ]

        # 今日學習統計
        today = datetime.now().strftime("%Y-%m-%d")
        self.cursor.execute(
            """
            SELECT * FROM study_sessions WHERE date = ?
        """,
            (today,),
        )
        today_row = self.cursor.fetchone()
        stats["today"] = (
            dict(today_row)
            if today_row
            else {
                "new_words": 0,
                "reviewed_words": 0,
                "correct_count": 0,
                "total_count": 0,
            }
        )

        # 連續學習天數
        self.cursor.execute("""
            SELECT date FROM study_sessions
            ORDER BY date DESC
        """)
        dates = [row["date"] for row in self.cursor.fetchall()]
        stats["streak_days"] = self._calculate_streak(dates)

        return stats

    def _calculate_streak(self, dates: List[str]) -> int:
        """計算連續學習天數

        Args:
            dates: 日期列表 (降序排列)

        Returns:
            連續天數
        """
        if not dates:
            return 0

        streak = 0
        expected_date = datetime.now().date()

        for date_str in dates:
            date = datetime.strptime(date_str, "%Y-%m-%d").date()

            if date == expected_date:
                streak += 1
                expected_date -= timedelta(days=1)
            elif date < expected_date:
                break

        return streak

    def record_study_session(
        self,
        new_words: int = 0,
        reviewed_words: int = 0,
        correct: int = 0,
        total: int = 0,
    ):
        """記錄今日學習統計

        Args:
            new_words: 新學單字數
            reviewed_words: 複習單字數
            correct: 答對數
            total: 總測驗數
        """
        today = datetime.now().strftime("%Y-%m-%d")

        self.cursor.execute(
            """
            INSERT INTO study_sessions (date, new_words, reviewed_words, correct_count, total_count)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(date) DO UPDATE SET
                new_words = new_words + ?,
                reviewed_words = reviewed_words + ?,
                correct_count = correct_count + ?,
                total_count = total_count + ?
        """,
            (
                today,
                new_words,
                reviewed_words,
                correct,
                total,
                new_words,
                reviewed_words,
                correct,
                total,
            ),
        )

        self.conn.commit()


if __name__ == "__main__":
    # 測試資料庫建立
    db = VocabularyDatabase()
    db.initialize_schema()

    # 顯示統計
    stats = db.get_statistics()
    print(f"\n資料庫統計：")
    print(f"總單字數：{stats['total']}")
    print(f"各級別分布：{stats['by_level']}")

    db.close()
