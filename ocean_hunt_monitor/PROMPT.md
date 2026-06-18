# Ocean Hunt Slot Monitor — Complete Reference Prompt

> **Scope**: This document covers ONLY the slot-machine version of Ocean Hunt inside Poppo Live / Vone app.
> It is the single source of truth for building, tuning, and extending the monitoring system.
> This project is INDEPENDENT of the barbieverse web app.

---

## 1. GAME IDENTITY

**Platform**: Poppo Live (global) / Vone (India rebrand, identical mechanics)
**Developer**: VSHOW PTE. LTD. (formerly "Sevennights Studio")
**Game Type**: Video slot machine (NOT the fish-shooter "Ocean Hunt")
**Grid**: 5 reels x 3 rows (5x3)
**Theme**: Underwater / ocean creatures

### 1.1 Symbol Set (High to Low)

| Symbol | Category | Visual | Role |
|--------|----------|--------|------|
| **Shark** | Premium | Animated shark | Highest pay, triggers Big Win |
| **Pearl Oyster** | Premium | Oyster with pearl | High pay, Big Win trigger |
| **Pufferfish** | Premium | Round pufferfish | High pay, Big Win trigger |
| **Octopus** | Premium | Purple/red octopus | High pay, Big Win trigger |
| **Sea Turtle** | Premium | Green sea turtle | Moderate-high pay |
| **A** | Low | Card letter A | Low pay |
| **K** | Low | Card letter K | Low pay |
| **Q** | Low | Card letter Q | Low pay |
| **J** | Low | Card letter J | Low pay |
| **10** | Low | Card number 10 | Lowest pay |

### 1.2 Win Conditions

- Matching 3+ identical symbols on an active payline (left to right)
- Matching 5x Shark or Pearl Oyster = maximum base payout
- **Big Win** = triggered randomly when premium symbols (Shark, Pearl Oyster, Pufferfish, Octopus) align; gives multiplier rewards instead of normal flat pays
- Wild symbols (if present) substitute for all except scatter

### 1.3 Currency Flow

```
Real Money → Poppo Coins → Diamonds → Slot Spins → Coin Winnings
                                                       ↓
                                              Can reconvert to Diamonds
```

- **Coins**: Primary platform currency, bought with real money (10,000 coins ≈ $1 USD)
- **Diamonds**: Used specifically for slot bets; obtained by exchanging coins
- **Bet Range**: 10 diamonds to 50,000 diamonds per spin
- **Conversion**: Coins → Diamonds (rate varies, roughly 100 coins = 1 diamond at base tier)

---

## 2. KEY GAME MECHANICS TO TRACK

### 2.1 Big Win Event

**What it is**: The jackpot event in Ocean Hunt slot. When triggered, the screen shows a full-screen overlay with coin shower animation and text like "BIG WIN" / "MEGA WIN" / "SUPER WIN" with a coin amount.

**Trigger conditions**:
- Matching premium symbols (Pearl Oyster, Pufferfish, Octopus, Shark) on paylines
- Higher diamond bets = higher coin rewards on Big Win
- Completely random — no guaranteed pattern
- Big Win is a MULTIPLIER event (not flat pay), meaning the payout scales with bet size

**Visual indicators**:
- Full-screen overlay covering the reels
- Large animated text: "BIG WIN!", "MEGA WIN!", "SUPER WIN!"
- Coin shower animation (gold coins falling)
- Large coin amount number displayed
- Typically shows for 3-5 seconds before returning to reels

**OCR detection zone**: Full screen (POPUP_REGION) — because Big Win overlays cover everything

### 2.2 Max Hit / Daily Win Limit

**What it is**: A popup banner that appears when the player hits the daily maximum winnings cap. After this, the player cannot win more for the day (or until the limit resets).

**Visual indicators**:
- Popup dialog/modal (not a scrolling marquee)
- Text typically in English or Chinese (depending on region)
- May show remaining cooldown or just a flat "limit reached" message
- Usually blocks further play until acknowledged

**Known text patterns** (multi-language):

English:
- "upper limit of winnings"
- "reached the upper limit"
- "max hit"
- "daily limit"
- "winning limit reached"
- "limit of winnings"
- "maximum winnings"
- "cap reached"
- "daily win limit"
- "reached daily limit"
- "upper limit"
- "limit reached"
- "you have reached the maximum"
- "today's winning limit has been reached"

Chinese (Poppo's origin language):
- "已达到今日赢利上限" (reached today's profit limit)
- "达到上限" (reached limit)
- "赢利上限" (profit limit)
- "每日上限" (daily limit)
- "已达上限" (already reached limit)
- "今日赢利已达上限" (today's profit has reached limit)
- "恭喜你达到上限" (congrats you reached limit)

Hindi (Indian Vone users):
- "जीत की सीमा" (winning limit)
- "अधिकतम सीमा" (maximum limit)
- "आज की सीमा पूरी हो गई" (today's limit is over)

**OCR detection zone**: BANNER_REGION (bottom 15%) + POPUP_REGION (full screen) — appears as popup

**Important**: This is the PRIMARY event this monitor tracks. It represents the hard ceiling on player earnings and is the most commercially valuable data point.

### 2.3 Normal Spin Result

**What it is**: Every individual spin outcome — win or loss.

**Visual indicators**:
- Reels stop spinning
- Winning paylines highlighted (usually with glow/animation)
- Win amount shown briefly
- Balance updates (diamonds decrease by bet amount, coins increase on win)

**OCR detection zone**: BANNER_REGION (bottom) — where win amounts and balance are shown

### 2.4 Free Spins / Bonus Round

**What it is**: Triggered by scatter symbols (typically 3+ scatters). Awards free spins with possible multipliers.

**Visual indicators**:
- "FREE SPINS" text overlay
- Counter showing remaining free spins
- Multiplier display (e.g., "3x")
- Different background color/theme during bonus

**OCR detection zone**: Full screen (POPUP_REGION)

### 2.5 Auto-Spin / Turbo Mode

**What it is**: Player sets automatic spinning at fixed bet amount. The screen rapidly cycles through results.

**Visual indicators**:
- Auto-spin button highlighted/active
- Rapid reel animation
- "AUTO" or spin count indicator
- Turbo icon (lightning bolt) if enabled

**Impact on monitoring**: Auto-spin generates results faster — 1 spin every 1-2 seconds vs manual 3-5 seconds. This affects capture interval requirements.

---

## 3. MONITORING ARCHITECTURE

### 3.1 Capture Pipeline

```
Android Emulator (NoxPlayer/BlueStacks/LDPlayer)
  └── Poppo Live app running
        └── Ocean Hunt slot game open
              └── Windows PrintWindow API captures emulator window (every POLL_INTERVAL seconds)
                    └── OpenCV saves screenshot
                          └── RapidOCR extracts text from predefined regions
                                └── Regex classifier identifies event type
                                      └── SQLite stores deduplicated events
                                            └── Reporter generates daily/monthly summaries
```

### 3.2 Screen Regions for OCR

The Ocean Hunt slot screen has distinct zones:

```
┌──────────────────────────────────┐  0%
│  TOP BAR: App UI, balance, back  │
│  (header area ~10%)              │
├──────────────────────────────────┤  10%
│                                  │
│                                  │
│  REEL AREA: 5x3 grid (~60%)     │
│  (symbols spin here)             │
│                                  │
│                                  │
├──────────────────────────────────┤  70%
│  BET CONTROLS: Bet amount,      │
│  spin button, auto-spin (~15%)  │
├──────────────────────────────────┤  85%
│  BOTTOM MARQUEE / STATUS BAR     │
│  (scrolling text, win amounts,  │
│   balance, messages ~15%)        │
└──────────────────────────────────┘  100%
```

**Region definitions** (as fraction of screenshot):

| Region | Purpose | Coordinates |
|--------|---------|-------------|
| `BANNER_REGION` | Bottom status bar — scrolling marquee, win amounts, balance, Max Hit text | x: 0.0–1.0, y: 0.85–1.0 |
| `BANNER_REGION_SECONDARY` | Top bar — balance display, notifications | x: 0.0–1.0, y: 0.0–0.15 |
| `POPUP_REGION` | Full screen — Big Win overlay, Max Hit popup, Free Spins modal | x: 0.0–1.0, y: 0.0–1.0 |
| `REEL_REGION` | Center reels — for future symbol recognition | x: 0.05–0.95, y: 0.15–0.70 |
| `BET_REGION` | Bottom controls — bet amount display | x: 0.1–0.9, y: 0.70–0.85 |

### 3.3 Capture Interval

| Mode | Interval | Rationale |
|------|----------|-----------|
| **Manual play** | 10 seconds | Spins take 3-5s each, 10s captures most results |
| **Auto-spin** | 3-5 seconds | Rapid spins need faster capture |
| **Idle/lobby** | 30 seconds | Not playing, reduce CPU/disk |
| **Big Win active** | 2 seconds | Capture the overlay for duration measurement |

Current default: **10 seconds** — adequate for manual play.

---

## 4. EVENT CLASSIFICATION LOGIC

### 4.1 Event Types

| Type | Priority | Description | Confidence Range |
|------|----------|-------------|-----------------|
| `max_hit` | CRITICAL | Daily win limit reached popup | 0.60–0.95 |
| `big_win` | HIGH | Big Win / Mega Win / Super Win overlay | 0.50–0.90 |
| `free_spins` | MEDIUM | Free spins triggered | 0.50–0.85 |
| `spin_result` | LOW | Normal spin win/loss (for RTP calculation) | 0.30–0.70 |
| `needs_review` | MEDIUM | Ambiguous text, needs human check | 0.30–0.50 |
| `noise` | NONE | Irrelevant text (chat, UI labels, etc.) | 0.70 |

### 4.2 Classification Rules (Pseudocode)

```
1. Normalize OCR text to lowercase
2. Check for MAX_HIT_KEYWORDS match:
   - If found → event_type = "max_hit", confidence = 0.6 + (0.1 * match_count) + (0.15 if ocean_hunt confirmed)
3. Check for BIG_WIN_KEYWORDS match (without max_hit):
   - If found → event_type = "big_win", confidence = 0.5 + (0.1 * match_count)
4. Check for FREE_SPINS_KEYWORDS:
   - If found → event_type = "free_spins"
5. Check for numeric amounts > 1000 with contextual clues (win, reward, limit):
   - If found → event_type = "needs_review", confidence = 0.4
6. Check for numeric amounts without context:
   - If found → event_type = "spin_result", confidence = 0.3
7. Otherwise → event_type = "noise"
```

### 4.3 Keyword Dictionaries

```python
MAX_HIT_KEYWORDS = [
    # English
    "upper limit of winnings", "reached the upper limit", "max hit",
    "daily limit", "winning limit reached", "limit of winnings",
    "maximum winnings", "cap reached", "daily win limit",
    "reached daily limit", "upper limit", "limit reached",
    "you have reached the maximum", "today's winning limit",
    "maximum number of wins", "daily earning limit",
    # Chinese
    "已达到今日赢利上限", "达到上限", "赢利上限", "每日上限",
    "已达上限", "今日赢利已达上限", "恭喜你达到上限",
    "已达到上限", "赢利已达上限",
    # Hindi
    "जीत की सीमा", "अधिकतम सीमा", "आज की सीमा पूरी हो गई",
    "जीत सीमा", "अधिकतम जीत",
]

BIG_WIN_KEYWORDS = [
    "big win", "huge win", "mega win", "super win",
    "jackpot", "congratulations", "you won",
    "大赢", "超级赢", "恭喜", "大奖",
]

FREE_SPINS_KEYWORDS = [
    "free spin", "free spins", "bonus round",
    "bonus game", "scatter", "免费旋转", "奖励回合",
]

OCEAN_HUNT_IDENTIFIERS = [
    "ocean hunt", "oceanhunt", "海洋猎人", "深海猎人",
    "ocean hunter", "slot", "reel",
]
```

### 4.4 Amount Extraction Patterns

```python
AMOUNT_PATTERNS = [
    r'([\d,]+)\s*(?:diamonds?|钻石)',           # "1,500 diamonds"
    r'([\d,]+)\s*(?:coins?|金币)',               # "5000 coins"
    r'([\d,]+)\s*(?:WIN|win|Win)',               # "2,500 WIN"
    r'(?:won|reward|payout)\s*([\d,]+)',         # "won 3000"
    r'[\$₹]([\d,]+)',                             # "$500" or "₹500"
    r'([\d,]+)',                                  # bare number fallback
]

USERNAME_PATTERNS = [
    r'(?:user|player|@\w+|UID\s*\d+)',
    r'([A-Za-z0-9_]{3,20})\s+(?:reached|hit|达到|won)',
    r'(?:reached|hit|达到|won)\s+([A-Za-z0-9_]{3,20})',
]
```

---

## 5. DATABASE SCHEMA

### 5.1 Events Table

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at TEXT NOT NULL,                    -- ISO timestamp (IST)
    screenshot_path TEXT NOT NULL,                -- path to raw screenshot
    crop_path TEXT,                               -- path to cropped region
    raw_ocr_text TEXT,                            -- full OCR output
    parsed_username TEXT,                         -- extracted username (nullable)
    parsed_amount INTEGER,                        -- extracted diamond/coin amount
    parsed_amount_text TEXT,                      -- raw text of amount match
    confirmed_game TEXT DEFAULT 'Ocean Hunt',     -- game identifier
    event_type TEXT CHECK(event_type IN (
        'max_hit', 'big_win', 'free_spins',
        'spin_result', 'needs_review', 'noise'
    )) NOT NULL,
    confidence REAL CHECK(confidence BETWEEN 0 AND 1),
    banner_region TEXT,                           -- which region triggered
    dedup_hash TEXT,                              -- SHA256 for dedup
    reviewed INTEGER DEFAULT 0,                  -- manual review flag
    review_notes TEXT,                            -- manual notes
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_events_detected_at ON events(detected_at);
CREATE INDEX idx_events_event_type ON events(event_type);
CREATE INDEX idx_events_dedup_hash ON events(dedup_hash);
```

### 5.2 Daily Summaries Table

```sql
CREATE TABLE daily_summaries (
    date TEXT PRIMARY KEY,
    total_max_hits INTEGER DEFAULT 0,
    total_big_wins INTEGER DEFAULT 0,
    total_free_spins INTEGER DEFAULT 0,
    total_spin_results INTEGER DEFAULT 0,
    total_needs_review INTEGER DEFAULT 0,
    total_noise INTEGER DEFAULT 0,
    unique_users TEXT,                            -- JSON array
    first_max_hit_time TEXT,
    last_max_hit_time TEXT,
    avg_amount_at_max_hit REAL,
    avg_bet_size REAL,                            -- average diamond bet observed
    estimated_rtp REAL,                           -- computed from spin results
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 5.3 Spin Log Table (NEW — for RTP tracking)

```sql
CREATE TABLE spin_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    detected_at TEXT NOT NULL,
    bet_amount INTEGER,                           -- diamonds wagered
    win_amount INTEGER,                           -- diamonds/coins won
    symbol_combo TEXT,                            -- detected symbols if available
    is_free_spin INTEGER DEFAULT 0,               -- 1 if during free spins
    is_big_win INTEGER DEFAULT 0,                 -- 1 if big win triggered
    screenshot_path TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### 5.4 Session Tracking Table (NEW)

```sql
CREATE TABLE sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    starting_balance INTEGER,
    ending_balance INTEGER,
    total_spins INTEGER DEFAULT 0,
    total_wagered INTEGER DEFAULT 0,              -- diamonds
    total_won INTEGER DEFAULT 0,                  -- diamonds/coins
    max_hit_reached INTEGER DEFAULT 0,            -- 1 if hit daily limit
    big_wins_count INTEGER DEFAULT 0,
    free_spins_count INTEGER DEFAULT 0,
    notes TEXT
);
```

---

## 6. PLATFORM ECONOMICS (What the Data Means)

### 6.1 Revenue Model

- Poppo takes **~30% cut** of all coin transactions
- Ocean Hunt slot RTP: **92–96%** (house edge 4–8%)
- Players lose 4–8% of wagered amount over time
- Big Win events are the "hook" — they create the perception of big returns

### 6.2 Known Manipulation Patterns (Community Reports)

1. **Early win hook**: New accounts win 300K–400K coins in first 2-3 minutes, then steady losses
2. **Dynamic difficulty** (2026 update): Target health adjusts based on recent session performance
3. **"Low network" excuse**: App shows network error when player is about to win
4. **Screen recording disabled** in Vone during games → no evidence for complaints
5. **30% withdrawal fee** surprise
6. **Coin expiry**: Unused coins expire, creating urgency to play

### 6.3 Key Metrics to Compute

| Metric | Formula | Significance |
|--------|---------|-------------|
| **Session RTP** | (total_won / total_wagered) × 100 | Actual return for this session |
| **Time to Max Hit** | max_hit_time - session_start | How fast does the ceiling hit |
| **Bet Size Distribution** | histogram of bet_amount | Player behavior patterns |
| **Win Frequency** | wins / total_spins | How often player wins |
| **Big Win Frequency** | big_wins / total_spins | Jackpot trigger rate |
| **Average Win Size** | total_won / wins | Mean payout per win |
| **Max Win** | max(win_amount) | Highest single payout observed |
| **Session Duration** | session_end - session_start | How long player stays |
| **Chase Index** | bet_increase_count after loss | Evidence of loss chasing |

### 6.4 Time-Based Patterns to Track

- **Peak hours**: When do most Max Hit events occur (IST timezone, 5:30 UTC offset)
- **Day-of-week**: Which days see most gambling activity
- **Reset timing**: Poppo resets weekly rewards Sunday 23:59 UTC+8
- **Event windows**: Time-based bonus windows in 2026 update
- **Session decay**: Does win rate decrease over time within a session

---

## 7. REPORTING REQUIREMENTS

### 7.1 Daily Report

```
OCEAN HUNT SLOT — DAILY REPORT
Date: YYYY-MM-DD
Period: Last 24 hours

EVENT COUNTS
  Max Hit events:     N
  Big Win events:     N
  Free Spin triggers: N
  Spin results:       N
  Needs review:       N

MAX HIT ANALYSIS
  First Max Hit: HH:MM IST
  Last Max Hit:  HH:MM IST
  Unique users hitting limit: N
  Average amount at Max Hit: N diamonds

BIG WIN ANALYSIS
  Total Big Wins: N
  Average Big Win amount: N
  Max single Big Win: N

SESSION INSIGHTS (if spin_log populated)
  Average session RTP: N%
  Average session duration: N minutes
  Average spins per session: N
  Average bet size: N diamonds

HOURLY HEATMAP (Max Hit events)
  00:00  ####
  01:00  ##
  ...

DAY-OF-WEEK DISTRIBUTION
  Monday    ####
  Tuesday   ##
  ...

BUSINESS RECOMMENDATION
  Peak activity hours: HH:00, HH:00, HH:00
  → Push recharge promos at these times
  → Average Max Hits per day: N
  → If >5 per day: High engagement, consider premium coin bundles
```

### 7.2 Monthly Report

Same as daily but with:
- Trend analysis (are Max Hits increasing/decreasing month-over-month)
- Top 10 users by Max Hit count
- Amount distribution histogram
- RTP trend over time
- Correlation: do recharges precede Max Hit events?

---

## 8. HEALTH MONITORING

### 8.1 System Health Checks

| Check | Alert Level | Threshold |
|-------|-------------|-----------|
| Screenshot age | WARNING | >300s since last capture |
| Screenshot age | CRITICAL | >600s (emulator may have crashed) |
| Database responsive | CRITICAL | Query fails |
| Disk space | WARNING | <1GB free |
| Disk space | CRITICAL | <500MB free |
| Pending reviews | WARNING | >50 unreviewed events |
| Emulator not found | WARNING | Window not detected for >5 min |
| Thread liveness | CRITICAL | Watcher or health thread died |

### 8.2 Auto-Recovery

- If emulator window disappears: retry discovery every 30s
- If OCR returns empty for 5+ consecutive captures: warn about possible game not open
- If database write fails: log to fallback file, retry on next cycle
- Thread crash: auto-restart with exponential backoff

---

## 9. CONFIGURATION REFERENCE

```python
# === PATHS ===
BASE_DIR = Path(__file__).parent
SCREENSHOTS_RAW = BASE_DIR / "screenshots" / "raw"
SCREENSHOTS_CROPS = BASE_DIR / "screenshots" / "crops"
SCREENSHOTS_REVIEW = BASE_DIR / "screenshots" / "review"
DATABASE_PATH = BASE_DIR / "data" / "ocean_hunt.db"
LOGS_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"

# === CAPTURE ===
POLL_INTERVAL = 10                    # seconds between captures
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}

# === OCR ===
OCR_CONFIDENCE_THRESHOLD = 0.4       # minimum confidence to keep text

# === SCREEN REGIONS (fraction of screenshot) ===
BANNER_REGION = {                     # bottom status bar
    "x_start_pct": 0.0, "y_start_pct": 0.85,
    "x_end_pct": 1.0, "y_end_pct": 1.0,
}
BANNER_REGION_SECONDARY = {           # top bar
    "x_start_pct": 0.0, "y_start_pct": 0.0,
    "x_end_pct": 1.0, "y_end_pct": 0.15,
}
POPUP_REGION = {                      # full screen (for overlays)
    "x_start_pct": 0.0, "y_start_pct": 0.0,
    "x_end_pct": 1.0, "y_end_pct": 1.0,
}
REEL_REGION = {                       # center reels (future use)
    "x_start_pct": 0.05, "y_start_pct": 0.15,
    "x_end_pct": 0.95, "y_end_pct": 0.70,
}
BET_REGION = {                        # bet controls area
    "x_start_pct": 0.1, "y_start_pct": 0.70,
    "x_end_pct": 0.9, "y_end_pct": 0.85,
}

# === DEDUP ===
DEDUP_WINDOW_SECONDS = 120            # ignore same event within 2 min
DEDUP_MAX_ENTRIES = 10000

# === HEALTH ===
MAX_SCREENSHOT_AGE_SECONDS = 300      # 5 min alert
MAX_LOG_SIZE_MB = 50
HEALTH_CHECK_INTERVAL = 60            # seconds between health checks

# === DATABASE ===
DB_WAL_MODE = True

# === REPORTING ===
REPORT_TIMEZONE = "Asia/Kolkata"      # IST = UTC+5:30
REPORT_SCHEDULE_HOUR = 0              # midnight IST
REPORT_SCHEDULE_MINUTE = 5

# === GAME IDENTIFICATION ===
GAME_VERSION = "2026"                 # track which version we're monitoring
```

---

## 10. DEPENDENCIES

```
Python 3.8+
opencv-python         # image processing, screenshot saving
rapidocr_onnxruntime  # OCR engine (no Tesseract needed)
pywin32               # Windows API for emulator window capture
numpy                 # image array handling
```

Install:
```bash
pip install opencv-python rapidocr-onnxruntime pywin32 numpy
```

---

## 11. FUTURE ENHANCEMENTS

### Phase 2 (Next)
- [ ] Real-time WhatsApp alerts when Max Hit is detected
- [ ] Spin-by-spin RTP calculation from consecutive screenshots
- [ ] Symbol recognition via template matching on reel region
- [ ] Multi-emulator support (monitor multiple accounts simultaneously)

### Phase 3 (Advanced)
- [ ] ML classifier trained on labeled screenshots (replaces regex)
- [ ] API endpoint to serve event data as JSON
- [ ] Web dashboard with live charts (separate from barbieverse)
- [ ] Correlation engine: recharge timing → Max Hit timing
- [ ] Predictive model: "User will hit Max Hit in ~N minutes"

### Phase 4 (Research)
- [ ] Compare RTP across time periods (is it changing?)
- [ ] Detect dynamic difficulty scaling by measuring win rate changes
- [ ] Cross-session analysis: does yesterday's loss affect today's odds?
- [ ] A/B test: does bet size affect Big Win probability?

---

## 12. KNOWN ISSUES & GOTCHAS

1. **Emulator window titles change** between versions — use class names as primary match
2. **OCR accuracy on game UI** is noisy — confidence thresholds matter
3. **Chinese text OCR** requires RapidOCR with CHN model (included by default)
4. **Big Win overlay** covers entire screen — OCR on other regions returns nothing during overlay
5. **Screen resolution** matters — 1080x1920 recommended for consistent region fractions
6. **Emulator minimization** — window must be visible for PrintWindow API to work
7. **Poppo app updates** may change UI layout — region fractions may need re-calibration
8. **Daily limit reset time** is not publicly documented — must be inferred from data
9. **Diamond vs coin amounts** — OCR may confuse currencies; contextual parsing needed
10. **Auto-spin mode** generates results faster than capture interval — may miss some spins

---

## 13. DATA COLLECTION BEST PRACTICES

1. **Always capture full screen** even if only analyzing specific regions — full context helps debugging
2. **Keep raw screenshots** for at least 30 days — allows re-processing if classifier improves
3. **Tag events manually** when confidence < 0.5 — builds training data for future ML
4. **Log emulator version** — different emulators render slightly differently
5. **Note Poppo app version** — UI changes between versions affect OCR
6. **Record session boundaries** — detect when player opens/closes Ocean Hunt
7. **Track diamond balance changes** — compute actual bet/win amounts from balance delta
8. **Monitor for "low network" errors** — these may correlate with manipulation events

---

*Last updated: 2026-06-18*
*Project scope: Slot Ocean Hunt only — not the fish-shooter variant*
*Independence: This is a standalone monitoring project, not part of barbieverse*
