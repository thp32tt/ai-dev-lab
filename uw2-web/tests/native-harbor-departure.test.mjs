import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {prepareNativeHarborDeparture} from '../web/native-harbor-departure.js';

const clock=(year=1522,month=7,day=31,timeTick=70)=>({
 year,month,day,timeTick,hour:Math.floor(timeTick/3),
 minute:(timeTick%3)*20
});
const makeShip=(index=0)=>({
 index,currentCrew:5,maxCrew:10,navigationPercent:100,
 cargo:100,load:30,water:200,food:200,lumber:0,shot:0,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0}))
});
const fixture=()=>({
 index:1,port:39,portWorld:{x:100,y:100,nation:0},
 money:10000,bankBalance:1000,dayFlags:0b10101011,
 dateTime:clock(),rank:0,charm:60,portMeta:{economy:1000,pubDrinkId:0},
 fleet:{count:2,totalCrew:10,ships:[makeShip(),makeShip(1)]}
});
const seaMap=()=>({cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)});
const run=(session,worldAssets=seaMap(),visitTicks=2)=>prepareNativeHarborDeparture({
 session,worldAssets,visitTicks
});
const rejected=(modification,map=seaMap(),duration=2)=>{
 const slot=fixture();modification(slot);
 const before=structuredClone(slot);
 const outcome=run(slot,map,duration);
 assert.equal(outcome.allowed,false,outcome.reason);
 assert.deepEqual(slot,before,'declined departure must not mutate live source-shaped state');
 return outcome.reason;
};

// This is the LIVE port -> sea navigation handler, not an unused helper.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('prepareNativeHarborDeparture({'));
assert.ok(app.includes('startSeaFromPort(ui.visitTicks)'));
assert.ok(app.includes('selected=prepared.session'));
assert.ok(app.includes('seaRuntime=prepared.sea'));
assert.doesNotMatch(app,/advanceSelectedDateTicks\(ui\.visitTicks\);\s*consumeDepartureDay\(selected\)/);

{
 const s=fixture();const before=structuredClone(s);
 const departure=run(s);
 assert.equal(departure.allowed,true);
 assert.ok(departure.sea instanceof SeaRuntime);
 assert.deepEqual(s,before,'preparation cannot mutate active session');
 assert.equal(departure.session.dateTime.day,1);
 assert.equal(departure.session.dateTime.month,8);
 assert.equal(departure.session.dateTime.timeTick,0);
 assert.equal(departure.session.dayFlags,0b10101010);
 assert.equal(departure.session.bankBalance,1030);
 assert.equal(departure.session.lastBankInterest.interest,30);
 assert.equal(departure.session.money,s.money);
 assert.equal(departure.sea.month,8);
 assert.deepEqual(departure.sea.dateTime,departure.session.dateTime);
 assert.strictEqual(departure.sea.fleet,departure.session.fleet);
 assert.deepEqual(departure.session.fleet.ships.map(x=>[x.water,x.food]),
   [[195,195],[195,195]]);
 departure.session.fleet.ships[0].food=0;
 assert.equal(s.fleet.ships[0].food,200);
}
{
 const s=fixture();s.dateTime=clock(1522,12,31,70);
 const after=run(s);
 assert.equal(after.allowed,true);
 assert.deepEqual(after.session.dateTime,clock(1523,1,1,0));
}
{
 const s=fixture();s.dateTime=clock(1522,7,6,30);
 const after=run(s,seaMap(),4);
 assert.equal(after.allowed,true);
 assert.equal(after.session.dateTime.timeTick,34);
 assert.equal(after.session.bankBalance,1000);
 assert.equal(after.session.dayFlags,0b10101011);
}
assert.equal(rejected(()=>{}, {cells:new Uint8Array(1080*540).fill(15),
 quad:new Uint8Array(1024)}),'source-sea-unavailable');
assert.equal(rejected(s=>{s.fleet.ships[1].currentCrew=Infinity;}),
 'invalid-supply-state');
assert.equal(rejected(s=>{for(const sh of s.fleet.ships)sh.water=0;}),
 'no-provisions');
for(const v of [0,1,5,-1,NaN,Infinity,2.5,'2'])
 assert.equal(rejected(()=>{},seaMap(),v),'visit-clock-invalid');
{
 const source=fixture(),before=structuredClone(source);
 const missing=prepareNativeHarborDeparture({session:source,worldAssets:seaMap()});
 assert.equal(missing.allowed,false);
 assert.equal(missing.reason,'visit-clock-invalid');
 assert.deepEqual(source,before);
}
for(const change of [
 s=>{s.dateTime.day=32;},
 s=>{s.dateTime.timeTick=72;},
 s=>{s.dateTime.minute=19;},
 s=>{s.dateTime=clock(9999,12,31,71);}
])assert.equal(rejected(change),'visit-clock-invalid');
for(const change of [
 s=>{s.bankBalance=Infinity;},s=>{s.bankBalance=1000001;},
 s=>{s.dayFlags=-1;}
])assert.equal(rejected(change),'source-session-invalid');
for(const change of [
 s=>{s.portWorld.x=-1;},s=>{s.portWorld.y=1080;},
 s=>{s.port=255;}
])assert.equal(rejected(change),'source-harbor-invalid');
{
 const s=fixture();
 s.fleet.ships[1].currentCrew=0;
 s.fleet.totalCrew=5;
 const original=structuredClone(s);
 const result=run(s);
 assert.equal(result.allowed,false,'every source ship needs navigation crew');
 assert.equal(result.reason,'no-navigation-crew');
 assert.deepEqual(s,original);
}
console.log('UW2 actual native port departure staging, source sea landing, clock, bank and fleet atomicity PASS');
