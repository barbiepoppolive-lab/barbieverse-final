"""
Ocean Hunt Slot Monitor - Database Layer
=========================================
SQLite database for storing detected events, spin logs, sessions, system logs, and summaries.
Slot Ocean Hunt only (not fish-shooter).
"""
import sqlite3
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from contextlib import contextmanager

from config import DATABASE_PATH, DB_WAL_MODE

IST = timezone(timedelta(hours=5, minutes=30))


def get_db_path() -> Path:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    return DATABASE_PATH


@contextmanager
def get_connection():
    conn = sqlite3.connect(str(get_db_path()))
    conn.row_factory = sqlite3.Row
    if DB_WAL_MODE:
        conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_database():
    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                detected_at TEXT NOT NULL,
                screenshot_path TEXT NOT NULL,
                crop_path TEXT,
                raw_ocr_text TEXT,
                parsed_username TEXT,
                parsed_amount INTEGER,
                parsed_amount_text TEXT,
                confirmed_game TEXT DEFAULT 'Ocean Hunt',
                event_type TEXT CHECK(event_type IN (
                    'max_hit', 'big_win', 'free_spins',
                    'spin_result', 'needs_review', 'noise'
                )) NOT NULL,
                confidence REAL CHECK(confidence BETWEEN 0 AND 1),
                banner_region TEXT,
                dedup_hash TEXT,
                reviewed INTEGER DEFAULT 0,
                review_notes TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS spin_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                detected_at TEXT NOT NULL,
                bet_amount INTEGER,
                win_amount INTEGER,
                symbol_combo TEXT,
                is_free_spin INTEGER DEFAULT 0,
                is_big_win INTEGER DEFAULT 0,
                screenshot_path TEXT,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                started_at TEXT NOT NULL,
                ended_at TEXT,
                starting_balance INTEGER,
                ending_balance INTEGER,
                total_spins INTEGER DEFAULT 0,
                total_wagered INTEGER DEFAULT 0,
                total_won INTEGER DEFAULT 0,
                max_hit_reached INTEGER DEFAULT 0,
                big_wins_count INTEGER DEFAULT 0,
                free_spins_count INTEGER DEFAULT 0,
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS daily_summaries (
                date TEXT PRIMARY KEY,
                total_max_hits INTEGER DEFAULT 0,
                total_big_wins INTEGER DEFAULT 0,
                total_free_spins INTEGER DEFAULT 0,
                total_spin_results INTEGER DEFAULT 0,
                total_needs_review INTEGER DEFAULT 0,
                total_noise INTEGER DEFAULT 0,
                unique_users TEXT,
                first_max_hit_time TEXT,
                last_max_hit_time TEXT,
                avg_amount_at_max_hit REAL,
                avg_bet_size REAL,
                estimated_rtp REAL,
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            );

            CREATE TABLE IF NOT EXISTS system_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL DEFAULT (datetime('now')),
                level TEXT CHECK(level IN ('INFO', 'WARNING', 'ERROR', 'CRITICAL')),
                component TEXT,
                message TEXT,
                details TEXT,
                resolved INTEGER DEFAULT 0
            );

            CREATE INDEX IF NOT EXISTS idx_events_detected_at ON events(detected_at);
            CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type);
            CREATE INDEX IF NOT EXISTS idx_events_dedup_hash ON events(dedup_hash);
            CREATE INDEX IF NOT EXISTS idx_spin_log_detected_at ON spin_log(detected_at);
            CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
            CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
        """)


def log_system_event(level: str, component: str, message: str, details: str = None):
    with get_connection() as conn:
        conn.execute(
            "INSERT INTO system_logs (timestamp, level, component, message, details) VALUES (?, ?, ?, ?, ?)",
            (datetime.now(IST).isoformat(), level, component, message, details)
        )


def insert_event(event: dict) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO events (
                detected_at, screenshot_path, crop_path, raw_ocr_text,
                parsed_username, parsed_amount, parsed_amount_text,
                confirmed_game, event_type, confidence, banner_region,
                dedup_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                event.get("detected_at", datetime.now(IST).isoformat()),
                event["screenshot_path"],
                event.get("crop_path"),
                event.get("raw_ocr_text"),
                event.get("parsed_username"),
                event.get("parsed_amount"),
                event.get("parsed_amount_text"),
                event.get("confirmed_game", "Ocean Hunt"),
                event["event_type"],
                event.get("confidence", 0.0),
                event.get("banner_region"),
                event.get("dedup_hash"),
            )
        )
        return cursor.lastrowid


def insert_spin_log(spin: dict) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO spin_log (
                detected_at, bet_amount, win_amount, symbol_combo,
                is_free_spin, is_big_win, screenshot_path
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                spin.get("detected_at", datetime.now(IST).isoformat()),
                spin.get("bet_amount"),
                spin.get("win_amount"),
                spin.get("symbol_combo"),
                spin.get("is_free_spin", 0),
                spin.get("is_big_win", 0),
                spin.get("screenshot_path"),
            )
        )
        return cursor.lastrowid


def insert_session(session: dict) -> int:
    with get_connection() as conn:
        cursor = conn.execute(
            """INSERT INTO sessions (
                started_at, ended_at, starting_balance, ending_balance,
                total_spins, total_wagered, total_won,
                max_hit_reached, big_wins_count, free_spins_count, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                session.get("started_at", datetime.now(IST).isoformat()),
                session.get("ended_at"),
                session.get("starting_balance"),
                session.get("ending_balance"),
                session.get("total_spins", 0),
                session.get("total_wagered", 0),
                session.get("total_won", 0),
                session.get("max_hit_reached", 0),
                session.get("big_wins_count", 0),
                session.get("free_spins_count", 0),
                session.get("notes"),
            )
        )
        return cursor.lastrowid


def update_session(session_id: int, updates: dict):
    set_parts = []
    values = []
    for key, val in updates.items():
        set_parts.append(f"{key} = ?")
        values.append(val)
    values.append(session_id)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE sessions SET {', '.join(set_parts)} WHERE id = ?",
            values
        )


def check_dedup(dedup_hash: str, window_seconds: int = 120) -> bool:
    with get_connection() as conn:
        cutoff = (datetime.now(IST) - timedelta(seconds=window_seconds)).isoformat()
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM events WHERE dedup_hash = ? AND detected_at > ?",
            (dedup_hash, cutoff)
        ).fetchone()
        return row["cnt"] > 0


def update_daily_summary(date_str: str = None):
    if date_str is None:
        date_str = datetime.now(IST).strftime("%Y-%m-%d")

    with get_connection() as conn:
        stats = conn.execute(
            """SELECT
                SUM(CASE WHEN event_type = 'max_hit' THEN 1 ELSE 0 END) as max_hits,
                SUM(CASE WHEN event_type = 'big_win' THEN 1 ELSE 0 END) as big_wins,
                SUM(CASE WHEN event_type = 'free_spins' THEN 1 ELSE 0 END) as free_spins,
                SUM(CASE WHEN event_type = 'spin_result' THEN 1 ELSE 0 END) as spin_results,
                SUM(CASE WHEN event_type = 'needs_review' THEN 1 ELSE 0 END) as needs_review,
                SUM(CASE WHEN event_type = 'noise' THEN 1 ELSE 0 END) as noise,
                GROUP_CONCAT(DISTINCT parsed_username) as users,
                AVG(CASE WHEN event_type = 'max_hit' THEN parsed_amount END) as avg_amount
            FROM events WHERE date(detected_at) = ?""",
            (date_str,)
        ).fetchone()

        first_hit = conn.execute(
            """SELECT detected_at FROM events
            WHERE event_type = 'max_hit' AND date(detected_at) = ?
            ORDER BY detected_at ASC LIMIT 1""",
            (date_str,)
        ).fetchone()

        last_hit = conn.execute(
            """SELECT detected_at FROM events
            WHERE event_type = 'max_hit' AND date(detected_at) = ?
            ORDER BY detected_at DESC LIMIT 1""",
            (date_str,)
        ).fetchone()

        # Compute average bet size from spin_log if available
        avg_bet = conn.execute(
            """SELECT AVG(bet_amount) as avg_bet FROM spin_log
            WHERE date(detected_at) = ? AND bet_amount IS NOT NULL""",
            (date_str,)
        ).fetchone()

        # Compute estimated RTP from spin_log if available
        rtp_row = conn.execute(
            """SELECT
                SUM(win_amount) as total_won,
                SUM(bet_amount) as total_wagered
            FROM spin_log
            WHERE date(detected_at) = ?
            AND bet_amount IS NOT NULL AND win_amount IS NOT NULL""",
            (date_str,)
        ).fetchone()

        estimated_rtp = None
        if rtp_row and rtp_row["total_wagered"] and rtp_row["total_wagered"] > 0:
            estimated_rtp = (rtp_row["total_won"] / rtp_row["total_wagered"]) * 100

        conn.execute(
            """INSERT OR REPLACE INTO daily_summaries (
                date, total_max_hits, total_big_wins, total_free_spins,
                total_spin_results, total_needs_review, total_noise,
                unique_users, first_max_hit_time, last_max_hit_time,
                avg_amount_at_max_hit, avg_bet_size, estimated_rtp, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                date_str,
                stats["max_hits"] or 0,
                stats["big_wins"] or 0,
                stats["free_spins"] or 0,
                stats["spin_results"] or 0,
                stats["needs_review"] or 0,
                stats["noise"] or 0,
                stats["users"],
                first_hit["detected_at"] if first_hit else None,
                last_hit["detected_at"] if last_hit else None,
                stats["avg_amount"],
                avg_bet["avg_bet"] if avg_bet else None,
                estimated_rtp,
                datetime.now(IST).isoformat(),
            )
        )


def get_events_summary(days: int = 30) -> list:
    with get_connection() as conn:
        return conn.execute(
            """SELECT * FROM daily_summaries
            WHERE date >= date('now', ?)
            ORDER BY date DESC""",
            (f"-{days} days",)
        ).fetchall()


def get_all_events(event_type: str = None, days: int = 30) -> list:
    with get_connection() as conn:
        if event_type:
            return conn.execute(
                """SELECT * FROM events
                WHERE event_type = ? AND detected_at >= datetime('now', ?)
                ORDER BY detected_at DESC""",
                (event_type, f"-{days} days")
            ).fetchall()
        else:
            return conn.execute(
                """SELECT * FROM events
                WHERE detected_at >= datetime('now', ?)
                ORDER BY detected_at DESC""",
                (f"-{days} days",)
            ).fetchall()


def get_spin_log(days: int = 30) -> list:
    with get_connection() as conn:
        return conn.execute(
            """SELECT * FROM spin_log
            WHERE detected_at >= datetime('now', ?)
            ORDER BY detected_at DESC""",
            (f"-{days} days",)
        ).fetchall()


def get_sessions(days: int = 30) -> list:
    with get_connection() as conn:
        return conn.execute(
            """SELECT * FROM sessions
            WHERE started_at >= datetime('now', ?)
            ORDER BY started_at DESC""",
            (f"-{days} days",)
        ).fetchall()


def get_system_logs(hours: int = 24) -> list:
    with get_connection() as conn:
        return conn.execute(
            """SELECT * FROM system_logs
            WHERE timestamp >= datetime('now', ?)
            ORDER BY timestamp DESC""",
            (f"-{hours} hours",)
        ).fetchall()
