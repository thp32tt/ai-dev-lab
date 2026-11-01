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
console.log('UW2 native web Port Call preserves original 4x4; isolated bounded source-nearest-sea recovery: PASS');
