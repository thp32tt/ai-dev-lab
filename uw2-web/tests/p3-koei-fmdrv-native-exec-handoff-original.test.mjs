import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedCom,loadVerifiedMz,inspectMzForLoad} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {installBiosInt10} from '../web/bios-int10.js';
import {installVgaIndexedWriteRecorder} from '../web/vga-indexed-ports.js';
import {installVgaDacWriteRecorder} from '../web/vga-dac-ports.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';
import {createSourceBoundDosExecHandoff} from '../web/guest-dos-exec-handoff.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
// PRIVATE KOREAN ORIGINAL KOEI.COM + FMDRV.COM. Every DOS/BIOS/IVT/port
// initial condition below is explicitly SYNTHETIC and is NOT a DOS
// reference trace. Actual original executable bytes remain private N100.
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const sha=b=>createHash('sha256').update(b).digest('hex');
const ko=readFileSync(join(root,'KOEI.COM'));
const fm=readFileSync(join(root,'FMDRV.COM'));
const originalOpen=readFileSync(join(root,'OPEN.EXE'));
assert.equal(sha(ko),'81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36');
assert.equal(sha(fm),'0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b');
assert.equal(sha(originalOpen),'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
const cpu=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
const pKo=new Uint8Array(256),pFm=new Uint8Array(256);
pKo.set([0xcd,0x20]);pKo.set([0x50,0x02],0x2c);
pFm.set([0xcd,0x20]);
await loadPinnedDosPsp(cpu,pKo,{pspSegment:0x200,expectedSha256:sha(pKo)});
await loadPinnedDosPsp(cpu,pFm,{pspSegment:0x400,expectedSha256:sha(pFm)});
await loadVerifiedCom(cpu,fm,{pspSegment:0x400,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:sha(fm)});
await loadVerifiedCom(cpu,ko,{pspSegment:0x200,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:sha(ko)});
const ivt=new Uint8Array(1024);
for(const [num,segment] of [[0x66,0xe000],[0x65,0xe010],[0x08,0xe020],[0x00,0xe030]]){
 ivt[4*num+2]=segment&255;ivt[4*num+3]=segment>>8;
 cpu.load(Uint8Array.of(0xcf),segment,0);
}
await installPinnedDosIvtSnapshot(cpu,ivt,{
 expectedSha256:sha(ivt),knownVectors:[0x66,0x65,0x08,0x00]
});
installBiosInt10(cpu,{
 teletype:()=>{},readMode:()=>({mode:3,columns:80,page:0}),
 setMode:()=>{},setPaletteRegister:()=>{}
});
const vga=installVgaIndexedWriteRecorder(cpu,{
 maxWrites:50000,onWrite:()=>{}
});
const dac=installVgaDacWriteRecorder(cpu,{
 maxColors:20000,onColor:()=>{}
});
let retrace=0;
cpu.registerIOPort(0x3da,{in8:()=>{
 retrace++;return retrace%2===0?8:0; // explicitly synthetic VGA retrace
}});
for(const [port,handlers] of [
 [0x43,{out8:()=>{}}],[0x40,{out8:()=>{}}],
 [0x61,{in8:()=>0,out8:()=>{}}],
 [0x388,{in8:()=>0,out8:()=>{}}],
 [0x389,{out8:()=>{}}]
])cpu.registerIOPort(port,handlers);
let activePsp=0x200;
const handoff=createSourceBoundDosExecHandoff(cpu);
const dos=installDosInt21(cpu,{
 executeChild:handoff.executeChild,
 pspSegment:()=>activePsp,
 stayResident:request=>{
  assert.deepEqual(request,{pspSegment:0x400,paragraphs:0x26,returnCode:1});
  return {resident:true};
 },
 freeMemory:({segment})=>{
  assert.ok([0x250,0x400].includes(segment));
  return {freed:true};
 },
 resizeMemory:({segment,paragraphs})=>{
  assert.ok((segment===0x200&&paragraphs===0x7a)||
    (segment===0x600&&paragraphs===6566));
  return {resized:true};
 },
 getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
 getDeviceInfo:({handle})=>{
   assert.ok(handle<=4);return {deviceInfo:0x80d3};
 },
 directConsoleIO:e=>{
  if(e.operation==='input')return {available:false};
 }
});
const parent=createGuestOriginalExecutionSession(cpu,{
 maxTotalSteps:5000,dosExecHandoff:handoff
});
let first=parent.runSlice(5000);
assert.equal(first.reason,'WAIT_NATIVE_DOS_EXEC_CHILD');
assert.equal(first.waiting.filename,'FMDRV.COM');
const atFirst=captureDosCpuFrame(cpu);
const stepsAtFirst=first.totalExecutedSteps;
for(let i=0;i<2;i++){
 const hold=parent.runSlice(1000);
 assert.equal(hold.steps,0);
 assert.equal(hold.totalExecutedSteps,stepsAtFirst);
 assert.deepEqual(captureDosCpuFrame(cpu),atFirst);
}
activePsp=0x400;
const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202};
const child=createStagedDosChildContinuation(cpu,{initialFrame:frame,
 maxTotalSteps:80000});
handoff.beginChild(child);
let fmResult;
for(let n=0;n<30;n++){
 fmResult=child.runSlice(4000);
 if(fmResult.state!=='ACTIVE')break;
}
assert.equal(fmResult.state,'COMPLETED');
assert.equal(fmResult.steps,30644);
assert.deepEqual(fmResult.result,{
 terminationType:3,returnCode:1,residentParagraphs:0x26
});
assert.deepEqual(captureDosCpuFrame(cpu),atFirst);
activePsp=0x200;
assert.deepEqual(handoff.completeChild(child),{
 terminationType:3,returnCode:1
});
const next=parent.runSlice(5000);
assert.equal(next.reason,'WAIT_NATIVE_DOS_EXEC_CHILD');
assert.equal(next.waiting.filename,'OPEN.EXE');
assert.equal(cpu.terminated,null);
assert.equal(dos.pendingChildStatus(),null);
assert.equal(handoff.snapshot().phase,'WAITING_CHILD');
// Continue inside the SAME suspended original KOEI.COM parent CPU, but
// NEVER forge OPEN termination if 80k original instructions do not exit.
const openInfo=inspectMzForLoad(originalOpen);
const openPsp=new Uint8Array(256);openPsp.set([0xcd,0x20]);
await loadPinnedDosPsp(cpu,openPsp,{
 pspSegment:0x600,expectedSha256:sha(openPsp)
});
const koeiParentFrame=captureDosCpuFrame(cpu);
const image=await loadVerifiedMz(cpu,originalOpen,{
 pspSegment:0x600,loadSegment:0x610,allocationParagraphs:7000,
 expectedSha256:sha(originalOpen)
});
for(const [name,value] of Object.entries(koeiParentFrame))
 cpu.set16(name,value);
activePsp=0x600;
const openFrame={AX:0,BX:0,CX:0,DX:0,SP:openInfo.sp,BP:0,SI:0,DI:0,
 CS:image.entryCS,DS:0x600,ES:0x600,
 SS:(0x610+openInfo.ss)&0xffff,IP:image.entryIP,FLAGS:0x202};
const openChild=createStagedDosChildContinuation(cpu,{
 initialFrame:openFrame,maxTotalSteps:80000
});
handoff.beginChild(openChild);
let openStep;
for(let n=0;n<25;n++){
 openStep=openChild.runSlice(4000);
 if(openStep.state!=='ACTIVE'||openStep.reason==='TOTAL_STEP_BUDGET_EXHAUSTED')break;
}
assert.equal(openStep.state,'ACTIVE');
assert.equal(openStep.reason,'TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(openStep.steps,80000);
assert.equal(openChild.snapshot().result,null);
assert.throws(()=>handoff.completeChild(openChild),/no verified DOS termination result/);
const aborted=openChild.abort();
assert.equal(aborted.state,'ABORTED');
assert.deepEqual(captureDosCpuFrame(cpu),koeiParentFrame);
activePsp=0x200;
assert.equal(handoff.snapshot().phase,'CHILD_ACTIVE');
const stillWaiting=parent.runSlice(1);
assert.equal(stillWaiting.reason,'WAIT_NATIVE_DOS_EXEC_CHILD');
assert.equal(stillWaiting.waiting.filename,'OPEN.EXE');
assert.equal(stillWaiting.steps,0);
assert.equal(dos.pendingChildStatus(),null);
console.log(JSON.stringify({
 result:'ORIGINAL_KOEI_FMDRV_OPEN_SHARED_NATIVE_DOS_EXEC__OPEN_CHILD_HOLD',
 koeiSha:sha(ko),fmdrvSha:sha(fm),openSha:sha(originalOpen),
 firstExecStep:stepsAtFirst,fmdrvNativeSteps:fmResult.steps,
 fmdrvResult:fmResult.result,openExecParentStep:next.totalExecutedSteps,
 openNativeSteps:openStep.steps,openReason:openStep.reason,
 nextFilename:stillWaiting.waiting.filename,
 vgaWrites:vga.writtenCount(),dacColors:dac.writtenColors(),
 fidelity:'PRIVATE_ORIGINAL_THREE_EXECUTABLE_BYTES__SYNTHETIC_DOS_IVT_BIOS_PORTS__OPEN_NOT_TERMINATED'
}));
