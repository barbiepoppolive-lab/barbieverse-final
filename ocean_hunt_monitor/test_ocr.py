"""
Ocean Hunt Max Hit Monitor - Static Image Test Tool
====================================================
Test OCR and classification on static screenshot images.
Run this BEFORE going live to validate parsing accuracy.
"""
import sys
import json
from pathlib import Path
from datetime import datetime, timezone, timedelta

from ocr_engine import extract_text_from_screenshot, combine_ocr_results
from detector import classify_event
from config import BANNER_REGION, BANNER_REGION_SECONDARY, SCREENSHOTS_REVIEW

IST = timezone(timedelta(hours=5, minutes=30))


def test_single_image(image_path: str, verbose: bool = True):
    """Test OCR and classification on a single image."""
    print(f"\n{'='*60}")
    print(f"Testing: {image_path}")
    print(f"{'='*60}")

    regions = {
        "banner_bottom": BANNER_REGION,
        "banner_top": BANNER_REGION_SECONDARY,
    }

    ocr_results, crop_img, error = extract_text_from_screenshot(
        image_path, regions=regions
    )

    if error:
        print(f"  ERROR: {error}")
        return None

    print(f"\n  OCR Results ({len(ocr_results)} text blocks found):")
    for i, r in enumerate(ocr_results):
        print(f"    [{i+1}] ({r.region_name}) conf={r.confidence:.2f}: {r.text}")

    combined = combine_ocr_results(ocr_results)
    print(f"\n  Combined text: '{combined}'")

    if not combined.strip():
        print("\n  No text extracted - possible issues:")
        print("    - Image quality too low")
        print("    - Banner region misaligned")
        print("    - Text is too small or blurry")
        return None

    classified = classify_event(combined, image_path)

    print(f"\n  Classification:")
    print(f"    Event type:   {classified.event_type}")
    print(f"    Confidence:   {classified.confidence:.2f}")
    print(f"    Username:     {classified.parsed_username}")
    print(f"    Amount:       {classified.parsed_amount}")
    print(f"    Amount text:  {classified.parsed_amount_text}")
    print(f"    Ocean Hunt:   {classified.is_ocean_hunt}")
    print(f"    Keywords:     {classified.matched_keywords}")
    print(f"    Dedup hash:   {classified.dedup_hash}")

    if crop_img is not None:
        crop_path = Path(SCREENSHOTS_REVIEW) / f"test_crop_{Path(image_path).name}"
        import cv2
        cv2.imwrite(str(crop_path), crop_img)
        print(f"\n  Crop saved: {crop_path}")

    return classified


def test_directory(dir_path: str, verbose: bool = False):
    """Test all images in a directory."""
    d = Path(dir_path)
    if not d.exists():
        print(f"Directory not found: {dir_path}")
        return

    extensions = {".png", ".jpg", ".jpeg", ".bmp", ".webp"}
    images = [f for f in d.iterdir() if f.suffix.lower() in extensions]

    if not images:
        print(f"No images found in {dir_path}")
        return

    print(f"\nTesting {len(images)} images in {dir_path}")

    results = {
        "total": len(images),
        "max_hit": 0,
        "big_win_overlay": 0,
        "needs_review": 0,
        "noise": 0,
        "no_text": 0,
        "errors": 0,
    }

    for img in sorted(images):
        try:
            classified = test_single_image(str(img), verbose=verbose)
            if classified is None:
                results["no_text"] += 1
            else:
                results[classified.event_type] += 1
        except Exception as e:
            results["errors"] += 1
            print(f"  Error: {e}")

    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    print(f"  Total images:     {results['total']}")
    print(f"  Max Hit:          {results['max_hit']}")
    print(f"  Big Win Overlay:  {results['big_win_overlay']}")
    print(f"  Needs Review:     {results['needs_review']}")
    print(f"  Noise:            {results['noise']}")
    print(f"  No text found:    {results['no_text']}")
    print(f"  Errors:           {results['errors']}")
    print()

    accuracy = (results["max_hit"] + results["big_win_overlay"] + results["noise"]) / max(results["total"], 1) * 100
    print(f"  Classification accuracy: {accuracy:.1f}%")
    print(f"  (excluding no-text and errors)")

    return results


def interactive_test():
    """Interactive mode for testing images one by one."""
    print("Ocean Hunt Max Hit Monitor - Interactive Test Tool")
    print("=" * 50)
    print("Enter image paths to test, or 'quit' to exit.")
    print("You can also drag-and-drop images onto this window.")
    print()

    while True:
        try:
            path = input("Image path: ").strip().strip('"')
            if path.lower() in ('quit', 'exit', 'q'):
                break
            if not path:
                continue
            test_single_image(path)
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        path = sys.argv[1]
        if Path(path).is_dir():
            test_directory(path)
        else:
            test_single_image(path)
    else:
        interactive_test()
