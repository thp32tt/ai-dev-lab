#!/usr/bin/env node
// Execute the SHA-pinned owner-held original Korean FMDRV.COM at PSP:0100h.
// Minimal fail-closed diagnostic only: no synthetic FM/OPL audio, BIOS,
// DOS memory allocation, or invented return values.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedCom} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {installDosInt21} from '../web/dos-int21.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/original-baseline-20261031.json'),'utf8'));
const pinned=baseline.coreExecutables.find(x=>x.name==='FMDRV.COM');
if(!pinned)throw new Error('missing original FMDRV.COM SHA baseline');
export async function probeOriginalFmdrv(original,{maxSteps=4096,
  traceLimit=32,initialIvt=null,initialPsp=null,
  cpu=null,pspSegment=0x300,dosOptions={}
}={}){
  if(!(original instanceof Uint8Array))
    throw new TypeError('original FMDRV.COM bytes must be Uint8Array');
  if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>100000)
    throw new RangeError('FMDRV bounded instruction budget required');
  if(!Number.isInteger(traceLimit)||traceLimit<0||traceLimit>128)
    throw new RangeError('FMDRV bounded trace length required');
  if(!Number.isInteger(pspSegment)||pspSegment<0||pspSegment>0xffff)
    throw new RangeError('FMDRV PSP segment must be uint16');
  const guest=cpu??new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
  if(!(guest instanceof RealMode8086))throw new TypeError('FMDRV requires shared RealMode8086');
  const psp=initialPsp===null?null:await loadPinnedDosPsp(guest,initialPsp.bytes,{
    pspSegment,expectedSha256:initialPsp.expectedSha256
  });
  const loaded=await loadVerifiedCom(guest,original,{pspSegment,
    allocationParagraphs:0x1000,initialSP:0xfffe,expectedSha256:pinned.sha256});
  const ivt=initialIvt===null?null:await installPinnedDosIvtSnapshot(guest,initialIvt.bytes,{
    expectedSha256:initialIvt.expectedSha256,knownVectors:initialIvt.knownVectors
  });
  installDosInt21(guest,dosOptions);
  let steps=0,stopped=null;
  const last=[],serviceCalls=[];
  for(;steps<maxSteps&&!guest.terminated;steps++){
    const cs=guest.get16('CS'),ip=guest.get16('IP'),
      ax=guest.get16('AX'),sp=guest.get16('SP');
    if(traceLimit){
      last.push({cs,ip,ax,sp});
      if(last.length>traceLimit)last.shift();
    }
    if(guest.read8(cs,ip)===0xcd&&guest.read8(cs,(ip+1)&0xffff)===0x21){
      serviceCalls.push({ah:guest.get8('AH'),al:guest.get8('AL'),
        cs,ip});
    }
    try{guest.step();}
    catch(error){
      stopped={reason:'MISSING_GUEST_RUNTIME_OR_OPCODE',
        cs,ip,ax,bx:guest.get16('BX'),cx:guest.get16('CX'),
        dx:guest.get16('DX'),ds:guest.get16('DS'),
        es:guest.get16('ES'),message:error.message};
      break;
    }
  }
  if(!stopped&&!guest.terminated)
    stopped={reason:'STEP_BUDGET',cs:guest.get16('CS'),ip:guest.get16('IP')};
  return Object.freeze({
    name:'FMDRV.COM',sha256:pinned.sha256,
    steps,loaded,stopped,terminated:guest.terminated,
    serviceCalls,recentSteps:last,
    initialPsp:psp?{sha256:psp.sha256,environmentSegment:psp.environmentSegment}:null,
    initialIvt:ivt?{sha256:ivt.sha256,knownVectorCount:ivt.knownVectorCount}:null,
    fidelity:'ORIGINAL_FMDRV_BYTES__SYNTHETIC_PROCESS_MEMORY__NOT_DOS_AUDIO_REFERENCE'
  });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    if(!process.argv[2])throw new Error('Usage: node tools/p3-fmdrv-exec-probe.mjs <private-FMDRV.COM>');
    const original=fs.readFileSync(process.argv[2]);
    console.log(JSON.stringify(await probeOriginalFmdrv(original),null,2));
  }catch(e){console.error(e.message);process.exitCode=1;}
}
