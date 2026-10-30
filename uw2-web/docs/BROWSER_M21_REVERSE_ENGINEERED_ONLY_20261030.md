# Browser M21 — reverse-engineered-only fidelity policy

Date: 2026-10-30 KST

## Policy change

The browser port no longer treats a plausible reconstruction as an implementation
of the Korean DOS original.

Default runtime policy is now:

- implement only behavior closed from shipped Korean artifacts or observed
  original execution,
- keep unclosed behavior visibly unimplemented rather than substituting guessed
  movement, timing, placement, palette or music,
- preserve old approximate renderers only behind explicit developer comparison
  query flags; they are not part of the default port.

HORIEDIT.C is excluded from authoritative evidence.

## Approximate paths removed from default runtime

Opening:
- pixelMatchPosition overlay placement,
- fallback overlay X/Y,
- percentage-based portrait/eye timing,
- synthetic sea-panorama alternation,
- synthetic 2.2x boarding slide,
- hand-entered title twinkle coordinates and hold timings.

These functions remain temporarily for comparison with prior screenshots, but
KoreanOpeningPlayer defaults to allowApproximate=false. The default path does
not execute them. Developer-only comparison requires:

  ?openingApprox=1

Music:
- opening=track 0,
- town/runtime=track 19,
- sea=track 21

were provisional browser mappings, not proven MAIN.EXE/OPEN.EXE routing.
Automatic selection/autoplay and normal sound controls no longer use them in the
default runtime. Developer-only comparison requires:

  ?musicApprox=1

## New execution evidence

The Korean OPEN.EXE was executed with the 8086 oracle while VGA DAC writes were
recorded.

Observed before the current sound-driver wait boundary:
- 612,667 interpreted instructions,
- 960 writes associated with VGA DAC programming,
- exactly 15 complete passes over palette entries 0..15,
- each pass writes R/G/B through ports 03C8h/03C9h.

The fifteenth pass for entries 0..7 is:

0: (0,0,0)
1: (0,16,52)
2: (52,16,0)
3: (60,16,48)
4: (0,40,24)
5: (0,40,60)
6: (60,40,0)
7: (60,56,52)

These are 6-bit DAC values. Entries 8..15 were still zero at this observed
startup point. This is evidence for that exact execution phase only; it is not
promoted to a global opening palette until later scene palette programming is
observed.

## Sound evidence boundary

OPEN.EXE and MAIN.EXE both issue INT 66h calls with F100/F101 during isolated
startup. They repeat while the resident sound environment is absent. These are
therefore not labeled as D2 song numbers. Scene->song mapping remains unverified
until the KOEI.COM/FMDRV.COM resident API is reproduced or the exact caller chain
to the play command is closed.

## Next implementation units

1. reproduce the resident KOEI.COM/FMDRV.COM INT 66h contract in the oracle,
2. execute OPEN.EXE through all 12 scene functions and record blit/copy/DAC/timer
   operations,
3. generate a deterministic opening operation transcript from that trace,
4. replace the browser opening renderer with transcript replay,
5. trace MAIN.EXE scene/building/sea transitions to exact D2 song commands and
   only then enable automatic BGM,
6. replace remaining generic menu/dialog rendering with the corresponding
   executable-proven window/text/select operations.