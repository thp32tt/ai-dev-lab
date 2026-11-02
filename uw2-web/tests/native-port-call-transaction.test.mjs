import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {prepareNativePortCall} from '../web/native-port-call-transaction.js';
const date={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const ship={index:0,cargo:400,load:10,water:200,food:200,
 lumber:0,shot:0,currentCrew:20,navigationPercent:100,
 goods:Array.from({length:5},(_,slot)=>({slot,id:0,quantity:0}))};
const actors=[{slot:0,x:4,y:5,type:1,active:true}];
const port={id:39,mapId:39,name:'source port',nation:3,x:288,y:240,meta:null};
const session={port:39,portCatalogId:39,portName:port.name,
 portWorld:{nation:port.nation,x:port.x,y:port.y},
 dateTime:{...date},fleet:{ships:[ship]},money:1000,bankBalance:0,dayFlags:0,
 townActors:actors,heroName:'source hero'};
const bank=Array.from({length:240},()=>new Uint8Array(256));
const portAssets={
 maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),banks:[bank],
 walkBounds:Array.from({length:4},()=>[0,100,200,250])
};
const portDoors=Array.from({length:101},(_,i)=>i===39?
 [null,null,null,{id:3,present:true,x:22,y:51}]:[]);
const portCatalog=[port];
function seaFor(s=session){
 const runtime=Object.create(SeaRuntime.prototype);
 runtime.fleet=s.fleet;runtime.dateTime={...s.dateTime};
 runtime.month=s.dateTime.month;runtime.x=286;runtime.y=238;
 runtime.snapshot=()=>({x:runtime.x,y:runtime.y,
   month:runtime.month,dateTime:{...runtime.dateTime}});
 return runtime;
}
const opts={session,runtime:seaFor(),portCatalog,portDoors,portAssets};
const saved=structuredClone(session);
const beforeSea=opts.runtime.snapshot();
const result=prepareNativePortCall(opts);
assert.equal(result.allowed,true,result.reason);
assert.equal(result.port.id,39);
assert.equal(result.session.portCatalogId,39);
assert.equal(result.town.slot,result.session);
assert.deepEqual(result.town.snapshot().mapX,22);
assert.equal(result.town.mapY,52);
assert.equal(result.session.dateTime.timeTick,49);
assert.deepEqual(result.session.townActors,actors);
result.town.actors[0].x=99;
assert.equal(actors[0].x,4);
assert.deepEqual(session,saved);
assert.deepEqual(opts.runtime.snapshot(),beforeSea);
// After successful arrival the old sea runtime is no longer the owner of
// live gameplay memory. Purchases and fleet changes in the new town must
// not retroactively mutate the earlier sea snapshot or original save.
assert.notStrictEqual(result.session.fleet,session.fleet);
assert.notStrictEqual(result.session.fleet.ships[0],session.fleet.ships[0]);
result.session.fleet.ships[0].water=42;
result.session.fleet.ships[0].goods[0].quantity=7;
assert.equal(session.fleet.ships[0].water,200);
assert.equal(session.fleet.ships[0].goods[0].quantity,0);
assert.equal(opts.runtime.fleet.ships[0].water,200);
assert.equal(result.town.slot.fleet.ships[0].water,42);
const sourceWithInventory={...session,inventory:[1,255],
 lastBankInterest:{interest:30,date:{...date}}};
const isolated=prepareNativePortCall({...opts,session:sourceWithInventory,
 runtime:seaFor(sourceWithInventory)});
assert.equal(isolated.allowed,true);
isolated.session.inventory[0]=9;
isolated.session.lastBankInterest.date.day=7;
assert.deepEqual(sourceWithInventory.inventory,[1,255]);
assert.equal(sourceWithInventory.lastBankInterest.date.day,6);


// All admission and constructor failures must preserve the caller state.
function fails(overrides={},reason){
 const current={...opts,...overrides};
 const snapshot=structuredClone(current.session);
 const r=prepareNativePortCall(current);
 assert.equal(r.allowed,false,reason||r.reason);
 if(reason)assert.equal(r.reason,reason);
 assert.deepEqual(current.session,snapshot);
 return r;
}
fails({session:{...session,money:600_000_001}},'port-session-invalid');
fails({session:{...session,fleet:{ships:[{...ship,water:-1}]} }},
 'port-session-invalid');
fails({runtime:{...opts.runtime}},'port-session-invalid');
const wrongClock=seaFor();
wrongClock.dateTime.timeTick=50;
wrongClock.dateTime.minute=40;
fails({runtime:wrongClock},'port-session-invalid');
const badSnapshot=seaFor();
badSnapshot.snapshot=()=>({x:286,y:238,month:7,dateTime:{...date,day:7}});
fails({runtime:badSnapshot},'port-sea-snapshot-invalid');
fails({portCatalog:[]},'port-session-invalid');
fails({portCatalog:[port,{...port,id:40,name:'duplicate'}]},'no-port-call');
fails({portCatalog:[{...port,x:999}]},'no-port-call');
fails({portDoors:[]},'port-map-unavailable');
fails({portAssets:{...portAssets,walkBounds:[[0,0,0,0]]}},
 'port-map-unavailable');

// A malformed carried-over actor collection passes the cheap landing
// geometry check but fails new PortWalkingRuntime construction. The old
// actual app assigned selected BEFORE that construction: partial transition.
const brokenActors={...session,townActors:{malformed:true}};
fails({session:brokenActors,runtime:seaFor(brokenActors)},
 'port-runtime-unavailable');
const throwing=seaFor();throwing.snapshot=()=>{throw Error('bad sea');};
fails({runtime:throwing},'port-runtime-unavailable');
// No ungrounded catalog/port state may be staged across the shared-map
// source supply ports; provenance is recorded by the source port ID.
const supplyPort={...port,id:100,mapId:100,name:'supply A',x:288,y:240};
const supplyOpts={...opts,portCatalog:[supplyPort],
 portDoors:Array.from({length:101},(_,i)=>i===100?
 [null,null,null,{id:3,present:true,x:22,y:51}]:[])};
const landing=prepareNativePortCall(supplyOpts);
assert.equal(landing.allowed,true,landing.reason);
assert.equal(landing.session.port,100);
assert.equal(landing.session.portCatalogId,100);
assert.deepEqual(landing.session.townActors,[]);
assert.equal(landing.town.portId,100);

const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/import \{ prepareNativePortCall \} from "\.\/native-port-call-transaction\.js"/);
assert.match(app,/const prepared=prepareNativePortCall\(\{/);
assert.match(app,/selected=prepared\.session;\s*townRuntime=prepared\.town;/);
assert.doesNotMatch(app,/selected = arrival;\s*townRuntime = new PortWalkingRuntime/);
console.log('UW2 native sea-to-port source landing stages full town runtime atomically: PASS');
