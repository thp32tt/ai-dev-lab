import assert from 'node:assert/strict';
import {findPortCallTarget,WORLD_CHIP_W} from '../web/world-map.js';
const a={id:1,name:'A',x:142,y:372};
const b={id:39,name:'B',x:288,y:240};
const c={id:60,name:'C',x:1700,y:800};
const ports=[a,b,c];
assert.equal(findPortCallTarget({x:144,y:373},ports)?.id,1);
assert.equal(findPortCallTarget({x:144,y:373},ports)?.approach,
 'NATIVE_SOURCE_NEAREST_SEA_2CHIP_RECOVERY');
assert.equal(findPortCallTarget({x:286,y:238},ports)?.id,39);
assert.equal(findPortCallTarget({x:286,y:238},ports)?.approach,'SOURCE_RING_4X4');
assert.equal(findPortCallTarget({x:100,y:100},ports),null);
assert.equal(findPortCallTarget({x:142,y:372},ports),null);
assert.equal(findPortCallTarget({x:144,y:373},[
 a,{...a,id:20,x:142,y:373,name:'overlapping source'}]),null);
assert.equal(findPortCallTarget({x:WORLD_CHIP_W-2,y:300},
 [{id:4,name:'wrapped',x:0,y:300}])?.id,4);
assert.equal(findPortCallTarget({x:8.5,y:372},ports),null);

const ringWest={id:70,name:'ring west',x:99,y:100};
const ringEast={id:71,name:'ring east',x:102,y:100};
const recoveryWest={id:72,name:'recovery west',x:98,y:100};
const near={x:100,y:100};
// Two valid 4x4 source-ring targets must not pick an arbitrary catalog
// entry; this is a real wrong-port/portState-contamination risk.
assert.equal(findPortCallTarget(near,[ringWest,ringEast]),null);
assert.equal(findPortCallTarget(near,[ringEast,ringWest]),null);
assert.equal(findPortCallTarget(near,[ringWest,ringEast,recoveryWest]),null);
// A unique source-ring hit wins over any recovery, regardless of order.
for(const order of [[recoveryWest,ringEast],[ringEast,recoveryWest]]){
 const chosen=findPortCallTarget(near,order);
 assert.equal(chosen?.id,ringEast.id);
 assert.equal(chosen?.approach,'SOURCE_RING_4X4');
}
// Recovery is equally fail-closed when multiple source ports are nearby.
const recoveryNorth={id:73,name:'recovery north',x:100,y:98};
assert.equal(findPortCallTarget(near,[recoveryWest,recoveryNorth]),null);
assert.equal(findPortCallTarget(near,[recoveryNorth,recoveryWest]),null);
// The dateline seam is a wrapped original map coordinate, not an edge
// where arbitrary port list order can manufacture a destination.
assert.equal(findPortCallTarget({x:0,y:100},[
 {id:74,name:'seam west',x:WORLD_CHIP_W-1,y:100},
 {id:75,name:'seam east',x:2,y:100}
]),null);
assert.equal(findPortCallTarget({x:WORLD_CHIP_W-1,y:100},[
 {id:76,name:'seam plus',x:1,y:100}])?.id,76);
// Reject malformed source catalog records and positions rather than
// admitting a ghost port or manufacturing a wrapped out-of-map port.
for(const bad of [
 {...ringWest,id:130},{...ringWest,id:-1},
 {...ringWest,x:-1},{...ringWest,x:WORLD_CHIP_W},
 {...ringWest,y:-1},{...ringWest,y:1080}
])assert.equal(findPortCallTarget(near,[bad]),null);
for(const badState of [{x:-1,y:100},{x:WORLD_CHIP_W,y:100},
 {x:100,y:-1},{x:100,y:1080}])
 assert.equal(findPortCallTarget(badState,[ringWest]),null);

console.log('UW2 native web Port Call preserves original 4x4; isolated bounded source-nearest-sea recovery: PASS');
