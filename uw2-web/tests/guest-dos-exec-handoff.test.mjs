import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {createSourceBoundDosExecHandoff}
 from '../web/guest-dos-exec-handoff.js';
import {createGuestOriginalExecutionSession}
 from '../web/guest-original-execution-session.js';
// This is synthetic 8086 DOS code. All filenames and child bytes are fixture
// data; no claim to run the original KOEI/OPEN files or reference DOS.
const cpu=new RealMode8086();
const parentProgram=Uint8Array.of(
  0xb8,0x00,0x4b, // MOV AX,4B00h
  0xba,0x30,0x00, // MOV DX,0030 filename
  0xbb,0x40,0x00, // MOV BX,0040 parameter offset
  0xcd,0x21,      // native DOS EXEC
  0xb4,0x4d,      // MOV AH,4Dh
  0xcd,0x21,      // actual child status from DOS 4D
  0xa3,0x50,0x00,// MOV [0050],AX
  0xb8,0x00,0x4c,// real DOS AH4C
  0xcd,0x21
);
cpu.load(parentProgram,0x200,0x100);
cpu.load(Uint8Array.from(Buffer.from('FMDRV.COM\0','ascii')),0x200,0x30);
cpu.load(Uint8Array.of(
  0xb8,0x01,0x31, // original-style TSR AX3101h
  0xba,0x26,0,   // DX=0026h
  0xcd,0x21      // real DOS AH31
),0x400,0x100);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);
cpu.set16('ES',0x200);cpu.set16('SS',0x200);
cpu.set16('SP',0xfffe);cpu.set16('IP',0x100);
const handoff=createSourceBoundDosExecHandoff(cpu);
let activePsp=0x200;
const dos=installDosInt21(cpu,{
  executeChild:handoff.executeChild,
  pspSegment:()=>activePsp,
  stayResident:req=>{
    assert.equal(req.pspSegment,0x400);
    assert.equal(req.paragraphs,0x26);
    assert.equal(req.returnCode,1);
    return {resident:true};
  }
});
const parentSession=createGuestOriginalExecutionSession(cpu,{
 maxTotalSteps:30,dosExecHandoff:handoff
});
const wait=parentSession.runSlice(30);
assert.equal(wait.reason,'WAIT_NATIVE_DOS_EXEC_CHILD');
assert.equal(wait.steps,3);
assert.equal(wait.waiting.filename,'FMDRV.COM');
assert.equal(wait.waiting.parameterBlockSegment,0x200);
assert.equal(wait.waiting.parameterBlockOffset,0x40);
assert.equal(cpu.get16('IP'),0x109);
const suspended=captureDosCpuFrame(cpu);
for(let i=0;i<3;i++){
 const retry=parentSession.runSlice(30);
 assert.equal(retry.steps,0);assert.equal(retry.totalExecutedSteps,3);
 assert.deepEqual(captureDosCpuFrame(cpu),suspended);
}
const childFrame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202};
activePsp=0x400;
const child=createStagedDosChildContinuation(cpu,{
 initialFrame:childFrame,maxTotalSteps:10
});
assert.equal(handoff.beginChild(child).phase,'CHILD_ACTIVE');
assert.equal(parentSession.runSlice(30).reason,'WAIT_NATIVE_DOS_EXEC_CHILD');
assert.throws(()=>handoff.completeChild(child),/no verified DOS termination result/);
const childDone=child.runSlice(10);
assert.equal(childDone.state,'COMPLETED');
assert.equal(childDone.result.terminationType,3);
assert.equal(childDone.result.returnCode,1);
assert.equal(childDone.result.residentParagraphs,0x26);
assert.deepEqual(captureDosCpuFrame(cpu),suspended);
activePsp=0x200;
assert.deepEqual(handoff.completeChild(child),{terminationType:3,returnCode:1});
assert.equal(handoff.snapshot().phase,'CHILD_READY');
assert.equal(parentSession.runSlice(30).reason,'TERMINATED');
assert.equal(cpu.terminated.returnCode,0);
assert.equal(cpu.read16(0x200,0x50),0x301);
assert.equal(parentSession.snapshot().totalExecutedSteps,9);
assert.equal(handoff.snapshot().phase,'IDLE');
assert.equal(dos.pendingChildStatus(),null);
assert.throws(()=>handoff.completeChild(child),/exact owned native child/);
assert.throws(()=>createGuestOriginalExecutionSession(new RealMode8086(),{
 dosExecHandoff:handoff
}),/exact native CPU owner/);
console.log('UW2 original-style native DOS 4B EXEC → proven staged TSR → parent 4D status: PASS (synthetic)');
