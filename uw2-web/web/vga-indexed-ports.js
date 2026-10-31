// Native VGA indexed register transport. Original DOS OUT imm/DX emits raw
// writes; optional GC/SEQ readback is limited to witnessed, previously written
// register bytes, never fabricated BIOS defaults or undocumented read-only bits.
// CRTC, timing, palette, screen pixels and unwitnessed register IN remain HOLD.
import {RealMode8086} from './realmode-8086.js';

const PORTS=Object.freeze([
  Object.freeze({port:0x3ce,device:'graphics-controller'}),
  Object.freeze({port:0x3c4,device:'sequencer'}),
  Object.freeze({port:0x3d4,device:'color-crtc'}),
  Object.freeze({port:0x3b4,device:'mono-crtc'})
]);
export function installVgaIndexedWriteRecorder(cpu,{
  onWrite,maxWrites=20000,allowKnownReadback=false,maxReads=20000
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA indexed port recorder requires RealMode8086');
  if(typeof onWrite!=='function')
    throw new TypeError('VGA indexed write requires external device recorder');
  if(!Number.isInteger(maxWrites)||maxWrites<1||maxWrites>1000000)
    throw new RangeError('bounded VGA indexed register write count required');
  if(typeof allowKnownReadback!=='boolean')
    throw new TypeError('VGA indexed readback opt-in must be boolean');
  if(!Number.isInteger(maxReads)||maxReads<1||maxReads>1000000)
    throw new RangeError('bounded known VGA indexed register read count required');
  for(const {port} of PORTS){
    if(cpu.portHandlers.has(port)||cpu.portHandlers.has(port+1))
      throw new Error('VGA indexed port already owned by device: fail closed');
  }
  let writes=0,reads=0;
  const last=new Map();
  // Only GC 00..08 and Sequencer 00..04 are plain register bytes safe
  // to echo after an accepted guest OUT. No reset/default guess is allowed.
  const known=new Map([[0x3ce,new Map()],[0x3c4,new Map()]]);
  const isReadable=(port,index)=>port===0x3ce?
    index<=8:port===0x3c4&&index<=4;
  const deliver=(device,port,index,value,width)=>{
    if(writes>=maxWrites)
      throw new Error('VGA indexed write budget exhausted: fail closed');
    const entry=Object.freeze({device,port,index,value,width});
    const result=onWrite(entry,cpu);
    if(result&&typeof result.then==='function')
      throw new Error('async VGA indexed register sink: fail closed');
    if(result!==undefined)
      throw new Error('VGA indexed register sink must not fabricate return values');
    if(known.has(port)&&isReadable(port,index))
      known.get(port).set(index,value);
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
    const dataHandlers={
      out8:(address,value)=>{
        if(!last.has(port))
          throw new Error('VGA data write without known register selector: fail closed');
        deliver(device,port,last.get(port),value,8);
      }
    };
    if(allowKnownReadback&&known.has(port)){
      dataHandlers.in8=()=>{
        const index=last.get(port);
        if(!Number.isInteger(index)||!isReadable(port,index)||
           !known.get(port).has(index))
          throw new Error('VGA indexed IN requires a previously written GC/SEQ register: fail closed');
        if(reads>=maxReads)
          throw new Error('VGA known register readback budget exhausted: fail closed');
        reads++;
        return known.get(port).get(index);
      };
    }
    cpu.registerIOPort(port+1,dataHandlers);
  }
  const invalidateAfterBiosModeSet=({mode}={})=>{
    if(!Number.isInteger(mode)||mode<0||mode>255)
      throw new RangeError('BIOS indexed VGA reset requires uint8 video mode');
    last.clear();
    for(const regs of known.values())regs.clear();
  };
  return Object.freeze({writtenCount:()=>writes,knownReadCount:()=>reads,
    invalidateAfterBiosModeSet,
    fidelity:allowKnownReadback?
      'VGA_GC_SEQ_KNOWN_WRITE_READBACK_ONLY__ORIGINAL_DOS_UNTESTED':
      'RAW_VGA_INDEXED_WRITES_ONLY__VGA_DISPLAY_STATE_UNTESTED'});
}
