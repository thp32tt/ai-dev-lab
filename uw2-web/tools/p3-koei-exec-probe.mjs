#!/usr/bin/env node
// Runs a SHA-pinned, user-owned original Korean KOEI.COM image through the
// browser's 8086 core with an EXPLICIT SYNTHETIC DOS/PSP + child-result fixture.
// This is a bounded compatibility probe, NEVER a real DOS reference trace.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedCom} from '../web/mz-loader.js';
import {installDosInt21} from '../web/dos-int21.js';
import {installBiosInt10} from '../web/bios-int10.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {verifyKoeiLaunchChain,ORIGINAL_KOEI_LAUNCH_SITES} from './koei-launch-chain.mjs';

const dirname=path.dirname(fileURLToPath(import.meta.url));
const baseline=JSON.parse(fs.readFileSync(path.join(dirname,'../docs/original-baseline-20261031.json'),'utf8'));
const pin=baseline.coreExecutables.find(x=>x.name==='KOEI.COM');
const statuses=Object.freeze({
  'FMDRV.COM':{terminationType:0,returnCode:0},
  'OPEN.EXE':{terminationType:0,returnCode:0},
  'MAIN.EXE':{terminationType:0,returnCode:1},
  'END.EXE':{terminationType:0,returnCode:0}
});
export async function probeOriginalKoeiWithSyntheticDos(original,{maxSteps=50000,childStatuses=statuses,initialIvt=null,biosVideo=null,initialPsp=null,dosMemory=null}={}){
  if(!(original instanceof Uint8Array))throw new TypeError('original KOEI.COM byte buffer required');
  if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100000)
    throw new RangeError('bounded KOEI instruction budget required');
  const bytes=Buffer.from(original),chain=verifyKoeiLaunchChain(bytes,{expectedSha256:pin.sha256});
  // Original KOEI.COM raw 02ACh includes C1 EB 04 (80186 SHR BX,4).
  const cpu=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
  // Synthetic memory state: NOT a measured PSP, DOS allocator, environment, or
  // hardware state. Work is ONLY used to find missing 8086/DOS primitives.
  const pspSegment=0x200;
  const psp=initialPsp===null?null:await loadPinnedDosPsp(cpu,initialPsp.bytes,{
    pspSegment,expectedSha256:initialPsp.expectedSha256
  });
  await loadVerifiedCom(cpu,bytes,{pspSegment,allocationParagraphs:0x1000,
    initialSP:0xfffe,expectedSha256:pin.sha256});
  // Only externally captured/declared IVT contents are admissible. Without
  // a pinned IVT, original INT21 AH35 AL65 remains a hard fail-closed stop.
  const ivt=initialIvt===null?null:await installPinnedDosIvtSnapshot(cpu,initialIvt.bytes,{
    expectedSha256:initialIvt.expectedSha256,knownVectors:initialIvt.knownVectors
  });
  const allowed=new Set(ORIGINAL_KOEI_LAUNCH_SITES.map(x=>x.name));
  const launches=[],videoRequests=[];
  if(biosVideo!==null&&(!biosVideo||typeof biosVideo!=='object'||Array.isArray(biosVideo)))
    throw new TypeError('explicit BIOS video provider object required');
  installBiosInt10(cpu,{...(biosVideo||{}),teletype:args=>{
    if(videoRequests.length>=32)throw new Error('synthetic BIOS video event budget exhausted');
    videoRequests.push(args);
  }});
  if(dosMemory!==null&&(!dosMemory||typeof dosMemory!=='object'||Array.isArray(dosMemory)))
    throw new TypeError('explicit DOS allocator device object required');
  installDosInt21(cpu,{freeMemory:dosMemory?.freeMemory,
    resizeMemory:dosMemory?.resizeMemory,executeChild:input=>{
    if(!allowed.has(input.filename))
      throw new Error('KOEI executable name not in SHA-pinned original launch sites');
    if(input.parameterBlockSegment!==pspSegment)
      throw new Error('KOEI DOS EXEC parameter block segment differs from synthetic PSP');
    const status=childStatuses[input.filename];
    if(!status||!Number.isInteger(status.terminationType)||!Number.isInteger(status.returnCode))
      throw new Error('explicit synthetic DOS child status required');
    launches.push(Object.freeze({file:input.filename,
      terminationType:status.terminationType,returnCode:status.returnCode}));
    return status;
  }});
  let steps=0,stopped=null;
  for(;steps<maxSteps&&!cpu.terminated;steps++){
    const cs=cpu.get16('CS'),ip=cpu.get16('IP');
    try{cpu.step();}
    catch(e){
      stopped=Object.freeze({reason:'UNSUPPORTED_OR_MISSING_DOS_STATE',
        cs,ip,ax:cpu.get16('AX'),bx:cpu.get16('BX'),cx:cpu.get16('CX'),dx:cpu.get16('DX'),es:cpu.get16('ES'),ds:cpu.get16('DS'),flags:cpu.get16('FLAGS'),message:e.message});
      break;
    }
  }
  if(!stopped&&!cpu.terminated)
    stopped={reason:'STEP_BUDGET_EXHAUSTED',cs:cpu.get16('CS'),ip:cpu.get16('IP')};
  return {
    moduleName:'KOEI.COM',sha256:chain.sha256,steps,
    entryPsp:chain.entryPsp,
    observedChildCalls:launches,observedBiosVideoRequests:videoRequests,
    externalVideoState:biosVideo?'CALLER_SUPPLIED_NOT_DOS_VERIFIED':null,
    initialPsp:psp?{sha256:psp.sha256,environmentSegment:psp.environmentSegment,
      provenance:'CALLER_SUPPLIED_NOT_ORIGINAL_DOS_VERIFIED'}:null,
    initialIvt:ivt?{sha256:ivt.sha256,knownVectorCount:ivt.knownVectorCount,
      provenance:'CALLER_SUPPLIED_NOT_ORIGINAL_DOS_VERIFIED'}:null,
    terminated:cpu.terminated??null,stopped,
    fidelity:'ORIGINAL_KOEI_BYTES__SYNTHETIC_PSP_AND_CHILD_STATUS__NOT_DOS_REFERENCE'
  };
}
const direct=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(direct){
  const originalPath=process.argv[2];
  if(!originalPath){process.stderr.write('Usage: node tools/p3-koei-exec-probe.mjs <original-KOEI.COM>\n');process.exitCode=2;}
  else{
    try{
      const result=await probeOriginalKoeiWithSyntheticDos(fs.readFileSync(originalPath));
      process.stdout.write(JSON.stringify(result,null,2)+'\n');
    }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
  }
}
