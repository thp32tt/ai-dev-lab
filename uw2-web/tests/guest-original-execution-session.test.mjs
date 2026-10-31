import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createBiosKeyboardQueue} from '../web/bios-keyboard-queue.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';

// Native 8086 code waits on an actual externally queued key, resumes at
// exactly the same IP, commits the key byte, then exits by real DOS AH4C.
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(
  0xb4,0x00,        // MOV AH,0
  0xcd,0x16,        // INT16 AH00 (blocking)
  0xa2,0x00,0x02,   // MOV [0200h],AL
  0xb8,0x00,0x4c,   // MOV AX,4C00
  0xcd,0x21         // INT21 AH4C termination
),0x200,0);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);
installDosInt21(cpu);
const queue=createBiosKeyboardQueue();
const session=createGuestOriginalExecutionSession(cpu,{keyboardQueue:queue,maxTotalSteps:8});
const stopped=session.runSlice(5);
assert.equal(stopped.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(stopped.steps,1);
assert.equal(stopped.totalExecutedSteps,1);
assert.equal(cpu.get16('IP'),2);
const repeated=session.runSlice(5);
assert.equal(repeated.steps,0);
assert.equal(repeated.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(cpu.get16('IP'),2);
assert.equal(queue.snapshot().consumed,0);
queue.enqueue({ascii:0x41,scanCode:0x1e});
const done=session.runSlice(8);
assert.equal(done.steps,4);
assert.equal(done.reason,'TERMINATED');
assert.equal(done.totalExecutedSteps,5);
assert.equal(done.remainingSteps,3);
assert.equal(cpu.read8(0x200,0x200),0x41);
assert.equal(queue.snapshot().consumed,1);
assert.ok(Object.isFrozen(done));
assert.ok(Object.isFrozen(session.snapshot()));
assert.equal(session.runSlice(1).steps,0);
assert.equal(session.snapshot().terminated,true);
const waiting=new RealMode8086();
waiting.load(Uint8Array.of(0xb4,0,0xcd,0x16,0x90),0x201,0);
waiting.set16('CS',0x201);
const q2=createBiosKeyboardQueue();
const capped=createGuestOriginalExecutionSession(waiting,{
  keyboardQueue:q2,maxTotalSteps:2
});
assert.equal(capped.runSlice(3).reason,'WAIT_BIOS_INT16_AH00');
assert.equal(waiting.get16('IP'),2);
q2.enqueue({ascii:0x42,scanCode:0x30});
assert.equal(capped.runSlice(3).reason,'TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(waiting.get16('IP'),4);
assert.equal(capped.runSlice(3).steps,0);
assert.equal(waiting.get16('IP'),4);
assert.throws(()=>capped.runSlice(0),/slice must/);
assert.throws(()=>createGuestOriginalExecutionSession({},{
  keyboardQueue:q2}),/requires RealMode8086/);
assert.throws(()=>createGuestOriginalExecutionSession(new RealMode8086(),{
  keyboardQueue:{checkKey:()=>({available:false})}}),/shared external BIOS FIFO/);
const occupied=new RealMode8086();
occupied.installInterruptAdapter(0x16,()=>{});
assert.throws(()=>createGuestOriginalExecutionSession(occupied,{
  keyboardQueue:createBiosKeyboardQueue()}),/already registered/);
for(const budget of [0,-1,15000001,1.5,Infinity])
  assert.throws(()=>createGuestOriginalExecutionSession(new RealMode8086(),{
    keyboardQueue:createBiosKeyboardQueue(),maxTotalSteps:budget
  }),/total step budget/);
console.log('UW2 native original guest execution session wait/resume/total bound and DOS exit: PASS');
