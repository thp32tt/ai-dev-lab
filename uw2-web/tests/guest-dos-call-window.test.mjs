import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createGuestDosCallWindow} from '../web/guest-dos-call-window.js';

// Actual native 8086 INT 21h instruction execution, with synthetic DOS
// adapter. History is attempts only; it does not report service success.
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xcd,0x21,0xcd,0x21,0xcd,0x21,0xcd,0x21,
  0xcd,0x21),0x280,0x100);
cpu.set16('CS',0x280);cpu.set16('IP',0x100);
cpu.installInterruptAdapter(0x21,()=>undefined);
const win=createGuestDosCallWindow({maxEvents:3});
assert.deepEqual(win.summarize().calls,[]);
for(let i=0;i<5;i++){
  cpu.set8('AH',0x30+i);cpu.set8('AL',0x80+i);
  win.observe({ah:cpu.get8('AH'),al:cpu.get8('AL'),
    cs:cpu.get16('CS'),ip:cpu.get16('IP')},cpu);
  cpu.step();
}
const result=win.summarize();
assert.equal(result.totalCalls,5);
assert.equal(result.discardedCalls,2);
assert.equal(result.calls.length,3);
assert.deepEqual(result.calls.map(x=>[x.ah,x.al,x.ip]),[
  [0x32,0x82,0x104],[0x33,0x83,0x106],[0x34,0x84,0x108]
]);
assert.equal(cpu.get16('IP'),0x10a);
assert.ok(Object.isFrozen(result));
assert.ok(Object.isFrozen(result.calls));
assert.ok(Object.isFrozen(result.calls[0]));
assert.ok(!JSON.stringify(result).includes('binary'));
assert.throws(()=>win.observe({ah:0x34,al:0x84,cs:0x280,ip:0x108},cpu),
  /does not match CPU/);
assert.throws(()=>win.observe({ah:0x34,al:0x84,cs:0x280,ip:0x10a},cpu),
  /does not match CPU/);
assert.throws(()=>win.observe({ah:256,al:0,cs:0,ip:0},cpu),
  /bounded unsigned/);
assert.equal(win.summarize().totalCalls,5); // refusals do not mutate history
const one=createGuestDosCallWindow({maxEvents:1});
const real=new RealMode8086();
real.load(Uint8Array.of(0xcd,0x21,0xcd,0x21),0,0);
real.installInterruptAdapter(0x21,()=>undefined);
for(let n=0;n<2;n++){
  one.observe({ah:0,al:0,cs:0,ip:real.get16('IP')},real);
  real.step();
}
assert.equal(one.summarize().totalCalls,2);
assert.equal(one.summarize().discardedCalls,1);
assert.equal(one.summarize().calls[0].ip,2);
for(const bad of [0,-1,65537,1.5,Infinity])
  assert.throws(()=>createGuestDosCallWindow({maxEvents:bad}),/capacity/);
console.log('UW2 bounded real guest DOS INT21 attempted-call history: PASS');
