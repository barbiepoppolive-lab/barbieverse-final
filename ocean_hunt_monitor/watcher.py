"""
Ocean Hunt Max Hit Monitor - Screenshot Watcher
=================================================
Watches a folder for new screenshots, processes them through OCR and classification.
"""
import time
import shutil
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Set

from config import (
    SCREENSHOTS_RAW,
    SCREENSHOTS_CROPS,
    SCREENSHOTS_REVIEW,
    IMAGE_EXTENSIONS,
    POLL_INTERVAL,
    BANNER_REGION,
    BANNER_REGION_SECONDARY,
    MAX_SCREENSHOT_AGE_SECONDS,
)
from ocr_engine import extract_text_from_screenshot, combine_ocr_results
from detector import classify_event
from database import (
    init_database,
    insert_event,
    check_dedup,
    log_system_event,
    update_daily_summary,
)
from config import DEDUP_WINDOW_SECONDS

IST = timezone(timedelta(hours=5, minutes=30))

logger = logging.getLogger("watcher")


class ScreenshotWatcher:
    def __init__(self):
        self.processed_files: Set[str] = set()
        self.raw_dir = Path(SCREENSHOTS_RAW)
        self.crop_dir = Path(SCREENSHOTS_CROPS)
        self.review_dir = Path(SCREENSHOTS_REVIEW)

        for d in [self.raw_dir, self.crop_dir, self.review_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def scan_for_new_files(self) -> list:
        """Scan raw screenshots directory for new image files."""
        new_files = []
        for f in self.raw_dir.iterdir():
            if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
                if str(f) not in self.processed_files:
                    new_files.append(f)
        return sorted(new_files, key=lambda f: f.stat().st_mtime)

    def save_crop(self, crop_image, screenshot_name: str) -> str:
        """Save cropped banner region for audit."""
        if crop_image is None:
            return None
        crop_path = self.crop_dir / f"crop_{screenshot_name}"
        import cv2
        cv2.imwrite(str(crop_path), crop_image)
        return str(crop_path)

    def move_to_review(self, screenshot_path: str):
        """Move screenshot to review folder for manual inspection."""
        src = Path(screenshot_path)
        if src.exists():
            dst = self.review_dir / src.name
            shutil.move(str(src), str(dst))

    def process_screenshot(self, screenshot_path: Path) -> dict:
        """Full pipeline: OCR -> classify -> store -> dedup."""
        try:
            regions = {
                "banner_bottom": BANNER_REGION,
                "banner_top": BANNER_REGION_SECONDARY,
            }

            ocr_results, crop_img, error = extract_text_from_screenshot(
                str(screenshot_path), regions=regions
            )

            if error:
                logger.warning(f"OCR error for {screenshot_path.name}: {error}")
                log_system_event("WARNING", "ocr", f"OCR error: {error}", str(screenshot_path))
                return None

            if not ocr_results:
                return None

            combined_text = combine_ocr_results(ocr_results)

            if not combined_text.strip():
                return None

            classified = classify_event(combined_text, str(screenshot_path))

            if check_dedup(classified.dedup_hash, DEDUP_WINDOW_SECONDS):
                logger.debug(f"Dedup hit for {screenshot_path.name}")
                return None

            crop_path = self.save_crop(crop_img, screenshot_path.name)

            event = {
                "detected_at": datetime.now(IST).isoformat(),
                "screenshot_path": str(screenshot_path),
                "crop_path": crop_path,
                "raw_ocr_text": combined_text,
                "parsed_username": classified.parsed_username,
                "parsed_amount": classified.parsed_amount,
                "parsed_amount_text": classified.parsed_amount_text,
                "confirmed_game": "Ocean Hunt" if classified.is_ocean_hunt else "Unknown",
                "event_type": classified.event_type,
                "confidence": classified.confidence,
                "banner_region": "banner_bottom",
                "dedup_hash": classified.dedup_hash,
            }

            event_id = insert_event(event)

            if classified.event_type == "needs_review":
                self.move_to_review(str(screenshot_path))

            log_system_event(
                "INFO", "detector",
                f"Event detected: {classified.event_type} (confidence={classified.confidence:.2f})",
                f"Event ID: {event_id}, Text: {combined_text[:200]}"
            )

            logger.info(
                f"[{classified.event_type.upper()}] {screenshot_path.name} "
                f"(confidence={classified.confidence:.2f}) "
                f"user={classified.parsed_username} amount={classified.parsed_amount}"
            )

            return event

        except Exception as e:
            logger.error(f"Error processing {screenshot_path.name}: {e}")
            log_system_event("ERROR", "watcher", f"Processing error: {e}", str(screenshot_path))
            return None

    def check_phone_health(self):
        """Check if screenshots are arriving regularly."""
        raw_files = list(self.raw_dir.glob("*"))
        image_files = [f for f in raw_files if f.suffix.lower() in IMAGE_EXTENSIONS]

        if not image_files:
            return

        newest = max(f.stat().st_mtime for f in image_files)
        age = time.time() - newest

        if age > MAX_SCREENSHOT_AGE_SECONDS:
            msg = f"No new screenshots for {int(age)}s (threshold: {MAX_SCREENSHOT_AGE_SECONDS}s)"
            logger.warning(msg)
            log_system_event("WARNING", "health", msg)
        else:
            logger.debug(f"Last screenshot age: {int(age)}s - OK")

    def run(self):
        """Main watcher loop."""
        init_database()
        log_system_event("INFO", "watcher", "Watcher started")

        logger.info("=" * 60)
        logger.info("Ocean Hunt Max Hit Monitor - Screenshot Watcher")
        logger.info("=" * 60)
        logger.info(f"Watching: {self.raw_dir}")
        logger.info(f"Poll interval: {POLL_INTERVAL}s")
        logger.info(f"Banner region (bottom): {BANNER_REGION}")
        logger.info(f"Banner region (top): {BANNER_REGION_SECONDARY}")
        logger.info("=" * 60)

        health_check_counter = 0
        summary_counter = 0

        while True:
            try:
                new_files = self.scan_for_new_files()

                if new_files:
                    logger.info(f"Found {len(new_files)} new screenshot(s)")

                for f in new_files:
                    self.process_screenshot(f)
                    self.processed_files.add(str(f))

                health_check_counter += POLL_INTERVAL
                summary_counter += POLL_INTERVAL

                if health_check_counter >= 300:
                    self.check_phone_health()
                    health_check_counter = 0

                if summary_counter >= 3600:
                    update_daily_summary()
                    summary_counter = 0

                time.sleep(POLL_INTERVAL)

            except KeyboardInterrupt:
                logger.info("Watcher stopped by user")
                log_system_event("INFO", "watcher", "Watcher stopped by user")
                break
            except Exception as e:
                logger.error(f"Watcher error: {e}")
                log_system_event("ERROR", "watcher", f"Watcher error: {e}")
                time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("logs/watcher.log", encoding="utf-8"),
        ]
    )
    watcher = ScreenshotWatcher()
    watcher.run()
