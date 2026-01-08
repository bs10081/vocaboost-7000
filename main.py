#!/usr/bin/env python3
"""
7000 單字學習 TUI 應用程式
主程式進入點
"""

import sys
from pathlib import Path

# 將 src 目錄加入 Python 路徑
sys.path.insert(0, str(Path(__file__).parent / 'src'))

from tui.app import run


if __name__ == "__main__":
    try:
        run()
    except KeyboardInterrupt:
        print("\n\n👋 感謝使用！持續學習，邁向成功！")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ 發生錯誤：{e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
