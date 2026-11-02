// Run the source-authenticated Korean MAIN.EXE raw 0x1B49B initializer
// only through its internal map/bitfield loops. We deliberately STOP at
// the unresolved relocated FAR CALL at 0x1B4F1; no fake DOS callee return.
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';
import {rawToMainRea} from './original-new-game-call-ledger.mjs';

export const ORIGINAL_INIT_RAW_START=0x1b49b;
export const ORIGINAL_INIT_FAR_CALL=0x1b4f1;
export const ORIGINAL_INIT_RAW_END=0x1b4f9;
const hex=x=>x.toString(16);
const u16=x=>Number.isInteger(x)&&x>=0&&x<=65535;

export function verifyOriginalMainInitPrefix(bytes,ghidra,{
 loadSegment=0x2000
}={}){
 if(!(bytes instanceof Uint8Array)||
    createHash('sha256').update(bytes).digest('hex')!==
    MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('original Korean MAIN source SHA-256 mismatch');
 if(!ghidra||ghidra.moduleName!=='MAIN.EXE'||
    ghidra.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
    ghidra.loadBase!==0x10000||
    ghidra.windowStart!==0x10000||ghidra.windowEnd!==0x20000||
    !Array.isArray(ghidra.instructions)||!u16(loadSegment))
  throw new Error('original Ghidra MAIN source window invalid');
 const headerBytes=inspectMzForLoad(bytes).headerBytes;
 if(headerBytes!==0x5400||bytes.length<ORIGINAL_INIT_RAW_END)
  throw new Error('original MZ header incompatible with MAIN initializer');
 // An unresolved FAR callee makes stopping here mandatory.
 if(bytes[ORIGINAL_INIT_FAR_CALL]!==0x9a||
   bytes[ORIGINAL_INIT_RAW_END-1]!==0xcb)
  throw new Error('unresolved initializer far-call boundary changed');
 const byRea=new Map();
 for(const item of ghidra.instructions){
  if(item?.reaAddress>=rawToMainRea(ORIGINAL_INIT_RAW_START)&&
     item.reaAddress<rawToMainRea(ORIGINAL_INIT_FAR_CALL)){
   if(byRea.has(item.reaAddress))throw new Error('duplicate Ghidra initializer boundary');
   byRea.set(item.reaAddress,item);
  }
 }
 const physicalStart=loadSegment*16+ORIGINAL_INIT_RAW_START-headerBytes;
 const physicalStop=loadSegment*16+ORIGINAL_INIT_FAR_CALL-headerBytes;
 const starts=new Set();
 for(let cursor=ORIGINAL_INIT_RAW_START;cursor<ORIGINAL_INIT_FAR_CALL;){
  const item=byRea.get(rawToMainRea(cursor));
  if(!item||!Number.isSafeInteger(item.length)||item.length<1||
     item.length>15||cursor+item.length>ORIGINAL_INIT_FAR_CALL)
   throw new Error('original initializer instruction coverage incomplete at '+hex(cursor));
  if(item.flow==='CALL_FAR'||item.flow==='CALL_NEAR'||item.flow==='RETURN')
   throw new Error('initializer contains early external call or return');
  if(item.targetRea!==undefined&&
     (item.targetRea<rawToMainRea(ORIGINAL_INIT_RAW_START)||
      item.targetRea>=rawToMainRea(ORIGINAL_INIT_FAR_CALL)||
      !ghidra.instructions.some(q=>q.reaAddress===item.targetRea)))
   throw new Error('initializer branch escapes source-backed prefix');
  starts.add(physicalStart+cursor-ORIGINAL_INIT_RAW_START);
  cursor+=item.length;
 }
 return Object.freeze({
  starts,sourcePhysical:physicalStart,stopPhysical:physicalStop,
  startCS:loadSegment+0x1000,startIP:0x609b,
  headerBytes,loadSegment,farCallOpcode:0x9a
 });
}

export function executeMainInitSourcePrefix(cpu,bytes,proof,{
 ds=0x7000,ss=0x8000,sp=0x8000,maxSteps=12000
}={}){
 if(!(cpu instanceof RealMode8086)||!(bytes instanceof Uint8Array)||
    !proof?.starts||!u16(ds)||!u16(ss)||!u16(sp)||
    !Number.isSafeInteger(maxSteps)||maxSteps<1||maxSteps>25000||
    cpu.physical(proof.startCS,proof.startIP)!==proof.sourcePhysical||
    proof.stopPhysical-proof.sourcePhysical!==
    ORIGINAL_INIT_FAR_CALL-ORIGINAL_INIT_RAW_START)
  throw new Error('source-authenticated initializer CPU/provenance required');
 for(let i=0;i<ORIGINAL_INIT_FAR_CALL-ORIGINAL_INIT_RAW_START;i++)
  if(cpu.memory[proof.sourcePhysical+i]!==bytes[ORIGINAL_INIT_RAW_START+i])
   throw new Error('original initializer guest code mutated');
 if(cpu.memory[proof.stopPhysical]!==0x9a)
  throw new Error('original initializer unresolved far call altered');
 const stack=cpu.physical(ss,sp-4),memoryStart=cpu.physical(ds,0);
 if(sp<4||stack+4>=cpu.memory.length||
    memoryStart+0x10000>cpu.memory.length||
    !(stack+4<=proof.sourcePhysical||stack>=proof.stopPhysical)||
    !(memoryStart+0x10000<=proof.sourcePhysical||memoryStart>=proof.stopPhysical))
  throw new Error('guest synthetic state aliases original initializer code');
 cpu.set16('DS',ds);cpu.set16('SS',ss);cpu.set16('SP',sp);
 cpu.set16('CS',proof.startCS);cpu.set16('IP',proof.startIP);
 cpu.set16('FLAGS',0x202);
 cpu.write16(ds,0x0f9a,0);
 // The caller owns DS:0x0D73..0x0F8E memory and may prefill it.
 let steps=0;
 for(;steps<maxSteps;steps++){
  const pos=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(pos===proof.stopPhysical&&cpu.get16('CS')===proof.startCS&&
     cpu.get16('IP')===0x60f1)break;
  if(!proof.starts.has(pos))
   throw new Error('8086 initializer crossed unresolved original branch');
  cpu.step();
 }
 if(steps===maxSteps||cpu.get16('CS')!==proof.startCS||
    cpu.get16('IP')!==0x60f1||
    cpu.get16('SP')!==sp-4)
  throw new Error('original initializer failed to reach unresolved FAR boundary');
 const count=cpu.read16(ds,0x0f9a);
 const output=Uint8Array.from({length:540},(_,i)=>cpu.read8(ds,0x0d73+i));
 return Object.freeze({steps,stoppedAtRaw:ORIGINAL_INIT_FAR_CALL,
   seededBytes:540,sourceCounter:count,output,
   completeNewGame:false,unresolvedOriginalFarCall:true});
}

export async function probeOriginalMainInitPrefix(bytes,ghidra,{
 loadSegment=0x2000,fill=0xa5
}={}){
 if(!u16(fill)||fill>255)throw new Error('byte seed required');
 const proof=verifyOriginalMainInitPrefix(bytes,ghidra,{loadSegment});
 const mz=inspectMzForLoad(bytes);
 const cpu=new RealMode8086();
 await loadVerifiedMz(cpu,bytes,{
  loadSegment,pspSegment:0x1000,
  allocationParagraphs:Math.max(Math.ceil(mz.imageBytes/16)+mz.minExtra,
   Math.ceil((mz.ss*16+mz.sp)/16)),
  expectedSha256:MAIN_NEW_GAME_SOURCE_SHA256
 });
 for(let i=0;i<540;i++)cpu.write8(0x7000,0x0d73+i,fill);
 cpu.write8(0x7000,0x0d72,0x7e);
 cpu.write8(0x7000,0x0f8f,0x6b);
 const r=executeMainInitSourcePrefix(cpu,bytes,proof);
 if(cpu.read8(0x7000,0x0d72)!==0x7e||
    cpu.read8(0x7000,0x0f8f)!==0x6b)
  throw new Error('original prefix corrupted guard bytes');
 if(!r.output.some(v=>v!==0)||r.sourceCounter<1)
  throw new Error('original source did not execute its region bitfield');
 return Object.freeze({...r,outputSha256:createHash('sha256').update(r.output).digest('hex'),
  outputNonzero:r.output.filter(Boolean).length,output:undefined,
  verifiedInstructionStarts:proof.starts.size,
  originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  originalDOSReferenceRun:false});
}