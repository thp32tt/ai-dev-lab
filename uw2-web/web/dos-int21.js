// Narrow DOS INT 21h process boundary. This does not claim a DOS kernel,
// original binary execution, or invented child process behavior.
import {RealMode8086} from './realmode-8086.js';
import {createDosReadOnlyFileHandler} from './dos-readonly-files.js';
const byte=(v,label)=>{
  if(!Number.isInteger(v)||v<0||v>255)throw new RangeError(label+' must be uint8');
  return v;
};
export function installDosInt21(cpu,{executeChild,readOriginalFile,freeMemory,resizeMemory}={}){
  if(!(cpu instanceof RealMode8086))throw new TypeError('DOS adapter requires RealMode8086');
  if(executeChild!==undefined&&typeof executeChild!=='function')
    throw new TypeError('executeChild must be synchronous');
  if(freeMemory!==undefined&&typeof freeMemory!=='function')
    throw new TypeError('freeMemory must be a synchronous DOS allocator boundary');
  if(resizeMemory!==undefined&&typeof resizeMemory!=='function')
    throw new TypeError('resizeMemory must be a synchronous DOS allocator boundary');
  // No host file provider => no DOS file service; never synthesize original assets.
  const fileHandler=readOriginalFile===undefined?null:
    createDosReadOnlyFileHandler(cpu,readOriginalFile);
  let completedChild=null;
  const readPath=()=>{
    const bytes=[],segment=cpu.get16('DS'),offset=cpu.get16('DX');
    for(let i=0;i<260;i++){
      const b=cpu.read8(segment,(offset+i)&0xffff);
      if(!b){
        if(!bytes.length)throw new Error('DOS EXEC empty pathname: fail closed');
        return {bytes:Uint8Array.from(bytes),filename:String.fromCharCode(...bytes)};
      }
      bytes.push(b);
    }
    throw new Error('DOS EXEC pathname lacks terminator: fail closed');
  };
  cpu.installInterruptAdapter(0x21,()=>{
    const ah=cpu.get8('AH');
    if(ah===0x25){
      // AH=25h AL=vector, DS:DX=guest handler address. KOEI.COM uses
      // AX=2524h to install its own DOS critical-error INT 24h handler.
      // No unknown DOS IVT default or host adapter is manufactured.
      cpu.setGuestInterruptVector(cpu.get8('AL'),cpu.get16('DS'),cpu.get16('DX'));
      return;
    }
    if(ah===0x35){
      // AH=35h gets only a previously installed/verified IVT entry.
      // Returning a zero-filled synthetic DOS vector would be incorrect.
      const vector=cpu.getGuestInterruptVector(cpu.get8('AL'));
      cpu.set16('ES',vector.segment);
      cpu.set16('BX',vector.offset);
      return;
    }
    if(ah===0x49){
      // Original KOEI.COM reads its environment segment from PSP:002Ch
      // and asks DOS to release it. The real DOS MCB allocator is external.
      if(!freeMemory)
        throw new Error('DOS AH49 requires a captured allocation owner: fail closed');
      const segment=cpu.get16('ES');
      if(segment===0)
        throw new Error('DOS AH49 cannot free absent PSP environment segment: fail closed');
      const result=freeMemory(Object.freeze({segment}),cpu);
      if(result&&typeof result.then==='function')
        throw new Error('async DOS free-memory allocator: fail closed');
      if(!result||typeof result!=='object'||Array.isArray(result))
        throw new Error('DOS AH49 requires explicit allocator result: fail closed');
      if(Object.hasOwn(result,'errorCode')){
        const error=result.errorCode;
        if(error!==7&&error!==9)
          throw new Error('DOS AH49 error must be 07h or 09h: fail closed');
        cpu.set16('AX',error);
        cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
        return;
      }
      if(result.freed!==true)
        throw new Error('DOS AH49 allocator must acknowledge explicit free: fail closed');
      cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
      return;
    }
    if(ah===0x4a){
      // AH=4Ah changes the ES-owned DOS memory block to BX paragraphs.
      // Actual MCB ownership, free-list coalescing and expansion are external.
      if(!resizeMemory)
        throw new Error('DOS AH4A requires a captured allocation owner: fail closed');
      const segment=cpu.get16('ES'),paragraphs=cpu.get16('BX');
      if(segment===0)
        throw new Error('DOS AH4A cannot resize absent memory block: fail closed');
      const result=resizeMemory(Object.freeze({segment,paragraphs}),cpu);
      if(result&&typeof result.then==='function')
        throw new Error('async DOS resize-memory allocator: fail closed');
      if(!result||typeof result!=='object'||Array.isArray(result))
        throw new Error('DOS AH4A requires explicit allocator result: fail closed');
      if(Object.hasOwn(result,'errorCode')){
        const error=result.errorCode;
        if(error!==7&&error!==8&&error!==9)
          throw new Error('DOS AH4A error must be 07h, 08h or 09h: fail closed');
        if(error===8){
          const max=result.maxAvailableParagraphs;
          if(!Number.isInteger(max)||max<0||max>0xffff)
            throw new Error('DOS AH4A insufficient-memory maximum required: fail closed');
          cpu.set16('BX',max);
        }
        cpu.set16('AX',error);
        cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
        return;
      }
      if(result.resized!==true)
        throw new Error('DOS AH4A allocator must acknowledge explicit resize: fail closed');
      cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
      return;
    }
    if(ah===0x4b){
      if(cpu.get8('AL')!==0)throw new Error('DOS EXEC other than 4B00h: fail closed');
      if(!executeChild)throw new Error('DOS EXEC requires a child runner: fail closed');
      const result=executeChild(Object.freeze({...readPath(),
        parameterBlockSegment:cpu.get16('ES'),parameterBlockOffset:cpu.get16('BX')}));
      if(result&&typeof result.then==='function')throw new Error('async DOS EXEC: fail closed');
      if(!result||typeof result!=='object')throw new Error('missing DOS EXEC result: fail closed');
      if(Object.hasOwn(result,'errorCode')){
        const error=result.errorCode;
        if(!Number.isInteger(error)||error<1||error>0xffff)
          throw new RangeError('DOS EXEC errorCode must be uint16 and nonzero');
        cpu.set16('AX',error);cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
        return;
      }
      completedChild=Object.freeze({
        terminationType:byte(result.terminationType,'terminationType'),
        returnCode:byte(result.returnCode,'returnCode')
      });
      cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
      return;
    }
    if(ah===0x4d){
      if(!completedChild)throw new Error('DOS 4Dh missing completed child: fail closed');
      cpu.set16('AX',(completedChild.terminationType<<8)|completedChild.returnCode);
      completedChild=null;return;
    }
    if(ah===0x4c){
      cpu.terminated=Object.freeze({terminationType:0,returnCode:cpu.get8('AL')});
      return;
    }
    if(fileHandler&&fileHandler(ah))return;
    throw new Error(`unsupported DOS INT 21h AH=${ah.toString(16)}: fail closed`);
  });
  return Object.freeze({pendingChildStatus:()=>completedChild});
}
