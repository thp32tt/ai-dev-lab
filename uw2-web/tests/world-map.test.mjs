import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import {
  decodeWorldAssets, worldChipAt, canFleetStand, findNearestSea,
  WORLD_CELL_W, WORLD_CELL_H, WORLD_CHIP_W, WORLD_CHIP_H
} from "../web/world-map.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=n=>fs.readFileSync(gd+"/"+n);
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);

const slots=parseSaveSlots(ab(read("KOUKAI2.DAT")));
assert.deepEqual(slots[0].portWorld,{nation:0x06,x:242,y:372});
assert.deepEqual(slots[1].portWorld,{nation:0x05,x:288,y:240});

const assets=decodeWorldAssets(ab(read("WORLDMAP.LZW")),ab(read("DATA1.LZW")));
assert.equal(assets.cells.length,WORLD_CELL_W*WORLD_CELL_H);
assert.equal(assets.tiles.length,128);
assert.equal(assets.quad.length,1024);

for(const slot of slots.filter(s=>!s.empty&&s.portWorld)){
  assert.ok(slot.portWorld.x>0&&slot.portWorld.x<WORLD_CHIP_W);
  assert.ok(slot.portWorld.y>0&&slot.portWorld.y<WORLD_CHIP_H);
}
const t=slots[0].portWorld;
const near=findNearestSea(assets,t.x,t.y,32);
assert.ok(near,"Tunis should have nearby sea");
assert.ok(canFleetStand(assets,near.x,near.y));

const d=slots[1].portWorld;
const near2=findNearestSea(assets,d.x,d.y,32);
assert.ok(near2,"Danzig should have nearby sea");
assert.ok(canFleetStand(assets,near2.x,near2.y));

const distinct=new Set(assets.cells).size;
assert.ok(distinct>20);
console.log(JSON.stringify({
  sizeCells:[WORLD_CELL_W,WORLD_CELL_H],
  sizeChips:[WORLD_CHIP_W,WORLD_CHIP_H],
  worldCellValues:distinct,
  Tunis:{port:t,nearestSea:near,chip:worldChipAt(assets,near.x,near.y)},
  Danzig:{port:d,nearestSea:near2,chip:worldChipAt(assets,near2.x,near2.y)},
},null,2));
console.log("world-map tests: PASS");