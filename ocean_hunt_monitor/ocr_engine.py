"""
Ocean Hunt Max Hit Monitor - OCR Engine
========================================
Handles image preprocessing and text extraction using RapidOCR.
"""
import cv2
import numpy as np
from pathlib import Path
from typing import Optional, Tuple, List
from dataclasses import dataclass

try:
    from rapidocr_onnxruntime import RapidOCR
    OCR_ENGINE = RapidOCR()
    OCR_AVAILABLE = True
except ImportError:
    OCR_AVAILABLE = False
    OCR_ENGINE = None

from config import (
    OCR_CONFIDENCE_THRESHOLD,
    BANNER_REGION,
    BANNER_REGION_SECONDARY,
)


@dataclass
class OCRResult:
    text: str
    confidence: float
    bbox: list
    region_name: str


def preprocess_image(image: np.ndarray, aggressive: bool = False) -> np.ndarray:
    """Preprocess image for better OCR accuracy on mobile game screens."""
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    if aggressive:
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)

        denoised = cv2.fastNlMeansDenoising(gray, h=15)
        _, binary = cv2.threshold(denoised, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

        kernel = np.ones((1, 1), np.uint8)
        binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)

        return binary
    else:
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        gray = clahe.apply(gray)
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        return binary


def crop_region(image: np.ndarray, region: dict) -> np.ndarray:
    """Crop a region from the image based on percentage coordinates."""
    h, w = image.shape[:2]
    x1 = int(region["x_start_pct"] * w)
    y1 = int(region["y_start_pct"] * h)
    x2 = int(region["x_end_pct"] * w)
    y2 = int(region["y_end_pct"] * h)
    return image[y1:y2, x1:x2]


def run_ocr(image: np.ndarray, preprocess: bool = True) -> List[OCRResult]:
    """Run OCR on an image and return structured results."""
    if not OCR_AVAILABLE or OCR_ENGINE is None:
        return []

    results = []

    try:
        if preprocess:
            processed = preprocess_image(image, aggressive=False)
        else:
            processed = image

        ocr_result, _ = OCR_ENGINE(processed)

        if ocr_result is None:
            return []

        for item in ocr_result:
            bbox, text, confidence = item
            if confidence >= OCR_CONFIDENCE_THRESHOLD:
                results.append(OCRResult(
                    text=text.strip(),
                    confidence=confidence,
                    bbox=bbox,
                    region_name="full"
                ))
    except Exception as e:
        pass

    return results


def extract_text_from_screenshot(
    screenshot_path: str,
    regions: dict = None,
    aggressive_preprocess: bool = False
) -> Tuple[List[OCRResult], Optional[np.ndarray], Optional[str]]:
    """
    Full OCR pipeline: load image, crop regions, run OCR, return results.

    Returns:
        (results, cropped_image, error_message)
    """
    path = Path(screenshot_path)
    if not path.exists():
        return [], None, f"File not found: {screenshot_path}"

    image = cv2.imread(str(path))
    if image is None:
        return [], None, f"Failed to load image: {screenshot_path}"

    all_results = []

    if regions:
        for region_name, region_coords in regions.items():
            cropped = crop_region(image, region_coords)
            results = run_ocr(cropped, preprocess=True)
            for r in results:
                r.region_name = region_name
            all_results.extend(results)
    else:
        results = run_ocr(image, preprocess=True)
        all_results.extend(results)

    if aggressive_preprocess and len(all_results) == 0:
        if regions:
            for region_name, region_coords in regions.items():
                cropped = crop_region(image, region_coords)
                results = run_ocr(cropped, preprocess=True)
                for r in results:
                    r.region_name = region_name
                all_results.extend(results)
        else:
            results = run_ocr(image, preprocess=True)
            all_results.extend(results)

    crop_img = None
    if regions:
        primary = list(regions.values())[0]
        crop_img = crop_region(image, primary)

    return all_results, crop_img, None


def combine_ocr_results(results: List[OCRResult]) -> str:
    """Combine multiple OCR results into a single text string."""
    sorted_results = sorted(results, key=lambda r: (r.bbox[0][1] if r.bbox else 0, r.bbox[0][0] if r.bbox else 0))
    return " ".join(r.text for r in sorted_results)
