#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import mimetypes
import os
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
GAME_DIR = Path(os.environ.get(
    "UW2_GAME_DIR",
    "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD",
)).resolve()
PORT = int(os.environ.get("UW2_WEB_PORT", "18082"))

ALLOWED_EXT = {
    ".DAT", ".LZW", ".MES", ".MML", ".FNT", ".TBL", ".PUT", ".16P"
}


def safe_game_file(name: str) -> Path | None:
    clean = Path(name).name
    if clean != name:
        return None
    p = (GAME_DIR / clean).resolve()
    if p.parent != GAME_DIR or p.suffix.upper() not in ALLOWED_EXT or not p.is_file():
        return None
    return p


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path: str) -> str:
        parsed = urlparse(path)
        rel = unquote(parsed.path).lstrip("/")
        if rel.startswith("api/") or rel.startswith("game/"):
            return str(WEB / "__not_a_static_file__")
        if not rel:
            rel = "index.html"
        return str((WEB / rel).resolve())

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/manifest":
            self.send_manifest()
            return
        if parsed.path.startswith("/game/"):
            self.send_game_file(unquote(parsed.path[len("/game/"):]))
            return
        super().do_GET()

    def send_manifest(self):
        files = []
        if GAME_DIR.is_dir():
            for p in sorted(GAME_DIR.iterdir()):
                if not p.is_file() or p.suffix.upper() not in ALLOWED_EXT:
                    continue
                h = hashlib.sha256()
                with p.open("rb") as f:
                    for chunk in iter(lambda: f.read(1024 * 1024), b""):
                        h.update(chunk)
                files.append({
                    "name": p.name,
                    "size": p.stat().st_size,
                    "sha256": h.hexdigest(),
                })
        body = json.dumps({
            "gameDirAvailable": GAME_DIR.is_dir(),
            "fileCount": len(files),
            "files": files,
        }, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_game_file(self, name: str):
        p = safe_game_file(name)
        if p is None:
            self.send_error(404, "Game resource not found")
            return
        ctype = mimetypes.guess_type(p.name)[0] or "application/octet-stream"
        size = p.stat().st_size
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(size))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        with p.open("rb") as f:
            while True:
                chunk = f.read(1024 * 1024)
                if not chunk:
                    break
                self.wfile.write(chunk)


if __name__ == "__main__":
    print(f"UW2 browser runtime: http://0.0.0.0:{PORT}")
    print(f"Game resources: {GAME_DIR}")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()