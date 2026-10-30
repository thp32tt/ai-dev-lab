// Artifact-grounded UI geometry for Korean Uncharted Waters II DOS.
//
// Proven directly from GRAPH.DAT:
//   #0  = 144x56 YES/NO surface
//   #4  = 640x400 Korean sea HUD
//   #5  = 640x400 Korean town/economy HUD
//   #6..#21 = 136x112 building portraits/scenes
//   #22 = 368x152 parchment/dialogue
//
// GRAPH #4/#5 prove a 384x384 (24x24 tile) central playfield bounded by
// x=96..479, y=8..391. PortWalkingRuntime lets a 32x32 actor top-left occupy
// tile coordinates 0..22, which also requires 24 background tiles to avoid
// clipping the actor at the right/bottom edges.
//
// GRAPH #22 is 368x152, so the original-sized lower dialogue surface is inset
// 8px from each horizontal playfield edge and bottom-aligned to y=392.
// GRAPH #0 (144x56) is centered in that dialogue surface and bottom-inset 8px.
//
// Building art remains native 136x112. Its x=220 follows exact horizontal
// centering in the 384px playfield. y remains provisional pending the direct
// GRAPH building-blit caller trace.
export const UI_LAYOUT = Object.freeze({
  viewport: Object.freeze({ x: 96, y: 8, w: 384, h: 384, tiles: 24 }),
  dialogue: Object.freeze({ x: 104, y: 240, w: 368, h: 152 }),
  building: Object.freeze({ x: 220, y: 64, w: 136, h: 112 }),
  yesNo: Object.freeze({ x: 216, y: 328, w: 144, h: 56 }),
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