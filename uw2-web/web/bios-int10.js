// Minimal BIOS INT 10h dispatch boundary for user-owned original DOS 8086 code.
// No synthetic VGA screen, sound, cursor, register returns or BIOS state.
// AH=0Eh dispatches AL character to a caller-supplied original-compatible
// teletype sink; the sink is responsible for any device-specific side effects.
// Other video BIOS functions fail closed until proven against original DOS.
import {RealMode8086} from './realmode-8086.js';

const byte=(n,label)=>{
  if(!Number.isInteger(n)||n<0||n>255)
    throw new RangeError(label+' must be uint8');
  return n;
};

export function installBiosInt10(cpu,{teletype}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('BIOS video dispatcher requires RealMode8086');
  if(teletype!==undefined&&typeof teletype!=='function')
    throw new TypeError('BIOS teletype must be a synchronous device sink');
  cpu.installInterruptAdapter(0x10,()=>{
    const ah=cpu.get8('AH');
    if(ah!==0x0e)
      throw new Error('unsupported BIOS INT 10h AH='+ah.toString(16)+': fail closed');
    if(!teletype)
      throw new Error('BIOS teletype device sink absent: fail closed');
    // Preserve raw guest BIOS arguments, including BEL (07h) and backspace.
    // Never replace control characters with invented text or browser alerts.
    const args=Object.freeze({
      character:byte(cpu.get8('AL'),'AL'),
      page:byte(cpu.get8('BH'),'BH'),
      color:byte(cpu.get8('BL'),'BL')
    });
    const response=teletype(args,cpu);
    if(response&&typeof response.then==='function')
      throw new Error('async BIOS video device sink: fail closed');
    if(response!==undefined)
      throw new Error('BIOS teletype device must not synthesize return registers');
  });
  return Object.freeze({supportedServices:Object.freeze(['INT10-AH0E']),
    fidelity:'DEVICE_DISPATCH_ONLY__ORIGINAL_BIOS_VISUAL_AUDIO_UNTESTED'});
}
