import sys
import os
import json
from datetime import datetime, timezone, timedelta
from dateutil.relativedelta import relativedelta
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import get_entries, get_user_settings, get_user_profile, save_letter
from lib.openai_client import chat
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in

SYSTEM_PROMPT = """You are helping someone write a heartfelt letter to their future self.
You have access to their recent journal entries to understand their current life context.

Write a warm, personal letter from the person's present self to their future self.
The letter should:
- Be written in first person ("Dear future me..." or similar opening)
- Reference specific things from their recent journal entries — their feelings, situations, hopes
- Capture who they are RIGHT NOW — their struggles, joys, what they're working on
- Ask their future self reflective questions about how things turned out
- Be warm, honest, and genuinely personal — not generic
- End with something encouraging or hopeful
- Be 3-5 paragraphs long
- Feel like something they'd actually want to read in the future

Do NOT be generic. If their entries mention work stress, a person, a project, a feeling — 
weave it in naturally. This should feel like THEIR letter, not a template.

Write only the letter text — no subject line, no meta commentary."""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_POST(self):
        # ── 1. Verify auth ────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── 2. Rate limit (2/day) ─────────────────────────────
        allowed, count, limit = check_rate_limit(uid, "letter")
        if not allowed:
            return send_error(self, f"Daily letter limit reached ({limit}/day).", 429)

        # ── 3. Parse body ─────────────────────────────────────
        try:
            body       = read_json_body(self)
            deliver_in = int(body.get("deliverIn", 6))
            user_note  = body.get("userNote", "").strip()

            if deliver_in not in [3, 6, 12]:
                return send_error(self, "deliverIn must be 3, 6, or 12 months", 400)
        except Exception:
            return send_error(self, "Invalid request body", 400)

        # ── 4. Check AI opt-in ────────────────────────────────
        settings = get_user_settings(uid)
        if not check_ai_opt_in(settings):
            return send_error(self, "AI features are not enabled.", 403)

        # ── 5. Fetch recent entries for context ───────────────
        entries = get_entries(uid, limit=10)
        if not entries:
            return send_error(self, "Write some journal entries first so I can understand your life right now.", 400)

        # ── 6. Build entry context ────────────────────────────
        profile   = get_user_profile(uid)
        user_name = (profile or {}).get("displayName", "").split()[0] if profile else ""

        entry_parts = []
        for entry in entries[:8]:
            title     = entry.get("title", "").strip()
            body_text = entry.get("bodyText", "").strip()[:300]
            moods     = entry.get("moods", [])
            created   = entry.get("createdAt")

            date_str = ""
            if created:
                try:
                    if hasattr(created, 'timestamp'):
                        from datetime import datetime, timezone
                        dt = datetime.fromtimestamp(created.timestamp(), tz=timezone.utc)
                        date_str = dt.strftime("%b %d")
                except Exception:
                    pass

            parts = []
            if date_str:
                parts.append(f"[{date_str}]")
            if title:
                parts.append(f"Title: {title}")
            if moods:
                parts.append(f"Mood: {', '.join(moods)}")
            if body_text:
                parts.append(body_text)
            entry_parts.append("\n".join(parts))

        context = "\n\n---\n\n".join(entry_parts)

        # ── 7. Build user prompt ──────────────────────────────
        user_prompt = f"""Here are {user_name or 'the user'}'s recent journal entries:\n\n{context}"""

        if user_note:
            user_prompt += f"\n\nThey also want to include this personal note in the letter:\n{user_note}"

        user_prompt += f"\n\nThis letter will be delivered to them in {deliver_in} months. Write it now."

        # ── 8. Call GPT-4o-mini ───────────────────────────────
        try:
            letter = chat(
                system_prompt=SYSTEM_PROMPT,
                user_prompt=user_prompt,
                max_tokens=700,
                temperature=0.8,
            )
            if not letter:
                raise ValueError("Empty letter returned")
        except Exception as e:
            return send_error(self, f"AI service error: {str(e)}", 500)

        # ── 9. Calculate delivery date ────────────────────────
        now         = datetime.now(timezone.utc)
        deliver_at  = now + relativedelta(months=deliver_in)
        deliver_str = deliver_at.strftime("%Y-%m-%d")

        # ── 10. Save to Firestore ─────────────────────────────
        try:
            letter_id = save_letter(uid, letter, deliver_str, deliver_in, user_note)
        except Exception as e:
            return send_error(self, f"Failed to save letter: {str(e)}", 500)

        # ── 11. Return ────────────────────────────────────────
        send_json(self, {
            "letter":    letter,
            "deliverAt": deliver_str,
            "deliverIn": deliver_in,
            "letterId":  letter_id,
            "remaining": limit - count,
        })

    def log_message(self, format, *args):
        pass