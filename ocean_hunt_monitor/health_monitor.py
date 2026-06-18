"""
Ocean Hunt Slot Monitor - Health Monitor
=========================================
Monitors system health, detects emulator disconnects, app crashes, and other issues.
Runs as a background thread alongside the main watcher.
"""
import time
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path

from config import (
    SCREENSHOTS_RAW,
    MAX_SCREENSHOT_AGE_SECONDS,
    HEALTH_CHECK_INTERVAL,
    IMAGE_EXTENSIONS,
)
from database import log_system_event, get_system_logs, get_connection

IST = timezone(timedelta(hours=5, minutes=30))
logger = logging.getLogger("health")


class HealthMonitor:
    def __init__(self):
        self.raw_dir = Path(SCREENSHOTS_RAW)
        self.last_screenshot_time = time.time()
        self.consecutive_failures = 0
        self.alert_callbacks = []

    def register_alert(self, callback):
        self.alert_callbacks.append(callback)

    def send_alert(self, level: str, message: str):
        for cb in self.alert_callbacks:
            try:
                cb(level, message)
            except Exception as e:
                logger.error(f"Alert callback failed: {e}")

        log_system_event(level, "health", message)

    def check_screenshot_feed(self):
        """Check if screenshots are still arriving from the emulator."""
        image_files = [
            f for f in self.raw_dir.iterdir()
            if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS
        ]

        if not image_files:
            if self.consecutive_failures == 0:
                self.send_alert("WARNING", "No screenshots found in raw directory")
            self.consecutive_failures += 1
            return

        newest = max(f.stat().st_mtime for f in image_files)
        age = time.time() - newest

        if age > MAX_SCREENSHOT_AGE_SECONDS:
            self.consecutive_failures += 1
            if self.consecutive_failures >= 3:
                self.send_alert(
                    "CRITICAL",
                    f"Emulator screenshot feed disrupted! "
                    f"Last screenshot {int(age)}s ago. "
                    f"Consecutive failures: {self.consecutive_failures}. "
                    f"Check: emulator running, Poppo Live open, Ocean Hunt slot active."
                )
            elif self.consecutive_failures == 1:
                self.send_alert(
                    "WARNING",
                    f"Screenshot feed gap detected: {int(age)}s since last image"
                )
        else:
            if self.consecutive_failures > 0:
                self.send_alert(
                    "INFO",
                    f"Screenshot feed restored after {self.consecutive_failures} failures"
                )
            self.consecutive_failures = 0

    def check_database_health(self):
        """Verify database is responsive and not corrupted."""
        try:
            with get_connection() as conn:
                conn.execute("SELECT COUNT(*) FROM events")
                conn.execute("SELECT COUNT(*) FROM system_logs")
            return True
        except Exception as e:
            self.send_alert("CRITICAL", f"Database health check failed: {e}")
            return False

    def check_disk_space(self):
        """Check if disk space is getting low."""
        import shutil
        usage = shutil.disk_usage(str(self.raw_dir))
        free_gb = usage.free / (1024 ** 3)

        if free_gb < 1.0:
            self.send_alert("WARNING", f"Low disk space: {free_gb:.1f}GB remaining")
        elif free_gb < 0.5:
            self.send_alert("CRITICAL", f"Critical disk space: {free_gb:.1f}GB remaining")

    def check_pending_reviews(self):
        """Check if there are too many items needing review."""
        with get_connection() as conn:
            row = conn.execute(
                "SELECT COUNT(*) as cnt FROM events WHERE event_type = 'needs_review' AND reviewed = 0"
            ).fetchone()

            if row and row["cnt"] > 50:
                self.send_alert(
                    "WARNING",
                    f"{row['cnt']} events pending review. Consider reviewing old entries."
                )

    def run_check_cycle(self):
        """Run all health checks."""
        logger.debug("Running health check cycle")
        self.check_screenshot_feed()
        self.check_database_health()
        self.check_disk_space()
        self.check_pending_reviews()

    def run(self):
        """Main health monitor loop."""
        logger.info("Health monitor started")
        log_system_event("INFO", "health", "Health monitor started")

        while True:
            try:
                self.run_check_cycle()
                time.sleep(HEALTH_CHECK_INTERVAL)
            except KeyboardInterrupt:
                logger.info("Health monitor stopped")
                break
            except Exception as e:
                logger.error(f"Health monitor error: {e}")
                time.sleep(HEALTH_CHECK_INTERVAL)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    monitor = HealthMonitor()
    monitor.run()
