import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';

const child={
 AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202
};
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(
  0xb8,0x66,0x25, // MOV AX,2566h
  0xba,0x40,0x01, // MOV DX,0140h
  0xcd,0x21,      // DOS AH25 set real guest-selected INT66 vector
  0xb8,0x01,0x31, // MOV AX,3101h
  0xba,0x26,0,    // MOV DX,0026h
  0xcd,0x21       // DOS TSR AH31
),0x400,0x100);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);
cpu.set16('SS',0x200);cpu.set16('SP',0x200);
cpu.set16('IP',0x5678);cpu.set16('FLAGS',0x203);
cpu.maskableIrqShadow=1;
const parent=captureDosCpuFrame(cpu);
let tsr=0;
installDosInt21(cpu,{stayResident:request=>{
  assert.deepEqual(request,{pspSegment:0x400,paragraphs:0x26,returnCode:1});
  tsr++;return {resident:true};
},pspSegment:0x400});
const session=createStagedDosChildContinuation(cpu,{
  initialFrame:child,maxTotalSteps:15
});
assert.equal(session.snapshot().state,'ACTIVE');
assert.equal(session.runSlice(2).reason,'SLICE_STEP_BUDGET_EXHAUSTED');
assert.equal(session.snapshot().steps,2);
assert.notDeepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(session.runSlice(1).reason,'SLICE_STEP_BUDGET_EXHAUSTED');
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x400);
assert.equal(cpu.getGuestInterruptVector(0x66).offset,0x140);
assert.equal(session.runSlice(4).reason,'TERMINATED');
assert.equal(session.snapshot().state,'COMPLETED');
assert.equal(session.snapshot().steps,6);
assert.deepEqual(session.snapshot().result,
  {terminationType:3,returnCode:1,residentParagraphs:0x26});
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(cpu.maskableIrqShadow,1);
assert.equal(cpu.terminated,null);
assert.equal(tsr,1);
assert.equal(cpu.getGuestInterruptVector(0x66).offset,0x140);
assert.throws(()=>session.runSlice(1),/not active/);
assert.throws(()=>session.abort(),/not active/);
// Aborting a paused child is explicit and restores parent CPU registers,
// but cannot undo partial RAM/IVT/device side effects.
const abortSession=createStagedDosChildContinuation(cpu,{
  initialFrame:child,maxTotalSteps:10
});
assert.equal(abortSession.runSlice(1).sliceSteps,1);
assert.equal(abortSession.abort().state,'ABORTED');
assert.deepEqual(captureDosCpuFrame(cpu),parent);
const altered=createStagedDosChildContinuation(cpu,{initialFrame:child});
cpu.set16('IP',0x999);
assert.throws(()=>altered.runSlice(1),/ownership\/state changed/);
cpu.set16('IP',0x100);
assert.equal(altered.abort().state,'ABORTED');
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.throws(()=>createStagedDosChildContinuation(cpu,{
 initialFrame:{...child,FLAGS:65536}
}),/uint16/);
console.log('UW2 persistent 8086 DOS child frame, real AH25 vector and AH31 TSR: PASS (synthetic)');
