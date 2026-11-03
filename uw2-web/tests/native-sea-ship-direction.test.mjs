import assert from 'node:assert/strict';
import {sourceSeaShipSpriteFrame} from '../web/world-map.js';
// Each of 16 Korean source blocks contains two planar 32x32 poses.
// The actual source atlas therefore holds 2 kinds * 8 headings * 2 poses.
for(const [oared,bank] of [[true,0],[false,16]]){
 const directional=new Set();
 for(let heading=0;heading<8;heading++){
  for(let steps=0;steps<2;steps++){
   const frame=sourceSeaShipSpriteFrame({heading,steps,flagshipOared:oared},32);
   assert.equal(frame,bank+heading*2+steps);
   assert.equal(sourceSeaShipSpriteFrame({heading,steps:steps+2,
    flagshipOared:oared},32),frame,'two source pose frames only');
   directional.add(frame);
  }
 }
 assert.equal(directional.size,16,'all eight headings and both original poses');
}
assert.equal(sourceSeaShipSpriteFrame({heading:0,steps:1,flagshipOared:false},32),17);
assert.equal(sourceSeaShipSpriteFrame({heading:7,steps:0,flagshipOared:false},32),30);
assert.equal(sourceSeaShipSpriteFrame({heading:4,steps:2,flagshipOared:true},32),8);
assert.equal(sourceSeaShipSpriteFrame({heading:4,steps:1,flagshipOared:false},16),12);
assert.equal(sourceSeaShipSpriteFrame({heading:4,steps:1},8),4);
assert.throws(()=>sourceSeaShipSpriteFrame({heading:0,steps:0},32),/oar class/);
assert.throws(()=>sourceSeaShipSpriteFrame({heading:7,steps:0},7),/frame unavailable/);
assert.throws(()=>sourceSeaShipSpriteFrame(null,32),/direction\/frames invalid/);
assert.throws(()=>sourceSeaShipSpriteFrame({
 heading:0,steps:-1,flagshipOared:false},32),/direction\/frames invalid/);
console.log('UW2 original ship 32 planar compass/pose frames, no incorrect nibble-mask: PASS');
