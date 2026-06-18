"""
Ocean Hunt Slot Monitor - Event Detector
==========================================
Classifies OCR text into event types for the SLOT version of Ocean Hunt.
Event types: max_hit, big_win, free_spins, spin_result, needs_review, noise.
"""
import re
import hashlib
from typing import Tuple, Optional
from dataclasses import dataclass, field

from config import (
    MAX_HIT_KEYWORDS,
    BIG_WIN_KEYWORDS,
    FREE_SPINS_KEYWORDS,
    OCEAN_HUNT_KEYWORDS,
)


@dataclass
class ClassifiedEvent:
    event_type: str          # max_hit, big_win, free_spins, spin_result, needs_review, noise
    confidence: float        # 0.0 - 1.0
    parsed_username: Optional[str]
    parsed_amount: Optional[int]
    parsed_amount_text: Optional[str]
    matched_keywords: list
    raw_text: str
    dedup_hash: str
    is_ocean_hunt: bool


def compute_dedup_hash(text: str, screenshot_path: str = "") -> str:
    """Compute a hash for deduplication based on text content."""
    normalized = re.sub(r'\s+', ' ', text.strip().lower())
    return hashlib.sha256(f"{normalized}:{screenshot_path}".encode()).hexdigest()[:16]


def extract_username(text: str) -> Optional[str]:
    """Try to extract a username from OCR text."""
    patterns = [
        r'(?:user|player|@\w+|UID\s*\d+)',
        r'([A-Za-z0-9_]{3,20})\s+(?:reached|hit|达到|won)',
        r'(?:reached|hit|达到|won)\s+([A-Za-z0-9_]{3,20})',
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1) if match.lastindex else match.group(0)
    return None


def extract_amount(text: str) -> Tuple[Optional[int], Optional[str]]:
    """Try to extract a diamond/coin amount from OCR text."""
    patterns = [
        r'([\d,]+)\s*(?:diamonds?|钻石)',
        r'([\d,]+)\s*(?:coins?|金币)',
        r'([\d,]+)\s*(?:WIN|win|Win)',
        r'(?:won|reward|payout)\s*([\d,]+)',
        r'[\$₹]([\d,]+)',
        r'([\d,]+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            amount_str = match.group(1).replace(',', '')
            try:
                amount = int(amount_str)
                if amount > 0:
                    return amount, match.group(0).strip()
            except ValueError:
                continue
    return None, None


def check_ocean_hunt(text: str) -> bool:
    """Check if the text mentions Ocean Hunt slot."""
    text_lower = text.lower()
    return any(kw.lower() in text_lower for kw in OCEAN_HUNT_KEYWORDS)


def classify_event(ocr_text: str, screenshot_path: str = "") -> ClassifiedEvent:
    """
    Classify OCR text into a slot-specific event type.

    Classification priority:
    1. Max Hit keywords -> max_hit (CRITICAL)
    2. Big Win keywords (without Max Hit) -> big_win (HIGH)
    3. Free Spins keywords -> free_spins (MEDIUM)
    4. Numeric amount with context -> needs_review (MEDIUM)
    5. Numeric amount without context -> spin_result (LOW)
    6. Everything else -> noise
    """
    text_lower = ocr_text.lower().strip()
    matched_max_hit = []
    matched_big_win = []
    matched_free_spins = []
    matched_ocean_hunt = []

    for kw in MAX_HIT_KEYWORDS:
        if kw.lower() in text_lower:
            matched_max_hit.append(kw)

    for kw in BIG_WIN_KEYWORDS:
        if kw.lower() in text_lower:
            matched_big_win.append(kw)

    for kw in FREE_SPINS_KEYWORDS:
        if kw.lower() in text_lower:
            matched_free_spins.append(kw)

    for kw in OCEAN_HUNT_KEYWORDS:
        if kw.lower() in text_lower:
            matched_ocean_hunt.append(kw)

    username = extract_username(ocr_text)
    amount, amount_text = extract_amount(ocr_text)
    is_ocean_hunt = len(matched_ocean_hunt) > 0
    dedup_hash = compute_dedup_hash(ocr_text, screenshot_path)

    # Priority 1: Max Hit (daily win limit reached)
    if matched_max_hit:
        confidence = min(0.95, 0.6 + 0.1 * len(matched_max_hit) + (0.15 if is_ocean_hunt else 0))
        return ClassifiedEvent(
            event_type="max_hit",
            confidence=confidence,
            parsed_username=username,
            parsed_amount=amount,
            parsed_amount_text=amount_text,
            matched_keywords=matched_max_hit,
            raw_text=ocr_text,
            dedup_hash=dedup_hash,
            is_ocean_hunt=is_ocean_hunt,
        )

    # Priority 2: Big Win overlay
    if matched_big_win:
        confidence = min(0.9, 0.5 + 0.1 * len(matched_big_win) + (0.15 if is_ocean_hunt else 0))
        return ClassifiedEvent(
            event_type="big_win",
            confidence=confidence,
            parsed_username=username,
            parsed_amount=amount,
            parsed_amount_text=amount_text,
            matched_keywords=matched_big_win,
            raw_text=ocr_text,
            dedup_hash=dedup_hash,
            is_ocean_hunt=is_ocean_hunt,
        )

    # Priority 3: Free Spins
    if matched_free_spins:
        confidence = min(0.85, 0.5 + 0.1 * len(matched_free_spins) + (0.15 if is_ocean_hunt else 0))
        return ClassifiedEvent(
            event_type="free_spins",
            confidence=confidence,
            parsed_username=username,
            parsed_amount=amount,
            parsed_amount_text=amount_text,
            matched_keywords=matched_free_spins,
            raw_text=ocr_text,
            dedup_hash=dedup_hash,
            is_ocean_hunt=is_ocean_hunt,
        )

    # Priority 4: Ambiguous amount with contextual clues -> needs review
    has_amount = amount is not None and amount > 1000
    has_contextual_clues = any(w in text_lower for w in [
        'win', 'won', 'reward', 'limit', 'cap', 'reached',
        'payout', 'earned', 'bonus',
        '上限', '奖励', '达到', '恭喜', '中奖',
    ])

    if has_amount and has_contextual_clues:
        confidence = 0.4
        return ClassifiedEvent(
            event_type="needs_review",
            confidence=confidence,
            parsed_username=username,
            parsed_amount=amount,
            parsed_amount_text=amount_text,
            matched_keywords=[],
            raw_text=ocr_text,
            dedup_hash=dedup_hash,
            is_ocean_hunt=is_ocean_hunt,
        )

    # Priority 5: Amount without context -> likely spin result
    if has_amount:
        confidence = 0.3
        return ClassifiedEvent(
            event_type="spin_result",
            confidence=confidence,
            parsed_username=username,
            parsed_amount=amount,
            parsed_amount_text=amount_text,
            matched_keywords=[],
            raw_text=ocr_text,
            dedup_hash=dedup_hash,
            is_ocean_hunt=is_ocean_hunt,
        )

    # Priority 6: Noise
    return ClassifiedEvent(
        event_type="noise",
        confidence=0.7,
        parsed_username=username,
        parsed_amount=amount,
        parsed_amount_text=amount_text,
        matched_keywords=[],
        raw_text=ocr_text,
        dedup_hash=dedup_hash,
        is_ocean_hunt=is_ocean_hunt,
    )
