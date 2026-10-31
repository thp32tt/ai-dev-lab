import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {createBrowserDosChildBridge} from '../web/browser-dos-child-bridge.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const source=Uint8Array.of(
  0xb8,0x00,0x35, // MOV AX,3500h (query missing INT00)
  0xcd,0x21,      // original DOS INT21 AH35
  0xcd,0x66,      // original native INT66
  0xb8,0x00,0x4c,// real DOS AH4C terminate
  0xcd,0x21
);
const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
  CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0,FLAGS:0x202};
const setup=()=>{
 const cpu=new RealMode8086();
 cpu.set16('CS',0x200);cpu.set16('IP',0x9876);
 cpu.set16('SS',0x200);cpu.set16('SP',0xf000);
 cpu.load(source,0x300,0);
 cpu.load(Uint8Array.of(0xcf),0x600,0);
 installDosInt21(cpu);
 return cpu;
};
const vector=Uint8Array.of(0x44,0x22,0x77,0x11);
const cpu=setup(),parent=captureDosCpuFrame(cpu);
const seen=[];
const child=createStagedDosChildContinuation(cpu,{
 initialFrame:frame,maxTotalSteps:20,onBeforeInstruction:({ip})=>{seen.push(ip);},
 pauseOnMissingExternalInterrupts:true
});
const s=child.runSlice(50);
assert.equal(s.reason,'WAIT_EXTERNAL_DOS_IVT_VECTOR');
assert.equal(s.steps,1);
assert.equal(s.sliceSteps,1);
assert.equal(s.waiting.missingInterruptVector,0);
assert.equal(cpu.get16('IP'),3);
assert.deepEqual(seen,[0]);
const frozen=captureDosCpuFrame(cpu);
for(let i=0;i<3;i++){
 const paused=child.runSlice(50);
 assert.equal(paused.sliceSteps,0);
 assert.equal(paused.waiting.missingInterruptVector,0);
 assert.deepEqual(captureDosCpuFrame(cpu),frozen);
 assert.deepEqual(seen,[0]);
}
await assert.rejects(child.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:'0'.repeat(64)
}),/SHA-256 mismatch/);
assert.equal(child.snapshot().waiting.missingInterruptVector,0);
await assert.rejects(child.supplyPinnedDosIvtVector({
 number:1,bytes:vector,expectedSha256:hash(vector)
}),/exact requested IVT vector/);
assert.equal(cpu.interruptVectors.has(0),false);
await child.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:hash(vector)
});
assert.equal(child.snapshot().waiting,null);
assert.equal(cpu.getGuestInterruptVector(0).offset,0x2244);
assert.equal(cpu.getGuestInterruptVector(0).segment,0x1177);
const second=child.runSlice(50);
assert.equal(second.reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
assert.equal(second.waiting.missingInterruptVector,0x66);
assert.equal(second.steps,2);
assert.equal(second.sliceSteps,1);
assert.equal(cpu.get16('IP'),5);
assert.equal(cpu.get16('BX'),0x2244);
assert.equal(cpu.get16('ES'),0x1177);
const intact=captureDosCpuFrame(cpu);
for(let i=0;i<3;i++){
 assert.equal(child.runSlice(100).sliceSteps,0);
 assert.deepEqual(captureDosCpuFrame(cpu),intact);
}
await assert.rejects(child.supplyPinnedDosIvtVector({
 number:0x66,bytes:vector,expectedSha256:hash(vector)
}),/waiting for exact requested IVT vector/);
// A separately supplied native FMDRV driver must install its own handler.
// Only this PRIVATE SYNTHETIC fixture installs an explicit IRET test vector.
cpu.installInterruptVector(0x66,0x600,0);
const done=child.runSlice(50);
assert.equal(done.reason,'TERMINATED');
assert.equal(done.steps,6); // MOV, INT21, INT66, native IRET, MOV, INT21
assert.equal(done.state,'COMPLETED');
assert.equal(done.waiting,null);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.deepEqual(seen,[0,3,5,0,7,10]);
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x600);
// Faults are still permanent; missing unregistered hardware I/O is not
// silently reinterpreted as a resumable external dependency.
const broken=new RealMode8086();
broken.set16('CS',0x500);broken.load(Uint8Array.of(0xec),0x500,0);
const failed=createGuestOriginalExecutionSession(broken);
assert.throws(()=>failed.runSlice(3),/no device adapter/);
assert.equal(failed.snapshot().faulted,true);
assert.throws(()=>failed.runSlice(3),/cannot resume/);
// The browser's same original DOS child must keep its trusted key binding
// across an external DOS-vector wait, then detach only after true termination.
const listeners=new Map();let removes=0;
const target={
 addEventListener(kind,fn){listeners.set(kind,fn);},
 removeEventListener(kind,fn){
  if(listeners.get(kind)===fn){listeners.delete(kind);removes++;}
 }
};
const browserCpu=setup();
browserCpu.set16('CS',0x250);
const originalParent=captureDosCpuFrame(browserCpu);
const bridge=createBrowserDosChildBridge({cpu:browserCpu,target,
 initialFrame:frame,maxTotalSteps:20,pauseOnMissingExternalInterrupts:true});
assert.equal(bridge.runSlice(20).reason,'WAIT_EXTERNAL_DOS_IVT_VECTOR');
assert.equal(listeners.has('keydown'),true);
assert.equal(bridge.snapshot().detached,false);
await bridge.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:hash(vector)
});
assert.equal(bridge.runSlice(20).reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
browserCpu.installInterruptVector(0x66,0x600,0);
assert.equal(bridge.runSlice(20).reason,'TERMINATED');
assert.deepEqual(captureDosCpuFrame(browserCpu),originalParent);
assert.equal(bridge.snapshot().detached,true);
assert.equal(listeners.size,0);
assert.equal(removes,1);
await assert.rejects(bridge.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:hash(vector)
}),/not active/);
console.log('UW2 original native session DOS AH35/INT66 source waits and SHA-pinned browser child continuation: PASS (synthetic)');

// Compatibility: explicit opt-in is required. The existing original OPEN
// probe's default missing-vector fault remains fail-closed and not resumable.
const legacy=setup();
for(const name of ['CS','DS','ES','SS','IP','AX','BX','CX','DX','SP','BP','SI','DI','FLAGS'])
 legacy.set16(name,frame[name]);
const oldSession=createGuestOriginalExecutionSession(legacy,{maxTotalSteps:10});
assert.throws(()=>oldSession.runSlice(5),/unknown initial DOS interrupt vector 00h/);
assert.equal(oldSession.snapshot().faulted,true);
assert.throws(()=>createGuestOriginalExecutionSession(new RealMode8086(),{
 pauseOnMissingExternalInterrupts:'yes'
}),/opt-in must be boolean/);

// Independent selection of external prerequisites is source-gated, never
// a blanket bypass of an actually unsupported INT instruction.
const onlyDos=new RealMode8086();
onlyDos.load(Uint8Array.of(0xcd,0x66),0x500,0);
onlyDos.set16('CS',0x500);
const dosOnly=createGuestOriginalExecutionSession(onlyDos,{
 pauseOnMissingDosIvt:true,pauseOnMissingGuestInterrupt:false
});
assert.throws(()=>dosOnly.runSlice(2),/unknown initial DOS interrupt vector|no installed|not registered|unowned|unsupported|unknown/i);
assert.equal(dosOnly.snapshot().faulted,true);
const onlyExternal=new RealMode8086();
onlyExternal.load(Uint8Array.of(0xcd,0x66),0x500,0);
onlyExternal.set16('CS',0x500);
const externalOnly=createGuestOriginalExecutionSession(onlyExternal,{
 pauseOnMissingGuestInterrupt:true,pauseOnMissingDosIvt:false
});
assert.equal(externalOnly.runSlice(3).reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
assert.equal(externalOnly.snapshot().totalExecutedSteps,0);
