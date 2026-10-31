// Explicit external IRQ edge delivery into an already installed guest IVT.
// This is NOT a PIT clock, PIC priority/EOI model, or a DOS time source.
// Host/device scheduler owns every interrupt edge and must supply its origin.
import {RealMode8086} from './realmode-8086.js';

export function deliverExternalMaskableIrq(cpu,{
  vector,source
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('external guest IRQ requires RealMode8086');
  if(!Number.isInteger(vector)||vector<0||vector>255)
    throw new RangeError('external IRQ vector must be uint8');
  if(typeof source!=='string'||!source.trim()||source.length>128)
    throw new Error('external IRQ must declare device source: fail closed');
  if(cpu.terminated)
    throw new Error('cannot deliver IRQ to terminated guest');
  if(!cpu.flag('IF'))
    return Object.freeze({delivered:false,vector,source,
      reason:'MASKED_IF_CLEAR'});
  if(cpu.isMaskableIrqShadowed())
    return Object.freeze({delivered:false,vector,source,
      reason:'DEFERRED_AFTER_STI_OR_SS'});
  // Do not manufacture an IVT vector from zero-filled RAM.
  if(!cpu.interruptVectors.has(vector))
    throw new Error('external IRQ has no installed guest vector: fail closed');
  cpu.dispatchInterrupt(vector);
  return Object.freeze({delivered:true,vector,source,
    fidelity:'EXPLICIT_GUEST_IRQ_EDGE_ONLY__PIT_PIC_TIMING_UNTESTED'});
}
