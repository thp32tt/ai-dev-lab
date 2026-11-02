import assert from 'node:assert/strict';
import {validNativeFleetRoster} from '../web/native-fleet-roster.js';
import {loadSupply,unloadSupply,harborDepartureStatus,consumeDepartureDay}
 from '../web/buildings.js';
import {buyGoods} from '../web/market.js';
import {validateNativeCheckpointSessionEconomy} from '../web/native-checkpoint-integrity.js';
import {SeaRuntime} from '../web/world-map.js';
import {advanceNativeSeaVoyageStep} from '../web/native-sea-voyage-step.js';

// The browser's source-shaped crew is duplicated in the fleet summary.
// An otherwise valid ship-0 trade must not mask a divergent companion.
const mkShip=index=>({
 index,currentCrew:5,maxCrew:10,navigationPercent:100,
 cargo:100,load:5,water:200,food:200,lumber:0,shot:0,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0})),
 oared:true,power:100,modelId:0,sailType:0,requiredCrew:5,
 capacity:100,navigationLevel:0,seamanship:75,tacking:100
});
const meta=()=>({economy:1000,marketId:0,rates:Array(10).fill(50)});
const slot=()=>({
 money:10000,bankBalance:1000,dayFlags:1,port:0,
 portMeta:meta(),dateTime:{year:1522,month:7,day:6,timeTick:49,hour:16,minute:20},
 fleet:{count:2,totalCrew:10,ships:[mkShip(0),mkShip(1)]}
});
const world={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const market={markets:[{id:0,listed:[{
 slot:0,good:0,name:'source-shape good',basePrice:100,minimumEconomy:0
 }],salePrices:Array(46).fill(100)}]};
const original=slot();
assert.equal(validNativeFleetRoster(original.fleet),true);
const validSupply=structuredClone(original);
assert.equal(loadSupply(validSupply,0,'food',1).quantity,1);
assert.equal(unloadSupply(validSupply,0,'food',1).quantity,1);
assert.equal(harborDepartureStatus(validSupply).allowed,true);
assert.equal(consumeDepartureDay(validSupply).consumed,true);
assert.equal(buyGoods(slot(),market,0,0,1).quantity,1);
assert.equal(validateNativeCheckpointSessionEconomy(slot(),slot()),true);
const safe=slot(),sea=new SeaRuntime(world,{x:100,y:100},null,
 safe.dateTime.month,safe.fleet,safe.dateTime);
assert.equal(advanceNativeSeaVoyageStep({session:safe,runtime:sea}).advanced,true);

const reject=change=>{
 const session=slot();change(session);
 const before=structuredClone(session);
 assert.equal(validNativeFleetRoster(session.fleet),false);
 assert.equal(loadSupply(session,0,'food',1).quantity,0);
 assert.equal(unloadSupply(session,0,'food',1).quantity,0);
 assert.equal(harborDepartureStatus(session).allowed,false);
 assert.equal(consumeDepartureDay(session).consumed,false);
 assert.equal(buyGoods(session,market,0,0,1).quantity,0);
 assert.throws(()=>validateNativeCheckpointSessionEconomy(session,slot()),
   /economy\/fleet state invalid/);
 const runtime=new SeaRuntime(world,{x:100,y:100},null,
  session.dateTime.month,session.fleet,session.dateTime);
 const snapshot=runtime.snapshot();
 const voyage=advanceNativeSeaVoyageStep({session,runtime});
 assert.equal(voyage.advanced,false);
 assert.equal(voyage.reason,'native-voyage-state-invalid');
 assert.deepEqual(session,before,'all refused commands preserve live original-shaped state');
 assert.deepEqual(runtime.snapshot(),snapshot);
};
reject(s=>{s.fleet.count=1;});
reject(s=>{s.fleet.count=3;});
reject(s=>{s.fleet.totalCrew=9;});
reject(s=>{s.fleet.totalCrew=11;});
reject(s=>{s.fleet.totalCrew='10';});
reject(s=>{s.fleet.ships[1].currentCrew=11;}); // exceeds source maxCrew
reject(s=>{s.fleet.ships[1].maxCrew=-1;});
// Optional summaries are for legacy synthetic adapters only; actual Korean
// save slots carry both fields and are fully checked.
const legacy={ships:[mkShip(0)]};
assert.equal(validNativeFleetRoster(legacy),true);
assert.equal(validNativeFleetRoster({ships:[]}),false);
console.log('UW2 native source fleet count/crew coherence across trade/supply/sea/port/checkpoint: PASS');
