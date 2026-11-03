import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNativeSeaHold} from '../web/native-sea-hold.js';
import {nativeSeaPointerCommand} from '../web/native-canvas-pointer.js';
const jobs=new Map();let serial=0;
const clock={
 setTimeout(fn){const n=++serial;jobs.set(n,{fn,kind:'delay'});return n;},
 clearTimeout(n){jobs.delete(n);},
 setInterval(fn){const n=++serial;jobs.set(n,{fn,kind:'interval'});return n;},
 clearInterval(n){jobs.delete(n);}
};
const fire=kind=>{
 const row=[...jobs.entries()].find(x=>x[1].kind===kind);
 assert.ok(row);if(kind==='delay')jobs.delete(row[0]);row[1].fn();
};
let heading=0,turns=0,voyages=0;
const point={x:400,y:216};
const hold=createNativeSeaHold({clock,onRepeat:p=>{
 const command=nativeSeaPointerCommand(p,{heading});
 if(!command)return false;
 if(command.kind==='turn'){heading=(heading+command.delta+8)%8;turns++;}
 else voyages++;
 return true;
}});
assert.equal(hold.begin(3,point),true);
assert.equal(hold.release(3),false);
assert.equal(hold.consumeClick(),false);
assert.equal(voyages,0);
assert.equal(hold.begin(4,point),true);
assert.equal(hold.release(5),false);
fire('delay');fire('interval');fire('interval');fire('interval');
assert.deepEqual({heading,turns,voyages},{heading:2,turns:2,voyages:2});
assert.equal(hold.release(4),true);
assert.equal(jobs.size,0);
assert.equal(hold.consumeClick(),true);
assert.equal(hold.consumeClick(),false);
hold.begin(9,point);hold.cancel();
assert.equal(jobs.size,0);
const stop=createNativeSeaHold({clock,onRepeat:()=>false});
stop.begin(12,point);fire('delay');
assert.equal(stop.snapshot().armed,false);
assert.equal(jobs.size,0);
assert.throws(()=>createNativeSeaHold({}),/invalid sea hold/);
assert.throws(()=>createNativeSeaHold({onRepeat:()=>{},repeatMs:0}),/invalid sea hold/);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/canvas\.addEventListener\("pointerdown"/);
assert.match(app,/seaHold\.begin\(event\.pointerId,point\)/);
assert.match(app,/if\(seaHold\.consumeClick\(\)\)return/);
assert.match(app,/window\.addEventListener\("pointercancel"/);
assert.match(app,/tickSeaWithBankInterest\(\)/);
console.log('Native WEB sea long press: turn and sail, stop on release/cancel, suppress second click PASS');
