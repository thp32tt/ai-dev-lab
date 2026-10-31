// Opt-in, read-only DOS INT 21h file boundary for supplied ORIGINAL bytes.
// This adapter does NOT enumerate, normalize or fabricate assets; the caller
// resolves the exact DOS pathname bytes and supplies an immutable snapshot.
// No write/rename/delete/save operations are supported or silently emulated.
import {RealMode8086} from './realmode-8086.js';

const code = (value, label) => {
  if(!Number.isInteger(value)||value<1||value>0xffff)
    throw new RangeError(label+' must be nonzero DOS error uint16');
  return value;
};
export function createDosReadOnlyFileHandler(cpu, readOriginalFile,{onFileEvent}={}) {
  if(!(cpu instanceof RealMode8086))
    throw new TypeError('DOS file boundary requires RealMode8086');
  if(typeof readOriginalFile!=='function')
    throw new TypeError('readOriginalFile must be a synchronous original-byte resolver');
  if(onFileEvent!==undefined&&typeof onFileEvent!=='function')
    throw new TypeError('DOS file event observer must be synchronous');
  const emit=e=>{
    if(onFileEvent===undefined)return;
    const response=onFileEvent(Object.freeze(e),cpu);
    if(response&&typeof response.then==='function')
      throw new Error('async DOS file event observer: fail closed');
    if(response!==undefined)
      throw new Error('DOS file event observer must not fabricate file status');
  };
  const open=new Map();
  const fail=error=>{
    cpu.set16('AX',code(error,'DOS file error'));
    cpu.set16('FLAGS',cpu.get16('FLAGS')|1);
  };
  const ok=()=>{
    cpu.set16('FLAGS',cpu.get16('FLAGS')&~1);
  };
  const pathname=()=>{
    const bytes=[],segment=cpu.get16('DS'),offset=cpu.get16('DX');
    for(let i=0;i<260;i++){
      const b=cpu.read8(segment,(offset+i)&0xffff);
      if(!b){
        if(!bytes.length)throw new Error('DOS file pathname empty: fail closed');
        const raw=Uint8Array.from(bytes);
        return Object.freeze({raw,filename:String.fromCharCode(...raw)});
      }
      bytes.push(b);
    }
    throw new Error('DOS file pathname unterminated: fail closed');
  };
  const get=()=>{
    const file=open.get(cpu.get16('BX'));
    if(!file){fail(6);return null;} // DOS invalid file handle
    return file;
  };
  return ah=>{
    if(ah!==0x3d&&ah!==0x3e&&ah!==0x3f&&ah!==0x42)return false;
    if(ah===0x3d){
      // Only read-only AL=00 is supported; sharing, writes and flags are not
      // invented in the absence of original DOS reference semantics.
      if(cpu.get8('AL')!==0)
        throw new Error('DOS open mode other than read-only 3D00h: fail closed');
      const name=pathname();
      const supplied=readOriginalFile(name);
      if(supplied&&typeof supplied.then==='function')
        throw new Error('async DOS original file resolver: fail closed');
      if(supplied===null||supplied===undefined){fail(2);return true;}
      if(supplied&&typeof supplied==='object'&&Object.hasOwn(supplied,'errorCode')){
        fail(supplied.errorCode);return true;
      }
      if(!supplied||!(supplied.bytes instanceof Uint8Array))
        throw new Error('original DOS file requires {bytes:Uint8Array}: fail closed');
      if(supplied.bytes.length>0x7fffffff)
        throw new RangeError('original DOS file too large for bounded adapter');
      let handle=5;
      while(open.has(handle)&&handle<37)handle++;
      if(handle>=37){fail(4);return true;} // DOS too many open files
      open.set(handle,{bytes:Uint8Array.from(supplied.bytes),position:0,filename:name.filename});
      cpu.set16('AX',handle);ok();
      emit({operation:'open',filename:name.filename,handle,fileBytes:supplied.bytes.length});
      return true;
    }
    const file=get();
    if(!file)return true;
    if(ah===0x3e){
      const handle=cpu.get16('BX');
      open.delete(handle);ok();
      emit({operation:'close',filename:file.filename,handle,position:file.position});
      return true;
    }
    if(ah===0x3f){
      const count=cpu.get16('CX'),offset=cpu.get16('DX');
      if(count>0x10000-offset)
        throw new Error('DOS read buffer crosses 16-bit segment boundary: fail closed');
      const physical=cpu.physical(cpu.get16('DS'),offset);
      if(physical+count>cpu.memory.length)
        throw new Error('DOS read buffer crosses 20-bit memory boundary: fail closed');
      const fileOffset=file.position;
      const length=Math.min(count,Math.max(0,file.bytes.length-file.position));
      // Resolve and bound the entire transfer before mutating guest memory.
      if(length)cpu.memory.set(file.bytes.subarray(file.position,file.position+length),physical);
      file.position+=length;
      cpu.set16('AX',length);ok();
      emit({operation:'read',filename:file.filename,handle:cpu.get16('BX'),
        fileOffset,requested:count,readBytes:length,
        segment:cpu.get16('DS'),offset,physical});
      return true;
    }
    // AH=42h, AL=0/1/2 origin; CX:DX signed 32-bit displacement.
    const origin=cpu.get8('AL');
    if(origin>2){fail(1);return true;}
    const unsigned=cpu.get16('CX')*0x10000+cpu.get16('DX');
    const displacement=unsigned>=0x80000000?unsigned-0x100000000:unsigned;
    const base=origin===0?0:origin===1?file.position:file.bytes.length;
    const position=base+displacement;
    if(position<0||position>0xffffffff){fail(1);return true;}
    const previousPosition=file.position;
    file.position=position;
    cpu.set16('AX',position&0xffff);
    cpu.set16('DX',Math.floor(position/0x10000));
    ok();
    emit({operation:'seek',filename:file.filename,handle:cpu.get16('BX'),
      previousPosition,position,origin,displacement});
    return true;
  };
}
