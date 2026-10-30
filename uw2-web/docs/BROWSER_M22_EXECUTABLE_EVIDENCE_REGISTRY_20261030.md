# Browser M22 — executable-derived evidence registry

Date: 2026-10-30 KST

The browser port now has a dedicated evidence registry at
`web/reverse-evidence.js`. Only facts whose path is closed from the shipped
Korean DOS artifacts are allowed in this module.

HORIEDIT.C is not an authoritative source and is not referenced.

## Exact source identities

- OPEN.EXE SHA-256
  `f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65`
- MAIN.EXE SHA-256
  `1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747`
- FMDRV.COM SHA-256
  `0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b`
- KOEI.COM SHA-256
  `81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36`
- D2.MML SHA-256
  `dbf29098e4b5c0e3130a8ce367465b20e8d370247b565e4c0752148078403dae`

## FMDRV command contract

Static disassembly closes these facts:

- AH=0 registers the D2 data pointer.
- AH=1 is the song-start command.
- AH=1 uses 1-based AL song numbers. The FMDRV song loader subtracts one
  before selecting a 10-byte D2 song-table entry.
- AH=F0 and AH=F1 are not songs. They get/set two internal timing words.
- AH=2 is not a song command.

This invalidates any earlier interpretation of F100/F101 as song numbers.

## Opening music

The Korean OPEN.EXE opening song is now proven, not inferred.

Raw file path:

1. OPEN.EXE 0x53F1 clears AL to 0.
2. 0x53F5 calls the play-song wrapper at 0x4994.
3. 0x49CB builds an INT 66h request with AH=1.
4. 0x49D2 increments AL before dispatch.
5. 0x49E2 executes INT 66h through the generic interrupt executor at 0x3166.

Therefore OPEN.EXE sends FMDRV song number 1, corresponding to browser rendered
track index 0.

The default browser still does not auto-run this music while the exact opening
visual/timing transcript remains incomplete. The value is stored as evidence,
not used to justify a partially reconstructed opening.

## MAIN.EXE music mapping table

The main game does not send its logical music index directly to FMDRV.

At raw MAIN.EXE:

- 0xE90C loads the logical music index to BL.
- 0xE911 loads AL from DS:[BX+9608h].
- 0xE908 builds AH=1.
- 0xE923 executes INT 66h.

The exact 24-byte table is at raw file offset 0x43FB8:

`21,19,22,18,2,3,4,7,6,5,11,9,8,10,1,13,14,15,16,20,17,12,0,0`

Address relation:

`0x5400 + (0x355B << 4) + 0x9608 = 0x43FB8`

These values are FMDRV 1-based D2 song numbers. The final two zero entries cause
the FMDRV AH=1 handler to return before song-table indexing.

What remains unproven is the semantic meaning of each MAIN logical index
(town/sea/building/event). Those names will not be assigned until each caller
of the MAIN play-music routine is traced to its game-state transition.

## Porting rule

A value may move from research notes into production behavior only if:

1. the exact source artifact hash is known,
2. the raw offset or dynamic observation is reproducible,
3. the call/data path reaches the behavior being implemented,
4. no semantic label is added beyond what that path proves.

Unclosed behavior remains disabled rather than replaced by a plausible browser
implementation.