import assert from 'node:assert/strict';
import fs from 'node:fs';
import {parseSaveSlots} from '../web/binary.js';
import {admitOriginalKoreanSaveSlot} from '../web/native-original-source-admission.js';
import {stageNativeTownSave} from '../web/native-save-load-transaction.js';

// A completely source-backed synthetic Korean page: no fixture field is
// invented independently of the bytes accepted by the production parser.
const bytes=new Uint8Array(333400),buffer=bytes.buffer;
const page=33340,header=1+15;
const u16=(at,value)=>{bytes[at]=value&255;bytes[at+1]=value>>>8};
bytes.set(new TextEncoder().encode('Danzig Slot'),header);
bytes[header+12]=39;
bytes[page+0x6a8]=1;
bytes.set(new TextEncoder().encode('Sourced Name'),page+0x6a9);
bytes.set(new TextEncoder().encode('Danzig'),page+0x53ba+39*20+5);
bytes[page+0x97+6]=25;
bytes[page+0x97+7]=3;
bytes[page+0x97+8]=12;
bytes[page+0x97+9]=34;
u16(page+0x97+0x10,10);u16(page+0x97+0x12,38);
u16(page+0x97+0x14,12);u16(page+0x97+0x16,14);
bytes[page+0x6a1]=0x78;bytes[page+0x6a2]=0x03;
const slot=parseSaveSlots(buffer)[1];
assert.equal(slot.index,1);
assert.equal(slot.port,39);
assert.equal(slot.portState.mapX,22);
assert.equal(slot.portState.mapY,52);
assert.equal(slot.money,888);
assert.equal(slot.heroId,1);
const assets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(101),walkBounds:[[0,100,200,250]]};
// Exact collision source rule: left 0, right 200 is walkable.
assets.maps[39][53*96+23]=200;
const doors=Array.from({length:101},()=>[]);
const before=structuredClone(slot);
const admitted=admitOriginalKoreanSaveSlot(slot,buffer);
assert.equal(admitted.allowed,true);
assert.deepEqual(admitted.slot,slot);
assert.notEqual(admitted.slot,slot);
assert.equal(Object.isFrozen(admitted),true);
const staged=stageNativeTownSave(slot,{saveBuffer:buffer,portAssets:assets,portDoors:doors});
assert.equal(staged.ready,true);
assert.equal(staged.portCatalog.length,130);
assert.equal(staged.session.index,slot.index);
assert.notEqual(staged.session,slot);
assert.notEqual(staged.session.portState,slot.portState);
assert.equal(staged.town.snapshot().mapX,22);
assert.equal(staged.town.snapshot().mapY,52);
const blockedAssets={...assets,maps:assets.maps.slice()};
blockedAssets.maps[39]=Uint8Array.from(assets.maps[39]);
blockedAssets.maps[39][53*96+22]=200;
assert.deepEqual(stageNativeTownSave(slot,{
 saveBuffer:buffer,portAssets:blockedAssets,portDoors:doors
}),{ready:false,reason:'ORIGINAL_TOWN_GEOMETRY_UNVERIFIED'});

// Every field the player can spend, change, or persist is bound to the
// original bytes, including nested person/fleet/item/actor structures.
for(const forged of [
 {...slot,money:slot.money+1},
 {...slot,port:255},
 {...slot,dateTime:{...slot.dateTime,day:13}},
 {...slot,portState:{...slot.portState,mapX:23}},
 {...slot,raw:{...slot.raw,page:0}},
 {...slot,heroId:0},
 {...slot,inventory:[...slot.inventory.slice(0,-1),255]},
 {...slot,fleet:{...slot.fleet,ships:[]}},
 {...slot,townActors:slot.townActors.map((a,i)=>i===0?{...a,type:99}:a)},
 {...slot,itemDefinitions:slot.itemDefinitions.map((a,i)=>i===0?{...a,price:12345}:a)},
 {...slot,unexpectedInternalFlag:true},
 ]){
 assert.deepEqual(admitOriginalKoreanSaveSlot(forged,buffer),
  {allowed:false,reason:'ORIGINAL_SOURCE_SLOT_MISMATCH'});
 assert.deepEqual(stageNativeTownSave(forged,{
  saveBuffer:buffer,portAssets:assets,portDoors:doors
 }),{ready:false,reason:'ORIGINAL_SOURCE_SLOT_MISMATCH'});
}
const changed=Uint8Array.from(bytes);changed[page+0x6a1]++;
assert.deepEqual(stageNativeTownSave(slot,{
 saveBuffer:changed.buffer,portAssets:assets,portDoors:doors
}),{ready:false,reason:'ORIGINAL_SOURCE_SLOT_MISMATCH'});
const unknown=Uint8Array.from(bytes);unknown[page+0x6a8]=255;
assert.deepEqual(admitOriginalKoreanSaveSlot(slot,unknown.buffer),
 {allowed:false,reason:'ORIGINAL_SOURCE_SLOT_UNVERIFIED'});
assert.deepEqual(stageNativeTownSave(slot,{
 saveBuffer:unknown.buffer,portAssets:assets,portDoors:doors
}),{ready:false,reason:'ORIGINAL_SOURCE_SLOT_UNVERIFIED'});
staged.session.money=10;
assert.deepEqual(slot,before);
assert.equal(Object.isFrozen(staged),true);
for(const [input,opts,reason] of [
 [slot,{saveBuffer:null,portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_SOURCE_UNAVAILABLE'],
 [slot,{saveBuffer:new ArrayBuffer(100),portAssets:assets,portDoors:doors},'ORIGINAL_SAVE_SOURCE_UNAVAILABLE'],
 [slot,{saveBuffer:buffer,portAssets:assets,portDoors:null},'ORIGINAL_TOWN_ASSETS_UNAVAILABLE'],
 [null,{saveBuffer:buffer,portAssets:assets,portDoors:doors},'ORIGINAL_SOURCE_SLOT_MISMATCH'],
 ]){
 const sourceSnapshot=structuredClone(input);
 assert.deepEqual(stageNativeTownSave(input,opts),{ready:false,reason});
 assert.deepEqual(input,sourceSnapshot);
}
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const selector=app.slice(app.indexOf('function selectLoadedSlot(index) {'),
 app.indexOf('function handleSystemKey(event) {'));
assert.match(selector,/return startSelectedGame\(slot\)/);
assert.doesNotMatch(selector,/selected\s*=/);
const start=app.slice(app.indexOf('function startSelectedGame('),
 app.indexOf('$("run-button").addEventListener'));
const staging=start.indexOf('stageNativeTownSave(');
const guard=start.indexOf('if(!stage.ready)');
const commit=start.indexOf('selected=stage.session;');
assert.ok(staging>=0&&guard>staging&&commit>guard);
assert.match(start,/nativeSaveHold:\s*stage\.reason/);
assert.ok(start.indexOf('stopSeaAuto()')>guard);
assert.ok(start.indexOf('stopOpening(false)')>guard);
const preflight=fs.readFileSync(new URL('../web/native-save-load-transaction.js',import.meta.url),'utf8');
assert.match(preflight,/admitOriginalKoreanSaveSlot\(slot,saveBuffer\)/);
assert.match(preflight,/openNativeSaveSession\(sourceAdmission\.slot\)/);
assert.match(preflight,/syncNativeTownSession\(session,town.snapshot\(\),portAssets\)/);
console.log('UW2 complete Korean original bytes -> exact slot money/date/fleet/items/actors/hero -> atomic town admission PASS');
