import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {advanceNativeSeaVoyageStep as voyage} from '../web/native-sea-voyage-step.js';
const date=(y=1522,m=7,d=31,t=71)=>({
 year:y,month:m,day:d,timeTick:t,hour:Math.floor(t/3),minute:t%3*20
});
const ship=(index)=>({
 index,currentCrew:5,maxCrew:20,navigationPercent:100,
 cargo:100,load:5,water:200,food:200,lumber:0,shot:0,
 goods:Array.from({length:5},(_,slot)=>({slot,id:255,quantity:0})),
 oared:true,modelId:0,sailType:0,power:100,requiredCrew:5,
 capacity:100,navigationLevel:0,seamanship:75,tacking:100
});
const world={cells:new Uint8Array(1080*540),quad:new Uint8Array(1024)};
const make=(d=date())=>{
 const session={dateTime:{...d},money:10000,bankBalance:1000,dayFlags:43,
 fleet:{count:2,totalCrew:10,ships:[ship(0),ship(1)]}};
 const runtime=new SeaRuntime(world,{x:100,y:100},null,d.month,
   session.fleet,session.dateTime);
 return {session,runtime};
};
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('advanceNativeSeaVoyageStep({session:selected,runtime:seaRuntime})'));
assert.ok(app.includes('selected=result.session'));
assert.ok(app.includes('seaRuntime=result.sea'));
{
 const p=make(),old=structuredClone(p.session),oldSea=p.runtime.snapshot();
 const a=voyage(p);
 assert.equal(a.advanced,true);
 assert.equal(a.dayChanged,true);
 assert.deepEqual(a.session.dateTime,date(1522,8,1,0));
 assert.deepEqual(a.session.fleet.ships.map(s=>[s.water,s.food]),
   [[195,195],[195,195]]);
 assert.equal(a.session.bankBalance,1030);
 assert.equal(a.session.dayFlags,42);
 assert.equal(a.session.lastBankInterest.interest,30);
 assert.equal(a.session.lastSeaProvisionDate.day,1);
 assert.strictEqual(a.sea.fleet,a.session.fleet);
 assert.equal(a.sea.month,8);
 assert.deepEqual(p.session,old);
 assert.deepEqual(p.runtime.snapshot(),oldSea);
 const b=voyage({session:a.session,runtime:a.sea});
 assert.equal(b.advanced,true);
 assert.equal(b.dayChanged,false);
 assert.deepEqual(b.session.fleet.ships.map(s=>[s.water,s.food]),
   [[195,195],[195,195]]);
 assert.equal(b.session.bankBalance,1030);
 assert.equal(b.session.dateTime.timeTick,1);
}
for(const [from,to] of [[date(1522,12,31,71),date(1523,1,1,0)],
  [date(1522,2,28,71),date(1522,3,1,0)]]){
 const outcome=voyage(make(from));
 assert.equal(outcome.advanced,true);
 assert.deepEqual(outcome.session.dateTime,to);
}
const blocked=(mutate,reason)=>{
 const p=make();mutate(p);
 const before=structuredClone(p.session),oldSea=p.runtime.snapshot();
 const result=voyage(p);
 assert.equal(result.advanced,false);
 assert.equal(result.reason,reason);
 assert.deepEqual(p.session,before);
 assert.deepEqual(p.runtime.snapshot(),oldSea);
};
blocked(p=>{p.session.dateTime.day=2;},'native-voyage-state-invalid');
blocked(p=>{p.runtime.month=9;},'native-voyage-state-invalid');
blocked(p=>{p.runtime.accX=Infinity;},'native-voyage-state-invalid');
blocked(p=>{p.runtime.accX=60;},'native-voyage-state-invalid');
blocked(p=>{p.runtime.accY=-1;},'native-voyage-state-invalid');
blocked(p=>{p.runtime.accY=0.25;},'native-voyage-state-invalid');
blocked(p=>{
 const cells=new Uint8Array(world.cells);
 cells[50*1080+50]=15;
 p.runtime.assets={cells,quad:world.quad};
},'native-voyage-state-invalid');
blocked(p=>{p.session.fleet.ships[1].water=Infinity;},'native-voyage-state-invalid');
blocked(p=>{p.session.bankBalance=1_000_001;},'native-voyage-state-invalid');
blocked(p=>{p.session.dayFlags=256;},'native-voyage-state-invalid');
{
 const p=make(date(9999,12,31,71)),before=structuredClone(p.session);
 const outcome=voyage(p);
 assert.equal(outcome.advanced,false);
 assert.equal(outcome.reason,'native-voyage-clock-invalid');
 assert.deepEqual(p.session,before);
}
{
 const p=make(date(1522,7,6,1));
 p.session.fleet.ships.forEach(sh=>{sh.oared=false;});
 const a=voyage(p);
 assert.equal(a.advanced,true);
 assert.equal(a.moved,false);
 assert.equal(a.sea.steps,0);
 assert.equal(a.sea.ticks,1);
 assert.equal(a.session.dateTime.timeTick,2);
}
console.log('UW2 sea time, source fleet, daily provision and bank interest atomicity: PASS');
