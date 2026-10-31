// Narrow DOS INT 21h process boundary. This does not claim a DOS kernel,
// original binary execution, or invented child process behavior.
import {RealMode8086} from './realmode-8086.js';
import {createDosReadOnlyFileHandler} from './dos-readonly-files.js';
const byte=(v,label)=>{
  if(!Number.isInteger(v)||v<0||v>255)throw new RangeError(label+' must be uint8');
  return v;
};
export function installDosInt21(cpu,{executeChild,readOriginalFile,onFileEvent,freeMemory,resizeMemory,directConsoleIO,stayResident,pspSegment,getDosVersion,getDeviceInfo,getCurrentDrive,allocateMemory,resetDisk}={}){
  if(!(cpu instanceof RealMode8086))throw new TypeError('DOS adapter requires RealMode8086');
  if(executeChild!==undefined&&typeof executeChild!=='function')
    throw new TypeError('executeChild must be synchronous');
  if(freeMemory!==undefined&&typeof freeMemory!=='function')
    throw new TypeError('freeMemory must be a synchronous DOS allocator boundary');
  if(resizeMemory!==undefined&&typeof resizeMemory!=='function')
    throw new TypeError('resizeMemory must be a synchronous DOS allocator boundary');
  if(directConsoleIO!==undefined&&typeof directConsoleIO!=='function')
    throw new TypeError('directConsoleIO must be a synchronous DOS console boundary');
  if(stayResident!==undefined&&typeof stayResident!=='function')
    throw new TypeError('stayResident must be a synchronous DOS TSR memory-owner callback');
  if(getDosVersion!==undefined&&typeof getDosVersion!=='function')
    throw new TypeError('getDosVersion must be a synchronous external DOS version provider');
  if(getDeviceInfo!==undefined&&typeof getDeviceInfo!=='function')
    throw new TypeError('getDeviceInfo must be a synchronous external DOS IOCTL provider');
  if(getCurrentDrive!==undefined&&typeof getCurrentDrive!=='function')
    throw new TypeError('getCurrentDrive must be a synchronous external DOS drive provider');
  if(allocateMemory!==undefined&&typeof allocateMemory!=='function')
    throw new TypeError('allocateMemory must be a synchronous external DOS MCB allocator');
  if(resetDisk!==undefined&&typeof resetDisk!=='function')
    throw new TypeError('resetDisk must be a synchronous external DOS disk device callback');
  if(stayResident&&typeof pspSegment!=='function'&&
     (!Number.isInteger(pspSegment)||pspSegment<0||pspSegment>0xffff))
    throw new RangeError('DOS TSR current PSP segment must be explicit uint16 or a synchronous resolver');
  // No host file provider => no DOS file service; never synthesize original assets.
  const fileHandler=readOriginalFile===undefined?null:
    createDosReadOnlyFileHandler(cpu,readOriginalFile,{onFileEvent});
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
    if(ah===0x06){
      // DOS 21h/06h is direct console output (DL!=FFh) or nonblocking
      // input (DL=FFh). No keyboard/video state is manufactured here.
      if(!directConsoleIO)
        throw new Error('DOS AH06 requires an external console device: fail closed');
      const dl=cpu.get8('DL');
      const read=dl===0xff;
      const response=directConsoleIO(Object.freeze(read?
        {operation:'input'}:{operation:'output',character:dl}),cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async DOS direct console device: fail closed');
      if(!read){
        if(response!==undefined)
          throw new Error('DOS console output must not fabricate device status');
        // DOS 2.1-7.0 returns the actual character in AL (RBIL 2106).
        cpu.set8('AL',dl);
        return;
      }
      if(!response||typeof response!=='object'||Array.isArray(response)||
         typeof response.available!=='boolean')
        throw new Error('DOS console input requires explicit availability: fail closed');
      if(response.available){
        const ch=response.character;
        if(!Number.isInteger(ch)||ch<0||ch>255)
          throw new Error('DOS console input character must be uint8');
        cpu.set8('AL',ch);
        cpu.set16('FLAGS',cpu.get16('FLAGS')&~0x40);
      }else{
        if(response.character!==undefined)
          throw new Error('DOS console no-input cannot carry character');
        cpu.set8('AL',0);
        cpu.set16('FLAGS',cpu.get16('FLAGS')|0x40);
      }
      return;
    }
    if(ah===0x09){
      // DOS AH09 prints DS:DX '$'-terminated bytes without guessed codepage.
      // Read with 16-bit real-mode offset wrap, bounded to a full segment.
      if(!directConsoleIO)
        throw new Error('DOS AH09 requires an external console device: fail closed');
      const segment=cpu.get16('DS'),offset=cpu.get16('DX'),bytes=[];
      let terminator=false;
      for(let i=0;i<0x10000;i++){
        const b=cpu.read8(segment,(offset+i)&0xffff);
        if(b===0x24){terminator=true;break;}
        bytes.push(b);
      }
      if(!terminator)
        throw new Error('DOS AH09 string missing $ terminator within segment: fail closed');
      const event=Object.freeze({operation:'string-output',segment,offset,
        bytes:Uint8Array.from(bytes)});
      const response=directConsoleIO(event,cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async DOS AH09 console device: fail closed');
      if(response!==undefined)
        throw new Error('DOS AH09 console output must not synthesize status');
      // Actual DOS 2.1-7.0 documented by RBIL: AL=24h on return.
      cpu.set8('AL',0x24);
      return;
    }
    if(ah===0x0d){
      // DOS INT21 AH0Dh disk reset/flush does not return a synthesized
      // status; original DOS disk buffers and timing belong to provider.
      if(!resetDisk)
        throw new Error('DOS AH0D requires an external disk reset device: fail closed');
      const response=resetDisk(Object.freeze({service:0x0d}),cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async DOS AH0D disk reset: fail closed');
      if(response!==undefined)
        throw new Error('DOS AH0D disk reset device must not fabricate registers');
      return;
    }
    if(ah===0x19){
      // DOS current drive: AL=0 for A:, 1 for B:, etc. DOS owns the
      // current drive/PSP environment; never manufacture a default C:.
      if(!getCurrentDrive)
        throw new Error('DOS AH19 needs an external current-drive snapshot: fail closed');
      const response=getCurrentDrive(Object.freeze({service:0x19}),cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async DOS current-drive provider: fail closed');
      if(!response||typeof response!=='object'||Array.isArray(response)||
         !Number.isInteger(response.drive)||response.drive<0||response.drive>25)
        throw new Error('DOS AH19 drive must be an explicit 0..25 value: fail closed');
      cpu.set8('AL',response.drive);
      return;
    }
    if(ah===0x25){
      // AH=25h AL=vector, DS:DX=guest handler address. KOEI.COM uses
      // AX=2524h to install its own DOS critical-error INT 24h handler.
      // No unknown DOS IVT default or host adapter is manufactured.
      cpu.setGuestInterruptVector(cpu.get8('AL'),cpu.get16('DS'),cpu.get16('DX'));
      return;
    }
    if(ah===0x30){
      // DOS 2.x+ INT21 AH30: AL=major AH=minor BH=OEM number,
      // BL/CX=24-bit serial. NO guessed DOS version or distribution;
      // the provider must supply each field from an external DOS snapshot.
      if(!getDosVersion)
        throw new Error('unsupported DOS INT 21h AH=30: DOS AH30 requires external DOS-version snapshot: fail closed');
      const value=getDosVersion(Object.freeze({requestAL:cpu.get8('AL')}),cpu);
      if(value&&typeof value.then==='function')
        throw new Error('async DOS version provider: fail closed');
      if(!value||typeof value!=='object'||Array.isArray(value))
        throw new Error('DOS version provider must supply explicit registers');
      const names=['major','minor','oem','serialHigh','serialLow'];
      if(names.some(name=>!Object.hasOwn(value,name)))
        throw new Error('DOS version snapshot missing a register: fail closed');
      const major=byte(value.major,'DOS major'),
        minor=byte(value.minor,'DOS minor'),
        oem=byte(value.oem,'DOS OEM'),
        serialHigh=byte(value.serialHigh,'DOS serial high');
      const serialLow=value.serialLow;
      if(!Number.isInteger(serialLow)||serialLow<0||serialLow>0xffff)
        throw new RangeError('DOS serial low must be uint16');
      cpu.set8('AL',major);cpu.set8('AH',minor);
      cpu.set8('BH',oem);cpu.set8('BL',serialHigh);
      cpu.set16('CX',serialLow);
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
    if(ah===0x44){
      // DOS IOCTL AL00 returns DX device-info bits for a caller-owned handle.
      // OPEN.EXE queries this during startup. Device classification must
      // come from the original DOS handle table, never guessed as console.
      if(cpu.get8('AL')!==0)
        throw new Error('unsupported DOS IOCTL subfunction: fail closed');
      if(!getDeviceInfo)
        throw new Error('DOS AH44 AL00 requires external handle table: fail closed');
      const handle=cpu.get16('BX');
      const result=getDeviceInfo(Object.freeze({handle}),cpu);
      if(result&&typeof result.then==='function')
        throw new Error('async DOS IOCTL device provider: fail closed');
      if(!result||typeof result!=='object'||Array.isArray(result))
        throw new Error('DOS IOCTL provider requires explicit handle info');
      if(Object.hasOwn(result,'errorCode')){
        const error=result.errorCode;
        if(!Number.isInteger(error)||error<1||error>0xffff)
          throw new RangeError('DOS IOCTL error code must be nonzero uint16');
        cpu.set16('AX',error);
        cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
        return;
      }
      const info=result.deviceInfo;
      if(!Number.isInteger(info)||info<0||info>0xffff)
        throw new RangeError('DOS IOCTL DX deviceInfo must be uint16');
      cpu.set16('DX',info);
      cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
      return;
    }
    if(ah===0x48){
      // DOS AH48 allocates BX paragraphs; on success AX is segment, CF=0.
      // MCB ownership, free list, and zeroed/uninitialized memory are NOT
      // invented. A verified caller-owned allocator must supply the block.
      if(!allocateMemory)
        throw new Error('DOS AH48 requires an external MCB allocator: fail closed');
      const paragraphs=cpu.get16('BX');
      const result=allocateMemory(Object.freeze({paragraphs}),cpu);
      if(result&&typeof result.then==='function')
        throw new Error('async DOS AH48 allocator: fail closed');
      if(!result||typeof result!=='object'||Array.isArray(result))
        throw new Error('DOS AH48 requires explicit memory allocation result');
      if(Object.hasOwn(result,'errorCode')){
        const error=result.errorCode;
        if(error!==7&&error!==8)
          throw new Error('DOS AH48 error must be 07h or 08h: fail closed');
        if(error===8){
          const max=result.maxAvailableParagraphs;
          if(!Number.isInteger(max)||max<0||max>0xffff)
            throw new Error('DOS AH48 failure requires available paragraph maximum');
          cpu.set16('BX',max);
        }
        cpu.set16('AX',error);
        cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
        return;
      }
      const segment=result.segment;
      if(!paragraphs||!Number.isInteger(segment)||segment<0||segment>0xffff||
         segment*16+paragraphs*16>cpu.memory.length)
        throw new Error('DOS AH48 allocated segment outside guest physical memory: fail closed');
      cpu.set16('AX',segment);
      cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
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
    if(ah===0x31){
      // Original FMDRV.COM calls AX=3101h, DX=0026h after hooking INT 66h,
      // INT 08h, PIT, and probing OPL status. This boundary does not install
      // a fake resident driver: only a verified external DOS MCB owner may
      // acknowledge retaining PSP+DX paragraphs and the original byte image.
      if(!stayResident)
        throw new Error('DOS AH31 requires explicit resident memory owner: fail closed');
      const paragraphs=cpu.get16('DX'),returnCode=cpu.get8('AL');
      if(!paragraphs)
        throw new Error('DOS AH31 zero resident paragraph count: fail closed');
      const currentPsp=typeof pspSegment==='function'?pspSegment():pspSegment;
      if(!Number.isInteger(currentPsp)||currentPsp<0||currentPsp>0xffff)
        throw new RangeError('DOS AH31 current process PSP must resolve to uint16: fail closed');
      const request=Object.freeze({pspSegment:currentPsp,paragraphs,returnCode});
      const response=stayResident(request,cpu);
      if(response&&typeof response.then==='function')
        throw new Error('async DOS AH31 residency owner: fail closed');
      if(!response||typeof response!=='object'||response.resident!==true)
        throw new Error('DOS AH31 residency owner must explicitly acknowledge: fail closed');
      cpu.terminated=Object.freeze({terminationType:3,returnCode,
        residentParagraphs:paragraphs,pspSegment:currentPsp});
      return;
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
