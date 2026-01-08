"""
學習/測驗畫面
處理單字學習、測驗、評分（翻牌模式）
"""

import sys

sys.path.insert(0, "/Users/bs10081/Developer/7000-english-vocabulary-trainer/src")


def debug_log(msg):
    """簡單的 debug 日誌函數"""
    try:
        with open("/tmp/vocab_study_debug.log", "a") as f:
            from datetime import datetime

            f.write(f"{datetime.now()} - {msg}\n")
    except:
        pass


from textual.app import ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.screen import Screen
from textual.widgets import Button, Label, Static

from quiz_engine import QuizEngine


class StudyScreen(Screen):
    """學習/測驗畫面（翻牌模式）"""

    CSS = """
    StudyScreen {
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

    .study-container {
        width: 1fr;
        max-width: 100;
        min-width: 60;
        height: auto;
        border: solid $primary;
        padding: 2;
        background: $panel;
        margin: 0 2;
    }

    .progress-bar {
        width: 100%;
        height: 1;
        margin: 0 0 2 0;
        text-align: center;
    }

    .card-container {
        width: 100%;
        min-height: 15;
        height: auto;
        border: solid $accent;
        padding: 3;
        text-align: center;
        background: $boost;
        align: center middle;
        margin: 0 0 2 0;
    }

    .word-display {
        width: 100%;
        text-style: bold;
        color: $success;
        text-align: center;
        margin: 1 0;
    }

    .phonetic-display {
        width: 100%;
        text-align: center;
        color: $text-muted;
        margin: 1 0;
    }

    .part-of-speech {
        width: 100%;
        text-align: center;
        color: $warning;
        margin: 1 0;
    }

    .translation-display {
        width: 100%;
        text-align: center;
        color: $accent;
        text-style: bold;
        margin: 2 0;
    }

    .hint-text {
        width: 100%;
        text-align: center;
        color: $text-muted;
        margin: 2 0;
    }

    .binary-buttons {
        width: 100%;
        height: auto;
        layout: horizontal;
        align: center middle;
        margin: 1 0;
    }

    .binary-button {
        width: 1fr;
        height: 3;
        min-width: 20;
        margin: 0 1;
    }

    .binary-button:hover {
        border: heavy $accent;
    }

    .binary-button-focused {
        border: heavy $accent;
    }

    .button-dont-know {
        background: $error;
    }

    .button-know {
        background: $success;
    }

    .feedback-text {
        width: 100%;
        text-align: center;
        margin: 1 0;
        color: $text-muted;
    }
    """

    BINDINGS = [
        Binding("escape", "go_back", "返回"),
        Binding("space", "reveal_answer", "顯示答案"),
        Binding("up", "go_previous", "上一題"),
        Binding("left", "select_dont_know", "不會"),
        Binding("right", "select_know", "會"),
    ]

    def __init__(self, mode: str = "review", level: int = None):
        """初始化學習畫面

        Args:
            mode: 模式 ("review", "new", "favorite")
            level: 級別 (僅對 new 模式有效)
        """
        super().__init__()
        self.mode = mode
        self.level = level
        debug_log(f"__init__() - mode={mode}, level={level}")
        self.quiz_engine = QuizEngine()
        self.words = []
        self.current_index = 0
        self.current_word = None
        self.show_answer = False  # 是否顯示答案面
        self.wrong_words = []  # 答錯的單字列表
        self.focused_button = 0  # 聚焦的按鈕索引 (0=不會, 1=會)
        self.history = []  # 歷史記錄用於返回上一題
        self._mounted = False  # 防止重複 mount
        self._is_active = True  # 螢幕是否活躍
        self._processing = False  # 是否正在處理答案
        self._db_closed = False  # 資料庫是否已關閉

    def compose(self) -> ComposeResult:
        """組合 UI 元件"""
        # 取得單字
        if self.mode == "new":
            debug_log(f"compose() - mode={self.mode}, level={self.level}")
            self.words = self.quiz_engine.get_quiz_words(
                mode="new", level=self.level, limit=50
            )
            debug_log(f"compose() - 取得 {len(self.words)} 個單字")
            # 使用通知顯示 debug 資訊
            if hasattr(self, "app"):
                self.app.notify(
                    f"DEBUG: compose() 取得 {len(self.words)} 個單字",
                    severity="information",
                )
            mode_text = f"學習新單字 (Level {self.level})"
        elif self.mode == "favorite":
            self.words = self.quiz_engine.get_quiz_words(mode="favorite")
            mode_text = "收藏難詞複習"
        else:
            self.words = self.quiz_engine.get_quiz_words(mode="review", limit=50)
            mode_text = "今日複習"

        with Container(classes="main-container"):
            yield Label(f"📖 {mode_text}", classes="title")

            with Vertical(classes="study-container"):
                # 進度條
                yield Static("", id="progress_bar", classes="progress-bar")

                # 卡片區域（翻牌）
                with Vertical(id="card_container", classes="card-container"):
                    # 問題面：單字、音標、詞性
                    yield Static("", id="word_text", classes="word-display")
                    yield Static("", id="phonetic_text", classes="phonetic-display")
                    yield Static("", id="pos_text", classes="part-of-speech")

                    # 答案面：翻譯（初始隱藏）
                    yield Static(
                        "", id="translation_text", classes="translation-display"
                    )

                    # 提示文字
                    yield Static("", id="hint_text", classes="hint-text")

                # 回饋訊息
                yield Static("", id="feedback_text", classes="feedback-text")

                # 二元評分按鈕（初始隱藏）
                with Horizontal(id="binary_buttons", classes="binary-buttons"):
                    yield Button(
                        "❌ 不會",
                        id="btn_dont_know",
                        classes="binary-button button-dont-know",
                    )
                    yield Button(
                        "✅ 會", id="btn_know", classes="binary-button button-know"
                    )

    def on_mount(self) -> None:
        """畫面載入時執行"""
        # 防止重複執行
        if self._mounted:
            return
        self._mounted = True

        debug_log(
            f"on_mount() - words count: {len(self.words)}, mode={self.mode}, level={self.level}"
        )

        # 如果 words 是空的，嘗試重新載入
        if not self.words:
            debug_log("on_mount() - words 是空的，嘗試重新載入")
            if self.mode == "new":
                self.words = self.quiz_engine.get_quiz_words(
                    mode="new", level=self.level, limit=50
                )
                debug_log(f"on_mount() - 重新載入後: {len(self.words)} 個單字")
            elif self.mode == "favorite":
                self.words = self.quiz_engine.get_quiz_words(mode="favorite")
            elif self.mode == "review":
                self.words = self.quiz_engine.get_quiz_words(mode="review", limit=50)

        self.app.notify(
            f"DEBUG: on_mount() 檢查到 {len(self.words)} 個單字", severity="information"
        )

        if not self.words:
            debug_log("on_mount() - 依然沒有單字，準備關閉螢幕")
            self.app.notify("沒有單字可以學習", severity="warning")
            # 延遲關閉螢幕，避免在初始化時立即 pop
            self.set_timer(0.5, self._safe_pop_screen)
            return

        debug_log("on_mount() - 開始顯示單字")
        self.show_next_word()

    def show_next_word(self) -> None:
        """顯示下一個單字（問題面）"""
        if self.current_index >= len(self.words):
            # 檢查是否有答錯的單字需要重測
            if self.wrong_words:
                self.app.notify(
                    f"有 {len(self.wrong_words)} 個單字需要重測", severity="information"
                )
                self.words = self.wrong_words.copy()
                self.wrong_words = []
                self.current_index = 0
            else:
                # 學習完成
                self.show_completion_screen()
                return

        self.current_word = self.words[self.current_index]
        self.show_answer = False

        # 更新進度
        progress_text = f"進度: {self.current_index + 1}/{len(self.words)}"
        self.query_one("#progress_bar").update(progress_text)

        # 顯示問題面：單字、音標、詞性
        self.query_one("#word_text").update(self.current_word["word"])
        self.query_one("#phonetic_text").update(f"[{self.current_word['phonetic']}]")
        self.query_one("#pos_text").update(self.current_word["part_of_speech"])

        # 隱藏答案面
        self.query_one("#translation_text").update("")
        self.query_one("#translation_text").display = False

        # 顯示提示
        self.query_one("#hint_text").update("[按空格顯示答案]")
        self.query_one("#hint_text").display = True

        # 隱藏按鈕和回饋
        self.query_one("#binary_buttons").display = False
        self.query_one("#feedback_text").update("")

    def action_reveal_answer(self) -> None:
        """顯示答案面（按空格鍵）"""
        if self.show_answer or not self.current_word:
            return

        self.show_answer = True

        # 顯示答案面：翻譯
        translation = self.current_word["translation"]
        self.query_one("#translation_text").update(f"🍎 {translation}")
        self.query_one("#translation_text").display = True

        # 隱藏提示，顯示按鈕說明
        self.query_one("#hint_text").update("← 不會    → 會    ↑ 上一題")

        # 顯示二元評分按鈕並設置聚焦
        self.query_one("#binary_buttons").display = True
        self.focused_button = 0  # 預設聚焦左側「不會」
        self._update_button_focus()

    def _update_button_focus(self) -> None:
        """更新按鈕聚焦狀態"""
        dont_know_btn = self.query_one("#btn_dont_know", Button)
        know_btn = self.query_one("#btn_know", Button)

        if self.focused_button == 0:
            dont_know_btn.add_class("binary-button-focused")
            know_btn.remove_class("binary-button-focused")
        else:
            dont_know_btn.remove_class("binary-button-focused")
            know_btn.add_class("binary-button-focused")

    def action_select_dont_know(self) -> None:
        """選擇「不會」（按 ←）"""
        if not self.show_answer or self._processing:
            return
        self.focused_button = 0
        self._update_button_focus()
        # 直接提交答案
        self.handle_binary_answer(know=False)

    def action_select_know(self) -> None:
        """選擇「會」（按 →）"""
        if not self.show_answer or self._processing:
            return
        self.focused_button = 1
        self._update_button_focus()
        # 直接提交答案
        self.handle_binary_answer(know=True)

    def action_go_previous(self) -> None:
        """返回上一題（按 ↑）"""
        if not self.history:
            self.app.notify("已經是第一題了", severity="information")
            return

        # 從歷史記錄恢復
        prev_state = self.history.pop()
        self.current_index = prev_state["index"]
        self.current_word = prev_state["word"]
        self.show_answer = False

        # 更新 UI
        self._display_question()

    def handle_binary_answer(self, know: bool) -> None:
        """處理二元答題結果

        Args:
            know: True 表示「會」，False 表示「不會」
        """
        if not self.current_word or self._processing:
            return

        self._processing = True  # 防止重複提交

        # 保存到歷史記錄（用於返回上一題）
        self.history.append(
            {"index": self.current_index, "word": self.current_word.copy()}
        )

        # 更新學習進度（使用二元評分）
        is_new_word = self.mode == "new"
        result = self.quiz_engine.submit_binary_answer(
            vocabulary_id=self.current_word["id"],
            know=know,
            is_new_word=is_new_word,
        )

        # 顯示回饋
        if know:
            feedback = f"✅ 太棒了！下次複習：{result['interval_days']} 天後"
            self.query_one("#feedback_text").update(feedback)
        else:
            feedback = "❌ 沒關係，明天再複習！"
            self.query_one("#feedback_text").update(feedback)
            # 加入錯題列表
            if self.current_word not in self.wrong_words:
                self.wrong_words.append(self.current_word)

        # 短暫延遲後進入下一題（使用安全方法）
        self.set_timer(1.0, self._safe_next_word)

    def _display_question(self) -> None:
        """顯示問題面（用於返回上一題）"""
        # 更新進度
        progress_text = f"進度: {self.current_index + 1}/{len(self.words)}"
        self.query_one("#progress_bar").update(progress_text)

        # 顯示問題面
        self.query_one("#word_text").update(self.current_word["word"])
        self.query_one("#phonetic_text").update(f"[{self.current_word['phonetic']}]")
        self.query_one("#pos_text").update(self.current_word["part_of_speech"])

        # 隱藏答案面
        self.query_one("#translation_text").update("")
        self.query_one("#translation_text").display = False

        # 顯示提示
        self.query_one("#hint_text").update("[按空格顯示答案]")
        self.query_one("#hint_text").display = True

        # 隱藏按鈕和回饋
        self.query_one("#binary_buttons").display = False
        self.query_one("#feedback_text").update("")

    def next_word(self) -> None:
        """進入下一個單字"""
        self.current_index += 1
        self.show_next_word()

    def _safe_next_word(self) -> None:
        """安全地進入下一題（檢查螢幕狀態）"""
        if self._is_active:
            self._processing = False
            self.next_word()

    def on_button_pressed(self, event: Button.Pressed) -> None:
        """處理按鈕點擊"""
        if not self.show_answer:
            return

        button_id = event.button.id
        if button_id == "btn_dont_know":
            self.handle_binary_answer(know=False)
        elif button_id == "btn_know":
            self.handle_binary_answer(know=True)

    def show_completion_screen(self) -> None:
        """顯示完成畫面"""
        summary = self.quiz_engine.get_study_session_summary()

        self.query_one("#word_text").update("🎉 學習完成！")
        self.query_one("#phonetic_text").update("")
        self.query_one("#pos_text").update("")
        self.query_one("#translation_text").update("")
        self.query_one("#translation_text").display = False
        self.query_one("#hint_text").update(
            f"今日新學：{summary['today_new']} 個\n"
            f"今日複習：{summary['today_reviewed']} 個\n"
            f"今日正確率：{summary['today_accuracy']}%\n\n"
            f"按 ESC 返回主選單"
        )
        self.query_one("#feedback_text").update("")
        self.query_one("#binary_buttons").display = False

    def _safe_pop_screen(self) -> None:
        """安全地關閉螢幕"""
        if self._is_active:
            self._is_active = False
            self.app.pop_screen()

    def action_go_back(self) -> None:
        """返回主選單"""
        self._is_active = False
        if not self._db_closed:
            self.quiz_engine.close()
            self._db_closed = True
        self.app.pop_screen()

    def on_unmount(self):
        """畫面卸載時關閉資料庫"""
        self._is_active = False  # 標記為非活躍
        if not self._db_closed:
            self.quiz_engine.close()
            self._db_closed = True
