# Browser M24 — KAO.LZW protagonist portrait decoder

Date: 2026-10-30 KST

This unit implements only the portrait format proven from MAIN.EXE.

## Resource identity

MAIN.EXE raw 0x1ADD1 opens DS:0978 and stores the handle at DS:0416.
The DS:0978 string is C:KAO.LZW.

KAO.LZW:
- size 465,890 bytes
- SHA-256 ffd3fb6660f92fef089861aa42bc7c2a4a50370cb27017f3cd2149361580ef87
- LS11 archive
- 256 decoded records
- records 0..127: 1,920 bytes each
- records 128..255: 864 bytes each

## Large portrait format

MAIN.EXE raw 0x1B1E9 loops protagonist ids 5..0 and passes:
- BX = protagonist id
- AX = selector x / 8
- DX = selector y
to far routine 0:7B7D.

0:7B7D reads the KAO record by index and calls the VGA blitter at raw 0x595E.

At raw 0xCF15 the final blit arguments are:
- source offset 0
- source segment DS:042E
- height 0x50 = 80
- width 8 bytes = 64 pixels
- destination y
- destination x/8

The VGA copy loop writes three sequential bytes with map masks 1,2,4.
Thus one source row is 8 groups * 3 planes = 24 bytes and:

24 * 80 = 1,920 bytes.

Therefore KAO records 0..127 are 64x80 three-plane portraits.

The same structure explains 864-byte records as 48x48:
6 byte groups * 3 planes * 48 rows = 864.

## Start New Game protagonists

For Start New Game, BX is exactly the selected protagonist id. Therefore KAO
records 0..5 are the six protagonist portraits.

The six executable-derived selector rectangles are:

0: (56,184)-(120,264)
1: (104,280)-(168,360)
2: (184,56)-(248,136)
3: (280,80)-(344,160)
4: (328,256)-(392,336)
5: (512,168)-(576,248)

## Deliberately not implemented yet

MAIN.EXE also draws GRAPH #1 during this path. GRAPH #1 is the numeric/text
input keypad. Its presence does not by itself prove it is the visible background;
the active/hidden VGA page state must be traced first.

Therefore M24 adds the exact KAO decoder but does not invent a Start New Game
screen composition.

HORIEDIT.C is not used as evidence.