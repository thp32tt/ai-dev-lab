// Synchronous, bounded DOS EXEC child CPU-frame switch for *already SHA-verified*
// and staged user-owned COM bytes. Does not invent a DOS allocator or PSP.
// RAM/IVT/device writes survive a resident child; only CPU registers/termination
// revert on parent resumption. Failure never becomes a fabricated DOS status.
import {RealMode8086} from './realmode-8086.js';

export const DOS_CPU_FRAME_NAMES=Object.freeze([
  'AX','CX','DX','BX','SP','BP','SI','DI','CS','DS','ES','SS','IP','FLAGS'
]);
const word=(v,label)=>{
  if(!Number.isInteger(v)||v<0||v>0xffff)
    throw new RangeError(label+' must be an explicit uint16');
  return v;
};
export function captureDosCpuFrame(cpu){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS CPU frame requires RealMode8086');
  const frame={};
  for(const name of DOS_CPU_FRAME_NAMES)frame[name]=cpu.get16(name);
  return Object.freeze(frame);
}
export function runStagedDosComChild(cpu,{initialFrame,maxSteps=100000}={}){
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS child runner requires shared RealMode8086');
  if(!initialFrame||typeof initialFrame!=='object'||Array.isArray(initialFrame))
    throw new TypeError('DOS child requires complete externally specified initial CPU frame');
  if(Object.keys(initialFrame).length!==DOS_CPU_FRAME_NAMES.length||
     DOS_CPU_FRAME_NAMES.some(name=>!Object.hasOwn(initialFrame,name)))
    throw new Error('DOS child initial CPU frame must specify exactly 14 registers');
  for(const name of DOS_CPU_FRAME_NAMES)word(initialFrame[name],name);
  if(!Number.isInteger(maxSteps)||maxSteps<1||maxSteps>1000000)
    throw new RangeError('DOS child bounded instruction budget required');
  if(cpu.terminated)
    throw new Error('cannot start DOS child from already terminated parent');
  const parent=captureDosCpuFrame(cpu),parentTerminated=cpu.terminated;
  let steps=0,result=null;
  try{
    for(const name of DOS_CPU_FRAME_NAMES)cpu.set16(name,initialFrame[name]);
    cpu.terminated=null;
    for(;steps<maxSteps&&!cpu.terminated;steps++){
      const cs=cpu.get16('CS'),ip=cpu.get16('IP');
      try{cpu.step();}catch(error){
        if(error instanceof Error){
          error.guestCS=cs;error.guestIP=ip;error.guestSteps=steps;
        }
        throw error;
      }
    }
    if(!cpu.terminated)
      throw new Error('DOS child instruction budget exhausted: fail closed');
    result=cpu.terminated;
    if(!Number.isInteger(result.terminationType)||result.terminationType<0||
       result.terminationType>255||!Number.isInteger(result.returnCode)||
       result.returnCode<0||result.returnCode>255)
      throw new Error('DOS child terminated without valid process status');
    if(result.terminationType===3&&
      (!Number.isInteger(result.residentParagraphs)||result.residentParagraphs<1))
      throw new Error('DOS TSR child has no explicit resident paragraphs');
  }finally{
    for(const name of DOS_CPU_FRAME_NAMES)cpu.set16(name,parent[name]);
    cpu.terminated=parentTerminated;
  }
  return Object.freeze({terminationType:result.terminationType,
    returnCode:result.returnCode,steps,
    residentParagraphs:result.terminationType===3?result.residentParagraphs:null});
}
