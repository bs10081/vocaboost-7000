"""
測驗引擎
處理選擇題測驗邏輯、評分、學習進度更新
"""

import random
from enum import Enum
from typing import Dict, List, Optional, Tuple

from database import VocabularyDatabase
from srs_algorithm import SM2Algorithm


class QuizMode(Enum):
    """測驗模式"""

    MULTIPLE_CHOICE_EN2ZH = "mc_en2zh"  # 英文選中文（選擇題）
    MULTIPLE_CHOICE_ZH2EN = "mc_zh2en"  # 中文選英文（選擇題）
    MIXED = "mixed"  # 混合模式


class QuizEngine:
    """測驗引擎"""

    def __init__(self, db_path: str = "data/vocabulary.db"):
        """初始化測驗引擎

        Args:
            db_path: 資料庫路徑
        """
        self.db = VocabularyDatabase(db_path)
        self.db.connect()
        self.sm2 = SM2Algorithm()
        self.current_quiz_mode = QuizMode.MIXED

    def get_quiz_words(
        self, mode: str = "review", level: Optional[int] = None, limit: int = 50
    ) -> List[Dict]:
        """取得測驗單字

        Args:
            mode: 模式 ("review"=複習, "new"=新單字, "favorite"=收藏)
            level: 級別 (僅對 new 模式有效)
            limit: 數量上限

        Returns:
            單字列表
        """
        if mode == "review":
            return self.db.get_words_for_review(limit)
        elif mode == "new":
            return self.db.get_new_words(level, limit)
        elif mode == "favorite":
            return self.db.get_favorite_words()
        else:
            return []

    def generate_quiz_question(
        self, word_data: Dict, mode: QuizMode = QuizMode.MIXED
    ) -> Tuple[str, str, str]:
        """生成測驗問題（舊版，保留向後兼容）

        Args:
            word_data: 單字資料
            mode: 測驗模式

        Returns:
            (問題類型, 問題文字, 正確答案)
        """
        # 如果是混合模式，隨機選擇
        if mode == QuizMode.MIXED:
            mode = random.choice(
                [
                    QuizMode.MULTIPLE_CHOICE_EN2ZH,
                    QuizMode.MULTIPLE_CHOICE_ZH2EN,
                ]
            )

        if mode == QuizMode.MULTIPLE_CHOICE_EN2ZH:
            question = f"{word_data['word']}\n[{word_data['phonetic']}]\n{word_data['part_of_speech']}"
            answer = word_data["translation"]
            return ("mc_en2zh", question, answer)
        else:  # MULTIPLE_CHOICE_ZH2EN
            question = word_data["translation"]
            answer = word_data["word"]
            return ("mc_zh2en", question, answer)

    def generate_multiple_choice_question(
        self, word_data: Dict, mode: QuizMode = QuizMode.MIXED
    ) -> Dict:
        """生成選擇題問題

        Args:
            word_data: 單字資料
            mode: 測驗模式

        Returns:
            包含問題、選項、正確答案的字典
            {
                'type': 'mc_en2zh' | 'mc_zh2en',
                'question': 問題文字,
                'options': [選項A, 選項B, 選項C, 選項D],
                'correct_answer': 正確答案,
                'correct_index': 正確答案索引 (0-3)
            }
        """
        # 如果是混合模式，隨機選擇
        if mode == QuizMode.MIXED:
            mode = random.choice(
                [QuizMode.MULTIPLE_CHOICE_EN2ZH, QuizMode.MULTIPLE_CHOICE_ZH2EN]
            )

        # 生成干擾選項
        distractors = self._get_distractors(word_data, count=3, mode=mode)

        if mode == QuizMode.MULTIPLE_CHOICE_EN2ZH:
            # 英文選中文
            question = f"{word_data['word']}\n[{word_data['phonetic']}]\n{word_data['part_of_speech']}"
            correct_answer = word_data["translation"]
            options = [d["translation"] for d in distractors] + [correct_answer]
        else:
            # 中文選英文
            question = word_data["translation"]
            correct_answer = word_data["word"]
            options = [d["word"] for d in distractors] + [correct_answer]

        # 隨機打亂選項順序
        random.shuffle(options)
        correct_index = options.index(correct_answer)

        return {
            "type": mode.value,
            "question": question,
            "options": options,
            "correct_answer": correct_answer,
            "correct_index": correct_index,
        }

    def _get_distractors(
        self, word_data: Dict, count: int = 3, mode: QuizMode = None
    ) -> List[Dict]:
        """生成干擾選項

        Args:
            word_data: 正確答案的單字資料
            count: 需要的干擾選項數量
            mode: 測驗模式

        Returns:
            干擾選項列表
        """
        word_id = word_data["id"]
        word_level = word_data["level"]
        distractors = []

        # 策略 1: 優先從相同級別取得
        same_level_words = self.db.get_random_words_by_level(
            level=word_level, exclude_id=word_id, limit=count
        )
        distractors.extend(same_level_words)

        # 策略 2: 如果不足，從相鄰級別補充
        if len(distractors) < count:
            nearby_words = self.db.get_random_words_nearby_level(
                level=word_level, exclude_id=word_id, limit=count - len(distractors)
            )
            distractors.extend(nearby_words)

        # 確保不重複
        seen = {word_id}
        unique_distractors = []
        for d in distractors:
            if d["id"] not in seen:
                seen.add(d["id"])
                unique_distractors.append(d)
                if len(unique_distractors) >= count:
                    break

        return unique_distractors[:count]

    def check_answer(
        self, user_answer: str, correct_answer: str, question_type: str
    ) -> bool:
        """檢查答案是否正確

        Args:
            user_answer: 使用者答案
            correct_answer: 正確答案
            question_type: 問題類型

        Returns:
            是否正確
        """
        # 移除首尾空白，轉小寫比較
        user_answer = user_answer.strip().lower()
        correct_answer = correct_answer.strip().lower()

        # 對於中文答案，允許部分匹配
        if question_type == "zh2en":
            return user_answer == correct_answer
        else:
            # 中文翻譯可能有多個，只要包含關鍵詞就算對
            # 例如：「能，可以」只要答「能」或「可以」都對
            keywords = [k.strip() for k in correct_answer.replace("；", ",").split(",")]
            return any(keyword in user_answer for keyword in keywords)

    def submit_answer(
        self, vocabulary_id: int, is_correct: bool, is_new_word: bool = False
    ) -> Dict:
        """提交答題結果並更新學習進度

        Args:
            vocabulary_id: 單字 ID
            is_correct: 是否答對
            is_new_word: 是否為新單字

        Returns:
            更新後的進度資訊
        """
        # 取得當前進度
        progress = self.db.get_progress(vocabulary_id)

        if progress:
            current_ef = progress["ease_factor"]
            current_interval = progress["interval_days"]
            review_count = progress["review_count"]
        else:
            current_ef = 2.5
            current_interval = 0
            review_count = 0

        # 根據答題結果轉換為評分
        # 答對 → rating=4（簡單）
        # 答錯 → rating=1（很難）
        rating = 4 if is_correct else 1

        # 使用 SM-2 演算法計算下次複習
        new_ef, new_interval, next_review = self.sm2.calculate_next_review(
            rating=rating,
            current_ease_factor=current_ef,
            current_interval_days=current_interval,
            review_count=review_count,
        )

        # 更新資料庫
        self.db.update_progress(
            vocabulary_id=vocabulary_id,
            ease_factor=new_ef,
            interval_days=new_interval,
            next_review=next_review,
            is_correct=is_correct,
        )

        # 記錄學習統計
        if is_new_word:
            self.db.record_study_session(
                new_words=1, correct=1 if is_correct else 0, total=1
            )
        else:
            self.db.record_study_session(
                reviewed_words=1, correct=1 if is_correct else 0, total=1
            )

        return {
            "ease_factor": new_ef,
            "interval_days": new_interval,
            "next_review": next_review,
            "is_correct": is_correct,
        }

    def submit_binary_answer(
        self, vocabulary_id: int, know: bool, is_new_word: bool = False
    ) -> Dict:
        """提交二元答題結果（會/不會）並更新學習進度

        使用簡化的二元評分系統，更符合翻牌學習模式

        Args:
            vocabulary_id: 單字 ID
            know: True 表示「會」，False 表示「不會」
            is_new_word: 是否為新單字

        Returns:
            更新後的進度資訊
        """
        # 取得當前進度
        progress = self.db.get_progress(vocabulary_id)

        if progress:
            current_ef = progress["ease_factor"]
            current_interval = progress["interval_days"]
            review_count = progress["review_count"]
        else:
            current_ef = 2.5
            current_interval = 0
            review_count = 0

        # 使用二元 SM-2 演算法計算下次複習
        new_ef, new_interval, next_review = self.sm2.calculate_binary(
            know=know,
            current_ease_factor=current_ef,
            current_interval_days=current_interval,
            review_count=review_count,
        )

        # 更新資料庫
        self.db.update_progress(
            vocabulary_id=vocabulary_id,
            ease_factor=new_ef,
            interval_days=new_interval,
            next_review=next_review,
            is_correct=know,
        )

        # 記錄學習統計
        if is_new_word:
            self.db.record_study_session(new_words=1, correct=1 if know else 0, total=1)
        else:
            self.db.record_study_session(
                reviewed_words=1, correct=1 if know else 0, total=1
            )

        return {
            "ease_factor": new_ef,
            "interval_days": new_interval,
            "next_review": next_review,
            "is_correct": know,
        }

    def submit_rating(
        self, vocabulary_id: int, rating: int, is_new_word: bool = False
    ) -> Dict:
        """提交評分並更新學習進度

        Args:
            vocabulary_id: 單字 ID
            rating: 評分 (0-5)
            is_new_word: 是否為新單字

        Returns:
            更新後的進度資訊
        """
        # 取得當前進度
        progress = self.db.get_progress(vocabulary_id)

        if progress:
            current_ef = progress["ease_factor"]
            current_interval = progress["interval_days"]
            review_count = progress["review_count"]
        else:
            current_ef = 2.5
            current_interval = 0
            review_count = 0

        # 使用 SM-2 演算法計算下次複習
        new_ef, new_interval, next_review = self.sm2.calculate_next_review(
            rating=rating,
            current_ease_factor=current_ef,
            current_interval_days=current_interval,
            review_count=review_count,
        )

        # 更新資料庫
        is_correct = rating >= 3
        self.db.update_progress(
            vocabulary_id=vocabulary_id,
            ease_factor=new_ef,
            interval_days=new_interval,
            next_review=next_review,
            is_correct=is_correct,
        )

        # 記錄學習統計
        if is_new_word:
            self.db.record_study_session(
                new_words=1, correct=1 if is_correct else 0, total=1
            )
        else:
            self.db.record_study_session(
                reviewed_words=1, correct=1 if is_correct else 0, total=1
            )

        return {
            "ease_factor": new_ef,
            "interval_days": new_interval,
            "next_review": next_review,
            "is_correct": is_correct,
        }

    def get_study_session_summary(self) -> Dict:
        """取得本次學習統計摘要

        Returns:
            統計資訊字典
        """
        stats = self.db.get_learning_statistics()
        return {
            "today_new": stats["today"]["new_words"],
            "today_reviewed": stats["today"]["reviewed_words"],
            "today_correct": stats["today"]["correct_count"],
            "today_total": stats["today"]["total_count"],
            "today_accuracy": (
                round(
                    stats["today"]["correct_count"]
                    * 100
                    / stats["today"]["total_count"]
                )
                if stats["today"]["total_count"] > 0
                else 0
            ),
            "streak_days": stats["streak_days"],
            "total_learned": stats["learned_words"],
            "total_words": stats["total_words"],
        }

    def close(self):
        """關閉資料庫連接"""
        self.db.close()


if __name__ == "__main__":
    # 測試測驗引擎
    engine = QuizEngine()

    print("測驗引擎測試")
    print("=" * 60)

    # 測試取得新單字
    print("\n取得 Level 1 的 5 個新單字：")
    new_words = engine.get_quiz_words(mode="new", level=1, limit=5)
    print(f"  找到 {len(new_words)} 個新單字")

    if new_words:
        # 測試生成問題
        word = new_words[0]
        print(f"\n測試單字：{word['word']}")

        for mode in [
            QuizMode.FLASHCARD,
            QuizMode.ENGLISH_TO_CHINESE,
            QuizMode.CHINESE_TO_ENGLISH,
        ]:
            q_type, question, answer = engine.generate_quiz_question(word, mode)
            print(f"\n  模式：{mode.value}")
            print(f"  問題：{question}")
            print(f"  答案：{answer}")

        # 測試評分更新
        print(f"\n測試評分更新（rating=4）")
        result = engine.submit_rating(word["id"], rating=4, is_new_word=True)
        print(f"  難度因子：{result['ease_factor']:.2f}")
        print(f"  間隔天數：{result['interval_days']}")
        print(f"  下次複習：{result['next_review']}")

    # 顯示統計
    summary = engine.get_study_session_summary()
    print(f"\n學習統計：")
    print(f"  今日新學：{summary['today_new']} 個")
    print(f"  今日複習：{summary['today_reviewed']} 個")
    print(f"  今日正確率：{summary['today_accuracy']}%")
    print(f"  連續天數：{summary['streak_days']} 天")
    print(f"  總學習進度：{summary['total_learned']}/{summary['total_words']}")

    engine.close()
