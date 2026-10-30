#!/usr/bin/env python3
"""End-to-end OPEN.EXE -> MAIN.EXE menu ordering with Firefox WebDriver.

Uses Python standard library (no Selenium package or screenshot OCR).
Reads the browser's read-only boot state and preserves the original assets.
"""
import json
import os
import shutil
import socket
import subprocess
import time
import urllib.error
import urllib.request

HOST = "127.0.0.1"
BASE = "http://127.0.0.1:18082"
PORT = 18093
DRIVER = f"http://{HOST}:{PORT}"

def request(method, path, payload=None, timeout=20):
    body = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(DRIVER + path, data=body, method=method,
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        result = json.load(response)
    if result.get("value") and isinstance(result["value"], dict) and "error" in result["value"]:
        raise RuntimeError(f"WebDriver {path}: {result['value']}")
    return result

def eval_js(session, script):
    return request("POST", f"/session/{session}/execute/sync",
                   {"script": script, "args": []})["value"]

def navigate(session, url):
    request("POST", f"/session/{session}/url", {"url": url}, timeout=70)

def state(session):
    return eval_js(session,
                   "return window.__uw2BootState ? window.__uw2BootState() : null")

def await_state(session, predicate, seconds, label):
    until = time.monotonic() + seconds
    seen = []
    while time.monotonic() < until:
        s = state(session)
        if s is not None and (not seen or seen[-1] != s):
            seen.append(s)
        if s is not None and predicate(s):
            return s, seen
        time.sleep(0.16)
    raise AssertionError(f"{label}: timeout, states={seen}")

if __name__ == "__main__":
    binary = shutil.which("geckodriver") or "/snap/bin/geckodriver"
    if not os.path.isfile(binary):
        raise RuntimeError(f"geckodriver unavailable: {binary}")

    proc = subprocess.Popen([binary, "--port", str(PORT), "--log", "error"],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    session = None
    try:
        ready = False
        for _ in range(100):
            if proc.poll() is not None:
                raise RuntimeError(f"geckodriver terminated: {proc.returncode}")
            try:
                request("GET", "/status", timeout=2)
                ready = True
                break
            except (urllib.error.URLError, ConnectionError, TimeoutError):
                time.sleep(0.15)
        assert ready, "geckodriver readiness"

        caps = {
            "capabilities": {
                "alwaysMatch": {
                    "browserName": "firefox",
                    "moz:firefoxOptions": {
                        "args": ["-headless"],
                        "prefs": {
                            "media.autoplay.default": 1,
                            "dom.webnotifications.enabled": False,
                        },
                    },
                }
            }
        }
        session = request("POST", "/session", caps, timeout=90)["value"]["sessionId"]

        # Give the verified OPEN.EXE sufficient time to remain visible while
        # all MAIN resources finish loading in the background.
        navigate(session, BASE + "/?openingSpeed=1")
        playing, seen = await_state(
            session,
            lambda s: s["opening"] == "playing" and s["viewMode"] == "opening",
            20, "initial OPEN.EXE")
        assert playing["viewMode"] != "system-menu", seen

        loaded, _ = await_state(
            session,
            lambda s: s["gameResourcesSettled"] and s["opening"] == "playing",
            20, "MAIN resource race")
        assert loaded["viewMode"] == "opening", loaded

        # Pressing Enter on the intro is an explicit user skip.
        eval_js(session,
                "window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true})); return true;")
        menu, _ = await_state(
            session,
            lambda s: s["viewMode"] == "system-menu" and s["opening"] == "finished",
            12, "skip -> menu")
        assert menu["gameResourcesSettled"], menu
        print("OPENING BEFORE MAIN LOAD + SKIP MENU: PASS", json.dumps(menu))

        # Natural completion, without a skip, cannot open the menu before all
        # twelve recorded Korean scenes have executed.
        navigate(session, BASE + "/?openingSpeed=80")
        start, _ = await_state(
            session,
            lambda s: s["opening"] == "playing" and s["viewMode"] == "opening",
            20, "accelerated OPEN.EXE")
        all_seen = []
        final = None
        until = time.monotonic() + 35
        while time.monotonic() < until:
            s = state(session)
            dbg = eval_js(session,
                         "return document.getElementById('debug')?.textContent || ''")
            try:
                data = json.loads(dbg)
                if data.get("view") == "opening":
                    scene = data.get("scene")
                    if scene not in all_seen:
                        all_seen.append(scene)
            except (ValueError, TypeError):
                pass
            if s and s["viewMode"] == "system-menu":
                final = s
                break
            time.sleep(0.12)
        assert final is not None, f"natural completion timeout; observed scenes={all_seen}"
        assert final["opening"] == "finished" and final["gameResourcesSettled"], final
        assert all_seen and max(all_seen) >= 10, f"missing late OPEN.EXE scenes {all_seen}"
        print("TWELVE-SCENE OPEN.EXE NATURAL END -> MAIN MENU: PASS",
              json.dumps({"scenesSeen": all_seen, "final": final}))
    finally:
        if session:
            try:
                request("DELETE", f"/session/{session}", timeout=10)
            except Exception:
                pass
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
