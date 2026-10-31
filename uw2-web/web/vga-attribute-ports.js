// IBM VGA attribute controller's 3C0h index/data flip-flop, bound to native
// 8086 port accesses. The flip-flop is unknown until the external 3DAh/3BAh
// Input Status 1 owner witnesses an IN and calls noteInputStatusRead.
// Only guest-OUT verified attributes are admitted; no BIOS palette defaults.
import {RealMode8086} from './realmode-8086.js';

const isByte=n=>Number.isInteger(n)&&n>=0&&n<=255;
export function installOriginalVgaAttributeController(cpu,{
  maxWrites=65536,maxReads=65536,allowKnownReadback=false,onRegisterWrite
}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('VGA attribute controller requires RealMode8086');
  if(!Number.isInteger(maxWrites)||maxWrites<1||maxWrites>1000000||
     !Number.isInteger(maxReads)||maxReads<1||maxReads>1000000)
    throw new RangeError('bounded VGA attribute register read/write budget required');
  if(typeof allowKnownReadback!=='boolean')
    throw new TypeError('VGA attribute readback opt-in must be boolean');
  if(onRegisterWrite!==undefined&&typeof onRegisterWrite!=='function')
    throw new TypeError('VGA attribute write sink must be synchronous');
  if(cpu.portHandlers.has(0x3c0)||cpu.portHandlers.has(0x3c1))
    throw new Error('VGA attribute ports already owned: fail closed');
  const regs=new Map();
  let phase='unknown',selected=null,displayEnabled=null,writes=0,reads=0;
  const noteInputStatusRead=port=>{
    if(port!==0x3da&&port!==0x3ba)
      throw new RangeError('VGA attribute flip-flop reset requires actual 3BAh/3DAh status IN');
    phase='index';
  };
  cpu.registerIOPort(0x3c0,{out8:(_port,value)=>{
    if(phase==='unknown')
      throw new Error('VGA attribute 3C0 flip-flop unknown before witnessed status IN: fail closed');
    if(phase==='index'){
      selected=value&31;
      displayEnabled=(value&0x20)!==0;
      phase='data';
      return;
    }
    if(selected>0x14)
      throw new Error('VGA attribute reserved index write: fail closed');
    if(writes>=maxWrites)
      throw new Error('VGA attribute write budget exhausted: fail closed');
    const event=Object.freeze({index:selected,value,displayEnabled});
    if(onRegisterWrite){
      const result=onRegisterWrite(event,cpu);
      if(result&&typeof result.then==='function')
        throw new Error('async VGA attribute sink: fail closed');
      if(result!==undefined)
        throw new Error('VGA attribute sink cannot synthesize hardware status');
    }
    regs.set(selected,value);
    writes++;phase='index';
  }});
  const data={};
  if(allowKnownReadback){
    data.in8=()=>{
      if(selected===null||selected>0x14||!regs.has(selected))
        throw new Error('VGA attribute IN requires a witnessed register value: fail closed');
      if(reads>=maxReads)
        throw new Error('VGA attribute read budget exhausted: fail closed');
      reads++;
      return regs.get(selected);
    };
  }
  // Out of reset the VGA data port is read-only; it never toggles 3C0.
  data.in8??=()=>{throw new Error('VGA attribute readback requires opt-in: fail closed');};
  cpu.registerIOPort(0x3c1,data);
  const getGroundedDacIndex=pixelIndex=>{
    if(!Number.isInteger(pixelIndex)||pixelIndex<0||pixelIndex>15)
      throw new RangeError('VGA Mode12 pixel index must be uint4');
    if(displayEnabled!==true)
      throw new Error('VGA attribute display enable not witnessed: fail closed');
    for(const n of [0x10,0x12,0x14])
      if(!regs.has(n))
        throw new Error('VGA attribute Mode12 palette mapping lacks original OUT state: fail closed');
    const mode=regs.get(0x10),planeEnable=regs.get(0x12),colorSelect=regs.get(0x14);
    // Native planar Mode12 only. 8-bit color / video-enabled behavior
    // requires its own separate source-state evidence.
    if(!(mode&1)||(mode&0x40)!==0||planeEnable>15||colorSelect>15)
      throw new Error('VGA attribute mode/plane/color-select not verified for Mode12: fail closed');
    const slot=pixelIndex&planeEnable;
    if(!regs.has(slot)||regs.get(slot)>63)
      throw new Error('VGA attribute pixel palette entry not witnessed: fail closed');
    const entry=regs.get(slot);
    const low=mode&0x80?(entry&15)|((colorSelect&3)<<4):entry;
    return (low|((colorSelect&12)<<4))&255;
  };
  return Object.freeze({
    noteInputStatusRead,getGroundedDacIndex,
    writtenCount:()=>writes,knownReadCount:()=>reads,
    getState:()=>Object.freeze({phase,selected,displayEnabled,writes,reads,
      knownRegisterCount:regs.size}),
    fidelity:'VGA_ATTRIBUTE_3C0_WITNESSED_ONLY__ORIGINAL_DOS_UNTESTED'
  });
}
