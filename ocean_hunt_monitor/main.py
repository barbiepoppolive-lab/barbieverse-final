"""
Ocean Hunt Slot Monitor - Master Launcher (Desktop Edition)
============================================================
Runs everything on desktop with Android emulator.
Slot Ocean Hunt only (not fish-shooter).
"""
import sys
import time
import logging
import threading
import signal
from datetime import datetime, timezone, timedelta
from pathlib import Path

from config import LOGS_DIR, REPORTS_DIR
from database import init_database, log_system_event
from desktop_watcher import DesktopWatcher
from health_monitor import HealthMonitor
from reporter import Reporter

IST = timezone(timedelta(hours=5, minutes=30))

logger = logging.getLogger("master")


def setup_logging():
    LOGS_DIR.mkdir(parents=True, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(
        logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
    )
    root_logger.addHandler(console_handler)

    for log_name in ["master", "desktop_watcher", "health", "detector"]:
        file_handler = logging.FileHandler(
            LOGS_DIR / f"{log_name}.log", encoding="utf-8"
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(
            logging.Formatter("%(asctime)s [%(levelname)s] %(name)s: %(message)s")
        )
        logging.getLogger(log_name).addHandler(file_handler)


class MasterLauncher:
    def __init__(self):
        self.watcher = None
        self.health_monitor = None
        self.reporter = None
        self.running = False
        self.threads = []

    def alert_handler(self, level: str, message: str):
        logger.warning(f"ALERT [{level}]: {message}")

    def start_watcher(self):
        self.watcher = DesktopWatcher()
        t = threading.Thread(target=self.watcher.run, name="desktop_watcher", daemon=True)
        t.start()
        self.threads.append(t)
        logger.info("Desktop watcher thread started")

    def start_health_monitor(self):
        self.health_monitor = HealthMonitor()
        self.health_monitor.register_alert(self.alert_handler)
        t = threading.Thread(target=self.health_monitor.run, name="health", daemon=True)
        t.start()
        self.threads.append(t)
        logger.info("Health monitor thread started")

    def run_daily_report(self):
        try:
            self.reporter = Reporter()
            report = self.reporter.generate_daily_summary()
            logger.info(f"Daily report generated:\n{report}")
        except Exception as e:
            logger.error(f"Daily report failed: {e}")

    def signal_handler(self, signum, frame):
        logger.info(f"Received signal {signum}, shutting down...")
        self.running = False
        log_system_event("INFO", "master", "Shutdown signal received")
        sys.exit(0)

    def run(self):
        setup_logging()

        logger.info("=" * 60)
        logger.info("OCEAN HUNT SLOT MONITOR - Desktop Edition")
        logger.info(f"Started at: {datetime.now(IST).strftime('%Y-%m-%d %H:%M:%S IST')}")
        logger.info("=" * 60)

        init_database()
        log_system_event("INFO", "master", "Desktop system started")

        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        self.reporter = Reporter()

        self.start_watcher()
        self.start_health_monitor()

        self.running = True
        last_report_date = None

        logger.info("All components started. Press Ctrl+C to stop.")
        logger.info("")
        logger.info("HOW IT WORKS:")
        logger.info("  1. Start your Android emulator (BlueStacks/NoxPlayer/LDPlayer)")
        logger.info("  2. Open Poppo Live -> Ocean Hunt (SLOT version)")
        logger.info("  3. The system auto-captures the emulator window every 10s")
        logger.info("  4. OCR extracts text, classifier identifies events")
        logger.info("  5. Events: max_hit, big_win, free_spins, spin_result")
        logger.info("  6. Results stored in SQLite, reports generated daily")
        logger.info("")

        while self.running:
            try:
                current_date = datetime.now(IST).strftime("%Y-%m-%d")
                if current_date != last_report_date:
                    hour = datetime.now(IST).hour
                    if hour == 0 and last_report_date is not None:
                        self.run_daily_report()
                    last_report_date = current_date

                time.sleep(60)

                for t in self.threads:
                    if not t.is_alive():
                        logger.error(f"Thread {t.name} died! Restarting...")
                        if t.name == "desktop_watcher":
                            self.start_watcher()
                        elif t.name == "health":
                            self.start_health_monitor()

            except KeyboardInterrupt:
                break
            except Exception as e:
                logger.error(f"Main loop error: {e}")
                time.sleep(60)

        logger.info("Shutting down...")
        log_system_event("INFO", "master", "System stopped")


def print_status():
    from database import get_all_events, get_system_logs, get_spin_log, get_sessions
    init_database()

    print("\n" + "=" * 55)
    print("OCEAN HUNT SLOT MONITOR - STATUS (30-day)")
    print("=" * 55)

    max_hits = get_all_events("max_hit", days=30)
    big_wins = get_all_events("big_win", days=30)
    free_spins = get_all_events("free_spins", days=30)
    spin_results = get_all_events("spin_result", days=30)
    reviews = get_all_events("needs_review", days=30)
    logs = get_system_logs(hours=24)
    spins = get_spin_log(days=30)
    sessions = get_sessions(days=30)

    print(f"  Max Hit events:       {len(max_hits)}")
    print(f"  Big Win events:       {len(big_wins)}")
    print(f"  Free Spin triggers:   {len(free_spins)}")
    print(f"  Spin results:         {len(spin_results)}")
    print(f"  Needs Review:         {len(reviews)}")
    print(f"  Spin log entries:     {len(spins)}")
    print(f"  Sessions:             {len(sessions)}")
    print(f"  System logs (24h):    {len(logs)}")

    # RTP from spin log
    if spins:
        total_wagered = sum(s["bet_amount"] or 0 for s in spins)
        total_won = sum(s["win_amount"] or 0 for s in spins)
        if total_wagered > 0:
            rtp = (total_won / total_wagered) * 100
            print(f"\n  Estimated RTP:        {rtp:.2f}%")
            print(f"  Total wagered:        {total_wagered:,} diamonds")
            print(f"  Total won:            {total_won:,} diamonds")

    if max_hits:
        print(f"\n  Recent Max Hits:")
        for e in max_hits[:5]:
            print(f"    {e['detected_at']} - {e['parsed_username'] or 'unknown'} - {e['parsed_amount'] or '?'}")

    print()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "status":
        print_status()
    elif len(sys.argv) > 1 and sys.argv[1] == "report":
        setup_logging()
        init_database()
        reporter = Reporter()
        print(reporter.generate_monthly_report())
    elif len(sys.argv) > 1 and sys.argv[1] == "test":
        from test_ocr import interactive_test
        interactive_test()
    elif len(sys.argv) > 1 and sys.argv[1] == "scan":
        from emulator_capture import EmulatorCapture
        logging.basicConfig(level=logging.INFO)
        capture = EmulatorCapture()
        windows = capture.list_emulator_windows()
        print(f"\nFound {len(windows)} visible windows:")
        for i, w in enumerate(windows[:15]):
            print(f"  [{i}] hwnd={w['hwnd']} title='{w['title'][:60]}' class='{w['class'][:30]}' area={w['area']}")
    else:
        launcher = MasterLauncher()
        launcher.run()
