import assert from 'node:assert/strict';
import {SeaRuntime} from '../web/world-map.js';
import {saveNativeSeaCheckpoint,loadNativeSeaCheckpoint,
 restoreNativeSeaRuntime,validateNativeSeaCheckpoint,
 NATIVE_SEA_CHECKPOINT_KEY,NATIVE_CHECKPOINT_CHOICE_KEY}
 from '../web/native-sea-checkpoint.js';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {validNativeSeaMotion} from '../web/native-sea-motion.js';
const cells=new Uint8Array(1080*540),quad=new Uint8Array(1024);
const assets={cells,quad};
const sourceSha256='b'.repeat(64);
const port={id:0,mapId:0,name:'original port',x:288,y:240,nation:5};
const original={index:1,heroId:0,heroName:'hero',memo:'original',
 money:100,port:0,portName:port.name,
 portWorld:{x:288,y:240,nation:5},raw:{page:33340},
 fleet:{ships:[{oared:false,currentCrew:50}]},
 dateTime:{year:1522,month:7,day:6,timeTick:49,hour:16,minute:20}};
const session=structuredClone(original);
const runtime=new SeaRuntime(assets,{x:286,y:238},null,
 7,session.fleet,session.dateTime);
runtime.heading=2;
runtime.tick();runtime.tick();runtime.tick();
session.dateTime={...runtime.dateTime};
const sea=runtime.snapshot();
const map=new Map();
const storage={setItem:(k,v)=>map.set(k,v),getItem:k=>map.get(k)??null};
const deps={storage,sourceSha256,sourceSlots:[undefined,original],
 worldAssets:assets,portCatalog:[port]};
const result=await saveNativeSeaCheckpoint({...deps,session,sea});
assert.equal(result.stored,true);assert.equal(result.index,1);
assert.equal(result.fidelity,'BROWSER_NATIVE_SEA_ONLY__DOS_SAVE_UNTESTED');
const restored=await loadNativeSeaCheckpoint(deps);
assert.deepEqual(restored.session,session);
assert.equal(restored.sea.x,sea.x);
assert.equal(restored.sea.heading,2);
assert.equal(restored.sea.ticks,3);
const resumed=restoreNativeSeaRuntime({...restored,worldAssets:assets});
assert.equal(resumed.x,sea.x);assert.equal(resumed.y,sea.y);
assert.equal(resumed.heading,sea.heading);
assert.equal(resumed.accX,sea.accX);assert.equal(resumed.accY,sea.accY);
assert.equal(resumed.ticks,sea.ticks);
assert.equal(resumed.snapshot().month,sea.month);
assert.deepEqual(original.dateTime,{year:1522,month:7,day:6,
 timeTick:49,hour:16,minute:20});
const wrongCatalog=[{...port,name:'other slot'}];
await assert.rejects(loadNativeSeaCheckpoint({...deps,
 portCatalog:wrongCatalog}),/port provenance invalid/);
const fromOwnSource=await loadNativeSeaCheckpoint({...deps,
 portCatalog:wrongCatalog,portCatalogForSlot:i=>{
 assert.equal(i,1);return [port];
}});
assert.equal(fromOwnSource.portCatalog[0].name,port.name);
const saved=map.get(NATIVE_SEA_CHECKPOINT_KEY);
const record=JSON.parse(saved);record.payload.sea.heading=9;
map.set(NATIVE_SEA_CHECKPOINT_KEY,JSON.stringify(record));
await assert.rejects(loadNativeSeaCheckpoint(deps),/checksum mismatch/);
map.set(NATIVE_SEA_CHECKPOINT_KEY,saved);
assert.equal(validNativeSeaMotion(sea,assets),true);
for(const value of [-1,60,1.5,1000000000]){
 const malformed={...sea,accX:value};
 assert.equal(validNativeSeaMotion(malformed,assets),false);
 assert.throws(()=>validateNativeSeaCheckpoint({
  version:1,kind:'native-sea',sourceSha256,session,sea:malformed
 },deps),/position\/tick\/clock/);
 assert.throws(()=>restoreNativeSeaRuntime({
  session,sea:malformed,worldAssets:assets
 }),/source invalid/);
 // A locally recomputed SHA is not original-game provenance: the loader
 // must reject a source-invalid motion even after checksum recomputation.
 const forged=JSON.parse(saved);
 forged.payload.sea.accX=value;
 forged.checksum=createHash('sha256')
   .update(JSON.stringify(forged.payload)).digest('hex');
 map.set(NATIVE_SEA_CHECKPOINT_KEY,JSON.stringify(forged));
 await assert.rejects(loadNativeSeaCheckpoint(deps),/position\/tick\/clock/);
}
map.set(NATIVE_SEA_CHECKPOINT_KEY,saved);
const landWorld={cells:new Uint8Array(cells),quad};
landWorld.cells[(sea.y>>1)*1080+(sea.x>>1)]=15;
assert.equal(validNativeSeaMotion(sea,landWorld),false);
assert.throws(()=>restoreNativeSeaRuntime({
 session,sea,worldAssets:landWorld
}),/source invalid/);
assert.throws(()=>validateNativeSeaCheckpoint({
 version:1,kind:'native-sea',sourceSha256,session,sea
},{...deps,worldAssets:landWorld}),/position\/tick\/clock/);
assert.throws(()=>validateNativeSeaCheckpoint({
 version:1,kind:'native-sea',sourceSha256,session,
 sea:{...sea,x:9999}},deps),/position\/tick\/clock/);
assert.throws(()=>restoreNativeSeaRuntime({
 session,sea:{...sea,heading:20},worldAssets:assets
}),/source invalid/);
assert.equal(await loadNativeSeaCheckpoint({...deps,
 storage:{getItem:()=>null}}),null);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('saveNativeSeaCheckpoint({'));
assert.ok(app.includes('loadNativeSeaCheckpoint({'));
assert.ok(app.includes('restoreNativeSeaRuntime({'));
assert.ok(app.includes('storage.setItem(NATIVE_CHECKPOINT_CHOICE_KEY,"sea")'));
assert.equal(NATIVE_CHECKPOINT_CHOICE_KEY,'uw2-web-native-checkpoint-choice-v1');
console.log('UW2 browser-native sea state roundtrip preserves 2D position/heading/accumulator/tick and source SHA: PASS');
