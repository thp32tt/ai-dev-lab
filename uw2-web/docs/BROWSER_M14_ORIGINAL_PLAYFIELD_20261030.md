# Browser M14 — original 24×24 playfield correction

Date: 2026-10-30 KST

## Evidence boundary

This correction uses only shipped Korean game artifacts and executable behavior:

- GRAPH.DAT #4 and #5: 640×400 sea/town frames.
- GRAPH.DAT #0: 144×56 YES/NO surface.
- GRAPH.DAT #22: 368×152 dialogue surface.
- MAIN.EXE EGA helpers: x is expressed in byte columns (8 pixels), y in pixels.
- PortWalkingRuntime/save-state coordinates and the shipped 32×32 actor sprites.

HORIEDIT.C is a third-party/save editor artifact and is explicitly excluded from UI/layout evidence.

## Corrected central playfield

M13 treated the town/sea playfield as 23×23 tiles at (104,16), 368×368.
The shipped frame border and legal 32×32 actor positions instead require a 24×24 tile
background:

- x=96
- y=8
- width=384
- height=384
- 24×24 at 16 pixels per tile

The actor top-left may legally occupy tile 22. A 23×23 background clips the second
16-pixel half of a 32×32 actor at the right/bottom legal edge. 24×24 does not.

## Dialogue and confirmation placement

GRAPH #22 remains native 368×152 and is inset 8 pixels from the 384-wide playfield:

- dialogue: (104,240), 368×152

This is bottom-aligned to playfield y=392.

GRAPH #0 remains native 144×56 and is centered in that dialogue surface with an
8-pixel bottom inset:

- YES/NO: (216,328), 144×56

## Renderer changes

- town renderer now draws 24×24 background tiles.
- sea renderer now draws 24×24 background tiles.
- scene origin moves from (104,16) to (96,8).
- dialogue/YES-NO vertical origins move +8 to match the corrected playfield.
- no browser scaling is introduced; source pixels remain nearest-neighbor/native.

## Remaining exactness work

The native 136×112 building image y position is still provisional. It will not be
promoted to exact until the MAIN.EXE GRAPH-record blit caller that selects records
#6..#21 is traced. Dialogue variants that move by scene/person state likewise remain
to be reconstructed from the executable rather than inferred from screenshots.
