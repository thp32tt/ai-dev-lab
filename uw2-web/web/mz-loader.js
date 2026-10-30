// MZ program-image relocation into the same 8086 CPU/memory state.
// This is NOT a DOS environment: PSP contents, DOS allocation contents,
// interrupts, devices, and original execution traces require separate proof.
import {RealMode8086} from './realmode-8086.js';

const word=(bytes,at)=>bytes[at]|(bytes[at+1]<<8);
const uint16=(v,name)=>{
  if(!Number.isInteger(v)||v<0||v>0xffff)throw new RangeError(name+' must be uint16');
  return v;
};
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');

export function inspectMzForLoad(bytes) {
  if(!(bytes instanceof Uint8Array))throw new TypeError('MZ image must be Uint8Array');
  if(bytes.length<0x1c||bytes[0]!==0x4d||bytes[1]!==0x5a)
    throw new Error('invalid MZ executable signature/header');
  const last=word(bytes,2),pages=word(bytes,4),relocations=word(bytes,6);
  const headerBytes=word(bytes,8)*16;
  const minExtra=word(bytes,10),maxExtra=word(bytes,12);
  const ss=word(bytes,14),sp=word(bytes,16),ip=word(bytes,20),cs=word(bytes,22);
  const tableOffset=word(bytes,24);
  if(!pages||last>511||headerBytes<0x1c||maxExtra<minExtra)
    throw new Error('invalid MZ page, allocation or header fields');
  const declaredBytes=(pages-1)*512+(last||512);
  if(declaredBytes>bytes.length||headerBytes>declaredBytes||
     tableOffset<0x1c||tableOffset+relocations*4>headerBytes)
    throw new Error('MZ length or relocation table outside declared header');
  const imageBytes=declaredBytes-headerBytes;
  const imageParas=Math.ceil(imageBytes/16);
  const entries=[],seen=new Set();
  for(let i=0;i<relocations;i++){
    const offset=word(bytes,tableOffset+4*i);
    const segment=word(bytes,tableOffset+4*i+2);
    const relative=segment*16+offset;
    if(seen.has(relative))throw new Error('duplicate MZ relocation destination');
    seen.add(relative);entries.push({offset,segment,relative});
  }
  return {headerBytes,declaredBytes,imageBytes,imageParas,minExtra,maxExtra,
    ss,sp,ip,cs,entries};
}

// Explicit DOS memory layout and expected original-file fingerprint are required.
// The caller supplies a DOS/PSP memory snapshot; no unverified synthetic PSP or
// zero-filled BSS is silently substituted for a real reference memory image.
export async function loadVerifiedMz(cpu,bytes,{loadSegment,pspSegment,allocationParagraphs,expectedSha256}={}) {
  if(!(cpu instanceof RealMode8086))throw new TypeError('MZ loader requires RealMode8086');
  uint16(loadSegment,'loadSegment');uint16(pspSegment,'pspSegment');
  if(!Number.isInteger(allocationParagraphs)||allocationParagraphs<0)
    throw new RangeError('explicit DOS allocationParagraphs required');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('pinned original SHA-256 is required: fail closed');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('SHA-256 verification unavailable: fail closed');
  const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
  if(digest!==expectedSha256)throw new Error('original MZ SHA-256 mismatch');
  const mz=inspectMzForLoad(bytes);
  const {imageParas,imageBytes,minExtra,maxExtra}=mz;
  const extra=allocationParagraphs-imageParas;
  if(extra<minExtra||(maxExtra!==0xffff&&extra>maxExtra))
    throw new Error('explicit MZ allocation outside min/max DOS header limits');
  const base=loadSegment*16,allocatedBytes=allocationParagraphs*16;
  if(base+allocatedBytes>cpu.memory.length)
    throw new RangeError('MZ image/allocation exceeds physical memory: fail closed');
  if(mz.cs*16+mz.ip>=allocatedBytes)
    throw new Error('MZ entry outside declared allocation');
  // SP may be the one-past-top stack pointer; do not assume BSS values.
  if(mz.ss*16+mz.sp>allocatedBytes)
    throw new Error('MZ stack outside declared allocation');
  for(const r of mz.entries)
    if(r.relative+1>=allocatedBytes)
      throw new Error('MZ relocation outside declared allocation');

  // All preflight checks and relocation arithmetic occur on a private copy.
  // Any invalid input leaves CPU registers and the shared memory unchanged.
  const image=new Uint8Array(cpu.memory);
  image.set(bytes.subarray(mz.headerBytes,mz.declaredBytes),base);
  let bssRelocations=0;
  for(const r of mz.entries){
    const at=base+r.relative;
    const old=image[at]|(image[at+1]<<8);
    const value=(old+loadSegment)&0xffff;
    image[at]=value&255;image[at+1]=value>>>8;
    if(r.relative>=imageBytes)bssRelocations++;
  }
  cpu.memory.set(image);
  cpu.set16('CS',(loadSegment+mz.cs)&0xffff);
  cpu.set16('IP',mz.ip);
  cpu.set16('SS',(loadSegment+mz.ss)&0xffff);
  cpu.set16('SP',mz.sp);
  cpu.set16('DS',pspSegment);
  cpu.set16('ES',pspSegment);
  return Object.freeze({
    imageBytes,relocations:mz.entries.length,bssRelocations,
    loadSegment,entryCS:cpu.get16('CS'),entryIP:cpu.get16('IP'),
    // Does not imply BSS/PSP contents equal the original DOS process.
    fidelity:'STRUCTURAL_MZ_ONLY__ORIGINAL_DOS_RUNTIME_UNTESTED'
  });
}


// The caller provides the authentic PSP/stack/allocation snapshot explicitly.
// Do not synthesize a DOS environment or overwrite unknown memory regions.
export async function loadVerifiedCom(cpu,bytes,{pspSegment,allocationParagraphs,initialSP,expectedSha256}={}){
  if(!(cpu instanceof RealMode8086))throw new TypeError('COM loader requires RealMode8086');
  if(!(bytes instanceof Uint8Array)||!bytes.length||bytes.length>0xff00)
    throw new RangeError('COM image length must be 1..65280');
  uint16(pspSegment,'pspSegment');uint16(initialSP,'initialSP');
  if(!Number.isInteger(allocationParagraphs)||allocationParagraphs<1||allocationParagraphs>0x1000)
    throw new RangeError('explicit COM allocationParagraphs must be 1..4096');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('pinned original SHA-256 required: fail closed');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('SHA-256 unavailable: fail closed');
  const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
  if(digest!==expectedSha256)throw new Error('original COM SHA-256 mismatch');
  const allocatedBytes=allocationParagraphs*16,codeEnd=0x100+bytes.length;
  if(codeEnd>allocatedBytes||initialSP<codeEnd+2||initialSP+1>=allocatedBytes||(initialSP&1))
    throw new Error('COM code/stack outside explicit DOS allocation: fail closed');
  const base=pspSegment*16;
  if(base+allocatedBytes>cpu.memory.length)
    throw new RangeError('COM allocation exceeds physical memory: fail closed');
  // Preflight complete: preserve the caller's PSP, BSS, IVT and stack contents.
  cpu.memory.set(bytes,base+0x100);
  for(const s of ['CS','DS','ES','SS'])cpu.set16(s,pspSegment);
  cpu.set16('IP',0x100);cpu.set16('SP',initialSP);
  return Object.freeze({pspSegment,entryIP:0x100,imageBytes:bytes.length,
    fidelity:'STRUCTURAL_COM_ONLY__ORIGINAL_DOS_RUNTIME_UNTESTED'});
}
