// SHA-pinned caller-provided 256-byte DOS PSP (program segment prefix).
// This imports reference memory only; it never creates DOS defaults, command
// tails, an environment segment or original reference authenticity.
import {RealMode8086} from './realmode-8086.js';
const hex=b=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
export async function loadPinnedDosPsp(cpu,bytes,{pspSegment,expectedSha256}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('PSP snapshot requires RealMode8086');
  if(!(bytes instanceof Uint8Array)||bytes.length!==256)
    throw new RangeError('DOS PSP snapshot must contain exactly 256 bytes');
  if(!Number.isInteger(pspSegment)||pspSegment<0||pspSegment>0xffff)
    throw new RangeError('DOS PSP segment must be uint16');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new Error('PSP original-snapshot SHA-256 required: fail closed');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('PSP SHA-256 verification unavailable: fail closed');
  const base=pspSegment*16;
  if(base+256>cpu.memory.length)
    throw new RangeError('DOS PSP snapshot exceeds physical memory');
  if(bytes[0]!==0xcd||bytes[1]!==0x20)
    throw new Error('DOS PSP INT 20h entry signature missing: fail closed');
  const digest=hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)));
  if(digest!==expectedSha256)
    throw new Error('DOS PSP snapshot SHA-256 mismatch: fail closed');
  const environmentSegment=bytes[0x2c]|(bytes[0x2d]<<8);
  cpu.memory.set(bytes,base);
  return Object.freeze({pspSegment,sha256:digest,environmentSegment,
    fidelity:'CALLER_PINNED_PSP_ONLY__DOS_REFERENCE_AUTHENTICITY_UNTESTED'});
}
