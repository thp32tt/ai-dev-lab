import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint,
 validateNativeTownCheckpoint,resumeNativeTownRuntime,NATIVE_TOWN_CHECKPOINT_KEY}
 from '../web/native-town-checkpoint.js';
import {PortWalkingRuntime} from '../web/town.js';
import fs from 'node:fs';
const sourceSha256='a'.repeat(64);
const assets={maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),
 walkBounds:[[0,100,200,250]]};
const port={id:0,mapId:0,name:'source port',nation:5,x:288,y:240};
const original={index:1,heroId:0,heroName:'hero',memo:'orig',
 port:0,portName:'source port',portWorld:{nation:5,x:288,y:240},
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 money:100,dateTime:{year:1522,month:7,day:6,timeTick:49,hour:16,minute:20},
 fleet:{ships:[{currentCrew:5}]},
 townActors:[{slot:0,x:30,y:50,type:1,active:true}],
 raw:{page:33340}};
const deps={sourceSha256,sourceSlots:[undefined,original],
 portAssets:assets,portCatalog:[port]};
const session=structuredClone(original),actor=structuredClone(original.townActors);
session.money=87;
const town={portId:0,portName:'source port',...session.portState,
 facing:'right',stepParity:1,talkCounter:7,
 actors:actor,building:null,talk:null};
const mem=new Map(),storage={
 getItem:key=>mem.get(key)??null,
 setItem:(key,value)=>mem.set(key,value)
};
const saved=await saveNativeTownCheckpoint({...deps,storage,session,town});
assert.equal(saved.stored,true);assert.equal(saved.index,1);
assert.equal(saved.fidelity,'BROWSER_ONLY_TOWN_CHECKPOINT__NOT_DOS_SAVE');
const read=await loadNativeTownCheckpoint({...deps,storage});
assert.deepEqual(read.session,session);
assert.deepEqual(read.town,town);
assert.deepEqual(read.portCatalog,[port]);

assert.notEqual(read.session,session);
const runtime=new PortWalkingRuntime(read.session,assets,[[]]);
assert.equal(resumeNativeTownRuntime(runtime,read.town),runtime);
assert.equal(runtime.facing,'right');assert.equal(runtime.stepParity,1);
assert.equal(runtime.talkCounter,7);
assert.equal(original.money,100);
// Browsing another save's port catalog must not corrupt checkpoint restore.
const wrongCatalog=[{...port,name:'another saved directory name'}];
await assert.rejects(loadNativeTownCheckpoint({...deps,
 portCatalog:wrongCatalog,storage}),/port ownership invalid/);
const resolved=await loadNativeTownCheckpoint({...deps,
 portCatalog:wrongCatalog,storage,portCatalogForSlot:index=>{
   assert.equal(index,1);
   return [port];
 }});
assert.equal(resolved.session.portName,'source port');
assert.equal(resolved.portCatalog[0].name,'source port');
const text=mem.get(NATIVE_TOWN_CHECKPOINT_KEY);
const tampered=JSON.parse(text);tampered.payload.session.money=5000;
mem.set(NATIVE_TOWN_CHECKPOINT_KEY,JSON.stringify(tampered));
await assert.rejects(loadNativeTownCheckpoint({...deps,storage}),/integrity mismatch/);
mem.set(NATIVE_TOWN_CHECKPOINT_KEY,text);
await assert.rejects(loadNativeTownCheckpoint({...deps,storage,
 sourceSha256:'b'.repeat(64)}),/source fingerprint/);
assert.equal(mem.get(NATIVE_TOWN_CHECKPOINT_KEY),text);
const invalidTown={...town,building:{id:3}};
await assert.rejects(saveNativeTownCheckpoint({
 ...deps,storage,session,town:invalidTown}),/town position\/idle state invalid/);
const invalidSession={...session,portState:{...session.portState,mapX:500}};
await assert.rejects(saveNativeTownCheckpoint({
 ...deps,storage,session:invalidSession,town}),/town position\/idle state invalid/);
assert.equal(mem.get(NATIVE_TOWN_CHECKPOINT_KEY),text);
const changedPort={...session,portName:'fake'};
assert.throws(()=>validateNativeTownCheckpoint({
 version:1,sourceSha256,session:changedPort,town
},deps),/port ownership invalid/);
const invalidActor={...town,actors:[{...town.actors[0],active:'wrong'}]};
assert.throws(()=>validateNativeTownCheckpoint({
 version:1,sourceSha256,session,town:invalidActor
},deps),/actor state mismatch/);
assert.equal(await loadNativeTownCheckpoint({...deps,storage:{getItem:()=>null}}),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const html=fs.readFileSync(new URL('../web/index.html',import.meta.url),'utf8');
assert.ok(app.includes('saveNativeTownCheckpoint({'));
assert.ok(app.includes('load:checkpointStorage=>loadNativeTownCheckpoint({'));
assert.ok(app.includes('resumeNativeTownRuntime(nextRuntime,restored.town)'));
assert.ok(html.includes('data-action="checkpoint-save"'));
assert.ok(html.includes('data-action="checkpoint-load"'));
assert.ok(html.includes('id="checkpoint-feedback"'));
assert.ok(app.includes(':"웹 항구 이어하기 완료"'));
assert.ok(app.includes('checkpointFeedback=`웹 항구 임시저장 완료'));

console.log('UW2 source-SHA scoped web-only town checkpoint save/load and original source isolation: PASS');
