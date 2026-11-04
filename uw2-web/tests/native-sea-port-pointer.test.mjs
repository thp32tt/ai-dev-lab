import assert from 'node:assert/strict';
import fs from 'node:fs';
import {nativeReadySeaPortMarker,nativeReadySeaPortPointerHit,
 nativeSeaPortMarkerContains} from '../web/native-sea-port-pointer.js';
import {findPortCallTarget,SeaRuntime} from '../web/world-map.js';
import {prepareNativePortCall} from '../web/native-port-call-transaction.js';

// Exact GRAPH #4 source camera: ship at (286,238), catalog port at
// (288,240) is within the existing 2-chip recovery admission and lands
// on native Canvas tile (x304,y216), centered at (312,224).
const state={x:286,y:238,heading:0};
const port={id:39,mapId:39,name:'port39',nation:3,x:288,y:240};
const ready=findPortCallTarget(state,[port]);
assert.equal(ready.approach,'SOURCE_RING_4X4');
const marker=nativeReadySeaPortMarker(state,ready);
assert.deepEqual(marker,{
 x:304,y:216,w:16,h:16,portId:39,portName:'port39',
 tapX:300,tapY:212,tapRight:324,tapBottom:236
});
assert.equal(nativeReadySeaPortPointerHit({x:312,y:225},state,ready),true);
for(const point of [{x:300,y:212},{x:312,y:225},{x:323.99,y:235.99},
 {x:324,y:228},{x:200,y:100},null,{x:NaN,y:224}]){
 assert.equal(nativeSeaPortMarkerContains(point,marker),
  nativeReadySeaPortPointerHit(point,state,ready),
  'hover and click must have identical source tile tap hitbox');
}
assert.equal(nativeReadySeaPortPointerHit({x:323.99,y:235.99},state,ready),true);
assert.equal(nativeReadySeaPortPointerHit({x:324,y:228},state,ready),false);
assert.equal(nativeReadySeaPortPointerHit({x:250,y:160},state,ready),false);
assert.equal(nativeReadySeaPortPointerHit({x:313,y:227},state,null),false);
assert.equal(nativeReadySeaPortMarker(state,{...ready,dx:1}),null);
assert.equal(nativeReadySeaPortMarker(state,{...ready,approach:'UNKNOWN'}),null);
assert.equal(nativeReadySeaPortMarker(state,{...ready,id:130}),null);
assert.equal(nativeReadySeaPortMarker(state,{...ready,name:''}),null);
assert.equal(nativeReadySeaPortMarker(state,{...ready,name:null}),null);
assert.equal(nativeSeaPortMarkerContains({x:312,y:225},null),false);
// World camera 720-chip segment boundary: a wrapped port can be in
// the original call ring but outside the 24x24 visible window.
const seamState={x:2159,y:238},wrapped={...port,x:0,y:240};
const seamPort=findPortCallTarget(seamState,[wrapped]);
assert.ok(seamPort);
assert.equal(nativeReadySeaPortMarker(seamState,seamPort),null);
assert.equal(nativeReadySeaPortPointerHit({x:100,y:210},seamState,seamPort),false);
// The 24x24 source camera follows its true per-band/polar clamping.
const edgeState={x:719,y:1079},edgePort={
 ...port,x:718,y:1077,name:'edge'
};
const edgeReady=findPortCallTarget(edgeState,[edgePort]);
assert.equal(edgeReady.approach,'NATIVE_SOURCE_NEAREST_SEA_2CHIP_RECOVERY');
const edgeMarker=nativeReadySeaPortMarker(edgeState,edgeReady);
assert.equal(edgeMarker.x,96+(718-696)*16);
assert.equal(edgeMarker.y,8+(1077-1056)*16);
assert.equal(nativeReadySeaPortPointerHit({x:edgeMarker.x+8,y:edgeMarker.y+8},
 edgeState,edgeReady),true);
assert.equal(nativeReadySeaPortMarker({x:-1,y:0},ready),null);
assert.equal(nativeReadySeaPortPointerHit({x:NaN,y:223},state,ready),false);
assert.equal(nativeReadySeaPortPointerHit(null,state,ready),false);

// Integrate a CLICK with the same source-validated atomic port-call helper.
// The pointer projector is a read-only source of intent, never a transaction.
const date={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const fleet={ships:[{index:0,cargo:400,load:10,water:200,food:200,
 lumber:0,shot:0,currentCrew:20,navigationPercent:100,
 goods:Array.from({length:5},(_,slot)=>({slot,id:0,quantity:0}))}]};
const saved={port:39,portCatalogId:39,portName:port.name,
 portWorld:{nation:3,x:port.x,y:port.y},dateTime:{...date},
 fleet,money:1000,bankBalance:0,dayFlags:0,
 townActors:[{slot:0,x:4,y:5,type:1,active:true}],heroName:'source'};
const sea=Object.create(SeaRuntime.prototype);
sea.fleet=saved.fleet;sea.dateTime={...date};sea.month=7;
sea.x=286;sea.y=238;
sea.snapshot=()=>({x:sea.x,y:sea.y,month:sea.month,dateTime:{...sea.dateTime}});
const mapBank=Array.from({length:240},()=>new Uint8Array(256));
const assets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),banks:[mapBank],
 walkBounds:Array.from({length:4},()=>[0,100,200,250])};
const doors=Array.from({length:101},(_,i)=>i===39?
 [null,null,null,{id:3,present:true,x:22,y:51}]:[]);
const before=structuredClone(saved),beforePos={x:sea.x,y:sea.y};
assert.equal(nativeReadySeaPortPointerHit({x:320,y:232},state,ready),true);
const arrival=prepareNativePortCall({session:saved,runtime:sea,
 portCatalog:[port],portDoors:doors,portAssets:assets});
assert.equal(arrival.allowed,true,arrival.reason);
assert.equal(arrival.session.portCatalogId,39);
assert.equal(arrival.town.mapY,52);
assert.deepEqual(saved,before);
assert.deepEqual({x:sea.x,y:sea.y},beforePos);
assert.deepEqual(saved.dateTime,date); // click does NOT charge sailing time
// An unreadable destination cannot change the live sea or saved state.
const rejected=prepareNativePortCall({session:saved,runtime:sea,
 portCatalog:[port],portDoors:[],portAssets:assets});
assert.equal(rejected.allowed,false);
assert.deepEqual(saved,before);
assert.deepEqual({x:sea.x,y:sea.y},beforePos);

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/nativeReadySeaPortMarker\(st,nearbyPort\)/);
assert.match(app,/nativeSeaPortMarkerContains\(point,seaPortHoverMarker\)/);
assert.ok(app.includes('canvas.style.cursor=hovering?"pointer":"default"'));
const hover=app.slice(app.indexOf('canvas.addEventListener("pointermove"'),
 app.indexOf('canvas.addEventListener("pointerleave"'));
assert.ok(hover.includes('seaPortHoverMarker.portName+" · 클릭하여 기항"'));
assert.equal(hover.includes('canvas.title=marker.portName'),false);
const inputLoss=app.slice(app.indexOf('function suspendNativeSeaControls('),
 app.indexOf('canvas.addEventListener("click"'));
assert.ok(inputLoss.includes('if(seaAutoActive){'));
assert.ok(inputLoss.includes('stopSeaAuto(reason)'));
assert.ok(inputLoss.includes('suspendNativeSeaControls("auto-focus-lost")'));
assert.ok(inputLoss.includes('suspendNativeSeaControls("auto-tab-hidden")'));
assert.match(app,/seaPortHoverMarker=null;\s*canvas\.style\.cursor="default"/);
assert.match(app,/nativeReadySeaPortPointerHit\(point,st,nearbyPort\)/);
assert.match(app,/if\(nativeReadySeaPortPointerHit\(point,st,nearbyPort\)\)\{/);
assert.match(app,/callNearbyPort\(\);\s*return;/);
assert.match(app,/const nearbyPort = findReadyNativePortCall\(st\);/);
console.log('UW2 web sea: source camera port tile click -> atomic town arrival, no sailing time charge, invalid port fails closed PASS');
