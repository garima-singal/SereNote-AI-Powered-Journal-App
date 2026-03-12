import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth import verify_token
from lib.firestore   import get_chat_history, clear_chat_history
from lib.helpers     import send_json, send_error, send_options


def _format_ts(created_at) -> str:
    """Format Firestore Timestamp to ISO string."""
    if created_at is None:
        return ""
    try:
        from datetime import datetime, timezone
        if hasattr(created_at, 'timestamp'):
            dt = datetime.fromtimestamp(created_at.timestamp(), tz=timezone.utc)
            return dt.isoformat()
    except Exception:
        pass
    return ""


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_GET(self):
        # ── Verify auth ───────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── Fetch history ─────────────────────────────────────
        try:
            messages = get_chat_history(uid, limit=50)
            formatted = [
                {
                    "id":        m["id"],
                    "role":      m["role"],
                    "content":   m["content"],
                    "createdAt": _format_ts(m.get("createdAt")),
                }
                for m in messages
            ]
            send_json(self, {"messages": formatted})
        except Exception as e:
            send_error(self, f"Failed to fetch history: {str(e)}", 500)

    def do_DELETE(self):
        # ── Verify auth ───────────────────────────────────────
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # ── Clear history ─────────────────────────────────────
        try:
            clear_chat_history(uid)
            send_json(self, {"success": True})
        except Exception as e:
            send_error(self, f"Failed to clear history: {str(e)}", 500)

    def log_message(self, format, *args):
        pass