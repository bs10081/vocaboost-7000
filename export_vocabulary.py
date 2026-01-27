#!/usr/bin/env python3
"""
導出單字資料庫到 JSON 格式
用於前端 React 應用
"""

import sqlite3
import json
from pathlib import Path


def export_vocabulary_to_json():
    """從 SQLite 資料庫導出所有單字到 JSON"""

    db_path = Path("private/data/vocabulary.db")
    output_path = Path("vocaboost-web/public/vocabulary.json")

    if not db_path.exists():
        print(f"錯誤：找不到資料庫檔案 {db_path}")
        return

    # 連接資料庫
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 查詢所有單字
    cursor.execute("""
        SELECT id, word, phonetic, part_of_speech, translation, level
        FROM vocabulary
        ORDER BY level, id
    """)

    # 轉換為字典列表
    vocabulary = []
    for row in cursor.fetchall():
        vocabulary.append({
            "id": row["id"],
            "word": row["word"],
            "phonetic": row["phonetic"] or "",
            "part_of_speech": row["part_of_speech"] or "",
            "translation": row["translation"],
            "level": row["level"]
        })

    conn.close()

    # 建立輸出目錄
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # 寫入 JSON 檔案
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(vocabulary, f, ensure_ascii=False, indent=2)

    # 統計資訊
    level_counts = {}
    for word in vocabulary:
        level = word["level"]
        level_counts[level] = level_counts.get(level, 0) + 1

    print(f"✅ 成功導出 {len(vocabulary)} 個單字到 {output_path}")
    print("\n各級別單字數量：")
    for level in sorted(level_counts.keys()):
        print(f"  Level {level}: {level_counts[level]} 個單字")

    return vocabulary


if __name__ == "__main__":
    export_vocabulary_to_json()
