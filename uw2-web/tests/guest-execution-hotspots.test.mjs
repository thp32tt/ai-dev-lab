import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createGuestExecutionHotspotRecorder} from '../web/guest-execution-hotspots.js';

const loop=new RealMode8086();
loop.set16('CS',0x200);
loop.load(Uint8Array.of(0x90,0xeb,0xfd),0x200,0); // NOP; JMP short -3
const monitor=createGuestExecutionHotspotRecorder({sampleEvery:1,maxSites:4,maxStates:4,top:2});
for(let steps=0;steps<64;steps++){
 monitor.observeInstruction({steps,cs:loop.get16('CS'),ip:loop.get16('IP')},loop);
 loop.step();
}
const summary=monitor.summarize();
assert.equal(summary.boundariesObserved,64);
assert.equal(summary.samples,64);
assert.equal(summary.trackedSites,2);
assert.equal(summary.trackedRegisterStates,2);
assert.equal(summary.repeatedRegisterStateSamples,62);
assert.deepEqual(summary.topSites.map(x=>[x.address,x.visits]),
 [['0200:0000',32],['0200:0001',32]]);
assert.match(summary.completion,/HOLD_/);
assert.equal(summary.topRepeatedRegisterStates[0].visits,32);
assert.ok(Object.isFrozen(summary.topSites));
assert.ok(Object.isFrozen(summary.topSites[0]));
assert.equal(loop.get16('IP'),0);
const sampled=createGuestExecutionHotspotRecorder({startStep:8,sampleEvery:3,maxSites:1,maxStates:1});
for(let steps=0;steps<50;steps++){
 sampled.observeInstruction({steps,cs:loop.get16('CS'),ip:loop.get16('IP')},loop);
 loop.step();
}
const s=sampled.summarize();
assert.equal(s.samples,14); // steps 8,11,...47 only
assert.equal(s.trackedSites,1);
assert.ok(s.untrackedSiteSamples>0); // the other site is intentionally discarded
assert.ok(s.untrackedRegisterStateSamples>0);
assert.equal(s.samples,s.topSites[0].visits+s.untrackedSiteSamples);
// Register changes can invalidate repeats even at the exact same code site.
const evolving=new RealMode8086();
evolving.set16('CS',0x100);
evolving.load(Uint8Array.of(0x41,0xeb,0xfd),0x100,0); // INC CX; JMP short -3
const dynamics=createGuestExecutionHotspotRecorder({sampleEvery:1,maxStates:128});
for(let steps=0;steps<64;steps++){
 dynamics.observeInstruction({steps,cs:evolving.get16('CS'),ip:evolving.get16('IP')},evolving);
 evolving.step();
}
assert.equal(dynamics.summarize().repeatedRegisterStateSamples,0);
const invalid=createGuestExecutionHotspotRecorder({sampleEvery:1});
assert.throws(()=>invalid.observeInstruction({steps:0,cs:0x100,ip:0},loop),
 /boundary does not match live CPU/);
assert.throws(()=>invalid.observeInstruction({steps:0,cs:loop.get16('CS'),ip:loop.get16('IP')},loop),
 /monotonically/);
assert.throws(()=>createGuestExecutionHotspotRecorder({maxSites:0}),/budget/);
assert.throws(()=>createGuestExecutionHotspotRecorder({sampleEvery:0}),/sampling/);
assert.throws(()=>createGuestExecutionHotspotRecorder({maxStates:65537}),/budget/);
assert.throws(()=>createGuestExecutionHotspotRecorder({top:0}),/top/);
console.log('UW2 original guest execution bounded instruction/register hotspot diagnostics synthetic regression: PASS');
