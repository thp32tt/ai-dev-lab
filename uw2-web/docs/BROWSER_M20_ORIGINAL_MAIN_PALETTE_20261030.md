# Browser M20 — MAIN.EXE VGA palette provenance

Date: 2026-10-30 KST

## Rule

The browser port must not invent or visually approximate the DOS palette.
This milestone removes the previous `UW2_APPROX_PALETTE` runtime default.

HORIEDIT.C is excluded from all evidence.

## Source

Authoritative binary:

- Korean `MAIN.EXE` from the user's original DOS installation.

Observed hardware interface:

- VGA DAC write-index port: `03C8h`
- VGA DAC data port: `03C9h`

The original program was executed in the 8086 analysis oracle while every DAC
write was recorded.  Writes were reconstructed as complete palette sets only
when indices 0 through 15 appeared in exact sequence.

The observed initialization/fade produced **45 complete 0..15 palette sets**.
The last complete set was emitted at approximately instruction 104187, and it
matched the final VGA palette state after the initialization path.

6-bit VGA DAC components are expanded to browser 8-bit RGB with the hardware
brightness conversion:

```
(v << 2) | (v >> 4)
```

## Final MAIN palette

| Index | RGB |
|---:|---|
| 0 | 0, 0, 0 |
| 1 | 0, 65, 211 |
| 2 | 211, 65, 0 |
| 3 | 211, 97, 162 |
| 4 | 0, 162, 97 |
| 5 | 0, 162, 243 |
| 6 | 243, 162, 97 |
| 7 | 243, 227, 211 |
| 8 | 113, 113, 146 |
| 9 | 0, 65, 195 |
| 10 | 162, 97, 0 |
| 11 | 227, 178, 81 |
| 12 | 0, 130, 243 |
| 13 | 0, 113, 97 |
| 14 | 0, 178, 97 |
| 15 | 97, 32, 195 |

## Port change

`web/graph-format.js` exports `UW2_MAIN_VGA_PALETTE`. GRAPH.DAT rendering
uses it by default, and `web/app.js` uses the same exact palette for the
original HUD, building and dialog GRAPH records.

The opening is intentionally **not** switched to this palette. `OPEN.EXE`
has its own time-varying DAC sequence; applying MAIN's final palette there
would be another guess. The opening palette event stream remains a separate
reverse-engineering unit.