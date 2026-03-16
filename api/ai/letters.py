import sys
import os
from datetime import datetime, timezone
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from http.server import BaseHTTPRequestHandler
from lib.verify_auth import verify_token
from lib.firestore   import get_letters, mark_letter_opened
from lib.helpers     import send_json, send_error, send_options


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


class handler(BaseHTTPRequestHandler):

    def do_OPTIONS(self):
        send_options(self)

    def do_GET(self):
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        letters = get_letters(uid)
        formatted = [
            {
                "id":        l["id"],
                "letter":    l.get("letter", ""),
                "deliverAt": l.get("deliverAt", ""),
                "deliverIn": l.get("deliverIn", 6),
                "userNote":  l.get("userNote", ""),
                "opened":    l.get("opened", False),
                "createdAt": _format_ts(l.get("createdAt")),
            }
            for l in letters
        ]
        send_json(self, {"letters": formatted})

    def do_POST(self):
        # Handle /api/ai/letters/{id}/open
        try:
            uid = verify_token(self.headers.get("Authorization"))
        except ValueError as e:
            return send_error(self, str(e), 401)

        # Extract letter_id from path
        path      = self.path  # e.g. /api/ai/letters/abc123/open
        parts     = path.strip('/').split('/')
        # parts = ['api', 'ai', 'letters', 'abc123', 'open']
        if len(parts) >= 5 and parts[-1] == 'open':
            letter_id = parts[-2]
            try:
                mark_letter_opened(uid, letter_id)
                send_json(self, {"success": True})
            except Exception as e:
                send_error(self, str(e), 500)
        else:
            send_error(self, "Not found", 404)

    def log_message(self, format, *args):
        pass