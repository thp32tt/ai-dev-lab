import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint,
 NATIVE_TOWN_CHECKPOINT_KEY} from '../web/native-town-checkpoint.js';
import {saveNativeSeaCheckpoint,loadNativeSeaCheckpoint,
 NATIVE_SEA_CHECKPOINT_KEY} from '../web/native-sea-checkpoint.js';
import {validateNativeCheckpointSessionEconomy,validNativeCheckpointClock}
 from '../web/native-checkpoint-integrity.js';

// Private source bytes are NEVER used in CI. Fixtures follow the source
// fields verified by binary.js and exercise both actual browser checkpoints.
const sourceSha256='c'.repeat(64);
const dateTime={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const ship=()=>({
 index:0,modelId:10,oared:false,currentCrew:10,
 cargo:100,capacity:120,load:3,water:60,food:50,lumber:1,shot:1,
 navigationPercent:70,requiredCrew:30,power:50,tacking:70,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0}))
});
const port={id:0,mapId:0,name:'port',x:288,y:240,nation:5};
const original={
 index:1,heroId:0,heroName:'hero',memo:'original',raw:{page:33340},
 money:350,bankBalance:900,
 dayFlags:1,voyageDay:2,waterRation:3,foodRation:4,
 inventory:Array(20).fill(255),port:0,portName:'port',
 portMeta:{marketId:0,rates:Array(10).fill(50)},
 portWorld:{x:288,y:240,nation:5},
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[],
 fleet:{count:1,ships:[ship()]},dateTime
};
const session=structuredClone(original);
const town={portId:0,portName:'port',...session.portState,
 facing:'down',stepParity:0,talkCounter:0,
 actors:[],building:null,talk:null};
const sea={x:286,y:238,heading:2,steps:0,ticks:0,accX:0,accY:0,
 month:7,dateTime:{...dateTime},lastEvent:'set-sail',flagshipOared:false};
const worldAssets={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const portAssets={maps:[new Uint8Array(96*96)],chipNo:Uint8Array.of(0),
 walkBounds:[[0,100,200,250]]};
const data=new Map();
const storage={setItem:(k,v)=>data.set(k,v),getItem:k=>data.get(k)??null};
const deps={storage,sourceSha256,sourceSlots:[null,original],
 portCatalog:[port],portAssets,worldAssets};
await saveNativeTownCheckpoint({...deps,session,town});
await saveNativeSeaCheckpoint({...deps,session,sea});
const townInitial=data.get(NATIVE_TOWN_CHECKPOINT_KEY);
const seaInitial=data.get(NATIVE_SEA_CHECKPOINT_KEY);
assert.equal((await loadNativeTownCheckpoint(deps)).session.money,350);
assert.equal((await loadNativeSeaCheckpoint(deps)).session.money,350);
assert.equal(validateNativeCheckpointSessionEconomy(session,original),true);
assert.equal(validNativeCheckpointClock(dateTime),true);
for(const bad of [
 {...dateTime,month:2,day:30},
 {...dateTime,month:4,day:31},
 {...dateTime,timeTick:72},
 {...dateTime,hour:4},
])assert.equal(validNativeCheckpointClock(bad),false);
const sha=value=>createHash('sha256').update(value).digest('hex');
const withRecomputedChecksum=(originalText,mutate)=>{
 const record=JSON.parse(originalText);
 mutate(record.payload.session,record.payload);
 record.checksum=sha(JSON.stringify(record.payload));
 return JSON.stringify(record);
};
for(const mutation of [
 s=>{s.money=600000001;},
 s=>{s.money=-1;},
 s=>{s.money=NaN;}, // JSON serializes NaN to null
 s=>{s.money='350';},
 s=>{s.bankBalance=-1000001;},
 s=>{s.bankBalance=1000001;},
 s=>{s.bankBalance='900';},
 s=>{s.dayFlags=256;},
 s=>{s.inventory[0]=999;},
 s=>{s.inventory.pop();},
 s=>{s.fleet.count=2;},
 s=>{s.fleet.ships[0].water=65536;},
 s=>{s.fleet.ships[0].food=-1;},
 s=>{s.fleet.ships[0].load=Infinity;},
 s=>{s.fleet.ships[0].cargo='100';},
 s=>{s.fleet.ships[0].goods[0].id=256;},
 s=>{s.fleet.ships[0].goods[0].quantity=65536;},
 s=>{s.fleet.ships[0].goods[0].slot=3;},
 s=>{s.fleet.ships[0].oared='false';},
 s=>{s.portMeta.rates[2]=NaN;},
 s=>{s.portMeta=null;},
 s=>{s.dateTime={...s.dateTime,month:2,day:31};},
 s=>{s.portActorMemory={'130':{source:'SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER',actors:[]}};},
 s=>{s.portActorMemory={'0':{source:'UNKNOWN',actors:[]}};},
 s=>{s.portActorMemory={'0':{source:'SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER',actors:[{slot:0,x:255,y:10,type:0,active:true}]}};},
 s=>{s.portActorMemory={'0':{source:'SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER',actors:Array(9).fill({slot:0,x:1,y:1,type:0,active:true})}};},
 s=>{s.portEconomyHistory={'100':{source:'SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER',meta:{economy:1000,marketId:0,rates:Array(10).fill(50)}}};},
 s=>{s.portEconomyHistory={'0':{source:'SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER',meta:{economy:-1,marketId:0,rates:Array(10).fill(50)}}};},
 s=>{s.portEconomyHistory={'0':{source:'SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER',meta:{economy:1000,marketId:0,rates:Array(10).fill(256)}}};},
 s=>{s.portEconomyHistory={'0':{source:'unverified',meta:{economy:1000,marketId:0,rates:Array(10).fill(50)}}};}
]){
 const beforeTown=data.get(NATIVE_TOWN_CHECKPOINT_KEY);
 const beforeSea=data.get(NATIVE_SEA_CHECKPOINT_KEY);
 data.set(NATIVE_TOWN_CHECKPOINT_KEY,withRecomputedChecksum(townInitial,mutation));
 data.set(NATIVE_SEA_CHECKPOINT_KEY,withRecomputedChecksum(seaInitial,mutation));
 await assert.rejects(loadNativeTownCheckpoint(deps));
 await assert.rejects(loadNativeSeaCheckpoint(deps));
 // Invalid saved data must never mutate the source slot or baseline fixtures.
 assert.equal(original.money,350);
 data.set(NATIVE_TOWN_CHECKPOINT_KEY,beforeTown);
 data.set(NATIVE_SEA_CHECKPOINT_KEY,beforeSea);
}
data.set(NATIVE_TOWN_CHECKPOINT_KEY,townInitial);
data.set(NATIVE_SEA_CHECKPOINT_KEY,seaInitial);
// An actual native gameplay transaction may change wallet, bank, provisions,
// cargo and crew without changing the original SHA-pinned source record.
const live=structuredClone(session);
live.money=0;
live.bankBalance=-950000;
live.dayFlags=0;
live.inventory[0]=8;
live.fleet.ships[0].water=40;
live.fleet.ships[0].food=20;
live.fleet.ships[0].goods[0]={slot:0,id:2,quantity:6};
live.fleet.ships[0].load=9;
live.portActorMemory={'0':{source:'SOURCE_KOUKAI2_TOWN_ACTORS_CARRIED_IN_BROWSER',
 actors:[{slot:0,x:24,y:52,type:1,active:true}]}};
live.portEconomyHistory={'0':{
 source:'SOURCE_KOUKAI2_PORT_ECONOMY_IN_NATIVE_BROWSER',
 meta:{economy:1000,marketId:0,rates:Array(10).fill(52)}
}};
assert.equal(validateNativeCheckpointSessionEconomy(live,original),true);
await saveNativeTownCheckpoint({...deps,session:live,town});
await saveNativeSeaCheckpoint({...deps,session:live,sea});
assert.deepEqual((await loadNativeTownCheckpoint(deps)).session,live);
assert.deepEqual((await loadNativeSeaCheckpoint(deps)).session,live);
assert.deepEqual(original.fleet.ships[0].goods[0],{slot:0,id:255,quantity:0});
console.log('UW2 town+sea web checkpoints reject malformed gameplay economies even with recomputed local checksum: PASS');
