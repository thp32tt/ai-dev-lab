import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {prepareNativeTownTimeTransition as prepare} from '../web/native-town-time-transaction.js';
const clock=(y=1522,m=7,d=6,t=48)=>({year:y,month:m,day:d,timeTick:t,
 hour:Math.floor(t/3),minute:t%3*20});
const session=(dateTime=clock(),bankBalance=1000,dayFlags=1)=>({
 dateTime,bankBalance,dayFlags,money:123456,heroName:'source',
 raw:new Uint8Array([1,2,3])});
function run(original,kind,ticks){
 const before=structuredClone(original);
 const result=prepare({session:original,kind,ticks});
 assert.deepEqual(original,before,'stage cannot mutate live source');
 return result;
}
let original=session(clock(1522,1,31,70));
let result=run(original,'visit',4);
assert.equal(result.allowed,true,result.reason);
assert.deepEqual(result.updates.dateTime,clock(1522,2,1,2));
assert.equal(result.updates.bankBalance,1030);
assert.equal(result.updates.dayFlags,0);
assert.equal(result.events.length,1);
Object.assign(original,result.updates);
assert.equal(original.bankBalance,1030);
assert.equal(original.dayFlags,0);
assert.equal(original.heroName,'source');
original=session();
result=run(original,'visit',2);
assert.equal(result.allowed,true);
assert.equal(result.events.length,0);
assert.equal(result.updates.dayFlags,1);
assert.equal(Object.hasOwn(result.updates,'lastBankInterest'),false);
original=session(clock(1522,12,31,50),-100);
result=run(original,'lodge');
assert.equal(result.allowed,true,result.reason);
assert.deepEqual(result.updates.dateTime,clock(1523,1,1,24));
assert.equal(result.updates.bankBalance,-110);
assert.equal(result.updates.dayFlags,0);
assert.equal(result.updates.lastBankInterest.interest,-10);
for(const [s,kind,ticks,reason] of [
 [session(clock(9999,12,31,71)),'lodge',undefined,'native-town-calendar-overflow'],
 [session(clock(9999,12,31,71)),'visit',2,'native-town-calendar-overflow'],
 [session(clock(1522,2,30,71)),'lodge',undefined,'native-town-calendar-state-invalid'],
 [session(clock(),1000001),'visit',2,'native-town-calendar-state-invalid'],
 [session(clock(),0,-1),'lodge',undefined,'native-town-calendar-state-invalid'],
 [{...session(),money:-1},'visit',2,'native-town-calendar-state-invalid'],
 [session(),'visit',0,'native-town-visit-ticks-invalid'],
 [session(),'visit',Infinity,'native-town-visit-ticks-invalid'],
 [session(),'inn',undefined,'native-town-calendar-kind-invalid']
 ]){
 const r=run(s,kind,ticks);
 assert.equal(r.allowed,false,reason);
 assert.equal(r.reason,reason);
}
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/prepareNativeTownTimeTransition/);
assert.match(app,/Object\.assign\(selected,prepared\.updates\)/);
assert.match(app,/if\(!lodgeSelected\(\)\)return;/);
assert.match(app,/if\(!advanceSelectedDateTicks\(buildingUi\.visitTicks\)\)return;/);
assert.doesNotMatch(app,/advanceDateTicks\(selected\.dateTime,ticks\)/);
assert.doesNotMatch(app,/lodgeCheckIn\(selected\.dateTime\)/);
console.log('UW2 native town clock/pub/bank visit and lodging atomic transaction: PASS');
