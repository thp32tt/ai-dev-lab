// Read-mode-0 VGA A000 physical aperture bridge for original 8086 guest code.
// Only byte reads whose selected plane is witnessed are returned. Other memory
// stays original guest RAM, and unsupported/unknown VGA bytes reject instead
// of being replaced by the last linear RAM write or a fabricated BIOS image.
import {RealMode8086} from './realmode-8086.js';

export function installVgaMode12ReadPlaneAdapter(cpu,witness,{maxReads=100000}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA planar CPU read adapter requires RealMode8086');
  if(!witness||typeof witness.readSelectedPlaneByte!=='function')
    throw new TypeError('VGA planar CPU read adapter requires an evidence witness');
  if(!Number.isInteger(maxReads)||maxReads<1||maxReads>2000000)
    throw new RangeError('bounded VGA native CPU read budget required');
  let reads=0;
  cpu.installMemoryReadProvider(({physical})=>{
    if(physical<0xa0000||physical>=0xb0000)return undefined;
    if(reads>=maxReads)
      throw new Error('VGA original CPU read budget exhausted: fail closed');
    const byte=witness.readSelectedPlaneByte(physical);
    reads++;
    return byte;
  });
  return Object.freeze({
    readCount:()=>reads,
    fidelity:'OBSERVED_VGA_READ_MODE0_SELECTED_PLANE_ONLY__ORIGINAL_DOS_UNTESTED'
  });
}
