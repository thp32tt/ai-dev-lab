import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import { decodeKoreanChar, heroFrameIndex } from "../web/char.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/CHAR.LZW");
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const d=decodeKoreanChar(ab);

assert.equal(d.heroes.length,6);
assert.deepEqual(d.chunkSizes,[5120,5120,5120,5120,5120,5120,15360]);
for (const h of d.heroes) {
  assert.equal(h.length,8);
  assert.ok(h.every(f=>f.length===4096));
}
assert.equal(d.folk.length,24);

function sheetHash(frames) {
  const width=frames.length*32, height=32;
  const out=new Uint8Array(width*height*4);
  for(let f=0;f<frames.length;f++) {
    const frame=frames[f];
    for(let y=0;y<32;y++) {
      const src=y*32*4;
      const dst=(y*width+f*32)*4;
      out.set(frame.subarray(src,src+32*4),dst);
    }
  }
  return crypto.createHash("sha256").update(out).digest("hex");
}

const hashes={
  hero0:sheetHash(d.heroes[0]),
  hero1:sheetHash(d.heroes[1]),
  folk:sheetHash(d.folk),
};
assert.equal(hashes.hero0,"418d02fdc8c343c7e3accd73d07ff90fa11badaebf289d6931f956722be43d55");
assert.equal(hashes.hero1,"fc92cae6c92f1643498d42554f4b47f4c81656c77048d3154cc9a0a2867d7757");
assert.equal(hashes.folk,"9d1c545a76fb3e3747559bd30121b067f2a70b15b39fcce612718b375ce9bfa3");

assert.equal(heroFrameIndex("up",0),0);
assert.equal(heroFrameIndex("left",1),3);
assert.equal(heroFrameIndex("down",0),4);
assert.equal(heroFrameIndex("right",1),7);

console.log(JSON.stringify({chunkSizes:d.chunkSizes,heroFrames:d.heroes.map(x=>x.length),folkFrames:d.folk.length,hashes},null,2));
console.log("char exact-reference tests: PASS");