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
export function createDosReadOnlyFileHandler(cpu, readOriginalFile,{onFileEvent,getCurrentPsp}={}) {
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
  // DOS JFT handle numbers belong to a specific PSP, while inherited
  // entries point to the same seek cursor. Unscoped mode preserves existing
  // single-process users until a verified DOS PSP resolver is available.
  if(getCurrentPsp!==undefined&&typeof getCurrentPsp!=='function')
    throw new TypeError('DOS file PSP resolver must be synchronous');
  const legacyOpen=new Map(),processTables=new Map();
  const checkPsp=(psp,label)=>{
    if(!Number.isInteger(psp)||psp<0||psp>0xffff)
      throw new RangeError(label+' must be explicit uint16');
    return psp;
  };
  const scoped=getCurrentPsp!==undefined;
  const handles=()=>{
    if(!scoped)return {table:legacyOpen,psp:null};
    const psp=getCurrentPsp();
    if(psp&&typeof psp.then==='function')
      throw new Error('async DOS file PSP resolver: fail closed');
    checkPsp(psp,'current DOS file PSP');
    if(!processTables.has(psp))processTables.set(psp,new Map());
    return {table:processTables.get(psp),psp};
  };
  const inherit=(parentPsp,childPsp)=>{
    if(!scoped)throw new Error('DOS file inheritance requires explicit PSP resolver');
    checkPsp(parentPsp,'parent DOS PSP');checkPsp(childPsp,'child DOS PSP');
    if(parentPsp===childPsp||!processTables.has(parentPsp)||processTables.has(childPsp))
      throw new Error('DOS file inheritance requires existing parent and new child PSP: fail closed');
    const copy=new Map(processTables.get(parentPsp)); // shared descriptors, isolated handle tables
    processTables.set(childPsp,copy);
    return copy.size;
  };
  const release=psp=>{
    if(!scoped)throw new Error('DOS file cleanup requires explicit PSP resolver');
    checkPsp(psp,'closing DOS PSP');
    if(!processTables.has(psp))throw new Error('unknown DOS file PSP on release: fail closed');
    const count=processTables.get(psp).size;
    processTables.delete(psp);
    return count;
  };
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
  const get=table=>{
    const file=table.get(cpu.get16('BX'));
    if(!file){fail(6);return null;} // DOS invalid file handle
    return file;
  };
  const handle=ah=>{
    if(![0x3d,0x3e,0x3f,0x42,0x45,0x46].includes(ah))return false;
    const {table,psp}=handles();
    // A process-scoped DOS JFT number is ambiguous without its PSP.
    // Never infer a PSP from CS, DS or guessed executable boundaries.
    const emitFileEvent=e=>emit(scoped?{...e,psp}:e);
    if(ah===0x45||ah===0x46){
      // DOS 2+ DUP/FORCEDUP JFT entries must reference the *same* SFT
      // cursor, not a copied file position. This bounded adapter only
      // owns original-file handles 5..36; standard devices 0..4 and
      // arbitrary DOS JFT expansion remain with the external DOS owner.
      const sourceHandle=cpu.get16('BX'),file=get(table);
      if(!file)return true;
      if(ah===0x45){
        let duplicate=5;
        while(table.has(duplicate)&&duplicate<37)duplicate++;
        if(duplicate>=37){fail(4);return true;}
        table.set(duplicate,file);
        cpu.set16('AX',duplicate);ok();
        emitFileEvent({operation:'duplicate',filename:file.filename,
          sourceHandle,handle:duplicate,position:file.position});
        return true;
      }
      const destination=cpu.get16('CX');
      if(destination<5)
        throw new Error('DOS forced duplicate of external standard device needs DOS JFT owner: fail closed');
      if(destination>=37){fail(6);return true;}
      if(sourceHandle===destination)
        throw new Error('DOS forced duplicate source equals destination is unverified: fail closed');
      const replaced=table.get(destination);
      table.set(destination,file); // implicit close of the old JFT entry
      ok(); // AH46 success specifies CF only; preserve AX
      emitFileEvent({operation:'force-duplicate',filename:file.filename,
        sourceHandle,handle:destination,replacedFilename:replaced?.filename??null,
        position:file.position});
      return true;
    }
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
      while(table.has(handle)&&handle<37)handle++;
      if(handle>=37){fail(4);return true;} // DOS too many open files
      table.set(handle,{bytes:Uint8Array.from(supplied.bytes),position:0,filename:name.filename});
      cpu.set16('AX',handle);ok();
      emitFileEvent({operation:'open',filename:name.filename,handle,fileBytes:supplied.bytes.length});
      return true;
    }
    const file=get(table);
    if(!file)return true;
    if(ah===0x3e){
      const handle=cpu.get16('BX');
      table.delete(handle);ok();
      emitFileEvent({operation:'close',filename:file.filename,handle,position:file.position});
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
      emitFileEvent({operation:'read',filename:file.filename,handle:cpu.get16('BX'),
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
    emitFileEvent({operation:'seek',filename:file.filename,handle:cpu.get16('BX'),
      previousPosition,position,origin,displacement});
    return true;
  };
  handle.inheritForChild=inherit;
  handle.releaseForProcess=release;
  return handle;
}
