import assert from 'node:assert/strict';
import {buildNativePortArrival,canBuildNativePortArrival} from '../web/native-port-arrival.js';
const bank=Array.from({length:240},()=>new Uint8Array(256));
const assets={maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),
 walkBounds:[[0,100,200,250]],banks:[bank]};
const doors=[[null,null,null,{id:3,present:true,x:22,y:51}]];
const port={id:0,mapId:0,name:'source port',nation:5,x:288,y:240,meta:null};
const time={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const seaState={dateTime:time},actors=[{slot:0,x:5,y:4,type:1,active:true}];
const previous={port:0,heroName:'saved',townActors:actors,money:100};
const opts={port,seaState,previous,portDoors:doors,portAssets:assets};
assert.equal(canBuildNativePortArrival(opts),true);
const arrival=buildNativePortArrival(opts);
assert.deepEqual(arrival.portState,{viewX:10,viewY:38,playerX:12,
 playerY:14,mapX:22,mapY:52});
assert.equal(arrival.money,100);
assert.deepEqual(arrival.dateTime,time);
assert.deepEqual(arrival.townActors,actors);
arrival.townActors[0].x=99;
assert.equal(previous.townActors[0].x,5);
assert.deepEqual(arrival.arrivalEvidence,{
 source:'ORIGINAL_PORT_TABLE_ZA_DAT_PORTCHIP_COLLISION',
 actorStatus:'CURRENT_PORT_SOURCE_ACTORS',
 economyStatus:'SUPPLY_PORT_ECONOMY_UNAVAILABLE'});
const supply=buildNativePortArrival({...opts,port:{
 ...port,id:100,mapId:100},portDoors:Array.from({length:101},(_,i)=>i===100?doors[0]:[]) ,
 portAssets:{...assets,maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),walkBounds:Array.from({length:4},()=>[0,100,200,250])}});
assert.equal(supply.port,100);
assert.equal(supply.arrivalEvidence.actorStatus,'OTHER_PORT_ACTORS_NOT_VERIFIED');
assert.deepEqual(supply.townActors,[]);
// Regression: 130 source PORT entries contain 30 supply ports reusing
// map100. Crossing supply A -> B must never leak actors just because both
// locations have identical shared source tile map and harbor door pixels.
const supplyOpts={...opts,portDoors:Array.from({length:101},
 (_,i)=>i===100?doors[0]:[]),
 portAssets:{...assets,maps:Array.from({length:101},
  ()=>new Uint8Array(96*96)),chipNo:new Uint8Array(100),
  walkBounds:Array.from({length:4},()=>[0,100,200,250])}};
const supplyA={...port,id:100,mapId:100,name:'supply-A',x:300,y:400};
const supplyB={...port,id:101,mapId:100,name:'supply-B',x:800,y:100};
const sameSupply=buildNativePortArrival({...supplyOpts,port:supplyA,
 portCatalog:[supplyA,supplyB],
 previous:{...previous,port:100,portCatalogId:100,
  portWorld:{nation:supplyA.nation,x:supplyA.x,y:supplyA.y}}});
assert.deepEqual(sameSupply.townActors,actors);
assert.equal(sameSupply.arrivalEvidence.actorStatus,'CURRENT_PORT_SOURCE_ACTORS');
const differentSupply=buildNativePortArrival({...supplyOpts,port:supplyB,
 portCatalog:[supplyA,supplyB],
 previous:{...sameSupply,townActors:actors}});
assert.deepEqual(differentSupply.townActors,[]);
assert.equal(differentSupply.arrivalEvidence.actorStatus,
 'OTHER_PORT_ACTORS_NOT_VERIFIED');
assert.equal(differentSupply.portCatalogId,101);
assert.notDeepEqual(differentSupply.portWorld,sameSupply.portWorld);
const unknownOriginalSupply=buildNativePortArrival({...supplyOpts,port:supplyA,
 previous:{...previous,port:100}});
assert.deepEqual(unknownOriginalSupply.townActors,[]);
assert.equal(unknownOriginalSupply.arrivalEvidence.actorStatus,
 'OTHER_PORT_ACTORS_NOT_VERIFIED');
// Prevent a stale native catalog id from carrying actors into a new
// ordinary port whose map id happens to match an older source save.
const mismatched=buildNativePortArrival({...opts,
 previous:{...previous,portCatalogId:5}});
assert.deepEqual(mismatched.townActors,[]);

const invalidCases=[
 {...opts,port:{...port,id:100,mapId:0}},
 {...opts,port:{...port,x:99999}},
 {...opts,seaState:{dateTime:{...time,timeTick:72}}},
 {...opts,seaState:{dateTime:{...time,timeTick:49,hour:5}}},
 {...opts,portDoors:[]},
 {...opts,portDoors:[[null,null,null,{id:3,present:true,x:95,y:51}]]},
 {...opts,portDoors:[[null,null,null,{id:3,present:true,x:22,y:94}]]},
 {...opts,portAssets:{...assets,walkBounds:[[0,0,0,0]]}}
];
for(const input of invalidCases){
 assert.equal(canBuildNativePortArrival(input),false);
 assert.equal(buildNativePortArrival(input),null);
}
// The read-only readiness gate must not alter the original source game
// state, unlike the actual arrival's authorized cloned session.
const original=structuredClone(previous);
assert.equal(canBuildNativePortArrival(opts),true);
assert.deepEqual(previous,original);
// An invalid landing must not be advertised as a navigable harbor.
const blocked={...assets,walkBounds:[[0,0,0,0]]};
assert.equal(canBuildNativePortArrival({...opts,portAssets:blocked}),false);
assert.equal(buildNativePortArrival({...opts,portAssets:blocked}),null);
console.log('UW2 native original 130-port harbor landing uses verified source door/collision/date: PASS');
