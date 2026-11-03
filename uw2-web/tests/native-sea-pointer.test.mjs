import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeSeaPointerCommand,nativeCanvasPointerPoint} from '../web/native-canvas-pointer.js';
import {SeaRuntime} from '../web/world-map.js';

const center={x:304,y:216};
const target=(dx,dy)=>({x:center.x+dx,y:center.y+dy});
const dir=[[0,-64],[64,-64],[64,0],[64,64],[0,64],[-64,64],[-64,0],[-64,-64]];
for(let heading=0;heading<8;heading++)for(let chosen=0;chosen<8;chosen++){
 const out=nativeSeaPointerCommand(target(...dir[chosen]),{heading});
 const delta=(chosen-heading+8)%8;
 assert.deepEqual(out,delta===0?{kind:'forward'}:
   {kind:'turn',delta:delta<=4?1:-1},'heading '+heading+' toward '+chosen);
}
for(const point of [null,{}, {x:NaN,y:200},{x:300,y:Infinity},
 {x:95.99,y:216},{x:480,y:216},{x:305,y:7.9},{x:300,y:392},
 {x:303,y:216},{x:319.99,y:231.99}])
 assert.equal(nativeSeaPointerCommand(point,{heading:0}),null);
for(const session of [null,{}, {heading:8},{heading:-1},{heading:2.5},
 {heading:Infinity},{heading:'0'}])
 assert.equal(nativeSeaPointerCommand(target(64,0),session),null);
assert.equal(nativeSeaPointerCommand(target(15.9,15.9),{heading:0}),null);
assert.deepEqual(nativeSeaPointerCommand(target(16,0),{heading:0}),
 {kind:'turn',delta:1});
assert.deepEqual(nativeSeaPointerCommand(target(0,-16),{heading:0}),
 {kind:'forward'});
const canvas={width:640,height:400,clientLeft:0,clientTop:0,
 clientWidth:1280,clientHeight:800,
 getBoundingClientRect:()=>({left:10,top:20,width:1280,height:800})};
const point=nativeCanvasPointerPoint({clientX:10+(304+64)*2,clientY:20+216*2},canvas);
assert.deepEqual(nativeSeaPointerCommand(point,{heading:0}),{kind:'turn',delta:1});
const sea=new SeaRuntime({cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)},
 {x:100,y:100},null,1,null,{year:1501,month:1,day:1,timeTick:0,hour:0,minute:0});
const before=sea.snapshot();
const turn=nativeSeaPointerCommand(target(64,0),sea.snapshot());
sea.turn(turn.delta);
assert.equal(sea.heading,1);
assert.equal(sea.ticks,before.ticks);
assert.deepEqual(sea.dateTime,before.dateTime);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/else if\(viewMode==="sea"&&seaRuntime\)\{[\s\S]*?const st=seaRuntime\.snapshot\(\),nearbyPort=findReadyNativePortCall\(st\);[\s\S]*?nativeSeaPointerCommand\(point,st\)/);
assert.match(app,/if\(command\.kind==="turn"\)seaRuntime\.turn\(command\.delta\)/);
assert.match(app,/else if\(command\.kind==="forward"\)tickSeaWithBankInterest\(\)/);
assert.doesNotMatch(app,/if\(command\.kind==="forward"\)seaRuntime\.tick\(\)/);
console.log('UW2 GRAPH #4 sea Canvas helm 8-way and existing voyage gate PASS');
