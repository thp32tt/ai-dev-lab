import assert from 'node:assert/strict';
import fs from 'node:fs';
import {SeaRuntime} from '../web/world-map.js';
import {advanceNativeSeaAuto} from '../web/native-sea-auto.js';

const cells=new Uint8Array(1080*540),quad=new Uint8Array(1024);
const assets={cells,quad};
const dateTime={year:1522,month:7,day:31,timeTick:71,hour:23,minute:40};
const makeRuntime=fleet=>new SeaRuntime(assets,{x:100,y:100},null,7,fleet,dateTime);
const still=makeRuntime(null);
const before=still.snapshot();
const stillMotion=still.projectedVelocity();
assert.ok(stillMotion.x===0&&stillMotion.y===0); // signed zero is motionless
assert.equal(still.hasNetMotion(),false);
let ticks=0;
const blocked=advanceNativeSeaAuto(still,()=>{ticks++;still.tick();});
assert.deepEqual(blocked,{advanced:false,reason:'auto-no-net-motion'});
assert.equal(Object.isFrozen(blocked),true);
assert.equal(ticks,0);
assert.equal(still.snapshot().ticks,before.ticks);
assert.deepEqual(still.dateTime,before.dateTime);
assert.equal(still.lastEvent,'auto-no-net-motion');
// Manual travel/wait is intentionally still permitted and advances the
// game's calendar without pretending an original sea movement occurred.
still.tick();
assert.equal(still.snapshot().ticks,1);
assert.equal(still.snapshot().steps,0);
assert.deepEqual(still.dateTime,{
 year:1522,month:8,day:1,timeTick:0,hour:0,minute:0
});
// Explicit source oared propulsion can proceed even without wind.
const oared={ships:[{index:0,modelId:0,name:'oared',
 oared:true,sailType:0,power:100,navigationPercent:100,
 currentCrew:50,requiredCrew:50,load:0,capacity:100,
 navigationLevel:0,seamanship:75,tacking:100}]};
const moving=makeRuntime(oared);
const velocity=moving.projectedVelocity();
assert.equal(velocity.x,0);
assert.ok(velocity.y<0);
assert.equal(moving.hasNetMotion(),true);
const start=moving.snapshot();
const ok=advanceNativeSeaAuto(moving,()=>{ticks++;moving.tick();});
assert.equal(ok.advanced,true);
assert.equal(ticks,1);
assert.equal(moving.snapshot().ticks,start.ticks+1);
assert.notDeepEqual(moving.dateTime,dateTime);
assert.throws(()=>advanceNativeSeaAuto({},()=>{}),/SeaRuntime/);
assert.throws(()=>advanceNativeSeaAuto(moving,null),/synchronous voyage tick/);
// The actual browser entrypoint must use the same tested guard BEFORE
// the native bank-interest/provision-carrying 220ms callback.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('if (!seaRuntime.hasNetMotion()) {'));
assert.ok(app.includes('advanceNativeSeaAuto(seaRuntime,tickSeaWithBankInterest)'));
assert.ok(app.includes('stopSeaAuto(advance.reason)'));
const refused=advanceNativeSeaAuto(moving,()=>({advanced:false,reason:'native-voyage-clock-invalid'}));
assert.deepEqual(refused,{advanced:false,reason:'native-voyage-clock-invalid'});
assert.equal(moving.lastEvent,'native-voyage-clock-invalid');
console.log('UW2 native browser auto-sail no-net-motion time/provision loop guard: PASS');
