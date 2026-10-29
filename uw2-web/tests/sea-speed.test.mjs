import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import { decodeWorldAssets, findNearestSea, SeaRuntime } from "../web/world-map.js";
import { parseWindCur, environmentAt } from "../web/windcur.js";
import { fleetSeaSpeed } from "../web/sea-speed.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=n=>fs.readFileSync(gd+"/"+n);
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);

const slots=parseSaveSlots(ab(read("KOUKAI2.DAT")));
const assets=decodeWorldAssets(ab(read("WORLDMAP.LZW")),ab(read("DATA1.LZW")));
const wind=parseWindCur(ab(read("WINDCUR.DAT")));

const cat=slots[0], joao=slots[1];
const envCat=environmentAt(wind,cat.dateTime.month,cat.portWorld.x,cat.portWorld.y);
const envJoao=environmentAt(wind,joao.dateTime.month,joao.portWorld.x,joao.portWorld.y);

assert.equal(cat.fleet.count,1);
assert.deepEqual(cat.fleet.ships.map(s=>[s.modelId,s.sailType,s.navigationPercent,s.requiredCrew,s.capacity]),[
  [10,0,20,45,800],
]);
assert.equal(fleetSeaSpeed(cat.fleet,0,envCat.wind).speed,2);

assert.equal(joao.fleet.count,3);
assert.deepEqual(joao.fleet.ships.map(s=>s.sailType),[5,5,3]);
assert.deepEqual(joao.fleet.ships.map(s=>s.navigationPercent),[50,50,20]);
assert.deepEqual(joao.fleet.ships.map(s=>s.load),[113,264,0]);
const speed=fleetSeaSpeed(joao.fleet,0,envJoao.wind);
assert.deepEqual(speed.ships.map(s=>s.speed),[15,15,8]);
assert.equal(speed.speed,8);
assert.equal(speed.knots,4);

// Verify Korean Ship4 +7 is the exact sail-type column for all 25 models.
const save=read("KOUKAI2.DAT");
const expected=[4,4,4,0,4,5,4,5,2,2,0,3,5,5,4,2,2,3,5,1,1,3,2,2,5];
const ship4Base=0x5291;
assert.deepEqual(expected.map((_,i)=>save[ship4Base+i*12+7]),expected);

const start=findNearestSea(assets,joao.portWorld.x,joao.portWorld.y,40);
assert.deepEqual(start,{x:286,y:238});
const rt=new SeaRuntime(assets,start,wind,joao.dateTime.month,joao.fleet,joao.dateTime);
// North from the exact Danzig departure tile is blocked immediately.
// Negative velocity crosses below zero on the first tick; the coast rule pins the axis at 0.
rt.tick();
let s=rt.snapshot();
assert.equal(s.ticks,1);
assert.equal(s.steps,0);
assert.equal(s.accY,0);
assert.equal(s.lastEvent,"coast-block");

// Turn east, where open water exists. Positive velocity accumulates toward +60,
// then moves one chip when the threshold is crossed.
rt.turn(2);
const beforeX=s.x;
for(let i=0;i<20 && rt.snapshot().steps===0;i++) rt.tick();
s=rt.snapshot();
assert.ok(s.steps>=1);
assert.ok(s.x>beforeX);
assert.equal(s.dateTime.timeTick,(joao.dateTime.timeTick+s.ticks)%72);
assert.ok(["sail","accumulate"].includes(s.lastEvent));

console.log(JSON.stringify({
  Catalina:{wind:envCat.wind,speed:fleetSeaSpeed(cat.fleet,0,envCat.wind)},
  Joao:{wind:envJoao.wind,speed,start,afterTicks:s},
  sailTypes:expected,
},null,2));
console.log("sea-speed exact Korean save tests: PASS");