# Browser M25 — MAIN music dispatcher call inventory

Date: 2026-10-30 KST

This unit extends the reverse-engineered-only policy. It records the original
execution structure without assigning scene names that the caller chain has not
yet proved.

## Proven dispatcher structure

MAIN.EXE raw 0xE8CA is loaded as 0000:94CA because the MZ header is 0x5400
bytes. The routine accepts a logical music id in AL, then reads the actual
1-based FMDRV song number from DS:[9608h + logical_id].

The exact table at raw 0x43FB8 is:

21, 19, 22, 18, 2, 3, 4, 7, 6, 5, 11, 9,
8, 10, 1, 13, 14, 15, 16, 20, 17, 12, 0, 0

The port now exposes this structure only through:

- mainMusicLogicalToFmdrvSong(logicalId)
- mainMusicLogicalToRenderedTrackIndex(logicalId)

Logical ids 22 and 23 resolve to null because MAIN's table contains zero.

## Direct far-call inventory

The exact far-call bytes are 9A CA 94 00 00. MAIN.EXE contains nine direct
far-call sites:

- 0x157FD: immediate logical id 0x15
- 0x15861: immediate logical id 0x11
- 0x15A1C: immediate logical id 0x14
- 0x1BE98: immediate logical id 0x03
- 0x1C574: immediate logical id 0x14
- 0x2019C: dynamic local selector + 0x0A, else 0x0F
- 0x20526: branch chooses 0x13 when DI=1 or 0x12 when DI=5
- 0x26197: replays DS:9606, the current logical music id
- 0x36940: wrapper forwards caller AL

There is also a same-segment call at raw 0xD872. That path is already closed:
DS:1241h is the selected protagonist id, +4 forms logical ids 4..9, mapping to
FMDRV songs 2,3,4,7,6,5.

## Semantic boundary

The nine far-call sites are intentionally not labeled town, sea, battle, event,
or similar until their caller chains are closed to a concrete game-state
transition. This avoids recreating game structure from plausible guesses.

HORIEDIT.C is excluded from authoritative evidence.
