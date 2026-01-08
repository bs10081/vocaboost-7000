#!/usr/bin/env python3
"""
資料庫功能測試腳本
用於驗證資料庫建立、查詢等基本功能
"""

import sys
from pathlib import Path

# 將 src 目錄加入 Python 路徑
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from database import VocabularyDatabase


def test_database_creation():
    """測試資料庫建立"""
    print("【測試 1】資料庫建立")
    db = VocabularyDatabase("data/test_vocabulary.db")
    db.initialize_schema()
    db.close()
    print("✓ 資料庫建立成功\n")


def test_insert_and_query():
    """測試插入和查詢"""
    print("【測試 2】插入和查詢單字")
    db = VocabularyDatabase("data/test_vocabulary.db")
    db.connect()

    # 插入測試資料
    test_words = [
        ("apple", "ˈæpl", "n", "蘋果", 1),
        ("book", "bʊk", "n", "書", 1),
        ("cat", "kæt", "n", "貓", 1),
        ("dog", "dɔg", "n", "狗", 1),
        ("beautiful", "ˈbjutəfəl", "adj", "美麗的", 2),
    ]

    for word_data in test_words:
        db.insert_vocabulary(*word_data)
        print(f"  插入：{word_data[0]}")

    print("✓ 插入完成\n")

    # 查詢 Level 1 的單字
    print("【測試 3】查詢 Level 1 單字")
    level1_words = db.get_words_by_level(1)
    print(f"  找到 {len(level1_words)} 個 Level 1 單字：")
    for word in level1_words:
        print(f"    {word['word']} [{word['phonetic']}] {word['part_of_speech']}. {word['translation']}")

    print("\n【測試 4】搜尋功能")
    results = db.search_word("dog")
    print(f"  搜尋 'dog'：找到 {len(results)} 筆")
    for word in results:
        print(f"    {word['word']} - {word['translation']}")

    print("\n【測試 5】統計資訊")
    stats = db.get_statistics()
    print(f"  總單字數：{stats['total']}")
    print(f"  各級別分布：{stats['by_level']}")

    db.close()
    print("\n✓ 所有測試通過！")


def clean_test_db():
    """清理測試資料庫"""
    test_db = Path("data/test_vocabulary.db")
    if test_db.exists():
        test_db.unlink()
        print("\n✓ 測試資料庫已清理")


def main():
    """主程式"""
    print("=" * 60)
    print("資料庫功能測試")
    print("=" * 60)
    print()

    try:
        test_database_creation()
        test_insert_and_query()
        print("\n" + "=" * 60)
        print("所有測試完成！")
        print("=" * 60)

        # 詢問是否清理測試資料
        response = input("\n是否清理測試資料庫？(y/n): ").strip().lower()
        if response == 'y':
            clean_test_db()

    except Exception as e:
        print(f"\n❌ 測試失敗：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
