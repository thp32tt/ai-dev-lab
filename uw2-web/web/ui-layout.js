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
// MAIN.EXE's GRAPH.DAT decoder proves the original destination contract:
// AX=x pixel, DX=y pixel, BX=GRAPH record. The building dispatcher at file
// 0xE108 selects BX=SI+6 (special record 20 for one building state) and calls
// the decoder with AX=0x68, DX=0x10: building art starts at (104,16).
//
// The standard GRAPH #22 caller at file 0x202EA passes AX=0x68, DX=0x88,
// BX=0x16, proving the 368x152 dialogue origin is (104,136).
//
// GRAPH #0 is driven by the original UI-object table. The object whose callback
// is the record-0 YES/NO renderer (0FB7:3BD8) has x=480,y=336 in MAIN.EXE;
// the native 144x56 asset therefore ends at x=624,y=392.
export const UI_LAYOUT = Object.freeze({
  viewport: Object.freeze({ x: 96, y: 8, w: 384, h: 384, tiles: 24 }),
  building: Object.freeze({ x: 104, y: 16, w: 136, h: 112 }),
  dialogue: Object.freeze({ x: 104, y: 136, w: 368, h: 152 }),
  yesNo: Object.freeze({ x: 480, y: 336, w: 144, h: 56 }),
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