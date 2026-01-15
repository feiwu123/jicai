from __future__ import annotations

import json
import mimetypes
import posixpath
import ssl
import sys
import traceback
import urllib.error
import urllib.parse
import urllib.request
import os
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


_HERE = Path(__file__).resolve().parent
_ROOT = _HERE.parent
_FRONTEND_DIR = _ROOT / "frontend"
_DEFAULT_INDEX = _FRONTEND_DIR / "index.html"
_API_ORIGIN = os.getenv("PICAI_API_ORIGIN") or os.getenv("TOPM_BASE") or "https://topm.tech"


def _safe_join(root: Path, url_path: str) -> Path | None:
    # Prevent path traversal; url_path is POSIX-style.
    url_path = posixpath.normpath(url_path)
    if url_path.startswith("../") or url_path == "..":
        return None
    rel = url_path.lstrip("/")
    candidate = (root / rel).resolve()
    try:
        candidate.relative_to(root.resolve())
    except Exception:
        return None
    return candidate


def _read_body(handler: BaseHTTPRequestHandler) -> bytes:
    length = handler.headers.get("Content-Length")
    if not length:
        return b""
    try:
        n = int(length)
    except ValueError:
        return b""
    return handler.rfile.read(n) if n > 0 else b""


class Handler(BaseHTTPRequestHandler):
    server_version = "picai/0.1"

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), fmt % args))

    def do_GET(self) -> None:  # noqa: N802
        self._dispatch()

    def do_POST(self) -> None:  # noqa: N802
        self._dispatch()

    def do_OPTIONS(self) -> None:  # noqa: N802
        # Allow preflight even though we serve same-origin by default.
        self.send_response(HTTPStatus.NO_CONTENT)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def _dispatch(self) -> None:
        try:
            parsed = urllib.parse.urlsplit(self.path)
            path = parsed.path or "/"

            if path == "/health":
                self._send_text(HTTPStatus.OK, "ok")
                return

            if path.startswith("/api/wholesales/"):
                self._proxy_to_upstream()
                return

            self._serve_static()
        except Exception:
            traceback.print_exc()
            self._send_json(
                HTTPStatus.INTERNAL_SERVER_ERROR,
                {"code": "1", "msg": "internal_error", "detail": "See server logs for traceback."},
            )

    def _serve_static(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        # Browsers percent-encode non-ASCII paths; decode so Chinese filenames resolve on disk.
        path = urllib.parse.unquote(parsed.path or "/")

        if path == "/":
            if _DEFAULT_INDEX.exists():
                self._send_file(_DEFAULT_INDEX)
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Missing frontend/index.html")
            return

        local_path = _safe_join(_FRONTEND_DIR, path)
        if local_path is None:
            self.send_error(HTTPStatus.BAD_REQUEST, "Bad path")
            return

        if local_path.is_dir():
            index = local_path / "index.html"
            if index.exists():
                self._send_file(index)
                return
            self.send_error(HTTPStatus.NOT_FOUND, "Directory index not found")
            return

        if not local_path.exists():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return

        self._send_file(local_path)

    def _send_file(self, path: Path) -> None:
        ctype, _enc = mimetypes.guess_type(str(path))
        if not ctype:
            ctype = "application/octet-stream"

        data = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_text(self, status: int, text: str) -> None:
        data = text.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, status: int, payload: object) -> None:
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(data)

    def _proxy_to_upstream(self) -> None:
        parsed = urllib.parse.urlsplit(self.path)
        upstream_url = urllib.parse.urlunsplit(
            (urllib.parse.urlsplit(_API_ORIGIN).scheme, urllib.parse.urlsplit(_API_ORIGIN).netloc, parsed.path, parsed.query, "")
        )

        body = _read_body(self)
        headers = {}
        content_type = self.headers.get("Content-Type")
        if content_type:
            headers["Content-Type"] = content_type
        accept = self.headers.get("Accept")
        if accept:
            headers["Accept"] = accept
        ua = self.headers.get("User-Agent")
        if ua:
            headers["User-Agent"] = ua

        req = urllib.request.Request(upstream_url, data=body if self.command != "GET" else None, headers=headers, method=self.command)

        ctx = ssl.create_default_context()
        try:
            with urllib.request.urlopen(req, timeout=30, context=ctx) as resp:
                resp_body = resp.read()
                self.send_response(resp.status)
                resp_ct = resp.headers.get("Content-Type") or "application/octet-stream"
                self.send_header("Content-Type", resp_ct)
                self.send_header("Content-Length", str(len(resp_body)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(resp_body)
        except urllib.error.HTTPError as e:
            err_body = e.read() if hasattr(e, "read") else b""
            self.send_response(e.code)
            resp_ct = e.headers.get("Content-Type") if getattr(e, "headers", None) else None
            self.send_header("Content-Type", resp_ct or "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(err_body)))
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(err_body)
        except Exception as e:
            self._send_json(
                HTTPStatus.BAD_GATEWAY,
                {"code": "1", "msg": "upstream_error", "detail": str(e), "upstream": upstream_url},
            )


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    mimetypes.add_type("application/javascript", ".js")
    mimetypes.add_type("text/css", ".css")
    mimetypes.add_type("image/svg+xml", ".svg")

    if not _FRONTEND_DIR.exists():
        raise RuntimeError(f"Missing frontend directory: {_FRONTEND_DIR}")

    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port}/ (frontend={_FRONTEND_DIR})")
    print(f"Proxying /api/wholesales/* -> {_API_ORIGIN}/api/wholesales/*")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
