import assert from 'node:assert/strict';
import fs from 'node:fs';
import {stageNativeTownSave} from '../web/native-save-load-transaction.js';

const buffer=new ArrayBuffer(333400);
const assets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(101),walkBounds:[[0,100,200,250]]};
const doors=Array.from({length:101},()=>[]);
const slot={index:1,empty:false,port:39,portName:'Danzig',money:888,
 raw:{page:0},portWorld:{nation:5,x:288,y:240},
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[]};
const before=structuredClone(slot);
const staged=stageNativeTownSave(slot,{saveBuffer:buffer,portAssets:assets,portDoors:doors});
assert.equal(staged.ready,true);
assert.equal(staged.portCatalog.length,130);
assert.equal(staged.session.index,slot.index);
assert.notEqual(staged.session,slot);
assert.notEqual(staged.session.portState,slot.portState);
assert.equal(staged.town.snapshot().mapX,22);
assert.equal(staged.town.snapshot().mapY,52);
staged.session.money=10;
assert.deepEqual(slot,before);
assert.equal(Object.isFrozen(staged),true);

for(const [input,options,reason] of [
  [slot,{saveBuffer:null,portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_SOURCE_UNAVAILABLE'],
  [slot,{saveBuffer:new ArrayBuffer(100),portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_SOURCE_UNAVAILABLE'],
  [{...slot,port:255},{saveBuffer:buffer,portAssets:assets,portDoors:doors},'AT_SEA_COORDINATE_LAYOUT_UNVERIFIED'],
  [{...slot,portState:{...slot.portState,mapX:23}},{saveBuffer:buffer,portAssets:assets,portDoors:doors},'ORIGINAL_TOWN_POSITION_UNVERIFIED'],
  [{...slot,raw:{page:-1}},{saveBuffer:buffer,portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_PAGE_UNVERIFIED'],
  [{...slot,raw:{page:buffer.byteLength-100}},{saveBuffer:buffer,portAssets:assets,portDoors:doors},'ORIGINAL_PORT_CATALOG_INCOMPLETE'],
  [slot,{saveBuffer:buffer,portAssets:assets,portDoors:null},'ORIGINAL_TOWN_ASSETS_UNAVAILABLE'],
  [null,{saveBuffer:buffer,portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_RUNTIME_PREFLIGHT_FAILED']
]){
  const snapshot=structuredClone(input);
  const result=stageNativeTownSave(input,options);
  assert.deepEqual(result,{ready:false,reason});
  assert.deepEqual(input,snapshot);
}

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const selector=app.slice(app.indexOf('function selectLoadedSlot(index) {'),
 app.indexOf('function handleSystemKey(event) {'));
assert.match(selector,/return startSelectedGame\(slot\)/);
assert.doesNotMatch(selector,/selected\s*=/);
assert.doesNotMatch(selector,/systemReturnMode\s*=/);
const start=app.slice(app.indexOf('function startSelectedGame('),
 app.indexOf('$("run-button").addEventListener'));
const staging=start.indexOf('stageNativeTownSave(');
const guard=start.indexOf('if(!stage.ready)');
const commit=start.indexOf('selected=stage.session;');
assert.ok(staging>=0&&guard>staging&&commit>guard);
assert.match(start,/nativeSaveHold:\s*stage\.reason/);
assert.match(start,/systemReturnMode=null/);
assert.ok(start.indexOf('stopSeaAuto()')>guard);
assert.ok(start.indexOf('stopOpening(false)')>guard);
assert.ok(start.indexOf('portCatalog=stage.portCatalog')>guard);
assert.ok(start.indexOf('townRuntime=stage.town')>guard);
console.log('UW2 original native Load Data: source preflight success, failure isolation, atomic live-session switch PASS');
