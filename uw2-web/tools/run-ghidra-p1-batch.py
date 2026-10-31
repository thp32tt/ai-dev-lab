#!/usr/bin/env python3
"""One import, multiple bounded SHA-pinned Ghidra 8086 instruction exports.

Uses installed native Ghidra only for private user-owned original files. No
game bytes/pseudocode/assembler text are copied to the public repository.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tempfile

from importlib.machinery import SourceFileLoader
from importlib.util import spec_from_loader, module_from_spec

TOOL = Path(__file__).resolve().with_name("run-ghidra-p1-chunk.py")
spec = spec_from_loader("uw2_chunk_preflight", SourceFileLoader("uw2_chunk_preflight", str(TOOL)))
helper = module_from_spec(spec)
spec.loader.exec_module(helper)


def run_batch(executable: Path, output_dir: Path, *, ghidra_home: Path,
              java_home: Path, timeout: int = 210, dry_run: bool = False) -> dict:
    executable = executable.resolve(strict=True)
    name = executable.name.upper()
    if name not in ("MAIN.EXE", "OPEN.EXE", "END.EXE", "GRPDRV.EXE"):
        raise ValueError("only SHA-pinned original MZ executable modules are supported")
    baseline = json.loads(helper.BASELINE.read_text("utf-8"))
    row = next((x for x in baseline["coreExecutables"] if x["name"] == name), None)
    if not row:
        raise ValueError("original module missing from pinned Korean baseline")
    original = executable.read_bytes()
    sha = hashlib.sha256(original).hexdigest()
    if sha != row["sha256"] or len(original) != row["size"]:
        raise ValueError("original Korean MZ size/SHA-256 mismatch")
    _, size = helper.parse_original_mz(original)
    if not output_dir.is_dir():
        raise ValueError("private output directory must exist before execution")
    windows = []
    for start in range(0, size, 0x10000):
        end = min(size, start + 0x10000)
        filename = f"{name[:-4]}-{start:06x}-{end:06x}.json"
        destination = (output_dir / filename).resolve()
        if destination.exists():
            raise FileExistsError("existing checkpoint will not be overwritten: " + filename)
        windows.append((start, end, destination))
    plan = {"moduleName": name, "sha256": sha, "imageBytes": size,
            "windows": [[a, b] for a, b, _ in windows],
            "status": "DRY_RUN" if dry_run else "STATIC_CANDIDATES_ONLY"}
    if dry_run:
        return plan
    if not 30 <= timeout <= 280:
        raise ValueError("bounded total analysis timeout must be 30..280 seconds")
    ghidra = (ghidra_home / "support" / "analyzeHeadless").resolve(strict=True)
    script = (helper.ROOT / "tools" / "Uw2GhidraInstructionChunk.java").resolve(strict=True)
    if not java_home.is_dir() or not ghidra.is_file() or not script.is_file():
        raise FileNotFoundError("installed Ghidra/Java/UW2 exporter missing")
    env = dict(os.environ, JAVA_HOME=str(java_home),
               GHIDRA_INSTALL_DIR=str(ghidra_home))
    with tempfile.TemporaryDirectory(prefix="uw2-p1-batch-") as project:
        cmd = [str(ghidra), project, "uw2_p1_batch", "-import", str(executable),
               "-processor", "x86:LE:16:Real Mode",
               "-scriptPath", str(script.parent), "-max-cpu", "1",
               "-analysisTimeoutPerFile", str(min(180, timeout-15)),
               "-deleteProject"]
        for start, end, destination in windows:
            cmd.extend(["-postScript", script.name, str(destination), name, sha,
                        str(size), str(start), str(end)])
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                encoding="utf-8", errors="replace", env=env,
                                timeout=timeout, check=False)
    try:
        if result.returncode != 0 or "SCRIPT ERROR" in result.stdout:
            raise RuntimeError("Ghidra batch post-script failed")
        summary = []
        for start, end, destination in windows:
            if not destination.is_file():
                raise RuntimeError("missing completed Ghidra chunk")
            body = destination.read_bytes()
            data = json.loads(body)
            if (data.get("moduleName") != name or data.get("sha256") != sha or
                data.get("imageBytes") != size or data.get("windowStart") != start or
                data.get("windowEnd") != end or data.get("provider") != "GHIDRA"):
                raise RuntimeError("wrong Ghidra module or incomplete chunk metadata")
            summary.append({"start": start, "end": end,
                            "instructionCandidates": data["instructionCandidateCount"],
                            "functionEntryCandidates": data["functionEntryCandidateCount"],
                            "exportSha256": hashlib.sha256(body).hexdigest()})
        return {**plan, "chunks": summary, "fidelity": "STATIC_ONLY__DOS_UNTESTED"}
    except Exception as error:
        for _, _, destination in windows:
            destination.unlink(missing_ok=True)
        tail = "\n".join(result.stdout.splitlines()[-35:])
        raise RuntimeError(str(error) + "\n" + tail) from error


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("original_exe", type=Path)
    parser.add_argument("private_output_dir", type=Path)
    parser.add_argument("--ghidra", type=Path, default=Path(helper.GHIDRA_DEFAULT))
    parser.add_argument("--java", type=Path, default=Path(helper.JAVA_DEFAULT))
    parser.add_argument("--timeout", type=int, default=210)
    parser.add_argument("--dry-run", action="store_true")
    options = parser.parse_args()
    report = run_batch(options.original_exe, options.private_output_dir,
                       ghidra_home=options.ghidra, java_home=options.java,
                       timeout=options.timeout, dry_run=options.dry_run)
    print(json.dumps(report, sort_keys=True))


if __name__ == "__main__":
    main()
