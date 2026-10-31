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
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
import {installVgaMode12ReadPlaneAdapter} from '../web/vga-mode12-read-adapter.js';
import {createOriginalOpl2WriteBus} from '../web/opl2-raw-write-bus.js';
import {createOriginalPitChannel0WriteBus} from '../web/pit8253-counter0-witness.js';
import {installDosInt21} from '../web/dos-int21.js';
import {deliverExternalMaskableIrq} from '../web/guest-irq-boundary.js';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
import {KOREAN_OPGRAPH_JS_DECODE_EVIDENCE as graphEvidence} from '../web/opgraph-korean-evidence.js';
import {runStagedDosComChild,captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {assertDisjointGuestPhysicalRegions} from '../web/guest-staging-physical-map.js';

// PRIVATE ORIGINAL KOEI + FMDRV bytes. ALL DOS/BIOS/OPL initial values below
// are explicitly SYNTHETIC. No original DOS reference, child OPEN/MAIN run,
// or sound reproduction is claimed. This test is private-N100-only, NOT CI.
const syntheticIrqStep=process.argv[2]===undefined?2048:Number(process.argv[2]);
const instructionBudget=process.argv[3]===undefined?60000:Number(process.argv[3]);
// Explicitly opt-in via fourth CLI argument for evidence-gated VGA reads.
// The synthetic BIOS/IVT baseline remains opt-in and cannot claim DOS parity.
const nativeVgaReadProbe=process.argv[4]==='vga-read-mode0';
if(process.argv[4]!==undefined&&!nativeVgaReadProbe)
 throw new Error('unknown original VGA probe argument: fail closed');
if(!Number.isInteger(syntheticIrqStep)||syntheticIrqStep<32||syntheticIrqStep>65535)
 throw new RangeError('explicit synthetic IRQ step interval must be 32..65535');
if(!Number.isInteger(instructionBudget)||instructionBudget<5000||instructionBudget>15000000)
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
 maxTotalDecodedBytes:64*1024*1024,
 expectedDecodedSha256:graphEvidence.decodedSha256.slice()
});
assert.equal(pinnedOpgraph.totalRecords,108);
assert.equal(pinnedOpgraph.totalDecodedBytes,512912);
assert.equal(pinnedOpgraph.decodedManifestVerified,true);
assert.deepEqual(pinnedOpgraph.parts.map(x=>x.recordCount),graphEvidence.recordCounts);
const sha=x=>createHash('sha256').update(x).digest('hex');
const koeiSha='81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36';
const fmdrvSha='0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b';
const openSha='f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65';
const openMzHeader=inspectMzForLoad(open);
const syntheticIvtStubs=[[0x66,0xe000],[0x65,0xe010],[0x08,0xe020],[0x00,0xe030],[0x67,0xe040],[0x33,0xe050]];
const stagingProof=assertDisjointGuestPhysicalRegions([
 {label:'KOEI PSP',segment:0x200,length:256},
 {label:'KOEI original COM',segment:0x200,offset:256,length:koei.length},
 {label:'FMDRV PSP',segment:0x400,length:256},
 {label:'FMDRV original COM',segment:0x400,offset:256,length:fmdrv.length},
 {label:'OPEN PSP',segment:0x600,length:256},
 {label:'OPEN original MZ image',segment:0x610,length:openMzHeader.imageBytes},
 ...syntheticIvtStubs.map(([number,segment])=>({
  label:'SYNTHETIC IVT handler '+number.toString(16),segment,length:1
 }))
]);
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
const openMz=await loadVerifiedMz(cpu,open,{pspSegment:0x600,loadSegment:0x610,
 allocationParagraphs:7000,expectedSha256:openSha});
await loadVerifiedCom(cpu,koei,{pspSegment:0x200,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:koeiSha});
const ivt=new Uint8Array(1024);
for(const [n,seg] of syntheticIvtStubs){
 ivt[n*4]=0;ivt[n*4+1]=0;
 ivt[n*4+2]=seg&255;ivt[n*4+3]=seg>>>8;
 cpu.load(Uint8Array.of(0xcf),seg,0); // synthetic original handler IRET
}
await installPinnedDosIvtSnapshot(cpu,ivt,{
 expectedSha256:sha(ivt),knownVectors:[0x66,0x65,0x08,0x00,0x67,0x33]});
const observed={biosModes:[],teletype:[],io:[],calls:[],freed:[],resizes:[],resident:[],vgaWrites:[],paletteWrites:[],dacColors:[],pitIrqEdges:[],picWrites:[],originalFileRequests:[],originalDosFileCalls:[],verifiedFileRead:null,originalOplRegisters:[],originalPitReloads:[],fileTransfers:[],verifiedReadBytesTotal:0};
installBiosInt10(cpu,{
 teletype:x=>{observed.teletype.push(x.character);},
 readMode:()=>({mode:3,columns:80,page:0}),
 setMode:({mode})=>{
  observed.biosModes.push(mode);
  // A completed BIOS AH00 may have invalidated old native VRAM and register
  // evidence. Do not re-use the old mode's bytes for an opted-in read probe.
  if(nativeVgaReadProbe)vgaPlaneWitness.invalidateAfterBiosModeSet({mode});
 },
 setPaletteRegister:entry=>{observed.paletteWrites.push({...entry});}
});
installBiosInt16(cpu,{checkKey:()=>({available:false})}); // SYNTHETIC empty keyboard queue
const originalOplBus=createOriginalOpl2WriteBus({
 readStatus:()=>0, // EXPLICIT SYNTHETIC OPL 0388h status; not original chip behavior
 maxRegisterWrites:250000,onRegisterWrite:event=>{
  if(observed.originalOplRegisters.length<128)
   observed.originalOplRegisters.push({...event});
 }});
const originalPitBus=createOriginalPitChannel0WriteBus({
 onReload:event=>{observed.originalPitReloads.push({...event});}
});
cpu.registerIOPort(0x43,originalPitBus.port43);
cpu.registerIOPort(0x40,originalPitBus.port40);
cpu.registerIOPort(0x388,originalOplBus.port388);
cpu.registerIOPort(0x389,originalOplBus.port389);
for(const [port,handlers] of [
 [0x61,{in8:()=>0,out8:(p,v)=>observed.io.push({port:p,value:v})}],
 [0x20,{out8:(p,v)=>observed.picWrites.push({port:p,value:v})}]
])cpu.registerIOPort(port,handlers);
const vgaPlaneWitness=createOriginalVgaMode12PlaneWitness({maxObservedWrites:1000000});
const indexedVga=installVgaIndexedWriteRecorder(cpu,{maxWrites:50000,onWrite:event=>{
 vgaPlaneWitness.noteIndexedRegister(event);
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
const originalLateHotspots=new Map();
let lastLateSamples=[];
const nativePart0Expected=pinnedOpgraph.getDecodedPart(0).bytes;
const nativePartBytes=pinnedOpgraph.parts.map((_,index)=>pinnedOpgraph.getDecodedPart(index).bytes);
const nativeAllPartsRuntimeWitness=nativePartBytes.map((bytes,part)=>({
 part,bytes:bytes.length,maxMatchingPrefix:0,fullMatchStep:null,fullMatchSha256:null
}));
let nativeCurrentPart=0;
const nativePart0RuntimeWitness={sourcePhysical:0x30000,expectedBytes:nativePart0Expected.length,
 maxMatchingPrefix:0,atStep:0,fullMatchStep:null,fullMatchSha256:null};
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
 // Child resource handles follow the test owner's explicitly selected PSP.
 // These PSP assignments remain synthetic, NOT original DOS snapshots.
 getFileProcessPsp:()=>activePsp,
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
        // The original OPEN decoder uses its externally allocated 3000h
        // buffer. Observe its *live* bytes before the next part overwrites it.
        // Never inject decoded bytes: compare guest RAM to independently
        // SHA-pinned JS LS11 part0 output at a bounded instruction cadence.
        if(steps>=200000&&steps%1024===0&&nativePart0RuntimeWitness.fullMatchStep===null){
          let match=0;
          const start=nativePart0RuntimeWitness.sourcePhysical;
          while(match<nativePart0Expected.length&&
            guest.memory[start+match]===nativePart0Expected[match])match++;
          if(match>nativePart0RuntimeWitness.maxMatchingPrefix){
            nativePart0RuntimeWitness.maxMatchingPrefix=match;
            nativePart0RuntimeWitness.atStep=steps;
          }
          if(match===nativePart0Expected.length){
            nativePart0RuntimeWitness.fullMatchStep=steps;
            nativePart0RuntimeWitness.fullMatchSha256=sha(guest.memory.subarray(start,start+match));
          }
        }
        if(steps>=200000&&steps%1024===0){
          const expected=nativePartBytes[nativeCurrentPart];
          const item=nativeAllPartsRuntimeWitness[nativeCurrentPart];
          if(item&&item.fullMatchStep===null){
            let matched=0;
            while(matched<expected.length&&guest.memory[0x30000+matched]===expected[matched])matched++;
            if(matched>item.maxMatchingPrefix)item.maxMatchingPrefix=matched;
            if(matched===expected.length){
              item.fullMatchStep=steps;
              item.fullMatchSha256=sha(guest.memory.subarray(0x30000,0x30000+matched));
            }
          }
        }
        if(steps>=205000){
          const key=cs.toString(16).padStart(4,'0')+':'+ip.toString(16).padStart(4,'0');
          originalLateHotspots.set(key,(originalLateHotspots.get(key)||0)+1);
          if(steps%4096===0&&lastLateSamples.length<32)
            lastLateSamples.push({steps,cs,ip,ax:guest.get16('AX'),flags:guest.get16('FLAGS')});
        }
        if(observed.originalDosFileCalls.length<64&&
           guest.read8(cs,ip)===0xcd&&guest.read8(cs,(ip+1)&0xffff)===0x21&&
           [0x3d,0x3f,0x42,0x3e].includes(guest.get8('AH'))){
          observed.originalDosFileCalls.push({steps,ah:guest.get8('AH'),
            al:guest.get8('AL'),bx:guest.get16('BX'),cx:guest.get16('CX'),dx:guest.get16('DX')});
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
 onFileEvent:(event,guest)=>{
   // Synthetic PSP=0600h is supplied by this test owner, never inferred
   // from OPEN's far CS or its resource buffer DS.
   if(event.psp!==0x600)
     throw new Error('original OPEN file event crossed a foreign PSP');
   if(observed.fileTransfers.length>=1024)
     throw new Error('original DOS OPGRAPH file transfer trace budget exceeded');
   observed.fileTransfers.push({...event});
   if(event.operation!=='read')return;
   const candidate=pinnedOpgraph.parts.findIndex(x=>event.fileOffset>=x.offset&&event.fileOffset<x.offset+x.compSize);
   if(candidate>=0)nativeCurrentPart=candidate;
   if(event.filename!=='C:OPGRAPH.LZW')
     throw new Error('unexpected original DOS file source path');
   const expected=opgraph.subarray(event.fileOffset,event.fileOffset+event.readBytes);
   if(expected.length!==event.readBytes)
     throw new Error('original DOS file read outside source file');
   const actual=Uint8Array.from(guest.memory.subarray(event.physical,event.physical+event.readBytes));
   if(actual.length!==event.readBytes||actual.some((value,i)=>value!==expected[i]))
     throw new Error('original DOS file transfer differs from verified OPGRAPH source bytes');
   observed.verifiedReadBytesTotal+=event.readBytes;
   if(observed.verifiedReadBytesTotal>8000000)
     throw new Error('original DOS file validated transfer budget exceeded');
   if(event.fileOffset===16&&event.readBytes===256)
     observed.verifiedFileRead={fileOffset:16,readCount:256,sha256:sha(actual)};
 },
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
// Opt-in read-only native byte-write attribution, installed *after* the
// externally staged original executable and DOS vector fixtures. This is NOT
// VGA emulation; only guest physical address and exact byte writes are seen.
const nativeMemoryWrites={
  openProgramTotal:0,physical64kBands:Array(16).fill(0),
  vgaA000Writes:0,vgaB000Writes:0,
  vgaFirstBytes:[],sampleGuestWrites:[]
};
cpu.installMemoryWriteObserver((event,guest)=>{
  if(activePsp!==0x600)return;
  vgaPlaneWitness.observeNativeByte(event);
  nativeMemoryWrites.openProgramTotal++;
  const band=event.physical>>>16;
  nativeMemoryWrites.physical64kBands[band]++;
  if(event.physical>=0xa0000&&event.physical<0xc0000){
    nativeMemoryWrites.vgaA000Writes++;
    if(nativeMemoryWrites.vgaFirstBytes.length<24)
      nativeMemoryWrites.vgaFirstBytes.push({
        physical:event.physical,value:event.value,
        cs:guest.get16('CS'),ip:guest.get16('IP')
      });
  }else if(event.physical>=0xb0000&&event.physical<0xc0000){
    nativeMemoryWrites.vgaB000Writes++;
  }
  if(nativeMemoryWrites.sampleGuestWrites.length<16)
    nativeMemoryWrites.sampleGuestWrites.push({physical:event.physical,
      value:event.value,cs:guest.get16('CS'),ip:guest.get16('IP')});
});
// Opt-in original CPU A000h readback. Unknown initial GC04/read mode or
// unwitnessed plane bytes stop the original execution instead of silently
// reading the emulated linear RAM shadow. Never synthesize missing VGA bytes.
const vgaNativeReadAdapter=nativeVgaReadProbe?
  installVgaMode12ReadPlaneAdapter(cpu,vgaPlaneWitness,{maxReads:1000000}):null;
let steps=0,stopped=null;
const trace=[];
for(;steps<3000&&!cpu.terminated;steps++){
 const before={cs:cpu.get16('CS'),ip:cpu.get16('IP'),ax:cpu.get16('AX')};
 try{cpu.step();}
 catch(e){stopped={...before,message:e.message};break;}
 trace.push(before);
 if(trace.length>16)trace.shift();
}
// Read-only diagnostic for future native OPEN.EXE unpacker parity. A suffix
// hash of JS output is NOT by itself a real DOS native decode reference;
// only identical full image bytes in guest RAM would be a candidate witness.
const guestDecodedWitness=[];
for(let part=0;part<4;part++){
 const expected=pinnedOpgraph.getDecodedPart(part).bytes;
 let cursor=0,prefixCandidates=0,longestPrefix=0,longestPhysical=null;
 const exactPhysical=[];
 const memory=cpu.memory;
 const last=memory.length-expected.length;
 while(cursor<=last){
   const start=memory.indexOf(expected[0],cursor);
   if(start<0||start>last)break;
   cursor=start+1;
   let prefix=true;
   for(let j=1;j<16;j++)if(memory[start+j]!==expected[j]){prefix=false;break;}
   if(!prefix)continue;
   prefixCandidates++;
   let matched=16;
   while(matched<expected.length&&memory[start+matched]===expected[matched])matched++;
   if(matched>longestPrefix){longestPrefix=matched;longestPhysical=start;}
   if(matched===expected.length)exactPhysical.push(start);
   if(prefixCandidates>256)throw new Error('native unpack witness prefix candidate budget exceeded');
 }
 guestDecodedWitness.push({part,bytes:expected.length,prefixCandidates,
   longestPrefix,longestPhysical,exactPhysical,
   provenance:'READ_ONLY_GUEST_MEMORY_SCAN__PARTIAL_PREFIX_ONLY_NOT_FULL_NATIVE_DECODER_PARITY'});
}

const originalVgaPlaneState=vgaPlaneWitness.getState();
const originalVgaFrame=originalVgaPlaneState.fullyCoveredBytes===38400?
  vgaPlaneWitness.captureCompleteIndexedFrame():null;
const originalVgaPaletteIndexHistogram=Array(16).fill(0);
let originalVgaNonzeroBounds=null;
if(originalVgaFrame){
  for(let i=0;i<originalVgaFrame.length;i++){
    const color=originalVgaFrame[i];
    if(color>=16)throw new Error('original VGA color index exceeds four-bit depth');
    originalVgaPaletteIndexHistogram[color]++;
    if(!color)continue;
    const x=i%640,y=Math.floor(i/640);
    if(originalVgaNonzeroBounds===null)
      originalVgaNonzeroBounds={left:x,top:y,right:x,bottom:y};
    else{
      originalVgaNonzeroBounds.left=Math.min(originalVgaNonzeroBounds.left,x);
      originalVgaNonzeroBounds.top=Math.min(originalVgaNonzeroBounds.top,y);
      originalVgaNonzeroBounds.right=Math.max(originalVgaNonzeroBounds.right,x);
      originalVgaNonzeroBounds.bottom=Math.max(originalVgaNonzeroBounds.bottom,y);
    }
  }
}
const result={
 original:{koeiSha:sha(koei),fmdrvSha:sha(fmdrv),openSha:sha(open)},
 stagingRegions:stagingProof.regions.length,
 syntheticIvtStubs,
 openStarted,openGuestFault,openMz,
 koeiSteps:steps,fmdrvChild:fmdrvRun,
 observedChildCalls:observed.calls,initialDosEnvironment:'SYNTHETIC',
 installedInt66:cpu.getGuestInterruptVector(0x66),
 initialInt66:{segment:0xe000,offset:0},
 originalFmdrvResidency:observed.resident,
 originalPitWrites:observed.originalPitReloads,
 originalPitState:originalPitBus.getState(),
 originalOplState:originalOplBus.getState(),
 originalOplFirstWrites:observed.originalOplRegisters,
 originalLateHotspots:Array.from(originalLateHotspots.entries()).sort((a,b)=>b[1]-a[1]).slice(0,16),
 originalLateSamples:lastLateSamples,
 originalFileRequests:observed.originalFileRequests,
 originalFileTransfers:observed.fileTransfers,
 verifiedReadBytesTotal:observed.verifiedReadBytesTotal,
 originalDosFileCalls:observed.originalDosFileCalls,
 verifiedFileRead:observed.verifiedFileRead,
 guestDecodedWitness,
 nativePart0RuntimeWitness,
 nativeAllPartsRuntimeWitness,
 nativeMemoryWrites,
 originalVgaCpuReadMode0Probe:nativeVgaReadProbe?{
  enabled:true,verifiedReads:vgaNativeReadAdapter.readCount(),
  note:'ORIGINAL_EXE_CPU_IN_SYNTHETIC_DOS__NOT_AUTHENTIC_VGA_REFERENCE'
 }:null,
 originalVgaPlaneState,
 originalVgaFrameSha256:originalVgaFrame?sha(originalVgaFrame):null,
 originalVgaPaletteIndexHistogram,originalVgaNonzeroBounds,
 originalVgaFramePixelPrefix:originalVgaFrame?Array.from(originalVgaFrame.slice(0,16)):null,
 pinnedOpgraph:{sha256:'f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d',bytes:opgraph.length,
  parts:pinnedOpgraph.partCount,decodedBytes:pinnedOpgraph.totalDecodedBytes,records:pinnedOpgraph.totalRecords},

 vgaWrites:observed.vgaWrites,vgaWriteCount:indexedVga.writtenCount(),
 paletteWrites:observed.paletteWrites,
 syntheticVgaStatusReads,dacColors:observed.dacColors,dacColorCount:vgaDac.writtenColors(),
 syntheticPitIrqStep:syntheticIrqStep,syntheticPitIrqEventCount:observed.pitIrqEdges.length,
 syntheticPitIrqDeliveredCount:observed.pitIrqEdges.filter(e=>e.delivered).length,
 syntheticPitIrqFirst:observed.pitIrqEdges.slice(0,5),
 originalPicWriteCount:observed.picWrites.length,originalPicFirst:observed.picWrites.slice(0,12),
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
if(syntheticIrqStep===128&&instructionBudget>=6000000){
 assert.equal(nativePart0RuntimeWitness.maxMatchingPrefix,52748);
 assert.equal(nativePart0RuntimeWitness.fullMatchSha256,graphEvidence.decodedSha256[0]);
 assert.equal(nativePart0RuntimeWitness.fullMatchStep,5715968);
}
if(syntheticIrqStep===128&&instructionBudget>=12000000){
 const originalNativeFinalPart=nativeAllPartsRuntimeWitness[13];
 assert.equal(originalNativeFinalPart.maxMatchingPrefix,64037);
 assert.equal(originalNativeFinalPart.fullMatchStep,11425792);
 assert.equal(originalNativeFinalPart.fullMatchSha256,graphEvidence.decodedSha256[13]);
 assert.ok(originalVgaPlaneState.mode0Writes>0);
}
if(syntheticIrqStep===128&&instructionBudget>=13000000){
 assert.equal(originalVgaPlaneState.mode0Writes,11648);
 assert.equal(result.originalVgaFrameSha256,
  'de5c45c4cbde52268f1ae98b8db9041fa24ceca1342d0c81ab908232aff98634');
 assert.equal(originalVgaPaletteIndexHistogram[0],307002);
 assert.deepEqual(originalVgaNonzeroBounds,{left:216,top:246,right:423,bottom:247});
 assert.equal(observed.verifiedReadBytesTotal,91494);
}
if(syntheticIrqStep===128&&instructionBudget===260000){
  assert.equal(originalVgaPlaneState.graphicsMode,2);
  assert.equal(originalVgaPlaneState.sequencerMapMask,15);
  assert.equal(originalVgaPlaneState.visibleWrites,38400);
  assert.equal(originalVgaPlaneState.fullyCoveredBytes,38400);
  assert.equal(result.originalVgaFrameSha256,'7818f5542a0404157573be6cffc0e0c8e68ce3c0f5d17d07ccdd9313fb700baf');
  assert.deepEqual(result.originalVgaFramePixelPrefix,Array(16).fill(0));
  assert.equal(nativeMemoryWrites.vgaA000Writes,38400);
}
// A deliberately shorter native instruction budget may stop before the
// original 3D00 resource-open call; never manufacture an observed filename.
if(observed.originalFileRequests.length)
  assert.equal(observed.originalFileRequests[0],'C:OPGRAPH.LZW');
if(syntheticIrqStep===128&&instructionBudget===260000)
  assert.deepEqual(observed.originalFileRequests,['C:OPGRAPH.LZW']);
assert.ok(indexedVga.writtenCount()>=6);
assert.ok(vgaDac.writtenColors()>=16);
assert.ok(observed.paletteWrites.length>=16);
assert.ok(observed.dacColors.length>0);
assert.equal(cpu.getGuestInterruptVector(0x66).segment,0x400);
assert.equal(result.stopped?.message,openGuestFault.message);
assert.deepEqual(observed.resident,[{pspSegment:0x400,paragraphs:0x26,returnCode:1}]);
console.log(JSON.stringify(result,null,2));
console.log('UW2 original KOEI -> FMDRV -> OPEN MZ external explicitly synthetic IRQ0 original ISR boundary PASS (NOT authentic PIT clock)');
