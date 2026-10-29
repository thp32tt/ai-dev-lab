# Browser M11 — original FMDRV/OPL audio correction

Date: 2026-10-30 KST

## Why M10 sounded like beeps

The M10 browser player correctly found the 22 D2 song pointer groups, but its
first-pass renderer guessed that arbitrary D2 bytes were MIDI-like
pitch/duration/expression triples and drove Web Audio oscillators. That was not
KOEI's FMDRV semantics and could only approximate a melody as synthetic beeps.

M11 removes that heuristic audio path completely. There is no oscillator/beep
fallback.

## Proven FMDRV interface

The user's Korean `FMDRV.COM` identifies itself as:

- `!SOUND-DRIVER-AD-LIBOPLDRV`
- `OPL-II Sound Driver Version 3.12`

Static disassembly plus execution proves:

- INT 66h AH=0 registers the D2 base pointer from DS:DX.
- INT 66h AH=1 uses AL as a 1-based song number.
- Song setup subtracts one from AL and multiplies by 10: every D2 song header is
  five little-endian 16-bit channel pointers.
- The driver writes the real YM3812/OPL stream through ports 0x388/0x389.
- Its PIT path advances the main music tick and secondary/effect tick at the
  original driver cadence.

## Renderer

`tools/render_uw2_fmdrv_audio.py` executes the user's own `FMDRV.COM` with
an 8086 interpreter, captures the original OPL writes, and renders them through
a Nuked-OPL compatible core. The tool references, but does not vendor,
`missingno7/dos_re` revision
`192572fe3e8410b25f54ea7a402c793fa2aa7577`.

The framework is MIT; its exact Nuked-OPL oracle is LGPL-2.1-or-later. Original
game files and rendered OGG/WAV files stay local and are ignored by Git.

A 2-second track-20 renderer regression produced 369 real OPL register writes
and deterministic PCM SHA-256
`6280929bb212984a9146c32df160a5d5de3badbf983ea186f0b267f533d4a8ec`.

## Browser playback

`web/music.js` now plays only locally generated FMDRV/OPL audio declared by
`web/generated/music/manifest.json`. If generated audio is absent, the browser
reports `BGM 생성 필요` and stays silent instead of falling back to the old
incorrect oscillator synth.

The live N100 deployment currently has local rendered tracks 1, 20 and 22.
Firefox validation on the town track confirmed:

- renderer = `FMDRV.COM→OPL PCM`
- `playing=true`
- media readyState 4
- playback currentTime advanced from about 0.25s to 1.23s.

## Fidelity boundary

The OPL register stream is produced by executing the original KOEI driver.
The current opening/town/sea choice of tracks 1/20/22 is still provisional
until the exact MAIN.EXE situation-to-song routing is fully traced. Do not treat
that mapping as original-authoritative yet.