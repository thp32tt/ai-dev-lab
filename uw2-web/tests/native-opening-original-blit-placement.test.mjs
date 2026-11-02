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
for(const r of Object.values(KOREAN_OPENING_VERIFIED_BLITS)){
 for(const value of Object.values(r)){
  assert.ok(value.x>=0&&value.y>=0&&value.x+value.w<=640&&
   value.y+value.h<=400);
 }
}
const source=fs.readFileSync(new URL('../web/opening.js',import.meta.url),'utf8');
assert.match(source,/exact\.main\.y/);
assert.match(source,/exact\.intro\.x/);
assert.match(source,/exact\.eye\.x/);
assert.match(source,/scene: 3/);
assert.match(source,/scene:4/);
console.log('UW2 Korean OPEN.EXE source 0x03CE blit rectangles drive actual Otto/Catalina Canvas placement: PASS');
