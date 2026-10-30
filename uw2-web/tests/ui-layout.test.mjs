import assert from "node:assert/strict";
import fs from "node:fs";
import { readGraphRecords, decodeGraphRecord } from "../web/graph-format.js";
import { UI_LAYOUT, UI_GRAPH_RECORD, frameRecordForMode } from "../web/ui-layout.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const raw=fs.readFileSync(gd+"/GRAPH.DAT");
const records=readGraphRecords(new Uint8Array(raw.buffer,raw.byteOffset,raw.byteLength));

assert.equal(records.length,65);
assert.equal(UI_GRAPH_RECORD.sea,4);
assert.equal(UI_GRAPH_RECORD.town,5);
assert.equal(frameRecordForMode("sea"),4);
assert.equal(frameRecordForMode("town"),5);

const sea=decodeGraphRecord(records[UI_GRAPH_RECORD.sea]);
const town=decodeGraphRecord(records[UI_GRAPH_RECORD.town]);
const dialog=decodeGraphRecord(records[UI_GRAPH_RECORD.dialogue]);
const yesNo=decodeGraphRecord(records[UI_GRAPH_RECORD.yesNo]);
assert.deepEqual([sea.width,sea.height],[640,400]);
assert.deepEqual([town.width,town.height],[640,400]);
assert.deepEqual([dialog.width,dialog.height],[368,152]);
assert.deepEqual([yesNo.width,yesNo.height],[144,56]);

for(let i=6;i<=21;i++){
  const b=decodeGraphRecord(records[i]);
  assert.deepEqual([b.width,b.height],[136,112], "building record "+i);
}
assert.equal(UI_LAYOUT.viewport.x,96);
assert.equal(UI_LAYOUT.viewport.y,8);
assert.equal(UI_LAYOUT.viewport.w,24*16);
assert.equal(UI_LAYOUT.viewport.h,24*16);
assert.equal(UI_LAYOUT.viewport.tiles,24);
assert.deepEqual(UI_LAYOUT.building,{x:104,y:16,w:136,h:112});
assert.deepEqual(UI_LAYOUT.dialogue,{x:104,y:136,w:368,h:152});
assert.deepEqual(UI_LAYOUT.yesNo,{x:480,y:336,w:144,h:56});

// Exact Korean MAIN.EXE call-site evidence. These checks deliberately pin the
// shipped executable rather than a browser-layout hypothesis.
const main=fs.readFileSync(gd+"/MAIN.EXE");
assert.equal(main.subarray(0xE135,0xE13E).toString("hex"),
  "8d5c06b86800ba1000"); // BX=SI+6, AX=104, DX=16
assert.equal(main.subarray(0x202EA,0x202F8).toString("hex"),
  "b86800ba8800bb16009a535a0000"); // x=104,y=136,record=22
assert.equal(main.subarray(0x4538E,0x4539A).toString("hex"),
  "e0015001f0015801d83bb70f"); // UI object x=480,y=336,... callback 0FB7:3BD8

console.log(JSON.stringify({
  frames:{sea:4,town:5},
  viewport:UI_LAYOUT.viewport,
  dialogue:UI_LAYOUT.dialogue,
  building:UI_LAYOUT.building,
  yesNo:UI_LAYOUT.yesNo,
  buildingRecords:"6..21 = 136x112"
},null,2));
console.log("UW2 original UI layout tests: PASS");