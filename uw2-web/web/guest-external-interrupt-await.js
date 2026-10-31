// Passive guest interrupt admission boundary. Direct native INT imm8 only.
// Does not treat an absent handler as an empty ISR, synthesize FMDRV, or
// mutate the original 8086 instruction pointer/stack/FLAGS.
import {RealMode8086} from './realmode-8086.js';

export function pendingGuestExternalInterrupt(cpu){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('guest interrupt wait requires RealMode8086');
  const cs=cpu.get16('CS'),ip=cpu.get16('IP');
  if(cpu.read8(cs,ip)!==0xcd)return null;
  const vector=cpu.read8(cs,(ip+1)&0xffff);
  if(cpu.interruptAdapters.has(vector)||cpu.interruptVectors.has(vector))
    return null;
  return Object.freeze({
    reason:'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER',cs,ip,
    missingInterruptVector:vector,
    requirement:'ORIGINAL_GUEST_INTERRUPT_DRIVER_OR_VERIFIED_IVT_REQUIRED'
  });
}
