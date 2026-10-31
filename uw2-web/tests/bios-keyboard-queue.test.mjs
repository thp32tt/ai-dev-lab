import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installBiosInt16} from '../web/bios-int16.js';
import {createBiosKeyboardQueue} from '../web/bios-keyboard-queue.js';

// Execute actual 8086 INT16 instructions; only supplied keys enter the FIFO.
const bus=createBiosKeyboardQueue({maxQueuedKeys:2});
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xcd,0x16,0xcd,0x16,0xcd,0x16,0xcd,0x16,
  0xcd,0x16),0x200,0);
cpu.set16('CS',0x200);
const binding=installBiosInt16(cpu,{keyboardQueue:bus});
assert.deepEqual(binding.supportedServices,['INT16-AH01','INT16-AH00']);
cpu.set16('AX',0x01fa);cpu.set16('FLAGS',0x202);
cpu.step(); // Empty status: ZF=1, original AX untouched.
assert.equal(cpu.get16('AX'),0x01fa);
assert.equal(cpu.flag('ZF'),true);
assert.equal(bus.snapshot().pending,0);
const first={ascii:0x0d,scanCode:0x1c};
assert.equal(bus.enqueue(first),1);
first.ascii=0x58; // Mutation after enqueue must not alter already queued key.
assert.equal(bus.enqueue({ascii:0x00,scanCode:0x48}),2);
assert.deepEqual(bus.snapshot().pending,2);
assert.throws(()=>bus.enqueue({ascii:0x41,scanCode:0x1e}),/capacity exceeded/);
assert.deepEqual(bus.snapshot(),{
  pending:2,accepted:2,consumed:0,maxQueuedKeys:2,
  fidelity:'EXTERNAL_KEY_EVENTS_ONLY__BIOS_TIMING_AND_BROWSER_KEY_MAPPING_UNTESTED'
});
cpu.set16('AX',0x0100);cpu.set16('FLAGS',0x247);
cpu.step(); // AH01: multiple peeks must not consume anything.
assert.equal(cpu.get16('AX'),0x1c0d);
assert.equal(cpu.get16('FLAGS'),0x207); // clears ZF only.
assert.equal(bus.snapshot().pending,2);
cpu.set16('AX',0);cpu.set16('FLAGS',0x2c7);
cpu.step(); // AH00: read same oldest key and preserve flags.
assert.equal(cpu.get16('AX'),0x1c0d);
assert.equal(cpu.get16('FLAGS'),0x2c7);
assert.deepEqual(bus.snapshot().pending,1);
cpu.set16('AX',0);cpu.step();
assert.equal(cpu.get16('AX'),0x4800); // Extended-key ASCII zero.
assert.deepEqual(bus.snapshot().pending,0);
cpu.set16('AX',0x0100);cpu.set16('FLAGS',0x202);
cpu.step();
assert.equal(cpu.flag('ZF'),true);
assert.equal(bus.snapshot().accepted,2);
assert.equal(bus.snapshot().consumed,2);
assert.throws(()=>bus.enqueue({ascii:-1,scanCode:4}),/uint8/);
assert.throws(()=>bus.enqueue({ascii:1,scanCode:256}),/uint8/);
assert.throws(()=>bus.enqueue({ascii:1}),/requires explicit/);
assert.throws(()=>bus.enqueue(null),/requires explicit/);
assert.equal(bus.snapshot().pending,0);
for(const capacity of [0,1025,1.5])
  assert.throws(()=>createBiosKeyboardQueue({maxQueuedKeys:capacity}),/bounded capacity/);
assert.throws(()=>installBiosInt16(new RealMode8086(),{
  keyboardQueue:bus,readKey:()=>({})
}),/cannot mix/);
assert.throws(()=>installBiosInt16(new RealMode8086(),{
  keyboardQueue:{checkKey:()=>({available:false})}
}),/checkKey and readKey/);
const empty=new RealMode8086();
empty.load(Uint8Array.of(0xcd,0x16),0,0);
const emptyQueue=createBiosKeyboardQueue();
installBiosInt16(empty,{keyboardQueue:emptyQueue});
empty.set16('AX',0);empty.set16('FLAGS',0x2c3);
assert.throws(()=>empty.step(),/blocking read requires an available key/);
assert.equal(empty.get16('AX'),0);
assert.equal(empty.get16('FLAGS'),0x2c3);
assert.equal(emptyQueue.snapshot().pending,0);
console.log('UW2 source-backed shared BIOS AH01 peek/AH00 dequeue keyboard FIFO 8086 regression: PASS');
