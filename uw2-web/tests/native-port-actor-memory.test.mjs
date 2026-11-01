import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buildNativePortArrival} from '../web/native-port-arrival.js';
import {prepareNativePortActorContinuity,validNativePortActorMemory}
 from '../web/native-port-actor-memory.js';
const time={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const makePort=(id,mapId,x)=>({
 id,mapId,name:'source '+id,nation:0,x,y:200,meta:null
});
const A=makePort(39,39,100);
const B=makePort(40,40,110);
const S1=makePort(100,100,120);
const S2=makePort(101,100,130);
const doors=Array.from({length:101},()=>[
 null,null,null,{id:3,present:true,x:22,y:51}]);
const assets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),walkBounds:Array.from({length:4},()=>[0,100,200,250])};
const actor=(x=10)=>({slot:0,x,y:10,type:1,active:true});
const original={index:1,port:39,portName:'source 39',
 portWorld:{x:100,y:200,nation:0},portState:{mapX:22,mapY:52},
 townActors:[actor()]};
const enter=(previous,port)=>buildNativePortArrival({
 previous,port,portDoors:doors,portAssets:assets,
 seaState:{dateTime:time}
});
// A => B: source people from A remain in browser memory; B is unknown.
const aToB=enter(original,B);
assert.ok(aToB);
assert.deepEqual(aToB.townActors,[]);
assert.equal(aToB.arrivalEvidence.actorStatus,'OTHER_PORT_ACTORS_NOT_VERIFIED');
assert.deepEqual(aToB.portActorMemory['39'].actors,[actor()]);
assert.equal(original.portActorMemory,undefined);
assert.deepEqual(original.townActors,[actor()]);
// B => A: restore only original A, no invented B actors.
const bToA=enter(aToB,A);
assert.deepEqual(bToA.townActors,[actor()]);
assert.equal(bToA.arrivalEvidence.actorStatus,'KNOWN_PORT_BROWSER_ACTORS');
bToA.townActors[0].x=33;
assert.equal(aToB.portActorMemory['39'].actors[0].x,10);
const backToB=enter(bToA,B);
assert.deepEqual(backToB.townActors,[]);
assert.equal(backToB.portActorMemory['39'].actors[0].x,33);
assert.equal(backToB.portActorMemory['40'],undefined);
// No supply-map conflation (100 and 101 use the SAME source town art bank).
const seededSupply={...original,port:100,portCatalogId:100,
 townActors:[actor(18)]};
const sToS2=enter(seededSupply,S2);
assert.deepEqual(sToS2.townActors,[]);
assert.deepEqual(sToS2.portActorMemory['100'].actors,[actor(18)]);
assert.equal(sToS2.portActorMemory['101'],undefined);
const s2ToS1=enter(sToS2,S1);
assert.deepEqual(s2ToS1.townActors,[actor(18)]);
assert.equal(s2ToS1.arrivalEvidence.actorStatus,'KNOWN_PORT_BROWSER_ACTORS');
assert.equal(s2ToS1.portActorMemory['101'],undefined);
// Generic original supply-bank save (port 100, no catalog provenance)
// cannot guess a geographic actor owner.
const unowned=enter({...seededSupply,portCatalogId:undefined},S2);
assert.deepEqual(unowned.townActors,[]);
assert.equal(unowned.portActorMemory['100'],undefined);
// A malformed remembered actor cannot mutate caller or create passengers.
const corrupt={...original,portActorMemory:{
 '39':{source:'SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER',
  actors:[{slot:0,x:255,y:2,type:1,active:true}]} }};
const before=structuredClone(corrupt);
assert.equal(validNativePortActorMemory(corrupt.portActorMemory),false);
assert.throws(()=>enter(corrupt,B),/native port actor/);
assert.deepEqual(corrupt,before);
assert.equal(validNativePortActorMemory({}),true);
assert.equal(validNativePortActorMemory(undefined),true);
for(const bad of [null,[],{'130':{source:'bad',actors:[]}},
 {'0':{source:'bad',actors:[]}}])assert.equal(validNativePortActorMemory(bad),false);
// The helper is in the actual source arrival path invoked by browser P/Enter.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const arrival=fs.readFileSync(new URL('../web/native-port-arrival.js',import.meta.url),'utf8');
assert.ok(app.includes('const prepared=prepareNativePortCall({'));
assert.ok(arrival.includes('prepareNativePortActorContinuity(previous,port)'));
assert.equal(prepareNativePortActorContinuity(original,A).actorStatus,
 'CURRENT_PORT_SOURCE_ACTORS');
console.log('UW2 browser-native sourced NPC identity A->B->A and supply-map provenance preserved: PASS');
