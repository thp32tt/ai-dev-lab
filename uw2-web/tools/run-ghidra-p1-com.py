#!/usr/bin/env python3
"""One-shot read-only Ghidra 8086 COM image scan; original Korean bytes remain private."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "docs" / "original-baseline-20261031.json"
GHIDRA = Path("/home/chatgpt-runner/tools/ghidra_12.1.4_PUBLIC")
JAVA = Path("/home/chatgpt-runner/tools/jdk-21.0.12.1+1")


def scan_com(original: Path, destination: Path, timeout: int = 150) -> dict:
    original = original.resolve(strict=True)
    name = original.name.upper()
    if name not in ("KOEI.COM", "FMDRV.COM"):
        raise ValueError("only Korean KOEI.COM/FMDRV.COM have pinned COM layout")
    baseline = json.loads(BASELINE.read_text("utf-8"))
    pinned = next((x for x in baseline["coreExecutables"] if x["name"] == name), None)
    if pinned is None:
        raise ValueError("original COM missing from pinned manifest")
    data = original.read_bytes()
    sha = hashlib.sha256(data).hexdigest()
    if (sha != pinned["sha256"] or len(data) != pinned["size"] or
        not 1 <= len(data) <= 0xff00 or pinned["com"]["loadOffset"] != 0x100):
        raise ValueError("COM size/load-offset/original SHA-256 mismatch")
    destination = destination.resolve()
    if destination.exists() or not destination.parent.is_dir():
        raise ValueError("private metadata output must be a new file in existing directory")
    if not 30 <= timeout <= 220:
        raise ValueError("bounded timeout required")
    headless = (GHIDRA / "support" / "analyzeHeadless").resolve(strict=True)
    script = (ROOT / "tools" / "Uw2GhidraInstructionChunk.java").resolve(strict=True)
    env = dict(os.environ, JAVA_HOME=str(JAVA), GHIDRA_INSTALL_DIR=str(GHIDRA))
    with tempfile.TemporaryDirectory(prefix="uw2-p1-com-") as project:
        args = [str(headless), project, "uw2_original_com", "-import", str(original),
                "-processor", "x86:LE:16:Real Mode",
                "-scriptPath", str(script.parent), "-max-cpu", "1",
                "-analysisTimeoutPerFile", str(min(timeout - 15, 160)),
                "-deleteProject", "-postScript", script.name, str(destination),
                name, sha, str(len(data)), "0", str(len(data)), "10100"]
        result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                text=True, encoding="utf-8", errors="replace",
                                timeout=timeout, check=False, env=env)
    if result.returncode or not destination.is_file() or "SCRIPT ERROR" in result.stdout:
        destination.unlink(missing_ok=True)
        raise RuntimeError("Ghidra COM static analysis failed:\n" +
                           "\n".join(result.stdout.splitlines()[-50:]))
    content = destination.read_bytes()
    j = json.loads(content)
    if (j.get("provider") != "GHIDRA" or j.get("moduleName") != name or
        j.get("sha256") != sha or j.get("loadBase") != 0x10100 or
        j.get("windowStart") != 0 or j.get("windowEnd") != len(data) or
        j.get("imageBytes") != len(data)):
        destination.unlink(missing_ok=True)
        raise RuntimeError("original DOS COM Ghidra layout mismatch")
    return {"moduleName": name, "sha256": sha, "fileBytes": len(data),
            "exportSha256": hashlib.sha256(content).hexdigest(),
            "instructionCandidates": j["instructionCandidateCount"],
            "functionEntryCandidates": j["functionEntryCandidateCount"],
            "fidelity": "STATIC_COM_CANDIDATES_ONLY__DOS_RUNTIME_UNTESTED"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("original_com", type=Path)
    parser.add_argument("private_output", type=Path)
    parser.add_argument("--timeout", type=int, default=150)
    p = parser.parse_args()
    print(json.dumps(scan_com(p.original_com, p.private_output, p.timeout), sort_keys=True))
