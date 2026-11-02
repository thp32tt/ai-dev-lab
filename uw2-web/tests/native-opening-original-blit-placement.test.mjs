import assert from 'node:assert/strict';
import fs from 'node:fs';
import {KOREAN_OPENING_VERIFIED_BLITS} from '../web/opening.js';

// Direct Korean OPEN.EXE Ghidra scene decompile:
// FUN_1000_5b4b / FUN_1000_5fa2, file SHA
// f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65
const rect=(x,y,w,h)=>({x:x*8,y,w:w*8,h});
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[3].main,
 rect(0x0b,0x30,0x3a,0x118));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[3].eye,
 rect(0x17,0x68,0x07,0x18));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[4].intro,
 rect(0x15,0x38,0x15,0xa8));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[4].eye,
 rect(0x36,0x78,0x06,0x18));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[6].eye,
 rect(0x2f,0x80,0x06,0x10));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[7].eye,
 rect(0x19,0x58,0x06,0x10));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[8].eye,
 rect(0x2b,0x78,0x06,0x10));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[8].extraEyes[0],
 rect(0x2e,0xc0,0x06,0x18));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[8].extraEyes[1],
 rect(0x37,0x70,0x06,0x10));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[9].intro,
 rect(0x1b,0x48,0x09,0x28));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[9].eye,
 rect(0x11,200,0x0a,0x30));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[10].intro,
 rect(0x2a,0x88,4,0x20));
assert.deepEqual(KOREAN_OPENING_VERIFIED_BLITS[10].eye,
 rect(0x2e,0x78,6,0x10));
for(const r of Object.values(KOREAN_OPENING_VERIFIED_BLITS)){
 for(const field of Object.values(r)){
  for(const value of Array.isArray(field)?field:[field]){
   assert.ok(value.x>=0&&value.y>=0&&value.x+value.w<=640&&
    value.y+value.h<=400);
  }
 }
}
const source=fs.readFileSync(new URL('../web/opening.js',import.meta.url),'utf8');
assert.match(source,/exact\.main\.y/);
assert.match(source,/exact\.intro\.x/);
assert.match(source,/exact\.eye\.x/);
assert.match(source,/exactEye\.x/);
assert.match(source,/sourceIntro\.x/);
assert.match(source,/sourceEye\.x/);
assert.match(source,/scene: 3/);
assert.match(source,/scene:4/);
console.log('UW2 Korean OPEN.EXE source 0x03CE blit rectangles drive actual Otto/Catalina Canvas placement: PASS');
