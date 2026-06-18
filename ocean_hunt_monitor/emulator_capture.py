"""
Ocean Hunt Max Hit Monitor - Desktop Capture Edition
=====================================================
Runs entirely on desktop using an Android emulator.
Captures emulator window, runs OCR, classifies events.
"""
import time
import ctypes
import ctypes.wintypes
import numpy as np
from pathlib import Path
from typing import Optional, Tuple

try:
    import cv2
    CV2_AVAILABLE = True
except ImportError:
    CV2_AVAILABLE = False

try:
    import win32gui
    import win32ui
    import win32con
    import win32api
    WIN32_AVAILABLE = True
except ImportError:
    WIN32_AVAILABLE = False

from config import SCREENSHOTS_RAW, IMAGE_EXTENSIONS

import logging
logger = logging.getLogger("emulator_capture")


class EmulatorCapture:
    """Capture screenshots directly from an Android emulator window."""

    # Known emulator window class names and titles
    EMULATOR_SIGNATURES = [
        {"class": "BlueStacksApp", "title": None},
        {"class": "Nox", "title": None},
        {"title": "BlueStacks"},
        {"title": "NoxPlayer"},
        {"title": "LDPlayer"},
        {"title": "MEmu"},
        {"class": "RenderWindow", "title": None},
    ]

    def __init__(self):
        self.emulator_hwnd = None
        self.emulator_name = None
        self.save_dir = Path(SCREENSHOTS_RAW)
        self.save_dir.mkdir(parents=True, exist_ok=True)

    def find_emulator_window(self) -> Optional[int]:
        """Find the emulator window handle."""
        if not WIN32_AVAILABLE:
            logger.error("win32gui not available. Install: pip install pywin32")
            return None

        found_windows = []

        def enum_callback(hwnd, _):
            if not win32gui.IsWindowVisible(hwnd):
                return
            title = win32gui.GetWindowText(hwnd)
            cls = win32gui.GetClassName(hwnd)
            for sig in self.EMULATOR_SIGNATURES:
                match_class = sig["class"] is None or sig["class"].lower() in cls.lower()
                match_title = sig["title"] is None or sig["title"].lower() in title.lower()
                if match_class and match_title and (title or cls):
                    found_windows.append((hwnd, title, cls))

        win32gui.EnumWindows(enum_callback, None)

        if not found_windows:
            logger.warning("No emulator window found")
            return None

        # Prefer the window with the largest area (likely the main game window)
        best_hwnd = None
        best_area = 0
        for hwnd, title, cls in found_windows:
            rect = win32gui.GetWindowRect(hwnd)
            area = (rect[2] - rect[0]) * (rect[3] - rect[1])
            if area > best_area:
                best_area = area
                best_hwnd = hwnd
                self.emulator_name = title or cls

        self.emulator_hwnd = best_hwnd
        logger.info(f"Found emulator: {self.emulator_name} (hwnd={best_hwnd})")
        return best_hwnd

    def capture_window(self) -> Optional[np.ndarray]:
        """Capture the emulator window as a numpy array."""
        if not self.emulator_hwnd:
            self.find_emulator_window()
        if not self.emulator_hwnd:
            return None

        try:
            # Get window dimensions
            rect = win32gui.GetWindowRect(self.emulator_hwnd)
            x, y, x2, y2 = rect
            width = x2 - x
            height = y2 - y

            if width <= 0 or height <= 0:
                logger.warning("Emulator window has zero dimensions")
                return None

            # Create device contexts
            hwnd_dc = win32gui.GetWindowDC(self.emulator_hwnd)
            mfc_dc = win32ui.CreateDCFromHandle(hwnd_dc)
            save_dc = mfc_dc.CreateCompatibleDC()

            # Create bitmap
            bitmap = win32ui.CreateBitmap()
            bitmap.CreateCompatibleBitmap(mfc_dc, width, height)
            save_dc.SelectObject(bitmap)

            # Use PrintWindow for better accuracy (handles occluded windows)
            result = ctypes.windll.user32.PrintWindow(
                self.emulator_hwnd, save_dc.GetSafeHdc(), 3  # PW_RENDERFULLCONTENT
            )

            if result == 0:
                # Fallback to BitBlt
                save_dc.BitBlt((0, 0), (width, height), mfc_dc, (0, 0), win32con.SRCCOPY)

            # Convert to numpy array
            bmpinfo = bitmap.GetInfo()
            bmpstr = bitmap.GetBitmapBits(True)
            img = np.frombuffer(bmpstr, dtype=np.uint8)
            img = img.reshape((bmpinfo['bmHeight'], bmpinfo['bmWidth'], 4))
            img = img[:, :, :3]  # Drop alpha channel

            # Cleanup
            save_dc.DeleteDC()
            mfc_dc.DeleteDC()
            win32gui.ReleaseDC(self.emulator_hwnd, hwnd_dc)
            win32gui.DeleteObject(bitmap.GetHandle())

            return img

        except Exception as e:
            logger.error(f"Capture failed: {e}")
            self.emulator_hwnd = None
            return None

    def capture_and_save(self, filename: str = None) -> Optional[str]:
        """Capture window and save to file."""
        img = self.capture_window()
        if img is None:
            return None

        if filename is None:
            timestamp = int(time.time() * 1000)
            filename = f"emu_{timestamp}.png"

        filepath = self.save_dir / filename
        cv2.imwrite(str(filepath), img)
        logger.debug(f"Saved: {filepath}")
        return str(filepath)

    def list_emulator_windows(self) -> list:
        """List all visible windows that could be emulators."""
        windows = []

        def enum_callback(hwnd, _):
            if not win32gui.IsWindowVisible(hwnd):
                return
            title = win32gui.GetWindowText(hwnd)
            cls = win32gui.GetClassName(hwnd)
            rect = win32gui.GetWindowRect(hwnd)
            area = (rect[2] - rect[0]) * (rect[3] - rect[1])
            if area > 10000:  # Skip tiny windows
                windows.append({
                    "hwnd": hwnd,
                    "title": title,
                    "class": cls,
                    "rect": rect,
                    "area": area
                })

        win32gui.EnumWindows(enum_callback, None)
        return sorted(windows, key=lambda w: w["area"], reverse=True)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    capture = EmulatorCapture()

    print("Scanning for emulator windows...")
    windows = capture.list_emulator_windows()

    print(f"\nFound {len(windows)} visible windows:")
    for i, w in enumerate(windows[:10]):
        print(f"  [{i}] {w['title'][:50]:50s} | class={w['class'][:30]} | area={w['area']}")

    hwnd = capture.find_emulator_window()
    if hwnd:
        print(f"\nSelected emulator: {capture.emulator_name}")
        path = capture.capture_and_save("test_capture.png")
        if path:
            print(f"Test capture saved: {path}")
    else:
        print("\nNo emulator found. Start your emulator first.")
