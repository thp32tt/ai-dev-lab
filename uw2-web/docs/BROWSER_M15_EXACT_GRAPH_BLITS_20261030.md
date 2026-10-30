# Browser M15 — executable-proven GRAPH blit geometry

Date: 2026-10-30 KST

## Evidence policy

Only shipped Korean game artifacts are used here: MAIN.EXE and GRAPH.DAT.
HORIEDIT.C is a save editor and is explicitly excluded.

## GRAPH decoder contract

MAIN.EXE file 0xAE53 selects a GRAPH.DAT record. Its decoder path reaches
0x5F9C, where the caller values are range-checked as x<=639 and y<=399,
then checked again as x+decoded_width<=640 and y+decoded_height<=400 before
the VGA destination address is calculated. Therefore the AE53 AX/DX inputs
are destination x/y pixels and BX is the GRAPH record selector.

## Building artwork

MAIN.EXE file 0xE108 is the building-art dispatcher. For the normal path it
does BX=SI+6 and then:

- AX=0x68 = 104
- DX=0x10 = 16
- AE53 GRAPH draw

One special building state selects GRAPH record 20, but uses the same x/y.
The native GRAPH building records are 136x112.

Exact browser geometry:
- building x=104
- building y=16
- size 136x112

This replaces the M13/M14 provisional centered position (220,64).

## Standard dialogue GRAPH #22

MAIN.EXE file 0x202EA contains the direct sequence:

- AX=0x68 = 104
- DX=0x88 = 136
- BX=0x16 = GRAPH record 22
- far call to AE53

GRAPH #22 is 368x152.

Exact browser geometry:
- dialogue x=104
- dialogue y=136
- size 368x152

This replaces the incorrect browser bottom placement y=240.

The same #22 draw routine is called from many person/trade/event paths, so it
is the standard Korean DOS dialogue/menu surface rather than a browser-only
building convention.

## YES/NO GRAPH #0

The original UI-object table contains a 12-byte entry:

`e0 01 50 01 f0 01 58 01 d8 3b b7 0f`

Decoded:
- x=0x01E0 = 480
- y=0x0150 = 336
- secondary bounds 496,344
- callback = 0FB7:3BD8

That callback is the routine that selects GRAPH record 0 and draws it at the
object's x/y. GRAPH #0 is 144x56.

Exact browser geometry:
- YES/NO x=480
- YES/NO y=336
- size 144x56
- right edge 624 (16px screen margin)
- bottom edge 392 (8px screen margin)

This replaces the browser-invented centered position (216,328).

## Regression guard

ui-layout.test.mjs now pins the exact MAIN.EXE byte sequences for all three
relationships so these coordinates cannot drift back into guessed layout.