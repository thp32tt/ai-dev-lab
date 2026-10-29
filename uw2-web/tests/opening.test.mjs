import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeLS11 } from "../web/ls11.js";
import { readGraphRecords,decodeGraphRecord } from "../web/graph-format.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/OPGRAPH.LZW");
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const archive=decodeLS11(ab);
assert.equal(archive.decoded.length,14);

let total=0, titleLike=0, largest=0;
for(let pi=0;pi<archive.decoded.length;pi++){
  const records=readGraphRecords(archive.decoded[pi].data);
  total+=records.length;
  for(const record of records){
    const im=decodeGraphRecord(record);
    if(im.width===640 && im.height===128) titleLike++;
    largest=Math.max(largest,im.width*im.height);
  }
}
assert.equal(total,108);
assert.ok(titleLike>=1);
assert.ok(largest>=640*200);
console.log(JSON.stringify({parts:14,records:total,titleLike,largestPixels:largest},null,2));
console.log("opening tests: PASS");