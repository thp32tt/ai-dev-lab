#!/usr/bin/env python3
"""Read-only, one-module, bounded Ghidra P1 chunk extraction for owned Korean DOS MZ.

The game executable stays outside GitHub. Script output is private candidate
metadata only, and is NOT a verified DOS execution or a complete port.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import struct
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]
BASELINE = ROOT / "docs" / "original-baseline-20261031.json"
GHIDRA_DEFAULT = "/home/chatgpt-runner/tools/ghidra_12.1.4_PUBLIC"
JAVA_DEFAULT = "/home/chatgpt-runner/tools/jdk-21.0.12.1+1"


def parse_original_mz(original: bytes) -> tuple[int, int]:
    if len(original) < 28 or original[:2] != b"MZ":
        raise ValueError("not an original DOS MZ file")
    page_tail, pages, reloc_count, header_para = struct.unpack_from("<HHHH", original, 2)
    if pages == 0 or page_tail > 511:
        raise ValueError("invalid MZ declared length")
    declared = (pages - 1) * 512 + (page_tail or 512)
    header = header_para * 16
    relocation_table = struct.unpack_from("<H", original, 24)[0]
    if header < 28 or header >= declared or declared > len(original):
        raise ValueError("MZ header/image outside original file")
    if relocation_table < 28 or relocation_table + 4 * reloc_count > header:
        raise ValueError("MZ relocation table outside original header")
    return header, declared - header


def extract_chunk(original_path: Path, start: int, size: int, output: Path,
                  ghidra_home: Path, java_home: Path, timeout: int = 150) -> dict:
    original_path = original_path.resolve(strict=True)
    module_name = original_path.name.upper()
    if module_name not in ("MAIN.EXE", "OPEN.EXE", "END.EXE", "GRPDRV.EXE"):
        raise ValueError("unsupported MZ launch module: fail closed")
    baseline = json.loads(BASELINE.read_text("utf-8"))
    row = next((x for x in baseline["coreExecutables"] if x["name"] == module_name), None)
    if row is None:
        raise ValueError("MZ module missing from Korean baseline")
    original = original_path.read_bytes()
    sha = hashlib.sha256(original).hexdigest()
    if sha != row["sha256"] or len(original) != row["size"]:
        raise ValueError("Korean original executable SHA-256 or size mismatch")
    _, image_bytes = parse_original_mz(original)
    if start < 0 or size < 1 or size > 0x10000 or start + size > image_bytes:
        raise ValueError("chunk must fit 1..65536 bytes within initialized MZ")
    if timeout < 20 or timeout > 240:
        raise ValueError("bounded Ghidra timeout must be 20..240 seconds")
    output = output.resolve()
    if output.exists():
        raise FileExistsError("private chunk already exists; do not replace previous evidence")
    if not output.parent.is_dir():
        raise FileNotFoundError("private output directory must already exist")
    ghidra = (ghidra_home / "support" / "analyzeHeadless").resolve(strict=True)
    script = (ROOT / "tools" / "Uw2GhidraInstructionChunk.java").resolve(strict=True)
    if not java_home.is_dir() or not ghidra.is_file() or not script.is_file():
        raise FileNotFoundError("installed Ghidra 12.1.4 / Java / export script missing")
    if not (ghidra_home / "Ghidra" / "application.properties").is_file():
        raise FileNotFoundError("Ghidra installation metadata missing")
    with tempfile.TemporaryDirectory(prefix="uw2-ghidra-p1-") as project_dir:
        command = [
            str(ghidra), project_dir, "uw2_original_p1",
            "-import", str(original_path),
            "-processor", "x86:LE:16:Real Mode",
            "-scriptPath", str(script.parent),
            "-max-cpu", "1",
            "-analysisTimeoutPerFile", str(min(timeout - 10, 180)),
            "-deleteProject",
            "-postScript", script.name, str(output), module_name, sha,
            str(image_bytes), str(start), str(start + size),
        ]
        env = dict(os.environ, JAVA_HOME=str(java_home),
                   GHIDRA_INSTALL_DIR=str(ghidra_home))
        completed = subprocess.run(command, stdout=subprocess.PIPE,
                                   stderr=subprocess.STDOUT, text=True,
                                   timeout=timeout, check=False, env=env)
    if completed.returncode != 0 or not output.is_file():
        # Never silently report success based on the import stage alone.
        output.unlink(missing_ok=True)
        tail = "\n".join(completed.stdout.splitlines()[-90:])
        raise RuntimeError("Ghidra post-script failed (not exported):\n" + tail)
    metadata = json.loads(output.read_text("utf-8"))
    if (metadata.get("moduleName") != module_name or
        metadata.get("sha256") != sha or
        metadata.get("windowStart") != start or
        metadata.get("windowEnd") != start + size or
        metadata.get("imageBytes") != image_bytes or
        metadata.get("provider") != "GHIDRA"):
        output.unlink(missing_ok=True)
        raise RuntimeError("Ghidra returned wrong module/window metadata")
    return {
        "moduleName": module_name, "sha256": sha,
        "imageBytes": image_bytes,
        "windowStart": start, "windowEnd": start + size,
        "exportSha256": hashlib.sha256(output.read_bytes()).hexdigest(),
        "instructionCandidates": metadata.get("instructionCandidateCount"),
        "functionEntryCandidates": metadata.get("functionEntryCandidateCount"),
        "fidelity": "STATIC_ONLY__ORIGINAL_DOS_UNTESTED",
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("original_exe", type=Path)
    parser.add_argument("chunk_start", type=lambda s: int(s, 0))
    parser.add_argument("chunk_bytes", type=lambda s: int(s, 0))
    parser.add_argument("private_output_json", type=Path)
    parser.add_argument("--ghidra", type=Path, default=Path(GHIDRA_DEFAULT))
    parser.add_argument("--java", type=Path, default=Path(JAVA_DEFAULT))
    parser.add_argument("--timeout", type=int, default=150)
    args = parser.parse_args()
    report = extract_chunk(args.original_exe, args.chunk_start, args.chunk_bytes,
                           args.private_output_json, args.ghidra, args.java, args.timeout)
    print(json.dumps(report, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
