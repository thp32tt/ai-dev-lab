// Narrow DOS INT 21h process boundary. This does not claim a DOS kernel,
// original binary execution, or invented child process behavior.
import {RealMode8086} from './realmode-8086.js';
const byte=(v,label)=>{
  if(!Number.isInteger(v)||v<0||v>255)throw new RangeError(label+' must be uint8');
  return v;
};
export function installDosInt21(cpu,{executeChild}={}){
  if(!(cpu instanceof RealMode8086))throw new TypeError('DOS adapter requires RealMode8086');
  if(executeChild!==undefined&&typeof executeChild!=='function')
    throw new TypeError('executeChild must be synchronous');
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
    throw new Error(`unsupported DOS INT 21h AH=${ah.toString(16)}: fail closed`);
  });
  return Object.freeze({pendingChildStatus:()=>completedChild});
}
