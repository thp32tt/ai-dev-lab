import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
const cpu=new RealMode8086();
const events=[];
cpu.installMemoryWriteObserver(e=>{assert.ok(Object.isFrozen(e));events.push(e);});
cpu.write8(0xa000,0x0000,0x7f);
cpu.write16(0xa000,0xffff,0x1234);
assert.deepEqual(events,[
 {segment:0xa000,offset:0,physical:0xa0000,value:0x7f,previous:0},
 {segment:0xa000,offset:0xffff,physical:0xaffff,value:0x34,previous:0},
 {segment:0xa000,offset:0,physical:0xa0000,value:0x12,previous:0x7f}
]);
assert.equal(cpu.read8(0xa000,0),0x12);
assert.equal(cpu.read8(0xa000,0xffff),0x34);
assert.throws(()=>cpu.installMemoryWriteObserver(()=>{}),/single synchronous callback/);
cpu.removeMemoryWriteObserver();
assert.doesNotThrow(()=>cpu.write8(0xa000,0,0x99));
assert.equal(events.length,3);
const rejecting=new RealMode8086();
rejecting.installMemoryWriteObserver(()=>true);
assert.throws(()=>rejecting.write8(0xa000,0,1),/cannot synthesize values/);
assert.equal(rejecting.read8(0xa000,0),0);
const asynchronous=new RealMode8086();
asynchronous.installMemoryWriteObserver(()=>Promise.resolve());
assert.throws(()=>asynchronous.write8(0xa000,0,1),/async 8086 memory-write observer/);
assert.equal(asynchronous.read8(0xa000,0),0);
// Instruction-level STORE runs through the same real memory bus witness.
const native=new RealMode8086();
native.load(Uint8Array.of(0xb8,0xcd,0xab,0xa3,0,0),0x100,0);
native.set16('CS',0x100);native.set16('DS',0xa000);
const observed=[];
native.installMemoryWriteObserver(e=>observed.push(e) && undefined);
native.step();native.step();
assert.equal(native.read16(0xa000,0),0xabcd);
assert.deepEqual(observed.map(e=>e.value),[0xcd,0xab]);
console.log('UW2 native 8086 original VGA-aperture and regular byte-write passive witness: PASS');
