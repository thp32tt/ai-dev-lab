import assert from 'node:assert/strict';
import {decodeSourceSeaShipFrames} from '../web/world-map.js';
// Synthetic original 0x400 byte block: TWO 0x200-byte 4-plane VGA images.
// Rows interleave 4 bytes from each of four planes, not color nibbles.
const raw=new Uint8Array(0x4000+0x400);
const put=(pose,x,y,color)=>{
 const base=0x4000+pose*0x200+y*16+(x>>3);
 for(let plane=0;plane<4;plane++)
  if(color&(1<<plane))raw[base+plane*4]|=1<<(7-(x&7));
};
put(0,0,0,5);put(0,1,0,10);put(0,31,31,15);put(0,16,10,13);
put(1,0,0,12);put(1,17,15,3);put(1,31,31,7);
const frames=decodeSourceSeaShipFrames(raw);
assert.equal(frames.length,2);
assert.equal(frames[0].length,1024);
assert.equal(frames[1].length,1024);
assert.equal(frames[0][0],5);
assert.equal(frames[0][1],10);
assert.equal(frames[0][10*32+16],13);
assert.equal(frames[0][1023],15);
assert.equal(frames[1][0],12);
assert.equal(frames[1][15*32+17],3);
assert.equal(frames[1][1023],7);
assert.equal(frames[1][1],0);
assert.equal(decodeSourceSeaShipFrames(new Uint8Array(0x4000)).length,0);
assert.throws(()=>decodeSourceSeaShipFrames(new Uint8Array(0x4000+0x401)),/truncated/);
assert.throws(()=>decodeSourceSeaShipFrames('bad'),/requires bytes/);
console.log('UW2 native 32x32 VGA scanline-interleaved four-plane ship + twin pose decoder PASS');
