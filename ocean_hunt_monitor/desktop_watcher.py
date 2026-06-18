"""
Ocean Hunt Slot Monitor - Desktop Native Watcher
=================================================
Captures emulator window directly, runs OCR, classifies slot events.
Slot Ocean Hunt only (not fish-shooter).
"""
import time
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
    POPUP_REGION,
    MAX_SCREENSHOT_AGE_SECONDS,
)
from ocr_engine import extract_text_from_screenshot, combine_ocr_results
from detector import classify_event
from database import (
    init_database,
    insert_event,
    insert_spin_log,
    check_dedup,
    log_system_event,
    update_daily_summary,
)
from config import DEDUP_WINDOW_SECONDS
from emulator_capture import EmulatorCapture

IST = timezone(timedelta(hours=5, minutes=30))
logger = logging.getLogger("desktop_watcher")


class DesktopWatcher:
    """Watch emulator window directly - captures slot screenshots."""

    def __init__(self):
        self.processed_files: Set[str] = set()
        self.raw_dir = Path(SCREENSHOTS_RAW)
        self.crop_dir = Path(SCREENSHOTS_CROPS)
        self.review_dir = Path(SCREENSHOTS_REVIEW)
        self.capture = EmulatorCapture()
        self.emulator_found = False

        for d in [self.raw_dir, self.crop_dir, self.review_dir]:
            d.mkdir(parents=True, exist_ok=True)

    def find_emulator(self) -> bool:
        """Try to find the emulator window."""
        hwnd = self.capture.find_emulator_window()
        if hwnd:
            self.emulator_found = True
            logger.info(f"Emulator found: {self.capture.emulator_name}")
            log_system_event("INFO", "desktop_watcher", f"Emulator found: {self.capture.emulator_name}")
            return True
        else:
            self.emulator_found = False
            return False

    def take_screenshot(self) -> str:
        """Capture emulator window and save to raw folder."""
        if not self.emulator_found:
            if not self.find_emulator():
                return None

        path = self.capture.capture_and_save()
        if path:
            logger.debug(f"Screenshot saved: {path}")
            return path
        else:
            self.emulator_found = False
            return None

    def process_screenshot(self, screenshot_path: str) -> dict:
        """Full pipeline: OCR -> classify -> store -> dedup."""
        try:
            # Scan all relevant regions for slot events
            regions = {
                "banner_bottom": BANNER_REGION,
                "banner_top": BANNER_REGION_SECONDARY,
                "popup_full": POPUP_REGION,
            }

            ocr_results, crop_img, error = extract_text_from_screenshot(
                screenshot_path, regions=regions
            )

            if error:
                logger.warning(f"OCR error for {Path(screenshot_path).name}: {error}")
                return None

            if not ocr_results:
                return None

            combined_text = combine_ocr_results(ocr_results)

            if not combined_text.strip():
                return None

            classified = classify_event(combined_text, screenshot_path)

            if check_dedup(classified.dedup_hash, DEDUP_WINDOW_SECONDS):
                logger.debug(f"Dedup hit for {Path(screenshot_path).name}")
                return None

            # Save crop
            crop_path = None
            if crop_img is not None:
                import cv2
                crop_path = str(self.crop_dir / f"crop_{Path(screenshot_path).name}")
                cv2.imwrite(crop_path, crop_img)

            event = {
                "detected_at": datetime.now(IST).isoformat(),
                "screenshot_path": screenshot_path,
                "crop_path": crop_path,
                "raw_ocr_text": combined_text,
                "parsed_username": classified.parsed_username,
                "parsed_amount": classified.parsed_amount,
                "parsed_amount_text": classified.parsed_amount_text,
                "confirmed_game": "Ocean Hunt" if classified.is_ocean_hunt else "Unknown",
                "event_type": classified.event_type,
                "confidence": classified.confidence,
                "banner_region": "popup_full",
                "dedup_hash": classified.dedup_hash,
            }

            event_id = insert_event(event)

            # Also log to spin_log if it's a spin result or big win
            if classified.event_type in ("spin_result", "big_win"):
                spin_entry = {
                    "detected_at": event["detected_at"],
                    "bet_amount": None,  # extracted separately if available
                    "win_amount": classified.parsed_amount,
                    "symbol_combo": None,
                    "is_free_spin": 0,
                    "is_big_win": 1 if classified.event_type == "big_win" else 0,
                    "screenshot_path": screenshot_path,
                }
                insert_spin_log(spin_entry)

            if classified.event_type == "needs_review":
                import shutil
                shutil.copy2(screenshot_path, str(self.review_dir / Path(screenshot_path).name))

            log_system_event(
                "INFO", "detector",
                f"Event detected: {classified.event_type} (confidence={classified.confidence:.2f})",
                f"Event ID: {event_id}, Text: {combined_text[:200]}"
            )

            logger.info(
                f"[{classified.event_type.upper()}] {Path(screenshot_path).name} "
                f"(confidence={classified.confidence:.2f}) "
                f"user={classified.parsed_username} amount={classified.parsed_amount}"
            )

            return event

        except Exception as e:
            logger.error(f"Error processing {Path(screenshot_path).name}: {e}")
            log_system_event("ERROR", "desktop_watcher", f"Processing error: {e}", screenshot_path)
            return None

    def run(self):
        """Main watcher loop - captures emulator directly."""
        init_database()
        log_system_event("INFO", "desktop_watcher", "Desktop watcher started")

        logger.info("=" * 60)
        logger.info("OCEAN HUNT SLOT MONITOR - Desktop Edition")
        logger.info("=" * 60)
        logger.info(f"Mode: Direct emulator capture")
        logger.info(f"Poll interval: {POLL_INTERVAL}s")
        logger.info(f"Regions: banner_bottom, banner_top, popup_full")
        logger.info("=" * 60)

        if not self.find_emulator():
            logger.warning("No emulator found. Waiting for emulator to start...")
            logger.info("Start your Android emulator with Poppo Live, then wait.")

        health_check_counter = 0
        summary_counter = 0
        capture_count = 0
        event_count = 0

        while True:
            try:
                if not self.emulator_found:
                    if not self.find_emulator():
                        time.sleep(POLL_INTERVAL * 3)
                        continue

                screenshot_path = self.take_screenshot()

                if screenshot_path:
                    capture_count += 1
                    event = self.process_screenshot(screenshot_path)
                    if event:
                        event_count += 1

                health_check_counter += POLL_INTERVAL
                summary_counter += POLL_INTERVAL

                if health_check_counter >= 300:
                    logger.info(f"Status: {capture_count} captures, {event_count} events")
                    health_check_counter = 0

                if summary_counter >= 3600:
                    update_daily_summary()
                    summary_counter = 0

                time.sleep(POLL_INTERVAL)

            except KeyboardInterrupt:
                logger.info("Desktop watcher stopped by user")
                log_system_event("INFO", "desktop_watcher", "Watcher stopped by user")
                break
            except Exception as e:
                logger.error(f"Desktop watcher error: {e}")
                log_system_event("ERROR", "desktop_watcher", f"Watcher error: {e}")
                time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler("logs/desktop_watcher.log", encoding="utf-8"),
        ]
    )
    watcher = DesktopWatcher()
    watcher.run()
