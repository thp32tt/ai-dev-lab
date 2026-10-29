import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeLS11 } from "../web/ls11.js";
import { readGraphRecords, decodeGraphRecord } from "../web/graph-format.js";
import {
  KOREAN_OPENING_SCENE_PLAN,
  KOREAN_OPENING_UNUSED_RECORDS,
} from "../web/opening.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/OPGRAPH.LZW");
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const archive=decodeLS11(ab);
assert.equal(archive.decoded.length,14);

const counts=[];
let total=0,titleLike=0,largest=0;
for(let pi=0;pi<archive.decoded.length;pi++){
  const records=readGraphRecords(archive.decoded[pi].data);
  counts.push(records.length);
  total+=records.length;
  for(const record of records){
    const im=decodeGraphRecord(record);
    if(im.width===640 && im.height===128) titleLike++;
    largest=Math.max(largest,im.width*im.height);
  }
}
assert.deepEqual(counts,[16,2,2,11,8,8,8,8,15,11,5,2,2,10]);
assert.equal(total,108);
assert.ok(titleLike>=1);
assert.ok(largest>=640*200);

// Korean OPEN.EXE DS:0740 has exactly 12 scene pointers.
assert.equal(KOREAN_OPENING_SCENE_PLAN.length,12);
assert.deepEqual(
  KOREAN_OPENING_SCENE_PLAN.map(x=>x.scene),
  [0,1,2,3,4,5,6,7,8,9,10,11],
);
assert.deepEqual(KOREAN_OPENING_SCENE_PLAN[0].sources[0].records,[0,1,3,4,2]);
assert.deepEqual(KOREAN_OPENING_SCENE_PLAN[1].sources[0].records,[5,6,7,8,9,11,12,13,14,15,10]);
assert.equal(KOREAN_OPENING_SCENE_PLAN[3].name,"Otto Spinola");
assert.equal(KOREAN_OPENING_SCENE_PLAN[4].name,"Catalina Erantzo");
assert.equal(KOREAN_OPENING_SCENE_PLAN[10].name,"João Ferrero");
assert.deepEqual(KOREAN_OPENING_SCENE_PLAN[11].sources,[{part:12,records:[0]}]);

const used=new Set();
for(const scene of KOREAN_OPENING_SCENE_PLAN){
  for(const src of scene.sources){
    for(const rec of src.records){
      assert.ok(src.part>=0&&src.part<counts.length,`bad part ${src.part}`);
      assert.ok(rec>=0&&rec<counts[src.part],`bad record ${src.part}:${rec}`);
      used.add(`${src.part}:${rec}`);
    }
  }
}
const unused=new Set(KOREAN_OPENING_UNUSED_RECORDS.map(([p,r])=>`${p}:${r}`));
assert.equal(unused.size,0);

const all=[];
for(let p=0;p<counts.length;p++)for(let r=0;r<counts[p];r++)all.push(`${p}:${r}`);
const uncovered=all.filter(k=>!used.has(k));
assert.deepEqual(uncovered,[]);
assert.equal(used.size,108);

console.log(JSON.stringify({
  parts:14,
  records:total,
  sceneCount:KOREAN_OPENING_SCENE_PLAN.length,
  used:used.size,
  titleLike,
  largestPixels:largest,
},null,2));
console.log("opening Korean OPEN.EXE 12-scene exact-record-map tests: PASS");