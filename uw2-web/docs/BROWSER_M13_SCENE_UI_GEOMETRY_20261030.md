# Browser M13 — scene-correct Korean HUD and dialogue geometry

Date: 2026-10-30 KST

## Corrected scene frames

The Korean GRAPH container contains two different 640x400 gameplay frames:

- GRAPH #4: sea/navigation HUD (선회력/추진력/... + 풍향/조류/침로/속도).
- GRAPH #5: town/economy HUD (명성/소지금/... + 상업/공업/평균물가).

Earlier browser builds used #4 for both modes. M13 maps them separately:
town/buildings -> #5, sea -> #4.

Firefox exact-canvas validation:
- town outside the 368x368 gameplay viewport: 120,576 / 120,576 pixels identical to GRAPH #5.
- harbor menu outside the viewport: 120,576 / 120,576 identical to GRAPH #5.
- sail confirmation outside the viewport: 120,576 / 120,576 identical to GRAPH #5.
- sea left static HUD strip: 38,400 / 38,400 identical to GRAPH #4.

## Native building artwork

GRAPH #6..#21 all decode to exactly 136x112. The previous browser renderer
scaled these to 204x168, shifting the visual center and destroying the original
pixel grid. M13 draws the records at native 136x112 with image smoothing off.

The horizontal placement is centered in the proven 368px town viewport:
x=104+(368-136)/2=220. The current y=64 is aligned to the 8px EGA grid and
centers the image in the upper dialogue-free area. This y remains explicitly
provisional until the exact MAIN.EXE GRAPH blit caller is identified.

## Dialogue/menu grid

Artifact facts:
- logical town viewport: 23x23 tiles = 368x368 at (104,16).
- GRAPH #22 dialogue: 368x152.
- therefore bottom-aligned dialogue origin is (104,232).

M13 keeps that artifact-consistent outer rectangle and changes its content to
the original 16px bitmap-font grid:
- first text cell x = dialogue x + 16.
- first glyph top = dialogue y + 16 (draw baseline y+30 for 14px glyphs).
- line advance = 16px.
- continuation marker moved from browser-style bottom-right to horizontal center.
- browser-only 'ENTER 결정 / ESC 나가기' footer removed.

## Confirmation artwork

GRAPH #0 is the shipped 144x56 YES/NO control. Sail confirmation now uses this
actual asset instead of the text 'ENTER / ESC'. It is centered horizontally in
the dialogue surface. Its vertical location remains a layout hypothesis pending
the exact confirmation caller trace.

## Reverse-engineering guardrail

MAIN.EXE MZ header is 0x5400 bytes. A far call to 0000:0906 therefore maps to
file offset 0x5D06, not raw file offset 0x0906. The function at 0x5D06 was
verified as an EGA rectangle operation whose arguments are byte-x, y,
byte-width, height and mask/color. An apparent 0x88x0x70 'building size' call
was rejected after this correction because 0x88 was actually y=136, not width.

No coordinate is promoted to 'original exact' unless the artifact, logical
viewport, or corrected MAIN.EXE caller proves it.