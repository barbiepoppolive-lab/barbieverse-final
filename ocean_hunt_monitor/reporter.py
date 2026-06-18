"""
Ocean Hunt Slot Monitor - Reporting System
===========================================
Generates daily and monthly summary reports from collected slot data.
"""
import json
import csv
from datetime import datetime, timezone, timedelta
from pathlib import Path
from collections import Counter, defaultdict

from config import REPORTS_DIR, REPORT_TIMEZONE
from database import (
    get_events_summary, get_all_events, get_spin_log, get_sessions, get_connection
)

IST = timezone(timedelta(hours=5, minutes=30))


class Reporter:
    def __init__(self):
        self.reports_dir = Path(REPORTS_DIR)
        self.reports_dir.mkdir(parents=True, exist_ok=True)

    def generate_monthly_report(self, days: int = 30) -> str:
        """Generate a comprehensive monthly report for slot monitoring."""
        report_lines = []
        report_lines.append("=" * 70)
        report_lines.append("OCEAN HUNT SLOT MONITOR - MONTHLY REPORT")
        report_lines.append(f"Generated: {datetime.now(IST).strftime('%Y-%m-%d %H:%M IST')}")
        report_lines.append(f"Period: Last {days} days")
        report_lines.append("=" * 70)

        max_hit_events = get_all_events("max_hit", days)
        big_win_events = get_all_events("big_win", days)
        free_spins_events = get_all_events("free_spins", days)
        spin_results = get_all_events("spin_result", days)
        needs_review_events = get_all_events("needs_review", days)

        # === EVENT COUNTS ===
        report_lines.append("")
        report_lines.append("## EVENT COUNTS")
        report_lines.append(f"  Max Hit events:       {len(max_hit_events)}")
        report_lines.append(f"  Big Win events:       {len(big_win_events)}")
        report_lines.append(f"  Free Spin triggers:   {len(free_spins_events)}")
        report_lines.append(f"  Spin results:         {len(spin_results)}")
        report_lines.append(f"  Needs review:         {len(needs_review_events)}")

        # === MAX HIT ANALYSIS ===
        if max_hit_events:
            hourly = Counter()
            daily = Counter()
            amounts = []
            users = set()
            daily_first_hits = defaultdict(list)

            for e in max_hit_events:
                try:
                    dt = datetime.fromisoformat(e["detected_at"])
                    hourly[dt.hour] += 1
                    daily[dt.strftime("%A")] += 1
                    day_key = dt.strftime("%Y-%m-%d")
                    daily_first_hits[day_key].append(dt)
                except:
                    pass
                if e["parsed_username"]:
                    users.add(e["parsed_username"])
                if e["parsed_amount"]:
                    amounts.append(e["parsed_amount"])

            report_lines.append("")
            report_lines.append("## MAX HIT ANALYSIS")
            report_lines.append(f"  Unique users hitting limit: {len(users)}")
            for u in sorted(users):
                report_lines.append(f"    - {u}")

            if amounts:
                amounts.sort()
                report_lines.append("")
                report_lines.append("## AMOUNT DISTRIBUTION AT MAX HIT")
                report_lines.append(f"  Count:  {len(amounts)}")
                report_lines.append(f"  Min:    {min(amounts):,}")
                report_lines.append(f"  Max:    {max(amounts):,}")
                report_lines.append(f"  Avg:    {sum(amounts)//len(amounts):,}")
                report_lines.append(f"  Median: {amounts[len(amounts)//2]:,}")

            # First Max Hit of day
            if daily_first_hits:
                first_hit_times = []
                for day, times in daily_first_hits.items():
                    first_hit = min(times)
                    first_hit_times.append(first_hit.hour + first_hit.minute / 60)

                if first_hit_times:
                    avg_time = sum(first_hit_times) / len(first_hit_times)
                    avg_hour = int(avg_time)
                    avg_min = int((avg_time - avg_hour) * 60)
                    report_lines.append("")
                    report_lines.append("## FIRST MAX HIT OF DAY")
                    report_lines.append(f"  Average time: {avg_hour:02d}:{avg_min:02d} IST")
                    report_lines.append(f"  Days with data: {len(daily_first_hits)}")

            # Hourly heatmap
            report_lines.append("")
            report_lines.append("## MAX HIT EVENTS BY HOUR (IST)")
            for hour in range(24):
                count = hourly.get(hour, 0)
                bar = "#" * count
                report_lines.append(f"  {hour:02d}:00  {count:4d}  {bar}")

            # Day of week
            report_lines.append("")
            report_lines.append("## MAX HIT EVENTS BY DAY OF WEEK")
            for day in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]:
                count = daily.get(day, 0)
                bar = "#" * count
                report_lines.append(f"  {day:10s}  {count:4d}  {bar}")

            # Peak hours
            report_lines.append("")
            report_lines.append("## PEAK HOURS (Top 5)")
            for hour, count in hourly.most_common(5):
                report_lines.append(f"  {hour:02d}:00 IST - {count} events")

        # === BIG WIN ANALYSIS ===
        if big_win_events:
            report_lines.append("")
            report_lines.append("## BIG WIN ANALYSIS")
            report_lines.append(f"  Total Big Wins: {len(big_win_events)}")
            big_amounts = [e["parsed_amount"] for e in big_win_events if e["parsed_amount"]]
            if big_amounts:
                report_lines.append(f"  Average Big Win: {sum(big_amounts)//len(big_amounts):,}")
                report_lines.append(f"  Max single Big Win: {max(big_amounts):,}")

        # === FREE SPINS ANALYSIS ===
        if free_spins_events:
            report_lines.append("")
            report_lines.append("## FREE SPINS ANALYSIS")
            report_lines.append(f"  Total Free Spin triggers: {len(free_spins_events)}")

        # === SESSION / RTP ANALYSIS ===
        spin_log = get_spin_log(days)
        if spin_log:
            total_wagered = sum(s["bet_amount"] or 0 for s in spin_log)
            total_won = sum(s["win_amount"] or 0 for s in spin_log)
            total_spins = len(spin_log)
            bet_sizes = [s["bet_amount"] for s in spin_log if s["bet_amount"]]

            report_lines.append("")
            report_lines.append("## SESSION / RTP ANALYSIS")
            report_lines.append(f"  Total spins logged: {total_spins}")
            report_lines.append(f"  Total wagered: {total_wagered:,} diamonds")
            report_lines.append(f"  Total won: {total_won:,} diamonds")
            if total_wagered > 0:
                rtp = (total_won / total_wagered) * 100
                report_lines.append(f"  Estimated RTP: {rtp:.2f}%")
            if bet_sizes:
                avg_bet = sum(bet_sizes) // len(bet_sizes)
                report_lines.append(f"  Average bet size: {avg_bet:,} diamonds")
                report_lines.append(f"  Min bet: {min(bet_sizes):,}")
                report_lines.append(f"  Max bet: {max(bet_sizes):,}")

        # === SESSIONS ===
        sessions = get_sessions(days)
        if sessions:
            report_lines.append("")
            report_lines.append("## SESSIONS")
            report_lines.append(f"  Total sessions: {len(sessions)}")
            durations = []
            for s in sessions:
                if s["started_at"] and s["ended_at"]:
                    try:
                        start = datetime.fromisoformat(s["started_at"])
                        end = datetime.fromisoformat(s["ended_at"])
                        dur = (end - start).total_seconds() / 60
                        durations.append(dur)
                    except:
                        pass
            if durations:
                avg_dur = sum(durations) / len(durations)
                report_lines.append(f"  Average session duration: {avg_dur:.1f} minutes")
                report_lines.append(f"  Max session duration: {max(durations):.1f} minutes")

        # === BUSINESS RECOMMENDATION ===
        report_lines.append("")
        report_lines.append("## BUSINESS RECOMMENDATION")
        if max_hit_events and len(max_hit_events) >= 5:
            top_hours = hourly.most_common(3)
            peak_hours_str = ", ".join(f"{h:02d}:00" for h, _ in top_hours)
            report_lines.append(f"  Peak Ocean Hunt slot activity hours (IST): {peak_hours_str}")
            report_lines.append(f"  -> Push recharge promos at these times")
            report_lines.append(f"  -> Total Max Hits: {len(max_hit_events)} over {days} days")
            avg_per_day = len(max_hit_events) / max(days, 1)
            report_lines.append(f"  -> Average Max Hits per day: {avg_per_day:.1f}")
        else:
            report_lines.append("  Insufficient Max Hit data (need >= 5 events)")

        report_lines.append("")
        report_lines.append("=" * 70)
        report_lines.append("END OF REPORT")
        report_lines.append("=" * 70)

        report_text = "\n".join(report_lines)

        # Save report
        timestamp = datetime.now(IST).strftime("%Y%m%d_%H%M%S")
        report_path = self.reports_dir / f"monthly_report_{timestamp}.txt"
        report_path.write_text(report_text, encoding="utf-8")

        # Export CSVs
        if max_hit_events:
            csv_path = self.reports_dir / f"max_hit_events_{timestamp}.csv"
            self._export_events_csv(max_hit_events, csv_path)

        if spin_log:
            csv_path = self.reports_dir / f"spin_log_{timestamp}.csv"
            self._export_spin_log_csv(spin_log, csv_path)

        return report_text

    def _export_events_csv(self, events: list, path: Path):
        if not events:
            return
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "detected_at", "event_type", "parsed_username",
                "parsed_amount", "parsed_amount_text", "confidence",
                "raw_ocr_text", "screenshot_path"
            ])
            writer.writeheader()
            for e in events:
                writer.writerow({
                    "detected_at": e.get("detected_at"),
                    "event_type": e.get("event_type"),
                    "parsed_username": e.get("parsed_username"),
                    "parsed_amount": e.get("parsed_amount"),
                    "parsed_amount_text": e.get("parsed_amount_text"),
                    "confidence": e.get("confidence"),
                    "raw_ocr_text": e.get("raw_ocr_text"),
                    "screenshot_path": e.get("screenshot_path"),
                })

    def _export_spin_log_csv(self, spins: list, path: Path):
        if not spins:
            return
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "detected_at", "bet_amount", "win_amount",
                "symbol_combo", "is_free_spin", "is_big_win", "screenshot_path"
            ])
            writer.writeheader()
            for s in spins:
                writer.writerow({
                    "detected_at": s.get("detected_at"),
                    "bet_amount": s.get("bet_amount"),
                    "win_amount": s.get("win_amount"),
                    "symbol_combo": s.get("symbol_combo"),
                    "is_free_spin": s.get("is_free_spin"),
                    "is_big_win": s.get("is_big_win"),
                    "screenshot_path": s.get("screenshot_path"),
                })

    def generate_daily_summary(self, date_str: str = None) -> str:
        if date_str is None:
            date_str = datetime.now(IST).strftime("%Y-%m-%d")

        max_hits = get_all_events("max_hit", days=1)
        big_wins = get_all_events("big_win", days=1)
        free_spins = get_all_events("free_spins", days=1)
        spin_results = get_all_events("spin_result", days=1)
        reviews = get_all_events("needs_review", days=1)

        lines = [
            f"Daily Summary for {date_str}",
            f"  Max Hits:     {len(max_hits)}",
            f"  Big Wins:     {len(big_wins)}",
            f"  Free Spins:   {len(free_spins)}",
            f"  Spin Results: {len(spin_results)}",
            f"  Needs Review: {len(reviews)}",
        ]

        if max_hits:
            hours = Counter()
            for e in max_hits:
                try:
                    dt = datetime.fromisoformat(e["detected_at"])
                    hours[dt.hour] += 1
                except:
                    pass
            peak = hours.most_common(3)
            lines.append(f"  Peak hours: {', '.join(f'{h:02d}:00 ({c})' for h, c in peak)}")

        return "\n".join(lines)


if __name__ == "__main__":
    reporter = Reporter()
    print(reporter.generate_monthly_report())
