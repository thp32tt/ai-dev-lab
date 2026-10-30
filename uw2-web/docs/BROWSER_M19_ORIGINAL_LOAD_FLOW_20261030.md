# Browser M19 — original in-game Load Data flow

Date: 2026-10-30 KST

## Why this replaces the browser save picker

The previous web port parsed KOUKAI2.DAT but auto-selected the first non-empty
slot and exposed HTML buttons outside the game canvas. The Korean game does not
load a save that way.

MAIN.EXE uses MENU.DAT #56 and its own 10-row save selector.

## Executable-proven system menu

MENU.DAT #56 contains five entries:

1. Ｌｏａｄ Ｄａｔａ
2. Ｓｔａｒｔ Ｎｅｗ Ｇａｍｅ
3. Ｅｎｖｉｒｏｎｍｅｎｔ
4. Ｑｕｉｔ Ｇａｍｅ
5. Ｓａｖｅ Ｄａｔａ

MAIN.EXE 0x1BD50 loads menu #56. Its call constants establish:

- menu outer origin: x=24*8=192, y=48
- menu outer width: 32*8=256
- menu height argument: 144
- option text/selector origin: x=25*8=200, y=48
- 16-pixel row grid

## Executable-proven Load Data selector

MAIN.EXE 0x1B699 constructs ten selection rectangles.

For slot i=0..9:
- x1 = 208
- x2 = 432
- y1 = 96 + i*16
- y2 = y1 + 16

0x1B765 prints each row at x=26*8=208 and the same 16-pixel y grid.

The empty-slot format string embedded in MAIN.EXE is:

        KOEI Game %02d

For a non-empty 15-byte KOUKAI2.DAT header the row uses the 12-byte memo,
the original status-marker condition, and the saved port name (or MESSAGE #1072
for sea state).

After all ten rows MAIN.EXE prints MESSAGE #951 at:
- x=28*8=224
- y=272

## Load confirmation / empty slot

For a non-empty selected slot:
- confirmation region x=192, y=256, w=256, h=48
- MESSAGE #952 text x=208, y=272
- original yes/no control is invoked

For an empty selected slot:
- region x=176, y=256, w=288, h=48
- MESSAGE #953 text x=192, y=272

The save path uses the same ten-row selector and MESSAGE #954 confirmation.

## Web-port correction

- opening completion/skip now enters the in-canvas system menu instead of a
  custom browser title hold.
- KOUKAI2.DAT no longer auto-selects the first save.
- Load Data is selected inside the game canvas.
- the 10 save rows, prompt, empty-slot message and load confirmation use the
  exact executable-derived positions.
- selecting and confirming a populated slot applies that slot and enters its
  town/sea state.
- fake ">" cursor prefixes are removed so menu text no longer shifts right.

## Remaining work

The generic MAIN.EXE window-tile renderer is not yet pixel-reimplemented. M19
pins exact geometry and flow; exact border/palette pixels will be replaced when
that renderer/palette path is decoded.

Save Data persistence, Start New Game and Environment remain separate material
units. The menu entries stay present exactly as in MENU.DAT rather than being
replaced with browser controls.

HORIEDIT.C is not used as evidence.