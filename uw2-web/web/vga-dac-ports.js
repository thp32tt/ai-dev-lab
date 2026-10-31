// VGA 256-entry DAC write stream, transport only. Port 3C8 selects a DAC
// palette index; three subsequent 3C9 OUT8 writes are R/G/B bytes and
// auto-increment the index. Preserve ORIGINAL raw bytes (including high bits).
// No guessed color space, 6-bit conversion, retrace timing or framebuffer.
import {RealMode8086} from './realmode-8086.js';
export function installVgaDacWriteRecorder(cpu,{onColor,maxColors=65536}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA DAC requires RealMode8086');
  if(typeof onColor!=='function')
    throw new TypeError('VGA DAC color event sink required');
  if(!Number.isInteger(maxColors)||maxColors<1||maxColors>1000000)
    throw new RangeError('VGA DAC bounded palette write count required');
  if(cpu.portHandlers.has(0x3c8)||cpu.portHandlers.has(0x3c9))
    throw new Error('VGA DAC ports are already owned: fail closed');
  let index=null,part=0,count=0;
  const raw=[];
  cpu.registerIOPort(0x3c8,{out8:(_p,number)=>{
    index=number;part=0;raw.length=0;
  }});
  cpu.registerIOPort(0x3c9,{out8:(_p,byte)=>{
    if(index===null)throw new Error('VGA DAC color byte without write-index: fail closed');
    if(count>=maxColors)throw new Error('VGA DAC write budget exhausted: fail closed');
    if(part<2){raw[part++]=byte;return;}
    const event=Object.freeze({index,red:raw[0],green:raw[1],blue:byte});
    const output=onColor(event,cpu);
    if(output&&typeof output.then==='function')
      throw new Error('async VGA DAC color sink: fail closed');
    if(output!==undefined)
      throw new Error('VGA DAC color sink cannot fabricate hardware status');
    count++;index=(index+1)&255;part=0;raw.length=0;
  }});
  return Object.freeze({writtenColors:()=>count,
    fidelity:'ORIGINAL_RAW_DAC_BYTE_TRIPLETS_ONLY__DISPLAY_OUTPUT_UNTESTED'});
}
