import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createBiosKeyboardQueue} from '../web/bios-keyboard-queue.js';
import {installBiosInt16} from '../web/bios-int16.js';
import {runGuestUntilKeyboardWait} from '../web/guest-bios-keyboard-step.js';
const queue=createBiosKeyboardQueue();
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xb4,0x00,0xcd,0x16,0x90,0xb4,0x00,0xcd,0x16),0x200,0);
cpu.set16('CS',0x200);cpu.set16('IP',0);
installBiosInt16(cpu,{keyboardQueue:queue});
const first=runGuestUntilKeyboardWait(cpu,{keyboardQueue:queue,maxSteps:8});
assert.equal(first.steps,1);assert.equal(first.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(cpu.get16('IP'),2);assert.equal(cpu.get16('AX'),0);
const second=runGuestUntilKeyboardWait(cpu,{keyboardQueue:queue,maxSteps:8});
assert.equal(second.steps,0);assert.equal(cpu.get16('IP'),2);
queue.enqueue({ascii:13,scanCode:0x1c});
const resumed=runGuestUntilKeyboardWait(cpu,{keyboardQueue:queue,maxSteps:2});
assert.equal(resumed.reason,'STEP_BUDGET_EXHAUSTED');assert.equal(resumed.steps,2);
assert.equal(cpu.get16('AX'),0x1c0d);assert.equal(queue.snapshot().pending,0);
assert.equal(cpu.get16('IP'),5);
const later=runGuestUntilKeyboardWait(cpu,{keyboardQueue:queue,maxSteps:8});
assert.equal(later.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(later.steps,1);assert.equal(cpu.get16('IP'),7);
assert.throws(()=>runGuestUntilKeyboardWait(cpu,{keyboardQueue:queue,maxSteps:0}),/budget/);
assert.throws(()=>runGuestUntilKeyboardWait({}, {keyboardQueue:queue}),/requires RealMode8086/);
const cpu2=new RealMode8086();
cpu2.load(Uint8Array.of(0x2e,0xcd,0x16,0x90),0,0);
installBiosInt16(cpu2,{keyboardQueue:queue});
cpu2.set16('AX',0);
const prefixed=runGuestUntilKeyboardWait(cpu2,{keyboardQueue:queue});
assert.equal(prefixed.reason,'WAIT_BIOS_INT16_AH00');assert.equal(cpu2.get16('IP'),0);
console.log('UW2 original guest INT16 AH00 wait/resume without forged BIOS events: PASS');

// The hook must run only for an instruction allowed to start. An empty BIOS
// AH00 is a real wait, not a synthetic instruction or source-progress event.
const waitCpu=new RealMode8086();
waitCpu.load(Uint8Array.of(0xb4,0,0xcd,0x16,0x90),0x220,0);
waitCpu.set16('CS',0x220);
const waitQueue=createBiosKeyboardQueue();
installBiosInt16(waitCpu,{keyboardQueue:waitQueue});
const attempts=[];
const before=({cs,ip},machine)=>{
  assert.ok(Object.isFrozen({cs,ip})===false); // callback input separately validated
  assert.equal(cs,machine.get16('CS'));
  attempts.push(ip);
};
const beforeHook=(frame,machine)=>{
  assert.ok(Object.isFrozen(frame));
  return before(frame,machine);
};
for(let i=0;i<3;i++){
  const boundary=runGuestUntilKeyboardWait(waitCpu,{keyboardQueue:waitQueue,
    maxSteps:4,onBeforeInstruction:beforeHook});
  assert.equal(boundary.reason,'WAIT_BIOS_INT16_AH00');
  assert.equal(boundary.steps,i===0?1:0);
}
assert.deepEqual(attempts,[0]);
assert.equal(waitCpu.get16('IP'),2);
waitQueue.enqueue({ascii:13,scanCode:0x1c});
runGuestUntilKeyboardWait(waitCpu,{keyboardQueue:waitQueue,
  maxSteps:2,onBeforeInstruction:beforeHook});
assert.deepEqual(attempts,[0,2,4]);
const invalidCpu=new RealMode8086();
invalidCpu.load(Uint8Array.of(0x90),0,0);
assert.throws(()=>runGuestUntilKeyboardWait(invalidCpu,{
  keyboardQueue:waitQueue,onBeforeInstruction:()=>123
}),/cannot synthesize execution/);
assert.equal(invalidCpu.get16('IP'),0);
assert.throws(()=>runGuestUntilKeyboardWait(invalidCpu,{
  keyboardQueue:waitQueue,onBeforeInstruction:()=>Promise.resolve()
}),/async guest instruction observer/);
assert.equal(invalidCpu.get16('IP'),0);
