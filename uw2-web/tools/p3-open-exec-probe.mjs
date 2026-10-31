#!/usr/bin/env node
// SHA-pinned original Korean OPEN.EXE MZ instruction probe. Only structural MZ
// relocations are authentic. DOS allocation, PSP, BSS, devices are synthetic.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {createGuestExecutionHotspotRecorder} from '../web/guest-execution-hotspots.js';
import {createGuestProgressWitness} from '../web/guest-progress-witness.js';
import {createGuestDosCallWindow} from '../web/guest-dos-call-window.js';
import {loadVerifiedMz} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';
import {pendingGuestDosIvtVector,supplyPinnedGuestDosIvtVector} from '../web/guest-dos-ivt-await.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata=JSON.parse(fs.readFileSync(path.join(base,'docs/original-baseline-20261031.json'),'utf8'));
const pin=metadata.coreExecutables.find(x=>x.name==='OPEN.EXE');
if(!pin)throw new Error('OPEN.EXE baseline fingerprint required');
export async function createOriginalOpenProbeSession(original,{
 pspSegment=0x600,loadSegment=0x610,allocationParagraphs,
 maxSteps=10000,initialPsp=null,initialIvt=null,dosOptions={},cpu=null,traceLimit=24,
 maxServiceEvents=4096,
 enableHotspots=false,enableProgressWitness=false,keyboardQueue=undefined,
 pauseOnMissingDosIvt=false
}={}){
 if(!(original instanceof Uint8Array))
   throw new TypeError('original OPEN.EXE binary byte buffer required');
 if(!Number.isInteger(allocationParagraphs)||allocationParagraphs<1||allocationParagraphs>65535)
   throw new Error('explicit synthetic OPEN allocation paragraphs required');
 if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>1000000)
   throw new RangeError('original OPEN step budget must be 1..1000000');
 if(typeof enableHotspots!=='boolean')
   throw new TypeError('guest execution hotspot opt-in must be boolean');
 if(typeof enableProgressWitness!=='boolean')
   throw new TypeError('guest execution progress opt-in must be boolean');
 if(typeof pauseOnMissingDosIvt!=='boolean')
   throw new TypeError('original DOS IVT pause opt-in must be boolean');
 if(!Number.isInteger(traceLimit)||traceLimit<0||traceLimit>128)
   throw new RangeError('bounded OPEN execution trace length required');
 if(!Number.isInteger(maxServiceEvents)||maxServiceEvents<1||maxServiceEvents>65536)
   throw new RangeError('bounded OPEN DOS service history capacity required');
 const machine=cpu??new RealMode8086();
 const psp=initialPsp===null?null:await loadPinnedDosPsp(machine,initialPsp.bytes,{
   pspSegment,expectedSha256:initialPsp.expectedSha256
 });
 const image=await loadVerifiedMz(machine,original,{
   pspSegment,loadSegment,allocationParagraphs,expectedSha256:pin.sha256
 });
 const ivt=initialIvt===null?null:await installPinnedDosIvtSnapshot(machine,initialIvt.bytes,{
   expectedSha256:initialIvt.expectedSha256,knownVectors:initialIvt.knownVectors
 });
 // Progress is passive and optional: never replace an existing VGA/CPU
 // memory witness installed by a reference DOS harness.
 const progress=enableProgressWitness?createGuestProgressWitness():null;
 if(progress&&(machine.memoryWriteObserver!==null||machine.ioPortObserver!==null||
              machine.memoryReadObserver!==null||machine.externalIrqObserver!==null))
   throw new Error('original OPEN progress observer requires unowned CPU write, read, I/O and IRQ sinks: fail closed');
 const originalOnFileEvent=dosOptions.onFileEvent;
 installDosInt21(machine,progress?{
   ...dosOptions,
   onFileEvent:(event,guest)=>{
     if(originalOnFileEvent!==undefined){
       const response=originalOnFileEvent(event,guest);
       if(response!==undefined)return response; // DOS handler validates refusal
     }
     progress.observeFileEvent(event);
   }
 }:dosOptions);
 if(progress){
   machine.installMemoryWriteObserver(progress.observeMemoryWrite);
   machine.installMemoryReadObserver(progress.observeProvidedMemoryRead);
   machine.installIOPortObserver(progress.observePortIO);
   machine.installExternalIrqObserver(progress.observeExternalIrq);
 }
 // Externally captured keys only, strictly opt-in: no fake BIOS queue.
 let steps=0,stopped=null,recent=[],faulted=false,running=false,supplying=false;
 const serviceHistory=createGuestDosCallWindow({maxEvents:maxServiceEvents});
 const hotspots=enableHotspots?createGuestExecutionHotspotRecorder({
   sampleEvery:127,maxSites:4096,maxStates:8192,top:16
 }):null;
 // A blocked BIOS AH00 must not create a phantom instruction, file
 // call or progress window. The hook runs only after the authentic queue
 // preflight has accepted that this guest instruction may start.
 const beforeInstruction=({cs,ip})=>{
   if(hotspots)hotspots.observeInstruction({steps,cs,ip},machine);
   if(progress)progress.observeInstruction({steps,cs,ip},machine);
   if(traceLimit){
     recent.push({cs,ip,ax:machine.get16('AX'),sp:machine.get16('SP')});
     if(recent.length>traceLimit)recent.shift();
   }
   if(machine.read8(cs,ip)===0xcd&&machine.read8(cs,(ip+1)&65535)===0x21)
     serviceHistory.observe({ah:machine.get8('AH'),al:machine.get8('AL'),cs,ip},machine);
 };
 const cpuSession=createGuestOriginalExecutionSession(machine,{
   keyboardQueue,maxTotalSteps:maxSteps,onBeforeInstruction:beforeInstruction
 });
 const snapshot=()=>{
   const dosCalls=serviceHistory.summarize();
   return Object.freeze({
     name:'OPEN.EXE',sha256:pin.sha256,image,initialPsp:psp,
     initialIvt:ivt?{sha256:ivt.sha256,knownVectorCount:ivt.knownVectorCount}:null,
     steps,stopped:stopped?Object.freeze({...stopped}):null,
     terminated:machine.terminated,
     services:dosCalls.calls,totalDosServiceCalls:dosCalls.totalCalls,
     discardedDosServiceCalls:dosCalls.discardedCalls,
     recent:Object.freeze(recent.map(x=>Object.freeze({...x}))),
     ...(hotspots?{executionHotspots:hotspots.summarize()}:{}),
     ...(progress?{executionProgress:progress.summarize()}:{}),
     fidelity:'ORIGINAL_OPEN_MZ_BYTES__SYNTHETIC_DOS_PSP_MEMORY__NOT_REFERENCE_BOOT'
   });
 };
 // Explicit bounded segments on one SHA-pinned original OPEN image: the
 // guest CPU, DOS files, observers and real BIOS keyboard FIFO survive calls.
 // This never fabricates the DOS environment or advances past an empty AH00.
 const runSlice=(sliceSteps=10000)=>{
   if(!Number.isSafeInteger(sliceSteps)||sliceSteps<1||sliceSteps>100000)
     throw new RangeError('original OPEN slice must be 1..100000 guest steps');
   if(running||supplying)throw new Error('reentrant original OPEN session: fail closed');
   if(faulted)throw new Error('faulted original OPEN session cannot resume: fail closed');
   if(machine.terminated)return snapshot();
   if(steps>=maxSteps){
     stopped={reason:'STEP_BUDGET_EXHAUSTED',cs:machine.get16('CS'),ip:machine.get16('IP')};
     return snapshot();
   }
   running=true;stopped=null;
   try{
     for(let performed=0;performed<sliceSteps&&steps<maxSteps&&!machine.terminated;){
       const cs=machine.get16('CS'),ip=machine.get16('IP');
       try{
         if(pauseOnMissingDosIvt){
           const pending=pendingGuestDosIvtVector(machine);
           if(pending){stopped=pending;break;}
         }
         const gate=cpuSession.runSlice(1);
         if(gate.reason==='WAIT_BIOS_INT16_AH00'){
           stopped={cs,ip,reason:gate.reason};break;
         }
         if(gate.steps!==1)
           throw new Error('original OPEN guest failed to execute an owned step');
         steps++;performed++;
       }catch(error){
         stopped={cs,ip,message:error?.message??String(error),
           ...(error?.code==='DOS_IVT_VECTOR_UNVERIFIED'&&
               Number.isInteger(error?.interruptVector)?{
                 requirement:'EXTERNAL_ORIGINAL_DOS_IVT_VECTOR_REQUIRED',
                 missingInterruptVector:error.interruptVector
               }:{})};
         faulted=true;
         break;
       }
     }
     if(!stopped&&!machine.terminated)
       stopped={reason:steps>=maxSteps?'STEP_BUDGET_EXHAUSTED':
         'SLICE_STEP_BUDGET_EXHAUSTED',
         cs:machine.get16('CS'),ip:machine.get16('IP')};
     return snapshot();
   }finally{running=false;}
 };
 const supplyPinnedDosIvtVector=async ({number,bytes,expectedSha256}={})=>{
   if(!pauseOnMissingDosIvt)
     throw new Error('DOS IVT resume requires explicit pause opt-in');
   if(running||supplying)
     throw new Error('concurrent original OPEN DOS IVT installation: fail closed');
   if(faulted||machine.terminated)
     throw new Error('faulted or terminated original OPEN cannot install DOS IVT');
   if(stopped?.reason!=='WAIT_EXTERNAL_DOS_IVT_VECTOR'||
      stopped.missingInterruptVector!==number)
     throw new Error('DOS IVT supply must match currently paused guest vector');
   // Never permit the guest to execute concurrently with a digest. Failed
   // SHA/ownership verification leaves its IP, counters and wait unchanged.
   supplying=true;
   try{
     const accepted=await supplyPinnedGuestDosIvtVector(machine,{
       number,bytes,expectedSha256
     });
     stopped=null;
     return accepted;
   }finally{supplying=false;}
 };
 return Object.freeze({runSlice,snapshot,supplyPinnedDosIvtVector});
}
export async function probeOriginalOpen(original,options={}){
 // Historical one-shot entrypoint remains stable. It uses the same
 // resumable implementation rather than a separate non-pausable CPU loop.
 const session=await createOriginalOpenProbeSession(original,options);
 const budget=options.maxSteps??10000;
 let result=session.runSlice(Math.min(100000,budget));
 while(result.stopped?.reason==='SLICE_STEP_BUDGET_EXHAUSTED')
   result=session.runSlice(Math.min(100000,budget-result.steps));
 return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
   if(!process.argv[2])throw Error('Usage: p3-open-exec-probe.mjs <private-OPEN.EXE>');
   const original=fs.readFileSync(process.argv[2]);
   const r=await probeOriginalOpen(original,{allocationParagraphs:3390});
   console.log(JSON.stringify(r,null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
