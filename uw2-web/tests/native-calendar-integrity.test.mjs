import assert from 'node:assert/strict';
import fs from 'node:fs';
import {advanceDateTicks,lodgeCheckIn} from '../web/buildings.js';

const clock=(year=1522,month=7,day=6,timeTick=71)=>({
  year,month,day,timeTick,
  hour:Math.floor(timeTick/3),minute:(timeTick%3)*20
});
const unchanged=(t,run)=>{
  const prior=structuredClone(t);
  assert.equal(run(t),null);
  assert.deepEqual(t,prior);
};
const game=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(game,/prepareNativeTownTimeTransition/);
assert.match(game,/Object\.assign\(selected,prepared\.updates\)/);

{
  const t=clock(1522,7,6,70);
  assert.equal(advanceDateTicks(t,1),t);
  assert.deepEqual(t,clock(1522,7,6,71));
  assert.equal(advanceDateTicks(t,1),t);
  assert.deepEqual(t,clock(1522,7,7,0));
}
{
  const t=clock(1522,4,30,71);
  assert.equal(advanceDateTicks(t,1),t);
  assert.deepEqual(t,clock(1522,5,1,0));
}
{
  const t=clock(1522,2,28,71);
  assert.equal(advanceDateTicks(t,1),t);
  assert.deepEqual(t,clock(1522,3,1,0));
}
{
  const t=clock(1522,12,31,71);
  assert.equal(advanceDateTicks(t,1),t);
  assert.deepEqual(t,clock(1523,1,1,0));
}
{
  const t=clock(1522,12,31,3);
  assert.equal(lodgeCheckIn(t),t);
  assert.deepEqual(t,clock(1523,1,1,24));
}
{
  const t=clock(1522,12,31,71);
  assert.equal(advanceDateTicks(t,72*366),t);
  assert.equal(t.year,1524);
  assert.equal(t.month,1);
  assert.equal(t.day,1);
  assert.equal(t.timeTick,71);
}
// The 9999 bound is already required by the browser checkpoint model.
// Refuse rollover rather than producing an un-restorable live session.
unchanged(clock(9999,12,31,71),t=>advanceDateTicks(t,1));
unchanged(clock(9999,12,31,71),t=>lodgeCheckIn(t));
for(const ticks of [Infinity,NaN,-1,1.5,'1',null,72*366+1]){
  unchanged(clock(),t=>advanceDateTicks(t,ticks));
}
for(const broken of [
  t=>{t.year=1500;},t=>{t.year=10000;},t=>{t.month=13;},
  t=>{t.month=0;},t=>{t.month=2;t.day=30;},
  t=>{t.day=0;},t=>{t.day=1.5;},t=>{t.timeTick=72;},
  t=>{t.timeTick='71';},t=>{t.hour=99;},t=>{t.minute=10;}
]){
  const bad=clock();broken(bad);
  unchanged(bad,t=>advanceDateTicks(t,1));
  unchanged(bad,t=>lodgeCheckIn(t));
}
{
  const t={...clock(1522,7,6,71),originalLabel:'source'};
  assert.equal(advanceDateTicks(t,0),t);
  assert.equal(t.originalLabel,'source');
}
console.log('UW2 shipping native calendar: month/year/inn rollover and atomic invalid-tick refusal PASS');
