// Artifact-grounded UI geometry for Korean Uncharted Waters II DOS.
//
// Proven directly from GRAPH.DAT:
//   #0  = 144x56 YES/NO surface
//   #4  = 640x400 Korean sea HUD
//   #5  = 640x400 Korean town/economy HUD
//   #6..#21 = 136x112 building portraits/scenes
//   #22 = 368x152 parchment/dialogue
//
// PortWalkingRuntime is a 23x23 tile view (16px tiles => 368x368).
// Dialogue occupies the bottom 152px of that logical viewport.
// Building art remains native 136x112; its y is EGA-grid aligned and centered
// in the upper dialogue-free region pending a direct MAIN.EXE blit trace.
export const UI_LAYOUT = Object.freeze({
  viewport: Object.freeze({ x: 104, y: 16, w: 368, h: 368 }),
  dialogue: Object.freeze({ x: 104, y: 232, w: 368, h: 152 }),
  building: Object.freeze({ x: 220, y: 64, w: 136, h: 112 }),
  yesNo: Object.freeze({ x: 216, y: 320, w: 144, h: 56 }),
});

export const UI_GRAPH_RECORD = Object.freeze({
  sea: 4,
  town: 5,
  yesNo: 0,
  dialogue: 22,
  side: 26,
});

export function frameRecordForMode(mode) {
  return mode === "sea" ? UI_GRAPH_RECORD.sea : UI_GRAPH_RECORD.town;
}