"""
Ocean Hunt Slot Monitor - Configuration
========================================
All tunable parameters in one place. Slot Ocean Hunt only (not fish-shooter).
"""
import os
from pathlib import Path

# === PATHS ===
BASE_DIR = Path(__file__).parent
SCREENSHOTS_RAW = BASE_DIR / "screenshots" / "raw"
SCREENSHOTS_CROPS = BASE_DIR / "screenshots" / "crops"
SCREENSHOTS_REVIEW = BASE_DIR / "screenshots" / "review"
DATABASE_PATH = BASE_DIR / "data" / "ocean_hunt.db"
LOGS_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"

# === CAPTURE ===
# How often to capture emulator screenshot (seconds)
# 10s adequate for manual play, reduce to 3-5s for auto-spin detection
POLL_INTERVAL = 10
# Supported image extensions
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

# === OCR SETTINGS ===
# RapidOCR is used (no external Tesseract needed)
# Confidence threshold: below this, text is discarded
OCR_CONFIDENCE_THRESHOLD = 0.4

# === SCREEN REGIONS (as fraction of screenshot dimensions) ===
# Ocean Hunt slot layout:
#   0-10%:   Top bar (balance, app UI)
#   10-70%:  Reel area (5x3 grid)
#   70-85%:  Bet controls (spin button, bet amount)
#   85-100%: Bottom bar (scrolling marquee, win messages, Max Hit text)

# Bottom status bar — scrolling marquee, win amounts, Max Hit text
BANNER_REGION = {
    "x_start_pct": 0.0,
    "y_start_pct": 0.85,
    "x_end_pct": 1.0,
    "y_end_pct": 1.0,
}

# Top bar — balance display, notifications
BANNER_REGION_SECONDARY = {
    "x_start_pct": 0.0,
    "y_start_pct": 0.0,
    "x_end_pct": 1.0,
    "y_end_pct": 0.15,
}

# Full screen — Big Win overlay, Max Hit popup, Free Spins modal
POPUP_REGION = {
    "x_start_pct": 0.0,
    "y_start_pct": 0.0,
    "x_end_pct": 1.0,
    "y_end_pct": 1.0,
}

# Center reels — for future symbol recognition via template matching
REEL_REGION = {
    "x_start_pct": 0.05,
    "y_start_pct": 0.15,
    "x_end_pct": 0.95,
    "y_end_pct": 0.70,
}

# Bet controls area — bet amount display, spin button state
BET_REGION = {
    "x_start_pct": 0.1,
    "y_start_pct": 0.70,
    "x_end_pct": 0.9,
    "y_end_pct": 0.85,
}

# === SLOT SYMBOLS (for future template matching) ===
SLOT_SYMBOLS = {
    "premium": ["shark", "pearl_oyster", "pufferfish", "octopus", "sea_turtle"],
    "low": ["A", "K", "Q", "J", "10"],
}
PREMIUM_SYMBOLS = SLOT_SYMBOLS["premium"]

# === MAX HIT KEYWORD PATTERNS ===
# The system matches ANY of these patterns (case-insensitive).
# Organized by language. Add more as real banners are observed.
MAX_HIT_KEYWORDS = [
    # --- English ---
    "upper limit of winnings",
    "reached the upper limit",
    "max hit",
    "daily limit",
    "winning limit reached",
    "limit of winnings",
    "maximum winnings",
    "cap reached",
    "daily win limit",
    "reached daily limit",
    "upper limit",
    "limit reached",
    "you have reached the maximum",
    "today's winning limit",
    "maximum number of wins",
    "daily earning limit",
    "reached the daily winning limit",
    "you have reached the limit",
    "winnings limit exceeded",
    # --- Chinese (Poppo's origin language) ---
    "已达到今日赢利上限",
    "达到上限",
    "赢利上限",
    "每日上限",
    "已达上限",
    "今日赢利已达上限",
    "恭喜你达到上限",
    "已达到上限",
    "赢利已达上限",
    "已达到每日上限",
    "今日赢利上限已到",
    # --- Hindi (Indian Vone users) ---
    "जीत की सीमा",
    "अधिकतम सीमा",
    "आज की सीमा पूरी हो गई",
    "जीत सीमा",
    "अधिकतम जीत",
    "आपने अधिकतम सीमा प्राप्त कर ली",
]

# === BIG WIN KEYWORDS ===
BIG_WIN_KEYWORDS = [
    "big win",
    "huge win",
    "mega win",
    "super win",
    "jackpot",
    "congratulations",
    "you won",
    "大赢",
    "超级赢",
    "恭喜",
    "大奖",
    "超级大奖",
]

# === FREE SPINS KEYWORDS ===
FREE_SPINS_KEYWORDS = [
    "free spin",
    "free spins",
    "bonus round",
    "bonus game",
    "scatter",
    "免费旋转",
    "奖励回合",
    "免费游戏",
]

# === GAME IDENTIFICATION ===
# Keywords that confirm the game is Ocean Hunt (slot version)
OCEAN_HUNT_KEYWORDS = [
    "ocean hunt",
    "oceanhunt",
    "海洋猎人",
    "深海猎人",
    "ocean hunter",
    "slot",
    "reel",
]

# === DEDUPLICATION ===
# How many seconds to keep a banner in the dedup cache
DEDUP_WINDOW_SECONDS = 120
# Maximum number of dedup entries to keep in memory
DEDUP_MAX_ENTRIES = 10000

# === HEALTH MONITORING ===
# Maximum age of newest screenshot before alerting (seconds)
MAX_SCREENSHOT_AGE_SECONDS = 300  # 5 minutes
# Log rotation: max log file size in MB before rotation
MAX_LOG_SIZE_MB = 50
# How often to check health (seconds)
HEALTH_CHECK_INTERVAL = 60

# === DATABASE ===
# SQLite WAL mode for concurrent reads
DB_WAL_MODE = True

# === REPORTING ===
# Timezone for reports (IST = UTC+5:30)
REPORT_TIMEZONE = "Asia/Kolkata"
# Report generation schedule (daily at midnight IST)
REPORT_SCHEDULE_HOUR = 0
REPORT_SCHEDULE_MINUTE = 5

# === GAME VERSION TRACKING ===
# Track which Poppo app version we're monitoring
# Update this when Poppo releases new versions
GAME_VERSION = "2026"

# === EMULATOR SETTINGS ===
# Recommended emulator resolution for consistent region fractions
RECOMMENDED_WIDTH = 1080
RECOMMENDED_HEIGHT = 1920
