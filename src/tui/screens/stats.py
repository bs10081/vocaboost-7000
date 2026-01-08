"""
統計儀表板畫面
顯示學習進度、各級別完成度、連續天數等統計資訊
"""

import sys
sys.path.insert(0, '/Users/bs10081/Developer/7000-english-vocabulary-trainer/src')

from textual.screen import Screen
from textual.app import ComposeResult
from textual.widgets import Static, Label
from textual.containers import Container, Vertical
from textual.binding import Binding

from quiz_engine import QuizEngine


class StatsScreen(Screen):
    """統計儀表板畫面"""

    CSS = """
    StatsScreen {
        align: center middle;
    }

    .title {
        text-align: center;
        text-style: bold;
        color: $accent;
        margin: 1 0;
    }

    .stats-container {
        width: 80;
        height: auto;
        border: solid $primary;
        padding: 2;
        background: $panel;
    }

    .progress-bar {
        width: 100%;
        height: 1;
        margin: 0 0 1 0;
    }

    .level-stats {
        margin: 1 0;
    }

    .stat-row {
        margin: 0 0 1 0;
    }
    """

    BINDINGS = [
        Binding("escape", "app.pop_screen", "返回"),
        Binding("q", "app.pop_screen", "返回"),
    ]

    def __init__(self):
        """初始化統計畫面"""
        super().__init__()
        self.quiz_engine = QuizEngine()

    def compose(self) -> ComposeResult:
        """組合 UI 元件"""
        stats = self.quiz_engine.db.get_learning_statistics()

        with Container():
            yield Label("📊 學習統計", classes="title")

            with Vertical(classes="stats-container"):
                # 總進度
                total_percentage = round(stats['learned_words'] * 100 / stats['total_words'], 1)
                progress_blocks = int(total_percentage / 5)  # 每 5% 一個方塊
                progress_bar = "█" * progress_blocks + "░" * (20 - progress_blocks)

                yield Static(
                    f"總進度: {progress_bar} {total_percentage}% ({stats['learned_words']}/{stats['total_words']})",
                    classes="stat-row"
                )

                # 各級別進度
                yield Static("\n各級別進度：", classes="level-stats")

                for level_stat in stats['by_level']:
                    level = level_stat['level']
                    percentage = level_stat['percentage']
                    learned = level_stat['learned']
                    total = level_stat['total']

                    progress_blocks = int(percentage / 5)
                    progress_bar = "█" * progress_blocks + "░" * (20 - progress_blocks)

                    yield Static(
                        f"  Level {level}: {progress_bar} {percentage}% ({learned}/{total})",
                        classes="stat-row"
                    )

                # 其他統計
                yield Static("\n學習統計：", classes="level-stats")
                yield Static(
                    f"  🔥 連續學習: {stats['streak_days']} 天",
                    classes="stat-row"
                )
                yield Static(
                    f"  📅 今日新學: {stats['today']['new_words']} 個",
                    classes="stat-row"
                )
                yield Static(
                    f"  📅 今日複習: {stats['today']['reviewed_words']} 個",
                    classes="stat-row"
                )

                if stats['today']['total_count'] > 0:
                    accuracy = round(stats['today']['correct_count'] * 100 / stats['today']['total_count'])
                    yield Static(
                        f"  ✅ 今日正確率: {accuracy}% ({stats['today']['correct_count']}/{stats['today']['total_count']})",
                        classes="stat-row"
                    )

                yield Static(
                    f"  ⭐ 收藏難詞: {stats['favorite_words']} 個",
                    classes="stat-row"
                )
                yield Static(
                    f"  📝 待複習: {stats['due_words']} 個",
                    classes="stat-row"
                )

                yield Static("\n按 [ESC] 或 [Q] 返回主選單", classes="stat-row")

    def on_unmount(self):
        """畫面卸載時關閉資料庫"""
        self.quiz_engine.close()
