#!/usr/bin/env python3
"""Regression: only the public web root is reachable through HTTP static paths.

No owner DOS resource bytes, local server, sockets or external packages needed.
"""
import importlib.util
import tempfile
from pathlib import Path

SCRIPT = Path(__file__).resolve().parents[1] / "serve.py"
spec = importlib.util.spec_from_file_location("uw2_web_safe_serve", SCRIPT)
server = importlib.util.module_from_spec(spec)
spec.loader.exec_module(server)

with tempfile.TemporaryDirectory(prefix="uw2-serve-scope-") as temporary:
    base = Path(temporary)
    web = base / "web"
    web.mkdir()
    (web / "assets").mkdir()
    (web / "index.html").write_text("public", encoding="utf-8")
    (web / "assets" / "app.js").write_text("public code", encoding="utf-8")
    secret = base / "PRIVATE_MAIN.EXE"
    secret.write_bytes(b"never served")
    (web / "redirect.js").symlink_to(secret)
    original = server.WEB
    server.WEB = web
    handler = object.__new__(server.Handler)
    try:
        assert handler.translate_path("/") == str(web / "index.html")
        assert handler.translate_path("/index.html?cache=1") == str(web / "index.html")
        assert handler.translate_path("/assets/app.js") == str(web / "assets" / "app.js")
        assert handler.translate_path("/assets%2Fapp.js") == str(web / "assets" / "app.js")
        refused = str(web / "__not_a_static_file__")
        for url in (
            "/../PRIVATE_MAIN.EXE",
            "/%2e%2e/PRIVATE_MAIN.EXE",
            "/assets/../../PRIVATE_MAIN.EXE",
            "/assets/%2e%2e/%2e%2e/PRIVATE_MAIN.EXE",
            "/%252e%252e/../PRIVATE_MAIN.EXE",
            "/redirect.js",
            "/api/manifest",
            "/game/KOUKAI2.DAT",
            "/game",
            "/api",
        ):
            result = handler.translate_path(url)
            assert result == refused, (url, result)
        assert secret.read_bytes() == b"never served"
    finally:
        server.WEB = original
print("UW2 static HTTP traversal, percent-encoded parent and symlink escape: PASS")
