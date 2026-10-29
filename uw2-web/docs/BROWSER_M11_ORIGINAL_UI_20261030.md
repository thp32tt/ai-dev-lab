# Browser M11 — original Korean HUD, menu and dialogue surfaces

Date: 2026-10-30 KST

## Source assets

The previous browser UI drew generic dark panels and gold rectangles. M11
replaces the main gameplay chrome with records decoded directly from the user's
Korean `GRAPH.DAT`.

Artifact-backed record map:

- GRAPH #0: 144×56 — original small yes/no surface.
- GRAPH #4: 640×400 — Korean main gameplay HUD/frame.
- GRAPH #5: 640×400 — Korean status/economy frame.
- GRAPH #22: 368×152 — original parchment menu/dialogue window.
- GRAPH #26: 224×400 — original side/status panel.
- GRAPH contains 65 records total.

`tests/original-ui.test.mjs` decodes these records from the actual user game
file and asserts the dimensions above.

## Main gameplay viewport

The original 640×400 HUD is drawn first. Town and sea gameplay then render into
its 23×23-tile center window:

- viewport origin: (104,16)
- dimensions: 368×368
- tile size: 16×16.

The existing original-data PORTMAP/WORLDMAP, player/townspeople sprites and sea
ship are therefore placed inside the shipped Korean HUD instead of beside a
developer diagnostics panel.

The right-side original HUD now carries live date, port, money, wind/current,
heading/speed and nearby-port state. Development coordinate dumps were removed
from the visible game screen.

## Menus and dialogue

GRAPH #22 is used as the menu/dialogue skin. To support variable content while
preserving the original ornamentation, the browser draws it as a nine-slice
surface using the original corners and edges.

Implemented in the live flow:

- Harbor building menu: 출항 / 보급 / 도크 inside the original parchment.
- Sail confirmation message inside the same original dialogue surface.
- Town NPC dialogue uses the original parchment and bottom-right continuation
  marker.
- The browser's separate debug/runtime status strip is hidden so it no longer
  covers the 640×400 DOS frame.

Firefox validation from João's Danzig save captured:

1. Danzig town walking inside the Korean main HUD.
2. Harbor building art plus original parchment menu.
3. `약 13일 항해할 수 있습니다. / 출항하겠습니까？` in the original
   parchment dialogue surface.

## Fidelity boundary

The shipped GRAPH artwork is used directly, including the full HUD and
parchment ornamentation. Text is currently overlaid with the system Korean
font. The game ships `ALL_FONT.16P` and `HANKAKU.FNT`, and HORIEDIT confirms
KSS1/Hanlib usage, but exact KSS1 bitmap-font rendering is a separate remaining
step.

Specialized transaction interiors (market, item shop, bank, supply, pub) still
use some generic browser panels. M11 establishes the original frame/menu/dialog
surface first; those subpanels can now be migrated onto original GRAPH layouts
one by one.