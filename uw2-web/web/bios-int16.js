// Original DOS BIOS INT 16h keyboard *status* boundary.
// No synthetic key presses, host keyboard polling or input auto-repeat are
// invented. Only caller-supplied keyboard queue observations are admissible.
import {RealMode8086} from './realmode-8086.js';

export function installBiosInt16(cpu,{checkKey}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('BIOS keyboard boundary requires RealMode8086');
  if(checkKey!==undefined&&typeof checkKey!=='function')
    throw new TypeError('BIOS keyboard status device must be synchronous');
  cpu.installInterruptAdapter(0x16,()=>{
    const ah=cpu.get8('AH');
    if(ah!==0x01)
      throw new Error('unsupported BIOS INT16 AH='+ah.toString(16)+': fail closed');
    if(!checkKey)
      throw new Error('BIOS INT16 AH01 requires an external keyboard queue: fail closed');
    const result=checkKey(Object.freeze({service:0x01}),cpu);
    if(result&&typeof result.then==='function')
      throw new Error('async BIOS keyboard status source: fail closed');
    if(!result||typeof result!=='object'||Array.isArray(result)||
       typeof result.available!=='boolean')
      throw new Error('BIOS keyboard status requires explicit availability');
    if(!result.available){
      if(Object.hasOwn(result,'ascii')||Object.hasOwn(result,'scanCode'))
        throw new Error('BIOS unavailable keyboard status cannot carry a key');
      cpu.set16('FLAGS',cpu.get16('FLAGS')|0x40); // ZF = no pending key
      return;
    }
    const {ascii,scanCode}=result;
    if(!Number.isInteger(ascii)||ascii<0||ascii>255||
       !Number.isInteger(scanCode)||scanCode<0||scanCode>255)
      throw new Error('BIOS keyboard scan code and ASCII must be uint8');
    cpu.set16('AX',(scanCode<<8)|ascii);
    cpu.set16('FLAGS',cpu.get16('FLAGS')&~0x40);
  });
  return Object.freeze({
    supportedServices:Object.freeze(['INT16-AH01']),
    fidelity:'CALLER_KEYBOARD_QUEUE_ONLY__REAL_BIOS_KEY_TIMING_UNTESTED'
  });
}
