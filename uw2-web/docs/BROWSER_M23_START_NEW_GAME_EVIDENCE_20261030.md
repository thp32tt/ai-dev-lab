# Browser M23 — Start New Game / protagonist evidence

Date: 2026-10-30 KST

This unit records only behavior closed from the Korean DOS MAIN.EXE.

## System menu dispatch

MENU.DAT #56 is the five-item system menu.

MAIN.EXE raw 0x1BD9A indexes a five-entry far-function table at raw 0x4557A:

0. Load Data -> 0FB7:6CDE -> raw 0x1BC4E
1. Start New Game -> 0FB7:6D0C -> raw 0x1BC7C
2. Environment -> 0FB7:6D68 -> raw 0x1BCD8
3. Quit Game -> 0FB7:6D7A -> raw 0x1BCEA
4. Save Data -> 0137:431B -> raw 0x0AA8B

## Protagonist selection

Start New Game handler raw 0x1BC7C calls raw 0x1B21B.

raw 0x1B21B builds six selector rectangles and raw 0x1B2A3 calls the selector with count=6.
The returned AL is stored at DS:1241h at raw 0x1B2B3.

Therefore DS:1241h is the selected protagonist id 0..5.

The exact six selector rectangles are derived from the DS:AB6E table and the
+64/+80 extent construction at raw 0x1B25C:

0: (56,184)-(120,264)
1: (104,280)-(168,360)
2: (184,56)-(248,136)
3: (280,80)-(344,160)
4: (328,256)-(392,336)
5: (512,168)-(576,248)

## Protagonist music

MAIN.EXE raw 0xD86B loads AL from DS:1241h, adds 4 at 0xD86E and calls the
music dispatcher at 0xD872.

MAIN music-map indices 4..9 map to FMDRV 1-based D2 songs:

2, 3, 4, 7, 6, 5

Thus protagonist ids 0..5 map to D2 songs 2,3,4,7,6,5 respectively.

No protagonist names are attached here until the identity ordering is closed
from original character resources/callers.

HORIEDIT.C is excluded from evidence.
