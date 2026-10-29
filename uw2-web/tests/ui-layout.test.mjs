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

for(let i=6;i<=17;i++){
  const b=decodeGraphRecord(records[i]);
  assert.deepEqual([b.width,b.height],[136,112], "building record "+i);
}
assert.equal(UI_LAYOUT.viewport.w,23*16);
assert.equal(UI_LAYOUT.viewport.h,23*16);
assert.equal(UI_LAYOUT.dialogue.x,UI_LAYOUT.viewport.x);
assert.equal(UI_LAYOUT.dialogue.y,UI_LAYOUT.viewport.y+UI_LAYOUT.viewport.h-UI_LAYOUT.dialogue.h);
assert.equal(UI_LAYOUT.building.w,136);
assert.equal(UI_LAYOUT.building.h,112);
assert.equal(UI_LAYOUT.building.x+UI_LAYOUT.building.w/2,UI_LAYOUT.viewport.x+UI_LAYOUT.viewport.w/2);
assert.equal(UI_LAYOUT.yesNo.w,yesNo.width);
assert.equal(UI_LAYOUT.yesNo.h,yesNo.height);
assert.equal(UI_LAYOUT.yesNo.x+UI_LAYOUT.yesNo.w/2,UI_LAYOUT.dialogue.x+UI_LAYOUT.dialogue.w/2);
assert.equal(UI_LAYOUT.yesNo.y+UI_LAYOUT.yesNo.h,UI_LAYOUT.dialogue.y+UI_LAYOUT.dialogue.h-8);

console.log(JSON.stringify({
  frames:{sea:4,town:5},
  viewport:UI_LAYOUT.viewport,
  dialogue:UI_LAYOUT.dialogue,
  building:UI_LAYOUT.building,
  yesNo:UI_LAYOUT.yesNo,
  buildingRecords:"6..17 = 136x112"
},null,2));
console.log("UW2 original UI layout tests: PASS");