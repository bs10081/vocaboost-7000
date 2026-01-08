"""
SM-2 間隔重複演算法
基於 Anki 使用的 SuperMemo SM-2 演算法實作
用於計算單字複習的最佳間隔時間
"""

from datetime import datetime, timedelta
from typing import Tuple


class SM2Algorithm:
    """SM-2 間隔重複演算法實作"""

    # 評分定義
    RATING_AGAIN = 0  # 完全不會
    RATING_HARD = 1  # 很難
    RATING_GOOD = 2  # 有點難
    RATING_EASY = 3  # 普通
    RATING_PERFECT = 4  # 簡單
    RATING_KNOWN = 5  # 已經會了（快速跳過）

    def __init__(self):
        """初始化 SM-2 演算法"""
        self.min_ease_factor = 1.3  # 最小難度因子
        self.max_ease_factor = 3.0  # 最大難度因子
        self.initial_ease_factor = 2.5  # 初始難度因子
        self.initial_intervals = [1, 3, 7]  # 前三次學習的固定間隔

    def calculate_next_review(
        self,
        rating: int,
        current_ease_factor: float = 2.5,
        current_interval_days: int = 0,
        review_count: int = 0,
    ) -> Tuple[float, int, str]:
        """計算下次複習時間

        Args:
            rating: 評分 (0-5)
            current_ease_factor: 當前難度因子
            current_interval_days: 當前間隔天數
            review_count: 複習次數

        Returns:
            (新的難度因子, 間隔天數, 下次複習日期)
        """
        # 1. 計算新的難度因子
        new_ease_factor = self._calculate_ease_factor(rating, current_ease_factor)

        # 2. 計算間隔天數
        interval_days = self._calculate_interval(
            rating, new_ease_factor, current_interval_days, review_count
        )

        # 3. 計算下次複習日期
        next_review_date = self._get_next_review_date(interval_days)

        return (new_ease_factor, interval_days, next_review_date)

    def calculate_binary(
        self,
        know: bool,
        current_ease_factor: float = 2.5,
        current_interval_days: int = 0,
        review_count: int = 0,
    ) -> Tuple[float, int, str]:
        """使用二元「會」/「不會」評分計算下次複習時間

        基於 FSRS 和 Leitner 系統的簡化 SM-2 演算法
        研究來源：
        - Anki FSRS FAQ 確認二元評分的有效性
        - Leitner 系統的盒子進階機制
        - Fresh Cards 的自訂演算法指南

        Args:
            know: True 表示「會」，False 表示「不會」
            current_ease_factor: 當前難度因子
            current_interval_days: 當前間隔天數
            review_count: 複習次數

        Returns:
            (新的難度因子, 間隔天數, 下次複習日期)
        """
        if know:
            # 「會」：難度因子小幅上升
            new_ease_factor = min(current_ease_factor + 0.1, self.max_ease_factor)

            # 前三次使用固定間隔，建立記憶基礎
            if review_count < 3:
                interval_days = self.initial_intervals[review_count]
            else:
                # 後續使用難度因子乘法
                interval_days = int(current_interval_days * new_ease_factor)
        else:
            # 「不會」：難度因子下降，重置間隔
            new_ease_factor = max(current_ease_factor - 0.2, self.min_ease_factor)
            # 回到第一天重新學習
            interval_days = 1

        # 計算下次複習日期
        next_review_date = self._get_next_review_date(interval_days)

        return (new_ease_factor, interval_days, next_review_date)

    def _calculate_ease_factor(self, rating: int, current_ease_factor: float) -> float:
        """計算新的難度因子

        Args:
            rating: 評分 (0-5)
            current_ease_factor: 當前難度因子

        Returns:
            新的難度因子
        """
        # 使用 SM-2 公式計算新的難度因子
        # EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        # 其中 q 是評分 (0-5)

        new_ef = current_ease_factor + (
            0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02)
        )

        # 確保難度因子不低於最小值
        return max(new_ef, self.min_ease_factor)

    def _calculate_interval(
        self, rating: int, ease_factor: float, current_interval: int, review_count: int
    ) -> int:
        """計算間隔天數

        Args:
            rating: 評分 (0-5)
            ease_factor: 難度因子
            current_interval: 當前間隔
            review_count: 複習次數

        Returns:
            新的間隔天數
        """
        # 評分低於 3：重新開始
        if rating < 3:
            return 1

        # 評分 = 5（已會）：快速跳過，設為 30 天
        if rating == self.RATING_KNOWN:
            return 30

        # 首次學習
        if review_count == 0:
            if rating == 3:
                return 1
            elif rating == 4:
                return 3
            else:  # rating >= 5
                return 7

        # 第二次複習
        if review_count == 1:
            return 6

        # 後續複習：使用難度因子
        return int(current_interval * ease_factor)

    def _get_next_review_date(self, interval_days: int) -> str:
        """計算下次複習日期

        Args:
            interval_days: 間隔天數

        Returns:
            日期字串 (YYYY-MM-DD)
        """
        next_date = datetime.now() + timedelta(days=interval_days)
        return next_date.strftime("%Y-%m-%d")


if __name__ == "__main__":
    # 測試 SM-2 演算法
    sm2 = SM2Algorithm()

    print("SM-2 演算法測試")
    print("=" * 60)

    # 測試情境 1：新單字，完全不會
    print("\n情境 1：新單字，完全不會 (rating=0)")
    ef, interval, next_review = sm2.calculate_next_review(
        rating=0, current_ease_factor=2.5, current_interval_days=0, review_count=0
    )
    print(f"  難度因子: {ef:.2f}, 間隔: {interval} 天, 下次複習: {next_review}")

    # 測試情境 2：新單字，已經會了
    print("\n情境 2：新單字，已經會了 (rating=5)")
    ef, interval, next_review = sm2.calculate_next_review(
        rating=5, current_ease_factor=2.5, current_interval_days=0, review_count=0
    )
    print(f"  難度因子: {ef:.2f}, 間隔: {interval} 天, 下次複習: {next_review}")

    # 測試情境 3：複習單字，簡單
    print("\n情境 3：複習單字 (第 3 次)，簡單 (rating=4)")
    ef, interval, next_review = sm2.calculate_next_review(
        rating=4, current_ease_factor=2.5, current_interval_days=6, review_count=2
    )
    print(f"  難度因子: {ef:.2f}, 間隔: {interval} 天, 下次複習: {next_review}")

    # 測試情境 4：複習單字，忘記了
    print("\n情境 4：複習單字，忘記了 (rating=1)")
    ef, interval, next_review = sm2.calculate_next_review(
        rating=1, current_ease_factor=2.5, current_interval_days=15, review_count=5
    )
    print(f"  難度因子: {ef:.2f}, 間隔: {interval} 天, 下次複習: {next_review}")
