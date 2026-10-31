#!/usr/bin/env node
// SHA-pinned original Korean OPEN.EXE MZ instruction probe. Only structural MZ
// relocations are authentic. DOS allocation, PSP, BSS, devices are synthetic.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {createGuestExecutionHotspotRecorder} from '../web/guest-execution-hotspots.js';
import {loadVerifiedMz} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {installDosInt21} from '../web/dos-int21.js';
const base=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const metadata=JSON.parse(fs.readFileSync(path.join(base,'docs/original-baseline-20261031.json'),'utf8'));
const pin=metadata.coreExecutables.find(x=>x.name==='OPEN.EXE');
if(!pin)throw new Error('OPEN.EXE baseline fingerprint required');
export async function probeOriginalOpen(original,{
 pspSegment=0x600,loadSegment=0x610,allocationParagraphs,
 maxSteps=10000,initialPsp=null,initialIvt=null,dosOptions={},cpu=null,traceLimit=24,
 enableHotspots=false
}={}){
 if(!(original instanceof Uint8Array))
   throw new TypeError('original OPEN.EXE binary byte buffer required');
 if(!Number.isInteger(allocationParagraphs)||allocationParagraphs<1||allocationParagraphs>65535)
   throw new Error('explicit synthetic OPEN allocation paragraphs required');
 if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100000)
   throw new RangeError('bounded original OPEN step budget required');
 if(typeof enableHotspots!=='boolean')
   throw new TypeError('guest execution hotspot opt-in must be boolean');
 if(!Number.isInteger(traceLimit)||traceLimit<0||traceLimit>128)
   throw new RangeError('bounded OPEN execution trace length required');
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
 installDosInt21(machine,dosOptions);
 let steps=0,stopped=null,services=[],recent=[];
 const hotspots=enableHotspots?createGuestExecutionHotspotRecorder({
   sampleEvery:127,maxSites:4096,maxStates:8192,top:16
 }):null;
 for(;steps<maxSteps&&!machine.terminated;steps++){
   const cs=machine.get16('CS'),ip=machine.get16('IP');
   if(hotspots)hotspots.observeInstruction({steps,cs,ip},machine);
   const record={cs,ip,ax:machine.get16('AX'),sp:machine.get16('SP')};
   if(traceLimit){recent.push(record);if(recent.length>traceLimit)recent.shift();}
   if(machine.read8(cs,ip)===0xcd&&machine.read8(cs,(ip+1)&65535)===0x21)
     services.push({ah:machine.get8('AH'),al:machine.get8('AL'),cs,ip});
   try{machine.step();}catch(e){stopped={cs,ip,message:e.message};break;}
 }
 if(!stopped&&!machine.terminated)
   stopped={reason:'STEP_BUDGET_EXHAUSTED',cs:machine.get16('CS'),ip:machine.get16('IP')};
 return Object.freeze({
   name:'OPEN.EXE',sha256:pin.sha256,image,initialPsp:psp,
   initialIvt:ivt?{sha256:ivt.sha256,knownVectorCount:ivt.knownVectorCount}:null,
   steps,stopped,terminated:machine.terminated,services,recent,
   ...(hotspots?{executionHotspots:hotspots.summarize()}:{}),
   fidelity:'ORIGINAL_OPEN_MZ_BYTES__SYNTHETIC_DOS_PSP_MEMORY__NOT_REFERENCE_BOOT'
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
   if(!process.argv[2])throw Error('Usage: p3-open-exec-probe.mjs <private-OPEN.EXE>');
   const original=fs.readFileSync(process.argv[2]);
   const r=await probeOriginalOpen(original,{allocationParagraphs:3390});
   console.log(JSON.stringify(r,null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
