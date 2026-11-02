import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint,
 NATIVE_TOWN_CHECKPOINT_KEY} from '../web/native-town-checkpoint.js';
import {saveNativeSeaCheckpoint,loadNativeSeaCheckpoint,
 NATIVE_SEA_CHECKPOINT_KEY,NATIVE_CHECKPOINT_CHOICE_KEY} from '../web/native-sea-checkpoint.js';
import {nativeCheckpointSlotStorage,recordNativeCheckpointSlot,
 resolveNativeCheckpointLoad,nativeCheckpointSlotKeys,
 NATIVE_CHECKPOINT_LATEST_SLOT_KEY} from '../web/native-checkpoint-slot-bank.js';

const sourceSha256='d'.repeat(64);
const dateTime={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const port={id:0,mapId:0,name:'verified port',x:288,y:240,nation:5};
const portAssets={maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),
 walkBounds:[[0,100,200,250]]};
const worldAssets={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const source=(index,heroId)=>({
 index,heroId,heroName:'hero '+heroId,memo:'original '+index,
 raw:{page:index*33340},money:1000+index,bankBalance:0,
 port:0,portName:port.name,portWorld:{x:288,y:240,nation:5},
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[],fleet:{count:1,totalCrew:5,ships:[{
 index:0,currentCrew:5,maxCrew:10,oared:false,
 cargo:100,capacity:120,load:3,water:60,food:50,lumber:1,shot:1,
 navigationPercent:70,requiredCrew:3,power:50,tacking:70,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0}))
 }]},dateTime:{...dateTime}
});
const ownerA=source(1,0),ownerB=source(2,1);
const slots=[null,ownerA,ownerB];
const map=new Map(),writes=[];
const storage={getItem:key=>map.get(key)??null,
 setItem:(key,value)=>{writes.push(key);map.set(key,value);}};
const deps={storage,sourceSha256,sourceSlots:slots,worldAssets,
 portCatalog:[port],portAssets};
const town=owner=>({
 portId:0,portName:port.name,...owner.portState,
 facing:'down',stepParity:0,talkCounter:0,actors:[],building:null,talk:null
});
const sea=owner=>({
 x:286,y:238,heading:2,steps:2,ticks:3,accX:8,accY:9,
 month:7,dateTime:{...owner.dateTime},lastEvent:'sail',
 flagshipOared:false
});
async function saveTown(owner,amount){
 const session=structuredClone(owner);session.money=amount;
 const result=await saveNativeTownCheckpoint({...deps,
  storage:nativeCheckpointSlotStorage(storage,owner.index,'town',{mirrorLatest:true}),
  session,town:town(owner)});
 storage.setItem(NATIVE_CHECKPOINT_CHOICE_KEY,'town');
 recordNativeCheckpointSlot(storage,result.index,'town');
}
async function saveSea(owner,amount){
 const session=structuredClone(owner);session.money=amount;
 const result=await saveNativeSeaCheckpoint({...deps,
  storage:nativeCheckpointSlotStorage(storage,owner.index,'sea',{mirrorLatest:true}),
  session,sea:sea(owner)});
 storage.setItem(NATIVE_CHECKPOINT_CHOICE_KEY,'sea');
 recordNativeCheckpointSlot(storage,result.index,'sea');
}
await saveTown(ownerA,1200);
assert.equal(resolveNativeCheckpointLoad(storage,1).kind,'town');
assert.equal((await loadNativeTownCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,1).storage})).session.money,1200);
await saveSea(ownerB,2500);
assert.equal(resolveNativeCheckpointLoad(storage,1).kind,'town');
assert.equal(resolveNativeCheckpointLoad(storage,2).kind,'sea');
assert.equal(resolveNativeCheckpointLoad(storage,null).kind,'sea');
assert.equal(resolveNativeCheckpointLoad(storage,null).slot,2);
const first=await loadNativeTownCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,1).storage});
const second=await loadNativeSeaCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,2).storage});
assert.equal(first.session.money,1200);
assert.equal(second.session.money,2500);
assert.equal(first.session.heroId,0);
assert.equal(second.session.heroId,1);
assert.equal(map.get(NATIVE_CHECKPOINT_LATEST_SLOT_KEY),'2');
assert.ok(map.has(nativeCheckpointSlotKeys(1,'town').data));
assert.ok(map.has(nativeCheckpointSlotKeys(2,'sea').data));
assert.equal(JSON.parse(map.get(NATIVE_TOWN_CHECKPOINT_KEY)).payload.session.index,1);
assert.equal(JSON.parse(map.get(NATIVE_SEA_CHECKPOINT_KEY)).payload.session.index,2);
assert.equal(resolveNativeCheckpointLoad(storage,3),null);
assert.deepEqual(ownerA.money,1001);
assert.deepEqual(ownerB.money,1002);
// Same protagonist can replace only THEIR web checkpoint with the newer
// town/sea mode; the other user's record remains intact and loadable.
await saveSea(ownerA,1900);
assert.equal(resolveNativeCheckpointLoad(storage,1).kind,'sea');
assert.equal(resolveNativeCheckpointLoad(storage,2).kind,'sea');
assert.equal((await loadNativeSeaCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,2).storage})).session.money,2500);
assert.equal((await loadNativeSeaCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,1).storage})).session.money,1900);
// A tampered owner copy is rejected by the pre-existing SHA/source checks.
const k=nativeCheckpointSlotKeys(1,'sea').data;
const bad=JSON.parse(map.get(k));
bad.payload.session.heroId=1;
bad.checksum=createHash('sha256').update(JSON.stringify(bad.payload)).digest('hex');
map.set(k,JSON.stringify(bad));
await assert.rejects(loadNativeSeaCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,1).storage}),
 /original save identity invalid/);
map.set(k,JSON.stringify({...bad,checksum:'0'.repeat(64)}));
await assert.rejects(loadNativeSeaCheckpoint({...deps,
 storage:resolveNativeCheckpointLoad(storage,1).storage}),
 /checksum mismatch/);
for(const invalid of [-1,10,NaN,'1',1.5])
 assert.throws(()=>nativeCheckpointSlotKeys(invalid,'town'),/slot\/kind/);
assert.throws(()=>nativeCheckpointSlotKeys(1,'fleet'),/slot\/kind/);
assert.throws(()=>nativeCheckpointSlotStorage(storage,1,'town').setItem('other','bad'),/key\/value/);
assert.throws(()=>resolveNativeCheckpointLoad(storage,10),/active original source slot invalid/);
map.set(nativeCheckpointSlotKeys(2,'town').mode,'unknown');
assert.throws(()=>resolveNativeCheckpointLoad(storage,2),/per-slot checkpoint mode corrupted/);
map.delete(nativeCheckpointSlotKeys(2,'town').mode);
map.set(NATIVE_CHECKPOINT_LATEST_SLOT_KEY,'02');
assert.throws(()=>resolveNativeCheckpointLoad(storage,null),/source slot marker corrupted/);
map.set(NATIVE_CHECKPOINT_LATEST_SLOT_KEY,'2');
// Legacy singleton records from older web ports remain loadable.
const legacy=new Map([[NATIVE_CHECKPOINT_CHOICE_KEY,'town'],
 [NATIVE_TOWN_CHECKPOINT_KEY,map.get(NATIVE_TOWN_CHECKPOINT_KEY)]]);
const legacyStorage={getItem:k=>legacy.get(k)??null,setItem:(k,v)=>legacy.set(k,v)};
const choice=resolveNativeCheckpointLoad(legacyStorage,1);
assert.equal(choice.source,'LEGACY_GLOBAL');
assert.strictEqual(choice.storage,legacyStorage);
assert.equal((await loadNativeTownCheckpoint({...deps,storage:choice.storage})).session.index,1);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/nativeCheckpointSlotStorage\(storage,selected\.index,"town",\{mirrorLatest:true\}\)/);
assert.match(app,/nativeCheckpointSlotStorage\(storage,selected\.index,"sea",\{mirrorLatest:true\}\)/);
assert.match(app,/resolveNativeCheckpointLoad\(storage,activeSlot\)/);
assert.match(app,/recordNativeCheckpointSlot\(storage,result\.index,"town"\)/);
assert.match(app,/recordNativeCheckpointSlot\(storage,result\.index,"sea"\)/);
console.log('UW2 original source 10-slot town/sea browser checkpoint separation, legacy migration and source SHA refusal: PASS');
