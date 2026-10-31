import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedCom,loadVerifiedMz,inspectMzForLoad} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {installBiosInt10} from '../web/bios-int10.js';
import {installBiosInt16} from '../web/bios-int16.js';
import {installVgaIndexedWriteRecorder} from '../web/vga-indexed-ports.js';
import {installVgaDacWriteRecorder} from '../web/vga-dac-ports.js';
import {installDosInt21} from '../web/dos-int21.js';
import {deliverExternalMaskableIrq} from '../web/guest-irq-boundary.js';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
import {runStagedDosComChild,captureDosCpuFrame} from '../web/dos-com-child-runner.js';

// PRIVATE ORIGINAL KOEI + FMDRV bytes. ALL DOS/BIOS/OPL initial values below
// are explicitly SYNTHETIC. No original DOS reference, child OPEN/MAIN run,
// or sound reproduction is claimed. This test is private-N100-only, NOT CI.
const syntheticIrqStep=process.argv[2]===undefined?2048:Number(process.argv[2]);
const instructionBudget=process.argv[3]===undefined?60000:Number(process.argv[3]);
if(!Number.isInteger(syntheticIrqStep)||syntheticIrqStep<32||syntheticIrqStep>65535)
 throw new RangeError('explicit synthetic IRQ step interval must be 32..65535');
if(!Number.isInteger(instructionBudget)||instructionBudget<5000||instructionBudget>500000)
 throw new RangeError('explicit bounded original OPEN instruction budget required');
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const koei=readFileSync(join(dir,'KOEI.COM'));
const fmdrv=readFileSync(join(dir,'FMDRV.COM'));
const open=readFileSync(join(dir,'OPEN.EXE'));
const opgraph=readFileSync(join(dir,'OPGRAPH.LZW'));
const pinnedOpgraph=await prepareOriginalOpgraphArchive(opgraph,{
 expectedSha256:'f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d',
 expectedPartCount:14,maxFileBytes:1024*1024,maxPartBytes:8*1024*1024,
 maxTotalDecodedBytes:64*1024*1024
});
assert.equal(pinnedOpgraph.totalRecords,108);
assert.equal(pinnedOpgraph.totalDecodedBytes,512912);
const sha=x=>createHash('sha256').update(x).digest('hex');
const koeiSha='81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36';
const fmdrvSha='0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b';
const openSha='f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65';
const cpu=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
const pspKo=new Uint8Array(256),pspFm=new Uint8Array(256),pspOpen=new Uint8Array(256);
pspKo.set([0xcd,0x20]);pspKo.set([0x50,0x02],0x2c);
pspFm.set([0xcd,0x20]);pspOpen.set([0xcd,0x20]);
await loadPinnedDosPsp(cpu,pspKo,{pspSegment:0x200,expectedSha256:sha(pspKo)});
await loadPinnedDosPsp(cpu,pspFm,{pspSegment:0x400,expectedSha256:sha(pspFm)});
await loadPinnedDosPsp(cpu,pspOpen,{pspSegment:0x600,expectedSha256:sha(pspOpen)});
// Pre-stage both original EXEs using the existing SHA-verified loader;
// only after preflight is the parent's KOEI.COM entry restored.
await loadVerifiedCom(cpu,fmdrv,{pspSegment:0x400,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:fmdrvSha});
const openMzHeader=inspectMzForLoad(open);
const openMz=await loadVerifiedMz(cpu,open,{pspSegment:0x600,loadSegment:0x610,
 allocationParagraphs:7000,expectedSha256:openSha});
await loadVerifiedCom(cpu,koei,{pspSegment:0x200,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:koeiSha});
const ivt=new Uint8Array(1024);
for(const [n,seg] of [[0x66,0x900],[0x65,0x910],[0x08,0x920],[0x00,0x930],[0x67,0x940],[0x33,0x950]]){
 ivt[n*4]=0;ivt[n*4+1]=0;
 ivt[n*4+2]=seg&255;ivt[n*4+3]=seg>>>8;
 cpu.load(Uint8Array.of(0xcf),seg,0); // synthetic original handler IRET
}
await installPinnedDosIvtSnapshot(cpu,ivt,{
 expectedSha256:sha(ivt),knownVectors:[0x66,0x65,0x08,0x00,0x67,0x33]});
const observed={biosModes:[],teletype:[],io:[],calls:[],freed:[],resizes:[],resident:[],vgaWrites:[],paletteWrites:[],dacColors:[],pitIrqEdges:[],picWrites:[],originalFileRequests:[],originalDosFileCalls:[],verifiedFileRead:null};
installBiosInt10(cpu,{
 teletype:x=>{observed.teletype.push(x.character);},
 readMode:()=>({mode:3,columns:80,page:0}),
 setMode:({mode})=>{observed.biosModes.push(mode);},
 setPaletteRegister:entry=>{observed.paletteWrites.push({...entry});}
});
installBiosInt16(cpu,{checkKey:()=>({available:false})}); // SYNTHETIC empty keyboard queue
for(const [port,handlers] of [
 [0x43,{out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x40,{out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x61,{in8:()=>0,out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x388,{in8:()=>0,out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x389,{out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x20,{out8:(p,v)=>observed.picWrites.push({port:p,value:v})}]
])cpu.registerIOPort(port,handlers);
const indexedVga=installVgaIndexedWriteRecorder(cpu,{maxWrites:50000,onWrite:event=>{
 if(observed.vgaWrites.length<32)observed.vgaWrites.push({...event});
}});
let syntheticVgaStatusReads=0;
cpu.registerIOPort(0x3da,{in8:()=>{
 syntheticVgaStatusReads++;
 return syntheticVgaStatusReads%2===0?0x08:0x00; // synthetic retrace, not measured
}});
const vgaDac=installVgaDacWriteRecorder(cpu,{maxColors:20000,onColor:e=>{
 if(observed.dacColors.length<32)observed.dacColors.push({...e});
}});
const fmdrvChildFrame={
 AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202
};
let pendingRead=null;
let activePsp=0x200;
let fmdrvRun=null,openGuestFault=null,openStarted=false;
const openChildFrame={
 AX:0,CX:0,DX:0,BX:0,SP:openMzHeader.sp,BP:0,SI:0,DI:0,
 CS:openMz.entryCS,DS:0x600,ES:0x600,
 SS:(0x610+openMzHeader.ss)&0xffff,IP:openMz.entryIP,FLAGS:0x202
};
const syntheticStatuses={
 'OPEN.EXE':{terminationType:0,returnCode:0},
 'MAIN.EXE':{terminationType:0,returnCode:1},
 'END.EXE':{terminationType:0,returnCode:0}
};
installDosInt21(cpu,{
 pspSegment:()=>activePsp,
 stayResident:request=>{
  if(activePsp!==0x400||request.pspSegment!==0x400||
     request.paragraphs!==0x26||request.returnCode!==1)
    throw new Error('unexpected actual FMDRV TSR owner request');
  observed.resident.push({...request});return {resident:true};
 },
 executeChild:request=>{
  if(request.parameterBlockSegment!==0x200)
    throw new Error('KOEI DOS EXEC child parameter block segment mismatch');
  if(request.filename==='FMDRV.COM'){
    if(fmdrvRun)throw new Error('FMDRV executed twice');
    const parentFrame=captureDosCpuFrame(cpu);
    activePsp=0x400;
    try{
      fmdrvRun=runStagedDosComChild(cpu,{initialFrame:fmdrvChildFrame,maxSteps:80000});
    }finally{activePsp=0x200;}
    if(JSON.stringify(captureDosCpuFrame(cpu))!==JSON.stringify(parentFrame))
      throw new Error('parent CPU state corrupted by DOS child');
    observed.calls.push({file:request.filename,status:fmdrvRun.terminationType});
    return {terminationType:fmdrvRun.terminationType,returnCode:fmdrvRun.returnCode};
  }
  if(request.filename==='OPEN.EXE'){
    openStarted=true;activePsp=0x600;
    try{runStagedDosComChild(cpu,{initialFrame:openChildFrame,maxSteps:instructionBudget,
      onInstructionBoundary:({steps,cs,ip},guest)=>{
        if(pendingRead!==null){
          const readCount=guest.get16('AX');
          if(readCount!==256||pendingRead.requested!==256)
            throw new Error('unexpected original OPEN 256-byte DOS read receipt');
          const actual=new Uint8Array(readCount);
          for(let i=0;i<readCount;i++)actual[i]=guest.read8(pendingRead.segment,(pendingRead.offset+i)&65535);
          const expected=opgraph.subarray(16,16+readCount);
          if(!actual.every((value,i)=>value===expected[i]))
            throw new Error('original OPEN DOS RAM bytes differ from pinned OPGRAPH.LZW +16');
          observed.verifiedFileRead={readCount,fileOffset:16,
            sha256:sha(actual)};
          pendingRead=null;
        }
        if(observed.originalDosFileCalls.length<64&&
           guest.read8(cs,ip)===0xcd&&guest.read8(cs,(ip+1)&0xffff)===0x21&&
           [0x3d,0x3f,0x42,0x3e].includes(guest.get8('AH'))){
          observed.originalDosFileCalls.push({steps,ah:guest.get8('AH'),
            al:guest.get8('AL'),bx:guest.get16('BX'),cx:guest.get16('CX'),dx:guest.get16('DX')});
          if(guest.get8('AH')===0x3f)
            pendingRead={segment:guest.get16('DS'),offset:guest.get16('DX'),requested:guest.get16('CX')};
        }
        if(steps>0&&steps%syntheticIrqStep===0){
          const x=deliverExternalMaskableIrq(guest,{vector:8,
            source:'SYNTHETIC_FIXED_STEP_IRQ0_NOT_REAL_PIT_CLOCK'});
          observed.pitIrqEdges.push({steps,delivered:x.delivered});
        }
      }
    });}
    catch(error){openGuestFault={message:error.message,
      cs:error.guestCS,ip:error.guestIP,steps:error.guestSteps,
      ax:error.guestAX,dx:error.guestDX,bx:error.guestBX,es:error.guestES};throw error;}
    finally{activePsp=0x200;}
    throw new Error('OPEN original unexpectedly terminated without a verified runtime');
  }
  if(!Object.hasOwn(syntheticStatuses,request.filename))
    throw new Error('unknown original child '+request.filename);
  const status=syntheticStatuses[request.filename];
  observed.calls.push({file:request.filename,status:status.terminationType});
  return status;
 },
 freeMemory:({segment})=>{
  observed.freed.push(segment);
  if(![0x250,0x400].includes(segment))
    throw new Error('unobserved synthetic DOS MCB owner '+segment.toString(16));
  return {freed:true};
 },
 resizeMemory:({segment,paragraphs})=>{
  observed.resizes.push({segment,paragraphs});
  if(!((segment===0x200&&paragraphs===0x7a)||
       (segment===0x600&&paragraphs===6566)))
    throw new Error('unobserved synthetic KOEI/OPEN PSP shrink');
  return {resized:true};
 },
 getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
 getCurrentDrive:()=>({drive:2}), // EXPLICIT SYNTHETIC C:, NOT actual DOS drive state
 resetDisk:()=>{}, // EXPLICIT synthetic disk reset acknowledgment; no DOS cache emulation
 allocateMemory:({paragraphs})=>{
  if(paragraphs!==0x1000)
    throw new Error('unexpected original OPEN DOS AH48 memory size '+paragraphs);
  // EXPLICIT synthetic nonoverlapping DOS allocation. No MCB is guessed.
  return {segment:0x3000};
 },
 readOriginalFile:request=>{
   observed.originalFileRequests.push(request.filename);
   return pinnedOpgraph.resolveDosFile(request);
 }, // only verified original C:OPGRAPH.LZW; all other paths get DOS file-not-found
 getDeviceInfo:({handle})=>{
   if(handle>4)throw new Error('OPEN original requested unobserved DOS handle');
   return {deviceInfo:0x80d3}; // SYNTHETIC DOS handle flags
 },
 directConsoleIO:event=>{
  if(event.operation==='input')return {available:false};
  if(!['output','string-output'].includes(event.operation))
    throw new Error('unknown original DOS console service');
 }
});
let steps=0,stopped=null;
const trace=[];
for(;steps<3000&&!cpu.terminated;steps++){
 const before={cs:cpu.get16('CS'),ip:cpu.get16('IP'),ax:cpu.get16('AX')};
 try{cpu.step();}
 catch(e){stopped={...before,message:e.message};break;}
 trace.push(before);
 if(trace.length>16)trace.shift();
}
const result={
 original:{koeiSha:sha(koei),fmdrvSha:sha(fmdrv),openSha:sha(open)},
 openStarted,openGuestFault,openMz,
 koeiSteps:steps,fmdrvChild:fmdrvRun,
 observedChildCalls:observed.calls,initialDosEnvironment:'SYNTHETIC',
 installedInt66:cpu.getGuestInterruptVector(0x66),
 initialInt66:{segment:0x900,offset:0},
 originalFmdrvResidency:observed.resident,
 originalPitWrites:observed.io.filter(x=>x.port===0x40||x.port===0x43).slice(0,4),
 originalFileRequests:observed.originalFileRequests,
 originalDosFileCalls:observed.originalDosFileCalls,
 verifiedFileRead:observed.verifiedFileRead,
 pinnedOpgraph:{sha256:'f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d',bytes:opgraph.length,
  parts:pinnedOpgraph.partCount,decodedBytes:pinnedOpgraph.totalDecodedBytes,records:pinnedOpgraph.totalRecords},

 vgaWrites:observed.vgaWrites,vgaWriteCount:indexedVga.writtenCount(),
 paletteWrites:observed.paletteWrites,
 syntheticVgaStatusReads,dacColors:observed.dacColors,dacColorCount:vgaDac.writtenColors(),
 syntheticPitIrqStep:syntheticIrqStep,syntheticPitIrqEdges:observed.pitIrqEdges,originalPicWrites:observed.picWrites,
 koeiModeRequests:observed.biosModes,
 freed:observed.freed,resizes:observed.resizes,
 koeiTerminated:cpu.terminated,stopped,trace,
 fidelity:'THREE_ORIGINAL_EXECUTABLE_BYTECODES__SHARED_CPU_RAM__OPEN_WAIT_BOUNDARY__SYNTHETIC_DOS_DEVICE_STATE__NOT_DOS_REFERENCE'
};
assert.equal(result.original.koeiSha,koeiSha);
assert.equal(result.original.fmdrvSha,fmdrvSha);
assert.ok(fmdrvRun);
assert.equal(fmdrvRun.terminationType,3);
assert.equal(fmdrvRun.returnCode,1);
assert.equal(fmdrvRun.residentParagraphs,0x26);
assert.ok(fmdrvRun.steps>30000);
assert.equal(observed.calls[0].file,'FMDRV.COM');
assert.equal(result.original.openSha,openSha);
assert.equal(openStarted,true);
assert.ok(openGuestFault);
assert.ok(openGuestFault.steps>=syntheticIrqStep);
assert.match(result.fidelity,/NOT_DOS_REFERENCE/);
assert.ok(observed.pitIrqEdges.length>=1);
assert.ok(observed.pitIrqEdges.some(x=>x.delivered));
assert.deepEqual(observed.originalFileRequests.slice(0,1),['C:OPGRAPH.LZW']);
assert.ok(indexedVga.writtenCount()>=6);
assert.ok(vgaDac.writtenColors()>=16);
assert.ok(observed.paletteWrites.length>=16);
assert.ok(observed.dacColors.length>0);
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x400);
assert.equal(result.stopped?.message,openGuestFault.message);
assert.deepEqual(observed.resident,[{pspSegment:0x400,paragraphs:0x26,returnCode:1}]);
console.log(JSON.stringify(result,null,2));
console.log('UW2 original KOEI -> FMDRV -> OPEN MZ external explicitly synthetic IRQ0 original ISR boundary PASS (NOT authentic PIT clock)');
