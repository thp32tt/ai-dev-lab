import assert from 'node:assert/strict';
import {sourceSeaShipSpriteFrame} from '../web/world-map.js';

// Korean original DATA1[11] is two eight-direction sprite banks.
for(const [oared,bank] of [[true,0],[false,8]]){
 const seen=new Set();
 for(let heading=0;heading<8;heading++){
  const frame=sourceSeaShipSpriteFrame({heading,steps:0,flagshipOared:oared},16);
  assert.equal(frame,bank+heading);
  seen.add(frame);
  for(const steps of [1,2,3,7,128,999]){
   assert.equal(sourceSeaShipSpriteFrame({heading,steps,
     flagshipOared:oared},16),frame,
   'ship advancement must not switch compass art');
  }
 }
 assert.equal(seen.size,8);
}
assert.equal(sourceSeaShipSpriteFrame({heading:0,steps:1,flagshipOared:true},16),0);
assert.equal(sourceSeaShipSpriteFrame({heading:1,steps:0,flagshipOared:true},16),1);
assert.equal(sourceSeaShipSpriteFrame({heading:7,steps:12,flagshipOared:false},16),15);
assert.equal(sourceSeaShipSpriteFrame({heading:4,steps:1},8),4);
assert.throws(()=>sourceSeaShipSpriteFrame({heading:0},16),/oar class/);
assert.throws(()=>sourceSeaShipSpriteFrame({heading:7},7),/frame unavailable/);
assert.throws(()=>sourceSeaShipSpriteFrame(null,16),/direction\/frames invalid/);
console.log('UW2 native source sea ship 8-direction sprite bank without step flicker: PASS');
