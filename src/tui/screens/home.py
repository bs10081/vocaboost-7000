"""
主選單畫面
顯示學習選項和統計資訊
"""

import sys

sys.path.insert(0, "/Users/bs10081/Developer/7000-english-vocabulary-trainer/src")

from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Button, Label, Static

from quiz_engine import QuizEngine


class HomeScreen(Screen):
    """主選單畫面"""

    CSS = """
    HomeScreen {
        layout: vertical;
        align: center middle;
    }

    .main-container {
        width: 100%;
        height: 100%;
        align: center middle;
    }

    .title {
        width: 100%;
        text-align: center;
        text-style: bold;
        color: $accent;
        margin: 1 0;
    }

    .menu-container {
        width: 1fr;
        max-width: 100;
        min-width: 60;
        height: auto;
        border: solid $primary;
        padding: 2;
        background: $panel;
        margin: 0 2;
    }

    .menu-button {
        width: 100%;
        height: 3;
        margin: 1 0;
    }

    .menu-button:hover {
        border: heavy $accent;
    }

    .menu-button-focused {
        border: heavy $accent;
    }

    .stats-bar {
        width: 100%;
        height: auto;
        min-height: 3;
        text-align: center;
        background: $boost;
        margin: 1 0;
        padding: 1;
    }

    .info-text {
        width: 100%;
        text-align: center;
        color: $text-muted;
    }
    """

    BINDINGS = [
        Binding("1", "start_review", "開始複習"),
        Binding("2", "start_new", "學習新單字"),
        Binding("3", "start_favorites", "難詞複習"),
        Binding("4", "show_stats", "學習統計"),
        Binding("5", "search_word", "搜尋單字"),
        Binding("q", "quit_app", "離開"),
        Binding("up", "navigate_up", "向上"),
        Binding("down", "navigate_down", "向下"),
        Binding("left", "level_down", "降低級別"),
        Binding("right", "level_up", "提高級別"),
        Binding("enter", "select_current", "選擇"),
    ]

    def __init__(self):
        """初始化主選單"""
        super().__init__()
        self.quiz_engine = QuizEngine()
        self.focused_index = 0  # 聚焦的按鈕索引 (0-5)
        self.selected_level = 1  # 選擇的學習級別 (1-6)
        self.button_ids = [
            "btn_review",
            "btn_new",
            "btn_favorites",
            "btn_stats",
            "btn_search",
            "btn_quit",
        ]

    def compose(self) -> ComposeResult:
        """組合 UI 元件"""
        # 取得統計資料
        stats = self.quiz_engine.get_study_session_summary()
        due_words = self.quiz_engine.get_quiz_words(mode="review", limit=500)
        favorite_count = len(self.quiz_engine.get_quiz_words(mode="favorite"))

        # 取得當前選擇 Level 的新單字數量
        new_words_count = self._get_new_words_count(self.selected_level)

        with Container(classes="main-container"):
            yield Label("📚 7000 單字學習系統", classes="title")

            with Vertical(classes="menu-container"):
                yield Static(
                    f"🔥 連續學習: {stats['streak_days']} 天  |  "
                    f"📈 今日進度: {stats['today_new']}新/{stats['today_reviewed']}複習  |  "
                    f"✅ 正確率: {stats['today_accuracy']}%",
                    classes="stats-bar",
                )

                yield Button(
                    f"[1] 📖 開始今日學習        待複習: {len(due_words)} 個",
                    id="btn_review",
                    classes="menu-button",
                )
                yield Button(
                    f"[2] 🆕 學習新單字          ◀ Level {self.selected_level} ▶  ({new_words_count} 個)",
                    id="btn_new",
                    classes="menu-button",
                )
                yield Button(
                    f"[3] ⭐ 難詞複習            收藏: {favorite_count} 個",
                    id="btn_favorites",
                    classes="menu-button",
                )
                yield Button("[4] 📊 學習統計", id="btn_stats", classes="menu-button")
                yield Button("[5] 🔍 搜尋單字", id="btn_search", classes="menu-button")

                yield Static(
                    f"\n總進度: {stats['total_learned']}/{stats['total_words']} "
                    f"({round(stats['total_learned'] * 100 / stats['total_words'], 1)}%)",
                    classes="info-text",
                )

                yield Button("[Q] 離開", id="btn_quit", classes="menu-button")

    def _get_new_words_count(self, level: int) -> int:
        """取得指定 Level 的新單字數量

        Args:
            level: 級別 (1-6)

        Returns:
            新單字數量
        """
        new_words = self.quiz_engine.get_quiz_words(mode="new", level=level, limit=1000)
        return len(new_words)

    def on_mount(self) -> None:
        """畫面載入時設置初始聚焦"""
        self._update_focus()

    def _update_focus(self) -> None:
        """更新按鈕聚焦狀態"""
        for i, button_id in enumerate(self.button_ids):
            button = self.query_one(f"#{button_id}", Button)
            if i == self.focused_index:
                button.add_class("menu-button-focused")
            else:
                button.remove_class("menu-button-focused")

    def action_navigate_up(self) -> None:
        """向上導航"""
        if self.focused_index > 0:
            self.focused_index -= 1
            self._update_focus()

    def action_navigate_down(self) -> None:
        """向下導航"""
        if self.focused_index < len(self.button_ids) - 1:
            self.focused_index += 1
            self._update_focus()

    def action_level_up(self) -> None:
        """提高 Level（按 →）"""
        # 只有在聚焦「學習新單字」按鈕時才有效
        if self.focused_index == 1:  # btn_new 的索引
            if self.selected_level < 6:
                self.selected_level += 1
                self._update_new_button()

    def action_level_down(self) -> None:
        """降低 Level（按 ←）"""
        # 只有在聚焦「學習新單字」按鈕時才有效
        if self.focused_index == 1:  # btn_new 的索引
            if self.selected_level > 1:
                self.selected_level -= 1
                self._update_new_button()

    def _update_new_button(self) -> None:
        """更新「學習新單字」按鈕的文字"""
        new_words_count = self._get_new_words_count(self.selected_level)
        button = self.query_one("#btn_new", Button)
        button.label = f"[2] 🆕 學習新單字          ◀ Level {self.selected_level} ▶  ({new_words_count} 個)"

    def action_select_current(self) -> None:
        """選擇當前聚焦的選項"""
        button_id = self.button_ids[self.focused_index]

        if button_id == "btn_review":
            self.action_start_review()
        elif button_id == "btn_new":
            self.action_start_new()
        elif button_id == "btn_favorites":
            self.action_start_favorites()
        elif button_id == "btn_stats":
            self.action_show_stats()
        elif button_id == "btn_search":
            self.action_search_word()
        elif button_id == "btn_quit":
            self.action_quit_app()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """處理按鈕點擊事件"""
        button_id = event.button.id

        if button_id == "btn_review":
            self.action_start_review()
        elif button_id == "btn_new":
            self.action_start_new()
        elif button_id == "btn_favorites":
            self.action_start_favorites()
        elif button_id == "btn_stats":
            self.action_show_stats()
        elif button_id == "btn_search":
            self.action_search_word()
        elif button_id == "btn_quit":
            self.action_quit_app()

    def action_start_review(self) -> None:
        """開始複習"""
        from tui.screens.study import StudyScreen

        self.app.push_screen(StudyScreen(mode="review"))

    def action_start_new(self) -> None:
        """學習新單字"""
        from tui.screens.study import StudyScreen

        # 使用用戶選擇的 Level
        self.app.push_screen(StudyScreen(mode="new", level=self.selected_level))

    def action_start_favorites(self) -> None:
        """複習收藏的難詞"""
        from tui.screens.study import StudyScreen

        self.app.push_screen(StudyScreen(mode="favorite"))

    def action_show_stats(self) -> None:
        """顯示統計"""
        from tui.screens.stats import StatsScreen

        self.app.push_screen(StatsScreen())

    def action_search_word(self) -> None:
        """搜尋單字"""
        # TODO: 實作搜尋功能
        self.app.notify("搜尋功能尚未實作", severity="information")

    def action_quit_app(self) -> None:
        """離開應用程式"""
        self.quiz_engine.close()
        self.app.exit()
