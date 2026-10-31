// VGA 256-entry DAC write stream, transport only. Port 3C8 selects a DAC
// palette index; three subsequent 3C9 OUT8 writes are R/G/B bytes and
// auto-increment the index. Preserve ORIGINAL raw bytes (including high bits).
// No guessed color space, 6-bit conversion, retrace timing or framebuffer.
// Optional read mode uses only complete prior RGB triplets with 6-bit bytes;
// no power-on palette, undocumented DAC status, or high-bit truncation guess.
import {RealMode8086} from './realmode-8086.js';
export function installVgaDacWriteRecorder(cpu,{
  onColor,maxColors=65536,allowKnownReadback=false,maxReads=65536
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA DAC requires RealMode8086');
  if(typeof onColor!=='function')
    throw new TypeError('VGA DAC color event sink required');
  if(!Number.isInteger(maxColors)||maxColors<1||maxColors>1000000)
    throw new RangeError('VGA DAC bounded palette write count required');
  if(typeof allowKnownReadback!=='boolean')
    throw new TypeError('VGA DAC readback opt-in must be boolean');
  if(!Number.isInteger(maxReads)||maxReads<1||maxReads>1000000)
    throw new RangeError('bounded VGA DAC readback count required');
  if(cpu.portHandlers.has(0x3c8)||cpu.portHandlers.has(0x3c9)||
     (allowKnownReadback&&cpu.portHandlers.has(0x3c7)))
    throw new Error('VGA DAC ports are already owned: fail closed');
  let index=null,part=0,count=0,reads=0,readIndex=null,readPart=0;
  const raw=[],known=new Map();
  if(allowKnownReadback)cpu.registerIOPort(0x3c7,{
    out8:(_p,selected)=>{readIndex=selected;readPart=0;}
  });
  cpu.registerIOPort(0x3c8,{out8:(_p,number)=>{
    index=number;part=0;raw.length=0;
    readIndex=null;readPart=0; // no stale read stream across write selection
  }});
  const handlers={out8:(_p,byte)=>{
    if(index===null)throw new Error('VGA DAC color byte without write-index: fail closed');
    if(count>=maxColors)throw new Error('VGA DAC write budget exhausted: fail closed');
    // Once any channel is overwritten, the previous full-triplet witness is
    // invalid until a complete, accepted new original OUT sequence exists.
    if(part===0)known.delete(index);
    if(part<2){raw[part++]=byte;return;}
    const event=Object.freeze({index,red:raw[0],green:raw[1],blue:byte});
    const output=onColor(event,cpu);
    if(output&&typeof output.then==='function')
      throw new Error('async VGA DAC color sink: fail closed');
    if(output!==undefined)
      throw new Error('VGA DAC color sink cannot fabricate hardware status');
    known.set(index,[event.red,event.green,event.blue]);
    count++;index=(index+1)&255;part=0;raw.length=0;
  }};
  if(allowKnownReadback){
    handlers.in8=()=>{
      if(readIndex===null||!known.has(readIndex))
        throw new Error('VGA DAC IN requires a completed, observed palette color: fail closed');
      const color=known.get(readIndex);
      if(color.some(v=>v>63))
        throw new Error('VGA DAC color uses unverified high-bit readback: fail closed');
      if(reads>=maxReads)
        throw new Error('VGA DAC known readback budget exhausted: fail closed');
      const result=color[readPart++];
      reads++;
      if(readPart===3){readPart=0;readIndex=(readIndex+1)&255;}
      return result;
    };
  }
  cpu.registerIOPort(0x3c9,handlers);
  const sampleKnownColor6=paletteIndex=>{
    if(!Number.isInteger(paletteIndex)||paletteIndex<0||paletteIndex>255)
      throw new RangeError('VGA DAC palette index must be uint8');
    const color=known.get(paletteIndex);
    if(!color||color.some(v=>v>63))
      throw new Error('VGA DAC RGB6 sample requires completed, observed 6-bit palette triplet: fail closed');
    return Object.freeze({red:color[0],green:color[1],blue:color[2]});
  };
  return Object.freeze({writtenColors:()=>count,knownReadCount:()=>reads,
    sampleKnownColor6,
    fidelity:allowKnownReadback?
      'RAW_DAC_KNOWN_COMPLETE_6BIT_IN_STREAM_ONLY__ORIGINAL_DOS_UNTESTED':
      'ORIGINAL_RAW_DAC_BYTE_TRIPLETS_ONLY__DISPLAY_OUTPUT_UNTESTED'});
}
