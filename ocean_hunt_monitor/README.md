# Ocean Hunt Slot Monitor — Desktop Edition

> **Slot Ocean Hunt only** (5x3 reel slot machine inside Poppo Live / Vone app).
> NOT the fish-shooter variant.

Runs entirely on your desktop using an Android emulator. No phone needed.

## Quick Start

### 1. Install Dependencies
```bash
pip install opencv-python rapidocr-onnxruntime pywin32 numpy
```

### 2. Install an Android Emulator (One-Time Setup)
- **NoxPlayer** (~500MB) — Recommended, lightweight
- **LDPlayer** (~400MB) — Very light
- **BlueStacks 5** (~1GB) — Most popular but heavier

Download from official sites only. Install, sign in to Google Play, install Poppo Live.

### 3. Test with Static Images
Before going live, test OCR on sample screenshots:
```bash
cd ocean_hunt_monitor
python test_ocr.py path/to/screenshot.png
# Or test a folder:
python test_ocr.py path/to/screenshots/
```

### 4. Start Monitoring
```bash
python main.py
```
Then start your emulator and open Poppo Live → Ocean Hunt (slot version). The system auto-detects the emulator window.

### 5. Check Status
```bash
python main.py status
```

### 6. Generate Report
```bash
python main.py report
```

### 7. Scan for Emulator Windows
```bash
python main.py scan
```

## How It Works

```
Desktop: Android Emulator (NoxPlayer/BlueStacks/LDPlayer)
  └── Poppo Live running inside emulator
        └── Ocean Hunt SLOT game open (5x3 reels)
              └── Auto-screenshot captures emulator window every 10s
                    └── RapidOCR extracts text from 3 screen regions
                          └── Classifier identifies events:
                                - max_hit (daily win limit reached)
                                - big_win (Big Win/Mega Win overlay)
                                - free_spins (bonus round triggered)
                                - spin_result (normal win/loss)
                                - needs_review (ambiguous)
                                - noise (irrelevant)
                          └── SQLite database stores results
                                └── Daily/monthly reports with RTP estimates
```

## Slot Game Details

**Grid**: 5 reels x 3 rows
**Symbols**: Shark, Pearl Oyster, Pufferfish, Octopus, Sea Turtle (premium) + A, K, Q, J, 10 (low)
**Bets**: 10–50,000 diamonds per spin
**Currency flow**: Real Money → Coins → Diamonds → Spins → Winnings
**RTP**: 92–96% (house edge 4–8%)
**Big Win**: Random multiplier event when premium symbols align

## Screen Regions for OCR

| Region | Coordinates | What it captures |
|--------|-------------|-----------------|
| `BANNER_REGION` | Bottom 15% | Scrolling marquee, win amounts, Max Hit text |
| `BANNER_REGION_SECONDARY` | Top 15% | Balance display, notifications |
| `POPUP_REGION` | Full screen | Big Win overlay, Max Hit popup, Free Spins modal |

## Files Overview

| File | Purpose |
|------|---------|
| `PROMPT.md` | **Complete reference** — all game mechanics, keywords, schema, reporting |
| `main.py` | Master launcher — starts all components |
| `config.py` | All tunable parameters (regions, keywords, thresholds) |
| `database.py` | SQLite database (events, spin_log, sessions, daily_summaries) |
| `ocr_engine.py` | RapidOCR text extraction with OpenCV preprocessing |
| `detector.py` | Event classification (max_hit, big_win, free_spins, spin_result, noise) |
| `emulator_capture.py` | Windows API emulator window capture |
| `desktop_watcher.py` | Main capture loop — screenshot → OCR → classify → store |
| `health_monitor.py` | System health checks (emulator, disk, database) |
| `reporter.py` | Daily/monthly reports with RTP, hourly heatmap, CSV exports |
| `test_ocr.py` | Static image testing |
| `start_monitor.bat` | Windows launcher |
| `setup_autostart.bat` | Auto-start on boot |

## Directory Structure

```
ocean_hunt_monitor/
├── screenshots/
│   ├── raw/          # Auto-captured screenshots
│   ├── crops/        # Cropped banner/popup regions
│   └── review/       # Events needing manual review
├── data/
│   └── ocean_hunt.db # SQLite database
├── logs/             # System logs
└── reports/          # Generated reports (TXT + CSV)
```

## Configuration

Edit `config.py` to adjust:
- `POLL_INTERVAL`: Capture frequency (default: 10s, reduce to 3-5s for auto-spin)
- `BANNER_REGION`: Where Max Hit text appears
- `MAX_HIT_KEYWORDS`: Multi-language keyword patterns
- `BIG_WIN_KEYWORDS`: Big Win overlay detection
- `FREE_SPINS_KEYWORDS`: Free spins trigger detection
- `DEDUP_WINDOW_SECONDS`: Deduplication window (default: 120s)

## Troubleshooting

### Emulator not detected
1. Run `python main.py scan` to see all windows
2. Check emulator is running and visible (not minimized)
3. Start Poppo Live and navigate to Ocean Hunt slot
4. The system will auto-detect on next scan cycle

### OCR not detecting text
1. Run `test_ocr.py` on a sample screenshot
2. Adjust `BANNER_REGION` in `config.py` if needed
3. Check emulator resolution (1080x1920 recommended)

### Emulator crashes or logout
- Keep emulator running 24/7 if possible
- Health monitor alerts if no captures for 5+ minutes
- Restart emulator and navigate back to Ocean Hunt

### Low disk space
- Screenshots are ~100KB each, ~860/day at 10s intervals
- Keep at least 5GB free for 30-day run

## Auto-Start on Windows Boot

Run `setup_autostart.bat` as Administrator to auto-start the monitor when Windows boots.

## Reports

Reports are saved to `reports/` directory:
- Daily summaries at midnight IST
- Monthly reports with hourly heatmap, day-of-week distribution, RTP estimates
- CSV exports of max_hit events and spin logs
