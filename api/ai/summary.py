# api/ai/summary.py
# ─────────────────────────────────────────────────────────────
# POST /api/ai/summary
# Generates a weekly narrative summary from the last 7 days
# of journal entries.
#
# Request body:
#   {} (no params needed — always summarises last 7 days)
#
# Response:
#   { "summary": "...", "weekOf": "2026-03-10", "entryCount": 5 }
#
# Flow:
#   1. Verify Firebase token
#   2. Check rate limit (3/day)
#   3. Check AI opt-in
#   4. Fetch entries from last 7 days
#   5. Call GPT-4o-mini
#   6. Save to weeklySummaries collection
#   7. Return summary
# ─────────────────────────────────────────────────────────────

import sys
import os
import json
from datetime import datetime, timedelta, timezone
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entries, get_user_settings, save_weekly_summary, get_weekly_summary
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in

SYSTEM_PROMPT = """You are a warm, reflective writing companion who helps people
understand their week through their journal entries.

Your job is to write a short, personal weekly summary narrative based on
someone's journal entries from the past 7 days.

Rules:
- Write in second person ("you", "your", "this week you...")
- Be warm, empathetic, and observational — not clinical
- Highlight key themes, emotions, and moments from the week
- Notice patterns or shifts in mood/energy across the week
- Keep it to 3-5 sentences — concise but meaningful
- Do NOT list every entry — weave them into a flowing narrative
- Do NOT use bullet points — pure prose only
- End with one forward-looking sentence about the coming week
- Write in English only
- Sound like a thoughtful friend summarising your week back to you"""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_POST(self):
        # ── 1. Verify auth ────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── 2. Rate limit ─────────────────────────────────────
        allowed, count, limit = check_rate_limit(uid, "summary")
        if not allowed:
            return send_error(self, f"Daily summary limit reached ({limit}/day).", 429)

        # ── 3. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled.", 403)

        # ── 4. Calculate this week's Monday ──────────────────
        now       = datetime.now(timezone.utc)
        week_start = now - timedelta(days=now.weekday())  # Monday
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        week_of   = week_start.strftime("%Y-%m-%d")

        # ── 5. Check if summary already exists for this week ──
        existing = get_weekly_summary(uid, week_of)
        if existing:
            return send_json(self, {
                "summary":    existing.get("summary", ""),
                "weekOf":     week_of,
                "entryCount": existing.get("entryCount", 0),
                "cached":     True,
            })

        # ── 6. Fetch last 7 days of entries ───────────────────
        all_entries = get_entries(uid, limit=50)

        cutoff = now - timedelta(days=7)
        week_entries = []
        for entry in all_entries:
            created_at = entry.get("createdAt")
            if created_at is None:
                continue
            # Handle both Firestore Timestamp and datetime
            if hasattr(created_at, 'astimezone'):
                entry_dt = created_at.astimezone(timezone.utc)
            else:
                entry_dt = datetime.fromtimestamp(
                    created_at.timestamp(), tz=timezone.utc
                )
            if entry_dt >= cutoff:
                week_entries.append(entry)

        if not week_entries:
            return send_error(self, "No entries found in the last 7 days.", 400)

        if len(week_entries) < 2:
            return send_error(self, "Write at least 2 entries this week to generate a summary.", 400)

        # ── 7. Build context ──────────────────────────────────
        entry_texts = []
        for entry in sorted(week_entries, key=lambda e: e.get("createdAt")):
            title     = entry.get("title", "").strip()
            body_text = entry.get("bodyText", "").strip()[:300]
            moods     = entry.get("moods", [])

            parts = []
            if title:
                parts.append(f"Title: {title}")
            if moods:
                parts.append(f"Mood: {', '.join(moods)}")
            if body_text:
                parts.append(body_text)
            entry_texts.append("\n".join(parts))

        context = "\n\n---\n\n".join(entry_texts)

        # ── 8. Call GPT-4o-mini ───────────────────────────────
        try:
            summary = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=(
                    f"Here are the journal entries from this week "
                    f"({len(week_entries)} entries):\n\n{context}\n\n"
                    f"Write a warm weekly summary narrative."
                ),
                max_tokens=300,
                temperature=0.7,
            )

            if not summary:
                raise ValueError("Empty summary returned")

        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 9. Save to Firestore ──────────────────────────────
        try:
            save_weekly_summary(uid, week_of, summary, len(week_entries))
        except Exception as e:
            print(f"Warning: could not save weekly summary: {e}")

        # ── 10. Return ────────────────────────────────────────
        send_json(self, {
            "summary":    summary,
            "weekOf":     week_of,
            "entryCount": len(week_entries),
            "cached":     False,
            "remaining":  limit - count,
        })

    def log_message(self, format, *args):
        pass