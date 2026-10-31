import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {RealMode8086} from './web/realmode-8086.js';
import {loadVerifiedCom,loadVerifiedMz,inspectMzForLoad} from './web/mz-loader.js';
import {loadPinnedDosPsp} from './web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from './web/dos-ivt-snapshot.js';
import {installBiosInt10} from './web/bios-int10.js';
import {installVgaIndexedWriteRecorder} from './web/vga-indexed-ports.js';
import {installVgaDacWriteRecorder} from './web/vga-dac-ports.js';
import {installDosInt21} from './web/dos-int21.js';
import {createStagedDosChildContinuation} from './web/dos-child-continuation.js';
import {captureDosCpuFrame} from './web/dos-com-child-runner.js';
const fsBase='/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD/';
const fm=readFileSync(fsBase+'FMDRV.COM'),open=readFileSync(fsBase+'OPEN.EXE');
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(fm),'0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b');
assert.equal(sha(open),'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
const cpu=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
const pFm=new Uint8Array(256),pOpen=new Uint8Array(256);
pFm.set([0xcd,0x20]);pOpen.set([0xcd,0x20]);
await loadPinnedDosPsp(cpu,pFm,{pspSegment:0x400,expectedSha256:sha(pFm)});
await loadPinnedDosPsp(cpu,pOpen,{pspSegment:0x600,expectedSha256:sha(pOpen)});
await loadVerifiedCom(cpu,fm,{pspSegment:0x400,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:sha(fm)});
const ivt=new Uint8Array(1024);
for(const [n,seg] of [[0x66,0x900],[0x65,0x910],[0x08,0x920],[0x00,0x930],[0x67,0x940]]){
 ivt[n*4+2]=seg&255;ivt[n*4+3]=seg>>>8;
 cpu.load(Uint8Array.of(0xcf),seg,0);
}
await installPinnedDosIvtSnapshot(cpu,ivt,{expectedSha256:sha(ivt),
 knownVectors:[0x66,0x65,0x08,0x00,0x67]});
let vgaCount=0,dacCount=0,modeCount=0,paletteCount=0,portCount=0,tsrCount=0;
installBiosInt10(cpu,{
 teletype:()=>{},readMode:()=>({mode:3,columns:80,page:0}),
 setMode:()=>{modeCount++;},
 setPaletteRegister:()=>{paletteCount++;}
});
for(const [port,handlers] of [
 [0x43,{out8:()=>{portCount++;}}],
 [0x40,{out8:()=>{portCount++;}}],
 [0x61,{in8:()=>0,out8:()=>{portCount++;}}],
 [0x388,{in8:()=>0,out8:()=>{portCount++;}}],
 [0x389,{out8:()=>{portCount++;}}]
])cpu.registerIOPort(port,handlers);
const vga=installVgaIndexedWriteRecorder(cpu,{maxWrites:50000,
 onWrite:()=>{vgaCount++;}});
let retrace=0;
cpu.registerIOPort(0x3da,{in8:()=>{retrace++;return retrace%2?0:8;}});
const dac=installVgaDacWriteRecorder(cpu,{maxColors:20000,onColor:()=>{dacCount++;}});
let activePsp=0x400;
installDosInt21(cpu,{
 pspSegment:()=>activePsp,
 stayResident:request=>{
  assert.deepEqual(request,{pspSegment:0x400,paragraphs:0x26,returnCode:1});
  tsrCount++;return {resident:true};
 },
 getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
 resizeMemory:({segment,paragraphs})=>{
  assert.deepEqual({segment,paragraphs},{segment:0x600,paragraphs:6566});
  return {resized:true};
 },
 getDeviceInfo:({handle})=>{
  assert.ok(handle<=4);return {deviceInfo:0x80d3};
 },
 directConsoleIO:event=>{
  if(event.operation==='input')return {available:false};
 }
});
cpu.set16('CS',0x200);cpu.set16('SS',0x200);cpu.set16('SP',0x1234);
cpu.set16('IP',0x120);cpu.set16('DS',0x200);cpu.set16('ES',0x200);
const parent=captureDosCpuFrame(cpu);
const fmFrame={AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202};
const fmSession=createStagedDosChildContinuation(cpu,{
 initialFrame:fmFrame,maxTotalSteps:80000
});
let fmr;
for(let n=0;n<30;n++){
 fmr=fmSession.runSlice(4000);
 if(fmr.state!=='ACTIVE'||fmr.reason==='TOTAL_STEP_BUDGET_EXHAUSTED')break;
}
assert.equal(fmr.state,'COMPLETED');
assert.equal(fmr.steps,30644);
assert.equal(fmr.result.terminationType,3);
assert.equal(tsrCount,1);
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x400);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
const info=inspectMzForLoad(open);
const loaded=await loadVerifiedMz(cpu,open,{pspSegment:0x600,
 loadSegment:0x610,allocationParagraphs:7000,expectedSha256:sha(open)});
// MZ loader establishes its authentic entry registers; suspend the
// caller's DOS parent frame before creating the child owner.
for(const [name,value] of Object.entries(parent))cpu.set16(name,value);
const openFrame={AX:0,CX:0,DX:0,BX:0,SP:info.sp,BP:0,SI:0,DI:0,
 CS:loaded.entryCS,DS:0x600,ES:0x600,SS:(0x610+info.ss)&65535,
 IP:loaded.entryIP,FLAGS:0x202};
activePsp=0x600;
const openSession=createStagedDosChildContinuation(cpu,{
 initialFrame:openFrame,maxTotalSteps:80000
});
let op=null,problem=null;
try{
 for(let n=0;n<30;n++){
  op=openSession.runSlice(4000);
  if(op.state!=='ACTIVE'||op.reason==='TOTAL_STEP_BUDGET_EXHAUSTED')break;
 }
}catch(e){problem={message:e.message,guestCS:e.guestCS,guestIP:e.guestIP};}
if(!problem&&op.state==='ACTIVE')openSession.abort();
activePsp=0x400;
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x400);
assert.equal(op?.steps,80000);
assert.equal(op?.reason,'TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(problem,null);
assert.equal(vga.writtenCount(),6);
assert.equal(dac.writtenColors(),16);
console.log(JSON.stringify({result:'ORIGINAL_FMDRV_TSR_TO_OPEN_SHARED_CPU',
 shaFMDRV:sha(fm),shaOPEN:sha(open),
 fmdrvSteps:fmr.steps,fmdrvTerminated:fmr.result,
 openStatus:op?.state??null,openSteps:op?.steps??null,
 openReason:op?.reason??null,openFault:problem,
 originalInstalledInt66:cpu.getGuestInterruptVector(0x66),
 video:{modeCount,paletteCount,vgaWrites:vga.writtenCount(),dacColors:dac.writtenColors(),retrace},
 ports:portCount,tsrCount,
 fidelity:'PRIVATE_ORIGINAL_FMDRV_OPEN_BYTES__SYNTHETIC_DOS_IVT_PORTS__NOT_REFERENCE'}));