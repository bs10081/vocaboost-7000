"""
收藏難詞畫面
顯示和管理收藏的難詞
"""

import sys
sys.path.insert(0, '/Users/bs10081/Developer/7000-english-vocabulary-trainer/src')

from textual.screen import Screen
from textual.app import ComposeResult
from textual.widgets import Static, Label, DataTable
from textual.containers import Container, Vertical
from textual.binding import Binding

from quiz_engine import QuizEngine


class FavoritesScreen(Screen):
    """收藏難詞畫面"""

    CSS = """
    FavoritesScreen {
        align: center middle;
    }

    .title {
        text-align: center;
        text-style: bold;
        color: $accent;
        margin: 1 0;
    }

    .favorites-container {
        width: 90;
        height: auto;
        border: solid $primary;
        padding: 2;
        background: $panel;
    }

    .favorites-table {
        width: 100%;
        height: 30;
    }

    .hint-text {
        text-align: center;
        color: $text-muted;
        margin: 1 0;
    }
    """

    BINDINGS = [
        Binding("escape", "app.pop_screen", "返回"),
        Binding("q", "app.pop_screen", "返回"),
        Binding("enter", "start_review", "開始複習"),
    ]

    def __init__(self):
        """初始化收藏畫面"""
        super().__init__()
        self.quiz_engine = QuizEngine()

    def compose(self) -> ComposeResult:
        """組合 UI 元件"""
        favorites = self.quiz_engine.get_quiz_words(mode="favorite")

        with Container():
            yield Label(f"⭐ 收藏難詞 ({len(favorites)} 個)", classes="title")

            with Vertical(classes="favorites-container"):
                if favorites:
                    # 建立表格
                    table = DataTable(id="favorites_table", classes="favorites-table")
                    table.add_columns("單字", "音標", "詞性", "翻譯", "複習次數")

                    for word in favorites:
                        review_count = word.get('review_count', 0)
                        table.add_row(
                            word['word'],
                            f"[{word['phonetic']}]",
                            word['part_of_speech'],
                            word['translation'][:30] + "..." if len(word['translation']) > 30 else word['translation'],
                            str(review_count)
                        )

                    yield table
                    yield Static(
                        "\n按 [Enter] 開始複習收藏的難詞\n按 [ESC] 或 [Q] 返回主選單",
                        classes="hint-text"
                    )
                else:
                    yield Static(
                        "\n目前沒有收藏的難詞\n\n"
                        "在學習過程中，您可以將覺得困難的單字標記為收藏\n\n"
                        "按 [ESC] 或 [Q] 返回主選單",
                        classes="hint-text"
                    )

    def action_start_review(self) -> None:
        """開始複習收藏的難詞"""
        favorites = self.quiz_engine.get_quiz_words(mode="favorite")
        if favorites:
            from tui.screens.study import StudyScreen
            self.app.push_screen(StudyScreen(mode="favorite"))

    def on_unmount(self):
        """畫面卸載時關閉資料庫"""
        self.quiz_engine.close()
