# Browser M20 — MAIN.EXE VGA palette provenance

Date: 2026-10-30 KST

## Rule

The browser port must not invent or visually approximate the DOS palette.
This milestone removes the previous `UW2_APPROX_PALETTE` runtime default.

HORIEDIT.C is excluded from all evidence.

## Source

## Static binary provenance

The final palette is also present **verbatim** in the shipped Korean
\`MAIN.EXE\` at file offset \`0x43FCE\`. It is 48 bytes: 16 B,R,G triplets
with 4-bit components.

\`\`\`text
000000 0d0004 000d04 0a0d06
06000a 0f000a 060f0a 0d0f0e
090707 0c0004 000a06 050e0b
0f0008 060007 06000b 0c0602
\`\`\`

The browser now stores this exact B,R,G source table and derives RGB through
the original hardware conversion instead of hard-coding the final colors.

The conversion is pinned to the original code:
- \`MAIN.EXE 0x6993..0x69A7\`: source B/R/G extraction and \`<<2\`
- \`MAIN.EXE 0x69BE..0x69CD\`: VGA DAC index/data writes to \`03C8h/03C9h\`

A different 48-byte palette table exists at \`MAIN.EXE 0x45930\`; it corresponds
to another palette state and must not replace the final MAIN-game table.


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