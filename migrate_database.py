#!/usr/bin/env python3
"""
資料庫遷移腳本
將現有資料庫升級到支援 SM-2 演算法的結構
"""

import sys
import sqlite3
from pathlib import Path

sys.path.insert(0, 'src')


def migrate_database(db_path: str = "data/vocabulary.db"):
    """遷移資料庫結構"""
    db_path = Path(db_path)

    if not db_path.exists():
        print(f"❌ 資料庫不存在：{db_path}")
        return False

    print(f"開始遷移資料庫：{db_path}")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 檢查 learning_progress 表是否已有新欄位
        cursor.execute("PRAGMA table_info(learning_progress)")
        columns = [col[1] for col in cursor.fetchall()]

        if 'ease_factor' in columns:
            print("✓ 資料庫已經是最新版本")
            conn.close()
            return True

        print("偵測到舊版資料庫，開始遷移...")

        # 1. 重新命名舊表
        cursor.execute("""
            ALTER TABLE learning_progress RENAME TO learning_progress_old
        """)
        print("  ✓ 備份舊表")

        # 2. 建立新表結構
        cursor.execute("""
            CREATE TABLE learning_progress (
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
        print("  ✓ 建立新表結構")

        # 3. 複製舊資料
        cursor.execute("""
            INSERT INTO learning_progress
            (id, vocabulary_id, familiarity, last_reviewed, review_count, correct_count)
            SELECT id, vocabulary_id, familiarity, last_reviewed, review_count, correct_count
            FROM learning_progress_old
        """)
        copied = cursor.rowcount
        print(f"  ✓ 複製 {copied} 筆學習記錄")

        # 4. 刪除舊表
        cursor.execute("DROP TABLE learning_progress_old")
        print("  ✓ 清理舊表")

        # 5. 建立新索引
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_next_review ON learning_progress(next_review)
        """)
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_favorite ON learning_progress(is_favorite)
        """)
        print("  ✓ 建立索引")

        # 6. 建立 study_sessions 表
        cursor.execute("""
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
        print("  ✓ 建立學習統計表")

        conn.commit()
        print("\n✅ 資料庫遷移成功！")
        return True

    except Exception as e:
        print(f"\n❌ 遷移失敗：{e}")
        conn.rollback()
        return False
    finally:
        conn.close()


if __name__ == "__main__":
    success = migrate_database()
    sys.exit(0 if success else 1)
