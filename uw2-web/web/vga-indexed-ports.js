// VGA indexed register WRITE transport only. Original DOS 8086 OUT imm/DX
// emits real register byte pairs; this module never fabricates VGA register
// reads, palette, screen pixels, timing or game-visible graphics.
import {RealMode8086} from './realmode-8086.js';

const PORTS=Object.freeze([
  Object.freeze({port:0x3ce,device:'graphics-controller'}),
  Object.freeze({port:0x3c4,device:'sequencer'}),
  Object.freeze({port:0x3d4,device:'color-crtc'}),
  Object.freeze({port:0x3b4,device:'mono-crtc'})
]);
export function installVgaIndexedWriteRecorder(cpu,{onWrite,maxWrites=20000}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA indexed port recorder requires RealMode8086');
  if(typeof onWrite!=='function')
    throw new TypeError('VGA indexed write requires external device recorder');
  if(!Number.isInteger(maxWrites)||maxWrites<1||maxWrites>1000000)
    throw new RangeError('bounded VGA indexed register write count required');
  for(const {port} of PORTS){
    if(cpu.portHandlers.has(port)||cpu.portHandlers.has(port+1))
      throw new Error('VGA indexed port already owned by device: fail closed');
  }
  let writes=0;
  const last=new Map();
  const deliver=(device,port,index,value,width)=>{
    if(writes>=maxWrites)
      throw new Error('VGA indexed write budget exhausted: fail closed');
    const entry=Object.freeze({device,port,index,value,width});
    const result=onWrite(entry,cpu);
    if(result&&typeof result.then==='function')
      throw new Error('async VGA indexed register sink: fail closed');
    if(result!==undefined)
      throw new Error('VGA indexed register sink must not fabricate return values');
    writes++;
  };
  for(const {port,device} of PORTS){
    cpu.registerIOPort(port,{
      out16:(address,word)=>{
        const index=word&255,value=(word>>>8)&255;
        last.set(port,index);
        deliver(device,address,index,value,16);
      },
      out8:(address,index)=>{
        last.set(port,index);
      }
    });
    cpu.registerIOPort(port+1,{
      out8:(address,value)=>{
        if(!last.has(port))
          throw new Error('VGA data write without known register selector: fail closed');
        deliver(device,port,last.get(port),value,8);
      }
    });
  }
  return Object.freeze({writtenCount:()=>writes,
    fidelity:'RAW_VGA_INDEXED_WRITES_ONLY__VGA_DISPLAY_STATE_UNTESTED'});
}
