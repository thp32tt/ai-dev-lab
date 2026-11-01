import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {advanceNativeSeaAuto} from '../web/native-sea-auto.js';
const world={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const clock=()=>({year:1522,month:7,day:5,timeTick:5,hour:1,minute:40});
const fleet=()=>({ships:[{index:0,modelId:0,name:'oared',
 oared:true,sailType:0,power:100,navigationPercent:100,
 currentCrew:50,requiredCrew:50,load:0,capacity:100,
 navigationLevel:0,seamanship:75,tacking:100}]});
const make=()=>new SeaRuntime(world,{x:100,y:100},null,7,fleet(),clock());
const initial=make(),snap=initial.snapshot();
let calls=0,probes=0;
const already=advanceNativeSeaAuto(initial,()=>{
 calls++;initial.tick();
},()=>{probes++;return {id:1};});
assert.deepEqual(already,{advanced:false,reason:'auto-port-arrived'});
assert.equal(calls,0);assert.equal(probes,1);
assert.deepEqual(initial.snapshot().dateTime,snap.dateTime);
assert.equal(initial.ticks,snap.ticks);
const moving=make();calls=0;probes=0;
const result=advanceNativeSeaAuto(moving,()=>{
 calls++;moving.tick();return {advanced:true,sea:moving};
},()=>++probes===2?{id:2}:null);
assert.deepEqual(result,{advanced:true,stopAtPort:true,reason:'auto-port-arrived'});
assert.equal(calls,1);assert.equal(probes,2);
assert.equal(moving.ticks,1);assert.equal(moving.lastEvent,'auto-port-arrived');
const old=make(),newSea=make();newSea.x=105;
const seen=[];
const swapped=advanceNativeSeaAuto(old,()=>({advanced:true,sea:newSea}),
 st=>{seen.push(st.x);return st.x===105?{id:3}:null;});
assert.equal(swapped.stopAtPort,true);
assert.deepEqual(seen,[100,105]);
assert.equal(newSea.lastEvent,'auto-port-arrived');
const nonPort=make();
const ordinary=advanceNativeSeaAuto(nonPort,()=>{
 nonPort.tick();return {advanced:true,sea:nonPort};
},()=>null);
assert.equal(ordinary.advanced,true);
assert.equal(ordinary.stopAtPort,undefined);
assert.throws(()=>advanceNativeSeaAuto(make(),()=>{},true),/port probe/);
const invalid=make();
const bad=advanceNativeSeaAuto(invalid,()=>{throw Error('tick must not run');},
 ()=>{throw Error('source map unreadable');});
assert.deepEqual(bad,{advanced:false,reason:'auto-port-probe-unavailable'});
assert.equal(invalid.ticks,0);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('findReadyNativePortCall(seaRuntime.snapshot())'));
assert.ok(app.includes('seaRuntime,tickSeaWithBankInterest,findReadyNativePortCall'));
assert.ok(app.includes('!advance.advanced||advance.stopAtPort'));
assert.ok(app.includes('stopSeaAuto(advance.reason)'));
console.log('UW2 source-backed auto-sail port arrival stop before next voyage tick PASS');
