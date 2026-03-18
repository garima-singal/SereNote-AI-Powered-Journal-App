# api/ai.py
# ─────────────────────────────────────────────────────────────
# Single consolidated serverless function that handles ALL
# AI endpoints. Routes based on the request path.
#
# Routes:
#   POST /api/ai/reflect
#   POST /api/ai/mood
#   POST /api/ai/polish
#   GET  /api/ai/prompt
#   POST /api/ai/summary
#   POST /api/ai/chat
#   GET  /api/ai/chat_history
#   DELETE /api/ai/chat_history
#   POST /api/ai/embed
#   POST /api/ai/letter
#   GET  /api/ai/letters
#   POST /api/ai/letters_manual
#   POST /api/ai/tags
#   GET  /api/ai/health
# ─────────────────────────────────────────────────────────────

import sys
import os
import json
import re
from datetime import datetime, timezone, timedelta
from http.server import BaseHTTPRequestHandler

sys.path.insert(0, os.path.dirname(__file__))

from lib.verify_auth   import verify_token
from lib.rate_limit    import check_rate_limit
from lib.firestore     import (
    get_entry, get_entries, get_user_settings, get_user_profile,
    update_entry_fields, save_weekly_summary, get_weekly_summary,
    save_chat_message, get_chat_history, clear_chat_history,
    save_letter, get_letters, mark_letter_opened,
)
from lib.openai_client import chat, chat_with_history
from lib.vector_store  import query_similar, upsert_entry
from lib.helpers       import send_json, send_error, send_options, read_json_body, check_ai_opt_in


# ══════════════════════════════════════════════════════════════
# ROUTE HANDLERS
# ══════════════════════════════════════════════════════════════

def handle_reflect(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "reflect")
    if not allowed:
        return send_error(handler_self, f"Daily reflection limit reached ({limit}/day).", 429)

    entry_id = body.get("entryId")
    if not entry_id:
        return send_error(handler_self, "entryId is required", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entry = get_entry(uid, entry_id)
    if not entry:
        return send_error(handler_self, "Entry not found", 404)

    body_text = entry.get("bodyText", "").strip()
    title     = entry.get("title", "").strip()
    if not body_text and not title:
        return send_error(handler_self, "Entry has no content to reflect on", 400)

    system_prompt = """You are a warm, empathetic journaling companion.
Read this journal entry and write a short, thoughtful reflection (3-4 sentences).
Be personal, insightful, and encouraging. Ask one gentle question at the end.
Do not be generic. Respond in the same language the writer used."""

    try:
        reflection = chat(
            system_prompt=system_prompt,
            user_prompt=f"Title: {title}\n\n{body_text[:2000]}",
            max_tokens=300, temperature=0.7,
        )
        update_entry_fields(uid, entry_id, {"aiReflection": reflection})
        send_json(handler_self, {"reflection": reflection, "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_mood(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "mood")
    if not allowed:
        return send_error(handler_self, f"Daily mood limit reached ({limit}/day).", 429)

    entry_id = body.get("entryId")
    raw_text = body.get("text", "").strip()
    if not entry_id and not raw_text:
        return send_error(handler_self, "Either entryId or text is required", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    text_to_analyse = raw_text
    if entry_id:
        entry = get_entry(uid, entry_id)
        if not entry:
            return send_error(handler_self, "Entry not found", 404)
        text_to_analyse = entry.get("bodyText", "").strip() or entry.get("title", "").strip()

    if not text_to_analyse or len(text_to_analyse) < 5:
        return send_error(handler_self, "Entry has too little content", 400)

    VALID_MOODS = ['calm', 'grateful', 'energized', 'low', 'anxious', 'inspired', 'frustrated', 'reflective']
    system_prompt = f"""Detect moods from a journal entry.
Available moods: {', '.join(VALID_MOODS)}
Return 1-3 moods max. The entry may be in English, Hindi, or Hinglish.
Response format JSON only: {{"moods": ["mood1"], "reasoning": "one sentence"}}"""

    try:
        result    = json.loads(chat(system_prompt=system_prompt,
            user_prompt=f"Journal entry:\n{text_to_analyse[:2000]}",
            max_tokens=150, temperature=0.3, json_mode=True))
        moods     = [m for m in result.get("moods", []) if m in VALID_MOODS][:3]
        if not moods:
            return send_error(handler_self, "Could not predict moods", 400)
        if entry_id:
            update_entry_fields(uid, entry_id, {"moods": moods})
        send_json(handler_self, {"moods": moods, "reasoning": result.get("reasoning", ""), "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_polish(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "polish")
    if not allowed:
        return send_error(handler_self, f"Daily polish limit reached ({limit}/day).", 429)

    entry_id = body.get("entryId")
    if not entry_id:
        return send_error(handler_self, "entryId is required", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entry = get_entry(uid, entry_id)
    if not entry:
        return send_error(handler_self, "Entry not found", 404)

    body_html = entry.get("body", "").strip()
    body_text = entry.get("bodyText", "").strip()
    if not body_text or len(body_text) < 10:
        return send_error(handler_self, "Entry too short to polish", 400)

    system_prompt = """You are a careful writing editor for a private journaling app.
Fix grammar and clarity while completely preserving the writer's voice and style.
Preserve ALL HTML tags. Return JSON only: {"polishedHtml": "...", "changes": "one sentence summary"}"""

    try:
        result        = json.loads(chat(system_prompt=system_prompt,
            user_prompt=f"Polish this journal entry HTML:\n{body_html[:4000]}",
            max_tokens=1500, temperature=0.3, json_mode=True))
        polished_html = result.get("polishedHtml", "").strip()
        if not polished_html:
            return send_error(handler_self, "AI returned empty content", 500)
        plain_text = re.sub(r'<[^>]+>', ' ', polished_html)
        plain_text = re.sub(r'\s+', ' ', plain_text).strip()
        word_count = len(plain_text.split()) if plain_text else 0
        update_entry_fields(uid, entry_id, {"body": polished_html, "bodyText": plain_text, "wordCount": word_count})
        send_json(handler_self, {"polishedHtml": polished_html, "changes": result.get("changes", ""), "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_prompt(handler_self, uid):
    allowed, count, limit = check_rate_limit(uid, "prompt")
    if not allowed:
        return send_error(handler_self, f"Daily prompt limit reached ({limit}/day).", 429)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entries = get_entries(uid, limit=5)
    if not entries:
        return send_json(handler_self, {
            "prompt": "What's been on your mind lately that you haven't had a chance to sit with?",
            "theme": "getting started"
        })

    entry_summaries = []
    for i, entry in enumerate(entries[:5], 1):
        title     = entry.get("title", "").strip()
        body_text = entry.get("bodyText", "").strip()[:200]
        moods     = entry.get("moods", [])
        summary   = f"Entry {i}:"
        if title:   summary += f" '{title}'"
        if moods:   summary += f" (mood: {', '.join(moods)})"
        if body_text: summary += f"\n{body_text}"
        entry_summaries.append(summary)

    system_prompt = """You are a thoughtful journaling coach.
Create one meaningful writing prompt based on the person's recent entries.
Make it specific to their actual life, not generic.
Write in English only.
Return JSON only: {"prompt": "...", "theme": "2-3 word theme"}"""

    try:
        result = json.loads(chat(system_prompt=system_prompt,
            user_prompt=f"Recent entries:\n\n{chr(10).join(entry_summaries)}\n\nGenerate a personalized prompt.",
            max_tokens=150, temperature=0.8, json_mode=True))
        send_json(handler_self, {"prompt": result.get("prompt", ""), "theme": result.get("theme", ""), "remaining": limit - count})
    except Exception:
        send_json(handler_self, {"prompt": "What's one thing from this week that deserves more of your attention?", "theme": "reflection"})


def handle_summary(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "summary")
    if not allowed:
        return send_error(handler_self, f"Daily summary limit reached ({limit}/day).", 429)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    now        = datetime.now(timezone.utc)
    week_start = now - timedelta(days=now.weekday())
    week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
    week_of    = week_start.strftime("%Y-%m-%d")

    existing = get_weekly_summary(uid, week_of)
    if existing:
        date_from = (now - timedelta(days=7)).strftime("%b %d")
        date_to   = now.strftime("%b %d, %Y")
        return send_json(handler_self, {
            "summary": existing.get("summary", ""), "weekOf": week_of,
            "entryCount": existing.get("entryCount", 0),
            "dateFrom": date_from, "dateTo": date_to, "cached": True,
        })

    all_entries  = get_entries(uid, limit=50)
    cutoff       = now - timedelta(days=7)
    week_entries = []
    for entry in all_entries:
        created_at = entry.get("createdAt")
        if created_at is None:
            continue
        try:
            if hasattr(created_at, 'timestamp'):
                entry_dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
            elif isinstance(created_at, datetime):
                entry_dt = created_at if created_at.tzinfo else created_at.replace(tzinfo=timezone.utc)
            else:
                continue
            if entry_dt >= cutoff:
                week_entries.append(entry)
        except Exception:
            continue

    if len(week_entries) < 2:
        week_entries = all_entries[:7]

    if not week_entries:
        return send_error(handler_self, "No entries found. Write some entries first!", 400)

    entry_texts = []
    for entry in sorted(week_entries, key=lambda e: e.get("createdAt") or 0):
        title     = entry.get("title", "").strip()
        body_text = entry.get("bodyText", "").strip()[:300]
        moods     = entry.get("moods", [])
        parts     = []
        if title:     parts.append(f"Title: {title}")
        if moods:     parts.append(f"Mood: {', '.join(moods)}")
        if body_text: parts.append(body_text)
        entry_texts.append("\n".join(parts))

    system_prompt = """Write a warm 3-5 sentence narrative weekly summary in second person.
Highlight themes, emotions, and moments. End with one forward-looking sentence.
Pure prose, no bullet points. English only."""

    try:
        summary = chat(system_prompt=system_prompt,
            user_prompt=f"Entries this week ({len(week_entries)} entries):\n\n{'---'.join(entry_texts)}\n\nWrite a warm weekly summary.",
            max_tokens=300, temperature=0.7)
        save_weekly_summary(uid, week_of, summary, len(week_entries))
        date_from = (now - timedelta(days=7)).strftime("%b %d")
        date_to   = now.strftime("%b %d, %Y")
        send_json(handler_self, {
            "summary": summary, "weekOf": week_of,
            "entryCount": len(week_entries),
            "dateFrom": date_from, "dateTo": date_to,
            "cached": False, "remaining": limit - count,
        })
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_chat(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "chat")
    if not allowed:
        return send_error(handler_self, f"Daily chat limit reached ({limit}/day).", 429)

    messages = body.get("messages", [])
    if not messages:
        return send_error(handler_self, "messages array is required", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entries = get_entries(uid, limit=20)
    if not entries:
        return send_error(handler_self, "No journal entries found.", 400)

    all_user_text = " ".join(m["content"] for m in messages[-4:] if m["role"] == "user")
    try:
        relevant_entries = query_similar(uid, all_user_text, top_k=8)
        used_rag = True
    except Exception:
        relevant_entries = []
        used_rag = False

    if not relevant_entries:
        relevant_entries = []
        for entry in entries[:10]:
            title     = entry.get("title", "Untitled").strip()
            body_text = entry.get("bodyText", "").strip()[:400]
            moods     = entry.get("moods", [])
            created_at = entry.get("createdAt")
            date_str  = ""
            if created_at:
                try:
                    if hasattr(created_at, 'timestamp'):
                        dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
                        date_str = dt.strftime("%b %d, %Y")
                except Exception:
                    pass
            relevant_entries.append({"title": title, "date": date_str, "moods": moods, "snippet": body_text})

    entry_context = "\n\n---\n\n".join(
        f"[{e.get('date','')}] {e.get('title','')}\nMood: {', '.join(e.get('moods',[]))}\n{e.get('snippet','')}"
        for e in relevant_entries
    )

    system_prompt = f"""You are a warm journaling companion who has read this person's journal.
Answer questions based ONLY on the entries below. Be empathetic and conversational.
Reference dates/titles naturally. If the answer isn't in the entries, say so.
Keep responses to 2-4 sentences. Respond in the same language the person uses.

=== RELEVANT JOURNAL ENTRIES ===
{entry_context}
=== END ==="""

    try:
        reply = chat_with_history(system_prompt=system_prompt,
            messages=messages[-10:], max_tokens=400, temperature=0.7)
        try:
            last_user_msg = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
            save_chat_message(uid, "user", last_user_msg)
            save_chat_message(uid, "assistant", reply)
        except Exception:
            pass
        send_json(handler_self, {"reply": reply, "entriesUsed": len(relevant_entries), "usedRag": used_rag, "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_chat_history_get(handler_self, uid):
    try:
        messages = get_chat_history(uid, limit=50)
        formatted = [{"id": m["id"], "role": m["role"], "content": m["content"],
                      "createdAt": _format_ts(m.get("createdAt"))} for m in messages]
        send_json(handler_self, {"messages": formatted})
    except Exception as e:
        send_error(handler_self, str(e), 500)


def handle_chat_history_delete(handler_self, uid):
    try:
        clear_chat_history(uid)
        send_json(handler_self, {"success": True})
    except Exception as e:
        send_error(handler_self, str(e), 500)


def handle_embed(handler_self, uid, body):
    entry_id = body.get("entryId")
    if not entry_id:
        return send_error(handler_self, "entryId is required", 400)

    entry = get_entry(uid, entry_id)
    if not entry:
        return send_error(handler_self, "Entry not found", 404)

    if entry.get("isDeleted", False):
        return send_json(handler_self, {"success": True, "skipped": "deleted"})

    title     = entry.get("title", "").strip()
    body_text = entry.get("bodyText", "").strip()
    moods     = entry.get("moods", [])
    tags      = entry.get("tags", [])
    date_str  = _format_ts_short(entry.get("createdAt"))

    parts = []
    if title:     parts.append(f"Title: {title}")
    if date_str:  parts.append(f"Date: {date_str}")
    if moods:     parts.append(f"Mood: {', '.join(moods)}")
    if tags:      parts.append(f"Tags: {', '.join(tags)}")
    if body_text: parts.append(f"\n{body_text}")
    embed_text = "\n".join(parts)

    if not embed_text.strip() or len(embed_text.strip()) < 5:
        return send_json(handler_self, {"success": True, "skipped": "too_short"})

    try:
        upsert_entry(uid, entry_id, embed_text, {
            "title": title or "Untitled", "date": date_str,
            "moods": moods, "tags": tags, "snippet": body_text[:300],
        })
        send_json(handler_self, {"success": True, "entryId": entry_id})
    except Exception as e:
        send_error(handler_self, f"Embedding failed: {str(e)}", 500)


def handle_letter(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "letter")
    if not allowed:
        return send_error(handler_self, f"Daily letter limit reached ({limit}/day).", 429)

    deliver_in = int(body.get("deliverIn", 6))
    user_note  = body.get("userNote", "").strip()

    if deliver_in not in [3, 6, 12]:
        return send_error(handler_self, "deliverIn must be 3, 6, or 12", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entries = get_entries(uid, limit=10)
    if not entries:
        return send_error(handler_self, "Write some entries first.", 400)

    profile   = get_user_profile(uid)
    user_name = ((profile or {}).get("displayName", "") or "").split()[0]

    entry_parts = []
    for entry in entries[:8]:
        title     = entry.get("title", "").strip()
        body_text = entry.get("bodyText", "").strip()[:300]
        moods     = entry.get("moods", [])
        date_str  = _format_ts_short(entry.get("createdAt"))
        parts     = []
        if date_str:  parts.append(f"[{date_str}]")
        if title:     parts.append(f"Title: {title}")
        if moods:     parts.append(f"Mood: {', '.join(moods)}")
        if body_text: parts.append(body_text)
        entry_parts.append("\n".join(parts))

    user_prompt = f"Here are {user_name or 'the user'}'s recent journal entries:\n\n{'---'.join(entry_parts)}"
    if user_note:
        user_prompt += f"\n\nThey also want to include: {user_note}"
    user_prompt += f"\n\nThis letter will be delivered in {deliver_in} months. Write it now."

    system_prompt = """Write a heartfelt personal letter from this person to their future self.
Reference their actual life from the entries. Ask their future self questions.
3-5 paragraphs. Warm, honest, personal. Only the letter text, no meta commentary."""

    try:
        letter = chat(system_prompt=system_prompt, user_prompt=user_prompt, max_tokens=700, temperature=0.8)
        try:
            from dateutil.relativedelta import relativedelta
            deliver_at = (datetime.now(timezone.utc) + relativedelta(months=deliver_in)).strftime("%Y-%m-%d")
        except ImportError:
            deliver_at = (datetime.now(timezone.utc) + timedelta(days=deliver_in * 30)).strftime("%Y-%m-%d")
        letter_id = save_letter(uid, letter, deliver_at, deliver_in, user_note)
        send_json(handler_self, {"letter": letter, "deliverAt": deliver_at, "deliverIn": deliver_in, "letterId": letter_id, "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_letters_get(handler_self, uid):
    letters = get_letters(uid)
    formatted = [{"id": l["id"], "letter": l.get("letter", ""), "deliverAt": l.get("deliverAt", ""),
                  "deliverIn": l.get("deliverIn", 6), "userNote": l.get("userNote", ""),
                  "opened": l.get("opened", False), "createdAt": _format_ts(l.get("createdAt"))} for l in letters]
    send_json(handler_self, {"letters": formatted})


def handle_letters_manual(handler_self, uid, body):
    letter     = body.get("letter", "").strip()
    deliver_at = body.get("deliverAt", "").strip()
    if not letter or not deliver_at:
        return send_error(handler_self, "letter and deliverAt are required", 400)
    try:
        letter_id = save_letter(uid, letter, deliver_at, 0, "")
        send_json(handler_self, {"letterId": letter_id, "deliverAt": deliver_at})
    except Exception as e:
        send_error(handler_self, str(e), 500)


def handle_tags(handler_self, uid, body):
    allowed, count, limit = check_rate_limit(uid, "tags")
    if not allowed:
        return send_error(handler_self, f"Daily tag limit reached ({limit}/day).", 429)

    entry_id = body.get("entryId")
    if not entry_id:
        return send_error(handler_self, "entryId is required", 400)

    settings = get_user_settings(uid)
    if not check_ai_opt_in(settings):
        return send_error(handler_self, "AI features are not enabled.", 403)

    entry = get_entry(uid, entry_id)
    if not entry:
        return send_error(handler_self, "Entry not found", 404)

    title    = entry.get("title", "").strip()
    body_text = entry.get("bodyText", "").strip()
    existing = entry.get("tags", [])

    if not body_text and not title:
        return send_error(handler_self, "Entry has no content", 400)

    system_prompt = """Suggest 2-5 short lowercase tags for a journal entry.
Focus on topics, themes, people, places, activities. Avoid generic words like 'journal'.
Return JSON only: {"tags": ["tag1", "tag2"]}"""

    user_prompt = f"Title: {title}\n\nContent:\n{body_text[:1500]}"
    if existing:
        user_prompt += f"\n\nDon't repeat existing tags: {', '.join(existing)}"

    try:
        result = json.loads(chat(system_prompt=system_prompt, user_prompt=user_prompt,
            max_tokens=100, temperature=0.3, json_mode=True))
        tags = [t.lower().strip().replace(' ', '-') for t in result.get("tags", []) if isinstance(t, str)]
        tags = [t for t in tags if t not in existing][:5]
        send_json(handler_self, {"tags": tags, "remaining": limit - count})
    except Exception as e:
        send_error(handler_self, f"AI service error: {str(e)}", 500)


def handle_health(handler_self):
    required = ["OPENAI_API_KEY", "FIREBASE_ADMIN_PROJECT_ID", "FIREBASE_ADMIN_CLIENT_EMAIL",
                "FIREBASE_ADMIN_PRIVATE_KEY", "UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN"]
    status = {k: bool(os.environ.get(k)) for k in required}
    send_json(handler_self, {"status": "ok", "env": status})


# ── HELPERS ───────────────────────────────────────────────────

def _format_ts(ts) -> str:
    if ts is None:
        return ""
    try:
        if hasattr(ts, 'timestamp'):
            dt = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc)
            return dt.isoformat()
    except Exception:
        pass
    return ""


def _format_ts_short(ts) -> str:
    if ts is None:
        return ""
    try:
        if hasattr(ts, 'timestamp'):
            dt = datetime.fromtimestamp(ts.timestamp(), tz=timezone.utc)
            return dt.strftime("%b %d, %Y")
    except Exception:
        pass
    return ""


# ══════════════════════════════════════════════════════════════
# MAIN ROUTER
# ══════════════════════════════════════════════════════════════

class handler(BaseHTTPRequestHandler):

    def _get_uid(self):
        try:
            return verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            send_error(self, str(e), 401)
            return None

    def _get_route(self):
        # Strip /api/ai prefix and query string
        path = self.path.split('?')[0]
        path = re.sub(r'^/api/ai', '', path).strip('/')
        return path

    def do_OPTIONS(self):
        send_options(self)

    def do_GET(self):
        route = self._get_route()

        if route == 'health':
            return handle_health(self)

        uid = self._get_uid()
        if not uid:
            return

        if route == 'prompt':
            return handle_prompt(self, uid)
        elif route == 'chat_history':
            return handle_chat_history_get(self, uid)
        elif route == 'letters':
            return handle_letters_get(self, uid)
        else:
            send_error(self, f"Unknown route: GET /{route}", 404)

    def do_POST(self):
        uid = self._get_uid()
        if not uid:
            return

        route = self._get_route()

        try:
            body = read_json_body(self)
        except Exception:
            body = {}

        if route == 'reflect':
            return handle_reflect(self, uid, body)
        elif route == 'mood':
            return handle_mood(self, uid, body)
        elif route == 'polish':
            return handle_polish(self, uid, body)
        elif route == 'summary':
            return handle_summary(self, uid, body)
        elif route == 'chat':
            return handle_chat(self, uid, body)
        elif route == 'embed':
            return handle_embed(self, uid, body)
        elif route == 'letter':
            return handle_letter(self, uid, body)
        elif route == 'letters_manual':
            return handle_letters_manual(self, uid, body)
        elif route == 'tags':
            return handle_tags(self, uid, body)
        elif re.match(r'^letters/[^/]+/open$', route):
            letter_id = route.split('/')[1]
            try:
                mark_letter_opened(uid, letter_id)
                send_json(self, {"success": True})
            except Exception as e:
                send_error(self, str(e), 500)
        else:
            send_error(self, f"Unknown route: POST /{route}", 404)

    def do_DELETE(self):
        uid = self._get_uid()
        if not uid:
            return

        route = self._get_route()

        if route == 'chat_history':
            return handle_chat_history_delete(self, uid)
        else:
            send_error(self, f"Unknown route: DELETE /{route}", 404)

    def log_message(self, format, *args):
        pass