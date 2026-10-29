# Browser M8 — Korean OPEN.EXE 12-scene opening reconstruction
Date: 2026-10-30 KST

## Result
The browser opening player was replaced with a Korean-build-specific reconstruction traced from the user's actual OPEN.EXE instead of the previous English-build-derived approximation.

## Korean OPEN.EXE control flow
Artifact:
- OPEN.EXE SHA-256: f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65
- DOS MZ, 16-bit real mode.
- Runtime data segment: 0x1996.
- Scene far-pointer table: DS:0x0740, file offset 0xA2A0.
- Main scene loop compares SI against 0x0C, therefore the Korean build has exactly 12 opening scenes.

Scene function offsets:
0 0x5152
1 0x5390
2 0x588D
3 0x5B4B
4 0x5FA2
5 0x6433
6 0x67C5
7 0x6BD5
8 0x6FF2
9 0x73D3
10 0x75F1
11 0x7B2C

This differs from the separately documented 13-scene English build and is the authoritative Korean artifact behavior.

## Part loader and GRAPH record trace
- OPEN.EXE routine 0x18493 is the OPGRAPH part loader.
- Its directory lookup uses 0x110 + partIndex * 12.
- Korean part13 is loaded once into the shared caption buffer and remains resident.
- OPEN.EXE routine 0x14E58 resolves a GRAPH record from a loaded part.
- A sequential buffer-state trace maps the actual part:record references for all 12 scene functions.

Scene 0:
- part0 records 0,1,3,4,2.

Scene 1 title:
- part0 records 5,6,7,8,9,11,12,13,14,15,10.
- The Korean build really uses the five 32x32 twinkle records 11..15.

Scene 2:
- part13:0
- part1:0,1
- part2:0,1

Scene 3 Otto:
- part13:1
- part3:5,0,1,2,3,4,6,7,8,9,10

Scene 4 Catalina:
- part13:2
- part4:0..7

Scene 5 Ernst:
- part13:3
- part5:0..7

Scene 6 Pietro:
- part13:4
- part6:0..7

Scene 7 Ali:
- part13:5
- part7:0..7

Scene 8 lovers/story:
- part13:6
- part8:0..14

Scene 9 antagonist:
- part13:7
- part9:0..10

Scene 10 João Ferrero:
- part13:8
- part10:0..4
- Korean part3 is reloaded and records 0..4 are used again.
- scene10 also preloads/displays the first boarding transition:
  - part11:1,0
  - part12:1
  - part13:9

Scene 11 boarding/closing:
- part12:0

All 108 records in the user's 14-part OPGRAPH.LZW are now accounted for by the Korean OPEN.EXE trace. The previous browser implementation incorrectly treated seven records as unused.

## Browser changes
- KOREAN_OPENING_SCENE_PLAN reduced from the incorrect 13 entries to the exact 12 Korean scene functions.
- Removed the invented 13th browser “HIT ANY BUTTON” scene.
- Corrected story order:
  Otto -> Catalina -> Ernst -> Pietro -> Ali -> story/lovers -> antagonist -> João -> boarding.
- Scene 0 preserves the Korean record order 0,1,3,4,2.
- Scene 1 now renders record order 5,6,7,8,9,11..15,10.
- Story scenes use artifact-traced part/record groups, not the prior English-part mapping.
- Small eye/sparkle overlays use pixel matching against the large GRAPH record to reduce arbitrary placement.
- Opening defaults to one pass, matching this Korean OPEN.EXE scene loop.
- Browser status reports scene 1/12 through 12/12.
- After OPEN.EXE-equivalent playback, the web runtime holds the game title; there is no fabricated opening scene 13.

## Validation
Node:
- OPGRAPH: 14 parts, 108 records.
- exact scene count: 12.
- all 108 artifact records are covered by the traced plan.
- opening Korean OPEN.EXE 12-scene exact-record-map tests: PASS.
- opening.js/app.js syntax: PASS.

Firefox:
- URL test: http://127.0.0.1:18082/?openingSpeed=20
- observed in order:
  1/12 KOEI / REKOEITION credits
  2/12 title reveal
  3/12 sea panorama
  4/12 Otto Spinola
  5/12 Catalina Erantzo
  6/12 Ernst von Bohr
  7/12 Pietro Conti
  8/12 Ali Vezas
  9/12 lovers/story
  10/12 antagonist plot
  11/12 João Ferrero
  12/12 boarding/closing
  then opening complete/title.
- Full accelerated cycle completed in ~4.82 seconds at openingSpeed=20.
- scene12 mid-frame visibly renders the part12:0 ship image entering the screen.
- title twinkle, Otto caption, João caption, boarding art visually inspected.

## Remaining fidelity work
- Some low-level OPEN.EXE rectangular blits/wipes are represented as visually equivalent browser transitions rather than instruction-by-instruction framebuffer emulation.
- Exact FM opening music from D2.MML/FMDRV is not yet browser-native. Public research notes the DOS music is FM-driver data, not directly a waveform.
- Exact original timing of every blit/vblank substep can be further tightened; major OPEN.EXE waits and scene order are already artifact-derived.

Status:
KOREAN_OPENING_12_SCENES=PASS
OPGRAPH_RECORD_COVERAGE=108/108
BROWSER_FULL_OPENING_PLAYBACK=PASS
FAKE_SCENE_13=REMOVED