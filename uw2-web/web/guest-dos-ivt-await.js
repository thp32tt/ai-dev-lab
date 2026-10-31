// Opt-in, instruction-boundary wait for caller-provided DOS vector data.
// Observes the exact direct INT21 AH35 native guest state. No guest opcode,
// stack, register or CPU IP is executed/changed while the IVT is unavailable.
// Other DOS services and prefix forms still execute via the normal 8086 CPU.
import {RealMode8086} from './realmode-8086.js';
const asHex=bytes=>Array.from(bytes,
  b=>b.toString(16).padStart(2,'0')).join('');

// Never infer DOS vectors from zero-initialized RAM. Only the DOS adapter
// installed for this CPU can service INT21 AH35.
export function pendingGuestDosIvtVector(cpu){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS IVT wait requires a real 8086 guest CPU');
  if(!cpu.interruptAdapters.has(0x21))return null;
  const cs=cpu.get16('CS'),ip=cpu.get16('IP');
  if(cpu.read8(cs,ip)!==0xcd||
     cpu.read8(cs,(ip+1)&0xffff)!==0x21||
     cpu.get8('AH')!==0x35)return null;
  const number=cpu.get8('AL');
  if(cpu.interruptVectors.has(number))return null;
  return Object.freeze({reason:'WAIT_EXTERNAL_DOS_IVT_VECTOR',
    cs,ip,missingInterruptVector:number,
    requirement:'PINNED_EXTERNAL_DOS_IVT_VECTOR_REQUIRED'});
}

// SHA pinning is an integrity check of explicitly caller-supplied data.
// It is never evidence that the bytes came from a real DOS reference.
export async function supplyPinnedGuestDosIvtVector(cpu,{
  number,bytes,expectedSha256
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS IVT install requires a real 8086 guest CPU');
  if(!Number.isInteger(number)||number<0||number>255)
    throw new RangeError('DOS IVT vector number must be uint8');
  if(!(bytes instanceof Uint8Array)||bytes.length!==4)
    throw new RangeError('single DOS vector requires exactly four caller-supplied bytes');
  if(typeof expectedSha256!=='string'||!/^[a-f0-9]{64}$/.test(expectedSha256))
    throw new TypeError('pinned DOS IVT vector SHA-256 required');
  if(!globalThis.crypto?.subtle?.digest)
    throw new Error('DOS IVT SHA-256 unavailable: fail closed');
  if(cpu.interruptAdapters.has(number)||cpu.interruptVectors.has(number))
    throw new Error('DOS IVT vector already owned: fail closed');
  const actual=asHex(new Uint8Array(await globalThis.crypto.subtle.digest(
    'SHA-256',bytes)));
  if(actual!==expectedSha256)
    throw new Error('DOS IVT vector SHA-256 mismatch: fail closed');
  // Recheck ownership after the digest to reject overlapping asynchronous
  // caller updates. The running guest must be separately paused by owner.
  if(cpu.interruptAdapters.has(number)||cpu.interruptVectors.has(number))
    throw new Error('DOS IVT vector ownership changed: fail closed');
  const offset=bytes[0]|(bytes[1]<<8),segment=bytes[2]|(bytes[3]<<8);
  cpu.installInterruptVector(number,segment,offset);
  return Object.freeze({number,segment,offset,sha256:actual,
    fidelity:'CALLER_SUPPLIED_PINNED_IVT_VECTOR__DOS_ORIGIN_NOT_PROVEN'});
}
