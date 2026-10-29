import assert from "node:assert/strict";
import fs from "node:fs";
import { decodeKoreanChar } from "../web/char.js";
const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/CHAR.LZW");
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const d=decodeKoreanChar(ab);
assert.equal(d.heroes.length,6);
for (let i=0;i<6;i++) {
  assert.equal(d.heroes[i].length,8);
  assert.ok(d.heroes[i].every(f=>f.length===1024));
  const used=new Set(d.heroes[i].flatMap(f=>Array.from(f)));
  assert.ok(used.size>=8);
}
assert.equal(d.folkChunk.length,15360);
console.log(JSON.stringify({
 heroes:d.heroes.length,
 heroFrames:d.heroes.map(x=>x.length),
 framePixels:d.heroes[0][0].length,
 folkBytes:d.folkChunk.length,
 firstFrameNonZero:Array.from(d.heroes[0][0]).filter(x=>x!==0).length
},null,2));
console.log("char decoder tests: PASS");