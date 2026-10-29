#!/usr/bin/env python3
"""Render Korean UW2 D2.MML through the original FMDRV.COM code.

This tool does not reinterpret D2.MML as MIDI. It executes KOEI FMDRV.COM 3.12
with an 8086 interpreter, captures the driver's actual OPL port writes
(0x388/0x389), and renders those writes through a Nuked-OPL compatible core.

External emulator dependency (not vendored here):
  missingno7/dos_re @ 192572fe3e8410b25f54ea7a402c793fa2aa7577
The dos_re framework is MIT; graveyard/opl3_exact.py is LGPL-2.1-or-later.
Pass --dos-re-root to a checkout of that exact revision.

The user's D2.MML, FMDRV.COM and rendered audio remain local and are not
committed to Git.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import sys
import wave

DRV_SEG = 0x2000
D2_SEG = 0x3000
SAMPLE_RATE = 44100
PIT_HZ = 1193182 / 4096

def load_dependencies(root: Path):
    sys.path.insert(0, str(root))
    from dos_re.cpu import CPU8086, CPUState
    from dos_re.memory import Memory
    opl_path = root / "graveyard" / "opl3_exact.py"
    if not opl_path.exists():
        raise FileNotFoundError(f"missing exact OPL core: {opl_path}")
    spec = importlib.util.spec_from_file_location("uw2_opl3_exact", opl_path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return CPU8086, CPUState, Memory, module.OPL3

class FMRenderer:
    def __init__(self, game_dir: Path, deps, track_index: int):
        CPU8086, CPUState, Memory, OPL3 = deps
        self.mem = Memory()
        self.mem.load(DRV_SEG, 0x100, (game_dir / "FMDRV.COM").read_bytes())
        self.mem.load(D2_SEG, 0, (game_dir / "D2.MML").read_bytes())
        self.cpu = CPU8086(
            self.mem,
            CPUState(cs=DRV_SEG, ds=DRV_SEG, es=DRV_SEG,
                     ss=DRV_SEG, sp=0xFF00),
        )
        self.chip = OPL3(sample_rate=SAMPLE_RATE)
        self.latched_reg = 0
        self.reg_writes = 0
        self.cpu.port_reader = lambda cpu, port, bits: 0
        self.cpu.port_writer = self._port_write

        # FMDRV command 0: register D2 base pointer DS:DX.
        self._call(0x26F, ax=0x0000, ds=D2_SEG, dx=0)
        # FMDRV command 1: AL is the original 1-based song number.
        self._call(0x26F, ax=0x0100 | (track_index + 1), ds=DRV_SEG, dx=0)
        self.track_index = track_index

    def _port_write(self, cpu, port: int, value: int, bits: int):
        if bits != 8:
            return
        value &= 0xFF
        if port == 0x388:
            self.latched_reg = value
        elif port == 0x389:
            self.chip.write(self.latched_reg, value)
            self.reg_writes += 1

    def _call(self, offset: int, *, ax=None, ds=None, dx=None,
              max_steps: int = 600000):
        if ax is not None:
            self.cpu.s.ax = ax
        if ds is not None:
            self.cpu.s.ds = ds
        if dx is not None:
            self.cpu.s.dx = dx
        if offset in (0xCD8, 0x120E):
            self.cpu.s.es = D2_SEG
        ret = 0x7000
        self.cpu.push(ret)
        self.cpu.s.cs = DRV_SEG
        self.cpu.s.ip = offset
        self.cpu.halted = False
        for _ in range(max_steps):
            if self.cpu.s.cs == DRV_SEG and self.cpu.s.ip == ret:
                return
            self.cpu.step()
        raise RuntimeError(
            f"FMDRV call timeout at {self.cpu.s.cs:04x}:{self.cpu.s.ip:04x}"
        )

    def _irq_tick(self):
        # Mirrors the relevant FMDRV PIT bookkeeping at the timer IRQ.
        old = self.mem.rw(DRV_SEG, 0x11A)
        value = old + self.mem.rw(DRV_SEG, 0x118)
        self.mem.ww(DRV_SEG, 0x11A, value & 0xFFFF)
        if value > 0xFFFF and self.mem.rb(DRV_SEG, 0x5F3):
            # Original music tick body: file 0xBD8 -> COM memory 0xCD8.
            self._call(0xCD8, ds=DRV_SEG)

        old = self.mem.rb(DRV_SEG, 0x120)
        value = old + 0x36
        self.mem.wb(DRV_SEG, 0x120, value & 0xFF)
        if value > 0xFF:
            # Original secondary/effect tick: file 0x110E -> memory 0x120E.
            self._call(0x120E, ds=DRV_SEG)

        for phase_addr, timer_addr in ((0x122, 0x124), (0x123, 0x126)):
            old = self.mem.rb(DRV_SEG, phase_addr)
            value = old + 0x35
            self.mem.wb(DRV_SEG, phase_addr, value & 0xFF)
            if value > 0xFF and self.mem.rw(DRV_SEG, timer_addr):
                self.mem.ww(
                    DRV_SEG, timer_addr,
                    (self.mem.rw(DRV_SEG, timer_addr) - 1) & 0xFFFF,
                )

    def render(self, max_seconds: float, release_seconds: float = 0.8):
        pcm = bytearray()
        sample_fraction = 0.0
        max_irqs = int(max_seconds * PIT_HZ)
        ended = False

        for _ in range(max_irqs):
            count_f = SAMPLE_RATE / PIT_HZ + sample_fraction
            count = int(count_f)
            sample_fraction = count_f - count
            pcm.extend(self.chip.generate_stereo(count))
            self._irq_tick()
            if self.mem.rb(DRV_SEG, 0x5F3) == 0:
                ended = True
                break

        if ended and release_seconds > 0:
            pcm.extend(self.chip.generate_stereo(int(SAMPLE_RATE * release_seconds)))

        return bytes(pcm), ended

def pcm_stats(pcm: bytes):
    values = struct.unpack("<" + "h" * (len(pcm) // 2), pcm)
    mono = [(values[i] + values[i + 1]) // 2
            for i in range(0, len(values), 2)]
    rms = math.sqrt(sum(x * x for x in mono) / max(1, len(mono)))
    peak = max(map(abs, mono), default=0)
    return {"rms": rms, "peak": peak}

def write_wav(path: Path, pcm: bytes):
    with wave.open(str(path), "wb") as out:
        out.setnchannels(2)
        out.setsampwidth(2)
        out.setframerate(SAMPLE_RATE)
        out.writeframes(pcm)

def encode_ogg(wav_path: Path, ogg_path: Path):
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("ffmpeg is required to create browser OGG files")
    # Real sound cards AC-couple the YM3812 output. The high-pass removes
    # waveform DC (notably OPL half-waveforms) without changing the score.
    subprocess.run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-i", str(wav_path),
        "-af", "highpass=f=20,volume=2,afade=t=in:st=0:d=0.03",
        "-c:a", "libvorbis", "-q:a", "5", str(ogg_path),
    ], check=True)

def parse_track(spec: str):
    # 1:opening:once or 22:sea:loop
    n, role, mode = spec.split(":", 2)
    number = int(n)
    if not 1 <= number <= 64:
        raise ValueError(f"track out of range: {number}")
    return number - 1, role, mode.lower() == "loop"

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--game-dir", type=Path, required=True)
    ap.add_argument("--dos-re-root", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seconds", type=float, default=60.0)
    ap.add_argument(
        "--track", action="append", default=None,
        help="1-based NUMBER:ROLE:loop|once; may be repeated",
    )
    args = ap.parse_args()

    for required in ("D2.MML", "FMDRV.COM"):
        if not (args.game_dir / required).is_file():
            raise FileNotFoundError(args.game_dir / required)

    deps = load_dependencies(args.dos_re_root)
    args.out.mkdir(parents=True, exist_ok=True)
    tracks = []
    reports = []
    specs = args.track or ["1:opening:once", "20:town:loop", "22:sea:loop"]

    for spec in specs:
        index, role, loop = parse_track(spec)
        renderer = FMRenderer(args.game_dir, deps, index)
        pcm, ended = renderer.render(args.seconds)
        wav = args.out / f"d2-{index + 1:02d}.wav"
        ogg = args.out / f"d2-{index + 1:02d}.ogg"
        write_wav(wav, pcm)
        encode_ogg(wav, ogg)
        wav.unlink()
        tracks.append({
            "index": index, "file": ogg.name, "role": role, "loop": loop,
        })
        reports.append({
            "track": index + 1,
            "role": role,
            "loop": loop,
            "ended": ended,
            "seconds": len(pcm) / 4 / SAMPLE_RATE,
            "regWrites": renderer.reg_writes,
            "sha256Pcm": hashlib.sha256(pcm).hexdigest(),
            **pcm_stats(pcm),
        })

    manifest = {
        "version": 1,
        "renderer": "KOEI FMDRV.COM 3.12 executed as 8086; OPL port stream rendered with Nuked-OPL compatible core",
        "mapping": "provisional until MAIN.EXE exact music routing is traced",
        "tracks": tracks,
    }
    (args.out / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(json.dumps({"manifest": manifest, "reports": reports},
                     ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()