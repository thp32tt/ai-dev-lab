// SHA-256-pinned *caller supplied* 1-KiB DOS interrupt vector table boundary.
// This neither captures an actual DOS reference nor certifies provenance.
// Only explicitly enumerated vector numbers become executable/queryable; all
// other IVT slots remain unknown even when their memory bytes are present.
import {RealMode8086} from './realmode-8086.js';

const hex=bytes=>Array.from(bytes,x=>x.toString(16).padStart(2,'0')).join('');
export async function installPinnedDosIvtSnapshot(cpu,bytes,{
  expectedSha256,knownVectors
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS IVT snapshot needs RealMode8086');
  if(!(bytes instanceof Uint8Array)||bytes.length!==1024)
    throw new RangeError('complete 1024-byte IVT snapshot required');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('IVT snapshot expected SHA-256 required: fail closed');
  if(!Array.isArray(knownVectors)||!knownVectors.length||knownVectors.length>256)
    throw new Error('explicit nonempty known DOS IVT vector list required');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('IVT SHA-256 verification unavailable: fail closed');
  // Atomic preflight: reject duplicates, invalid IDs and adapter collisions
  // *before* the first byte/register is touched.
  const seen=new Set();
  for(const number of knownVectors){
    if(!Number.isInteger(number)||number<0||number>255)
      throw new RangeError('DOS IVT vector number must be uint8');
    if(seen.has(number))throw new Error('duplicate known DOS IVT vector: fail closed');
    if(cpu.interruptVectors.has(number)||cpu.interruptAdapters.has(number))
      throw new Error('DOS IVT vector conflicts with live guest/host handler');
    seen.add(number);
  }
  const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
  if(digest!==expectedSha256)
    throw new Error('DOS IVT snapshot SHA-256 mismatch: fail closed');
  // Authenticity of supplied bytes is NOT determined by a self-reported hash.
  // Use the whole original IVT in guest physical RAM, but register ONLY the
  // original-vector addresses explicitly marked known by the caller.
  cpu.memory.set(bytes,0);
  for(const number of seen)cpu.interruptVectors.add(number);
  return Object.freeze({
    sha256:digest,size:1024,knownVectorCount:seen.size,
    fidelity:'CALLER_PINNED_IVT_SNAPSHOT_ONLY__DOS_REFERENCE_AUTHENTICITY_UNTESTED'
  });
}
