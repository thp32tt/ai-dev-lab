import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import { parseWindCur, environmentAt, windPageForMonth, FLOW_DIR_NAMES } from "../web/windcur.js";
const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const slots=parseSaveSlots(ab(fs.readFileSync(gd+"/KOUKAI2.DAT")));
assert.deepEqual(slots[0].dateTime,{year:1522,month:5,day:28,timeTick:26,hour:8,minute:40});
assert.deepEqual(slots[1].dateTime,{year:1522,month:7,day:6,timeTick:49,hour:16,minute:20});
assert.equal(slots[0].fleet.count,1);
assert.equal(slots[0].fleet.ships[0].modelName,"갤리온");
assert.equal(slots[1].fleet.count,3);
assert.deepEqual(slots[1].fleet.ships.map(s=>s.modelName),["카라벨 라티나","브리간틴","라레아르"]);
assert.equal(slots[1].fleet.totalCrew,80);
assert.equal(windPageForMonth(5),0);
assert.equal(windPageForMonth(7),0);
assert.equal(windPageForMonth(1),1);
assert.equal(windPageForMonth(10),1);
const raw=parseWindCur(ab(fs.readFileSync(gd+"/WINDCUR.DAT")));
const t=environmentAt(raw,slots[0].dateTime.month,242,370);
const d=environmentAt(raw,slots[1].dateTime.month,286,238);
for(const e of [t,d]) {
  assert.ok(e.wind.dir>=0&&e.wind.dir<8&&e.wind.speed>=0&&e.wind.speed<8);
  assert.ok(e.current.dir>=0&&e.current.dir<8&&e.current.speed>=0&&e.current.speed<8);
}
console.log(JSON.stringify({
  tunis:{date:slots[0].dateTime,wind:{...t.wind,name:FLOW_DIR_NAMES[t.wind.dir]},current:{...t.current,name:FLOW_DIR_NAMES[t.current.dir]}},
  fleet1:slots[0].fleet,
  fleet2:slots[1].fleet,
  danzig:{date:slots[1].dateTime,wind:{...d.wind,name:FLOW_DIR_NAMES[d.wind.dir]},current:{...d.current,name:FLOW_DIR_NAMES[d.current.dir]}}
},null,2));
console.log("wind/date tests: PASS");