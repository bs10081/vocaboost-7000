"""
TUI 主應用程式
使用 Textual 框架建立終端使用者介面
"""

from textual.app import App, ComposeResult
from textual.widgets import Header, Footer
from textual.binding import Binding


class VocabularyLearningApp(App):
    """7000 單字學習 TUI 應用程式"""

    # CSS 樣式
    CSS = """
    Screen {
        background: $surface;
    }

    Header {
        background: $primary;
        color: $text;
    }

    Footer {
        background: $panel;
    }
    """

    # 鍵盤綁定
    BINDINGS = [
        Binding("q", "quit", "離開", priority=True),
        Binding("h", "show_home", "主選單"),
        Binding("s", "show_stats", "統計"),
        Binding("f", "show_favorites", "收藏"),
    ]

    def __init__(self):
        """初始化應用程式"""
        super().__init__()
        self.title = "📚 7000 單字學習系統"
        self.sub_title = "間隔重複學習法"

    def compose(self) -> ComposeResult:
        """組合 UI 元件"""
        yield Header()
        # 主要內容區域將由各個 Screen 提供
        yield Footer()

    def on_mount(self) -> None:
        """應用程式啟動時執行"""
        # 預設顯示主選單
        from tui.screens.home import HomeScreen
        self.push_screen(HomeScreen())

    def action_show_home(self) -> None:
        """顯示主選單"""
        from tui.screens.home import HomeScreen
        self.push_screen(HomeScreen())

    def action_show_stats(self) -> None:
        """顯示統計頁面"""
        from tui.screens.stats import StatsScreen
        self.push_screen(StatsScreen())

    def action_show_favorites(self) -> None:
        """顯示收藏頁面"""
        from tui.screens.favorites import FavoritesScreen
        self.push_screen(FavoritesScreen())


def run():
    """啟動應用程式"""
    app = VocabularyLearningApp()
    app.run()


if __name__ == "__main__":
    run()
