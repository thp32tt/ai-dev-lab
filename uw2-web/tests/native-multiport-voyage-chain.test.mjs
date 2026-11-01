import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buyGoods,currentPortMarket} from '../web/market.js';
import {prepareNativeHarborDeparture} from '../web/native-harbor-departure.js';
import {advanceNativeSeaVoyageStep} from '../web/native-sea-voyage-step.js';
import {prepareNativePortCall} from '../web/native-port-call-transaction.js';
import {findPortCallTarget} from '../web/world-map.js';
import {saveNativeTownCheckpoint,loadNativeTownCheckpoint} from '../web/native-town-checkpoint.js';

// One synthetic, SOURCE-SHAPED end-to-end browser gameplay cycle exercising
// shipping modules, with no DOS interpreter and no copyrighted original bytes.
// It is NOT evidence of original DOS ship speed, ports or economy parity.
const clock={year:1522,month:7,day:6,timeTick:49,hour:16,minute:20};
const mkMeta=rate=>({
 economy:1000,marketId:0,rates:Array(10).fill(rate),
 specialtyGoodsId:255,specialtyEconomyThreshold:0,specialtyBasePrice:0,
 pubDrinkId:0
});
const A={id:39,mapId:39,name:'source A',nation:0,x:100,y:100,
 meta:mkMeta(50)};
const B={id:40,mapId:40,name:'source B',nation:1,x:104,y:100,
 meta:mkMeta(70)};
const catalog=[A,B];
const ports=Array.from({length:101},(_,i)=>[null,null,null,
 ...(i===39||i===40?[{id:3,present:true,x:22,y:51}]:[])]);
const portAssets={maps:Array.from({length:101},()=>new Uint8Array(96*96)),
 chipNo:new Uint8Array(100),
 walkBounds:[[0,100,200,250]]};
const world={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const market={markets:[{id:0,
 listed:[{slot:0,good:0,name:'정향',basePrice:100,minimumEconomy:0}],
 salePrices:Array(46).fill(100)}]};
const ship=()=>({
 index:0,name:'original-shape ship',oared:true,modelId:18,
 sailType:0,power:100,requiredCrew:5,currentCrew:5,maxCrew:10,
 navigationPercent:100,lookoutPercent:0,navigationLevel:0,
 seamanship:75,tacking:100,capacity:100,cargo:100,load:0,
 water:200,food:200,lumber:0,shot:0,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0}))
});
const original={
 index:1,empty:false,heroId:0,heroName:'source hero',memo:'source',
 raw:{page:33340},port:39,portName:A.name,
 portWorld:{nation:A.nation,x:A.x,y:A.y},
 portState:{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52},
 townActors:[{slot:0,x:10,y:10,type:1,active:true}],
 money:10000,bankBalance:1000,dayFlags:1,
 dateTime:{...clock},portMeta:structuredClone(A.meta),
 fleet:{count:1,totalCrew:5,ships:[ship()]}
};
let active=structuredClone(original);
const trade=buyGoods(active,market,0,0,20);
assert.equal(trade.quantity,20);
assert.equal(trade.cost,2400);
const localRate=active.portMeta.rates[0];
assert.ok(localRate>50);
assert.equal(active.fleet.ships[0].goods[0].quantity,20);
assert.equal(active.money,7600);
const sourceCheckpoint=structuredClone(original);
function depart(session,heading){
 const outcome=prepareNativeHarborDeparture({
  session,worldAssets:world,visitTicks:2
 });
 assert.equal(outcome.allowed,true,outcome.reason);
 assert.notStrictEqual(outcome.session,session);
 assert.equal(outcome.sea.fleet,outcome.session.fleet);
 outcome.sea.heading=heading;
 return {session:outcome.session,sea:outcome.sea};
}
function sailTo(sailing,port){
 const start=sailing.sea.ticks;
 for(let n=0;n<650;n++){
  const match=findPortCallTarget(sailing.sea.snapshot(),catalog);
  if(match?.id===port.id){
   const arrived=prepareNativePortCall({
    session:sailing.session,runtime:sailing.sea,
    portCatalog:catalog,portDoors:ports,portAssets
   });
   assert.equal(arrived.allowed,true,arrived.reason);
   assert.equal(arrived.session.portCatalogId,port.id);
   assert.equal(arrived.town.slot,arrived.session);
   assert.ok(sailing.sea.ticks>start,'must advance real source-shaped sea ticks');
   return arrived;
  }
  const step=advanceNativeSeaVoyageStep({
   session:sailing.session,runtime:sailing.sea
  });
  assert.equal(step.advanced,true,step.reason);
  sailing={session:step.session,sea:step.sea};
 }
 assert.fail('synthetic sea voyage never reached '+port.name);
}
const first=sailTo(depart(active,2),B);
assert.equal(first.session.portMeta.rates[0],70);
assert.deepEqual(first.session.townActors,[]);
assert.deepEqual(first.session.portActorMemory['39'].actors,original.townActors);
assert.equal(first.session.portEconomyHistory['39'].meta.rates[0],localRate);
assert.equal(first.session.money,7600);
const second=sailTo(depart(first.session,6),A);
assert.equal(second.session.portMeta.rates[0],localRate);
assert.deepEqual(second.session.townActors,original.townActors);
assert.equal(second.session.fleet.ships[0].goods[0].quantity,20);
assert.equal(second.session.money,7600);
assert.equal(currentPortMarket(second.session,market).rates[0],localRate);
assert.equal(sourceCheckpoint.portMeta.rates[0],50);
assert.equal(sourceCheckpoint.money,10000);
// Browser-only checkpoint of the ACTUAL returned town runtime persists BOTH
// historical source NPC and port economy states. Does not modify DOS bytes.
const memory=new Map(),storage={
 setItem:(key,value)=>memory.set(key,value),
 getItem:key=>memory.get(key)??null
};
const dependencies={storage,sourceSha256:'d'.repeat(64),
 sourceSlots:[null,sourceCheckpoint],
 portAssets,portCatalog:catalog};
const stored=await saveNativeTownCheckpoint({
 ...dependencies,session:second.session,town:second.town.snapshot()
});
assert.ok(stored.stored);
const restored=await loadNativeTownCheckpoint(dependencies);
assert.deepEqual(restored.session.portActorMemory,
 second.session.portActorMemory);
assert.deepEqual(restored.session.portEconomyHistory,
 second.session.portEconomyHistory);
assert.deepEqual(restored.session.townActors,original.townActors);
assert.equal(restored.session.portMeta.rates[0],localRate);
assert.equal(restored.session.money,7600);
assert.equal(original.money,10000);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
for(const call of ['buyGoods(selected,marketAssets','prepareNativeHarborDeparture({',
 'advanceNativeSeaVoyageStep({session:selected,runtime:seaRuntime})',
 'prepareNativePortCall({','saveNativeTownCheckpoint({'])
 assert.ok(app.includes(call),'web game integration missing '+call);
console.log('UW2 real module chain: trade -> sea -> other port -> sea -> home source NPC/economy -> browser checkpoint PASS');
