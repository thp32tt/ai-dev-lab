#!/usr/bin/env node
// Authenticated Korean MAIN.EXE 8086 new-game map initializer:
// 0x1B49B source bitfield loop -> original relocated 9A 0x1B4F1
// -> callee 0x27E32 -> relocated 9A 0x27E3D
// -> callee 0x3A879 -> PUSH CS / original E8 0x3A87B
// -> genuine 0x3A566 helper -> authentic RETF to 0x3A87E.
// Stops there; no invented return from the remaining unknown DOS calls.
// Synthetic DS argument and stack are explicit and are NOT original gameplay.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';
import {rawToMainRea} from './original-new-game-call-ledger.mjs';
import {verifyOriginalMainInitPrefix,executeMainInitSourcePrefix}
 from './original-main-map-init-cpu-probe.mjs';

const FIRST_CALL=0x1b4f1,FIRST_TARGET=0x27e32;
const SECOND_CALL=0x27e3d,SECOND_TARGET=0x3a879;
const NEAR_CALL=0x3a87b,NEAR_TARGET=0x3a566;
const NEAR_RETURN=0x3a87e,HELPER_END=0x3a584;
const SECOND_CALLEE_RETURN=0x27e42,SECOND_TAIL_END=0x3a8a8;
const FIRST_CALLEE_RETURN=0x1b4f6,FIRST_TAIL_END=0x27eca;
const PARENT_ENTRY=0x1b66a,PARENT_E8=0x1b66b,PARENT_RETURN=0x1b66e;
const MAP_INIT_RETURN=0x1b4f8;
const OWNER_FILL_SELECT=0x1b671,OWNER_FILL_BEGIN=0x1b66e;
const OWNER_FILL_END=0x1b694,OWNER_FILL_LENGTH=0x300;
const TYPE_ONE_SELECTOR_CALL=0x3a892;
const TYPE_ONE_HELPER_START=0x3a846,TYPE_ONE_HELPER_END=0x3a879;
const TYPE_ONE_NESTED_UNVERIFIED_CALL=0x3a866;
const HEADER=0x5400;
const u16=x=>Number.isSafeInteger(x)&&x>=0&&x<=0xffff;
const word=(data,i)=>data[i]|(data[i+1]<<8);
export const ORIGINAL_MAP_FAR_CHAIN=Object.freeze({
 firstCall:FIRST_CALL,firstTarget:FIRST_TARGET,
 secondCall:SECOND_CALL,secondTarget:SECOND_TARGET,
 nearCall:NEAR_CALL,nearTarget:NEAR_TARGET,
 nearReturn:NEAR_RETURN
});
const physically=(loadSegment,raw)=>loadSegment*16+raw-HEADER;

function indexPart(part,start,end){
 if(!part||part.moduleName!=='MAIN.EXE'||part.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
   part.loadBase!==0x10000||part.windowStart!==start||
   part.windowEnd!==end||!Array.isArray(part.instructions))
  throw new Error('Korean Ghidra source window provenance invalid');
 const map=new Map();
 for(const i of part.instructions){
  if(!Number.isSafeInteger(i?.reaAddress)||!Number.isSafeInteger(i?.length)||
     i.length<1||i.length>15||typeof i.flow!=='string'||
     map.has(i.reaAddress))
   throw new Error('Ghidra instruction boundary duplicated/malformed');
  map.set(i.reaAddress,i);
 }
 return map;
}
function expectOpcode(map,raw,bytes,flow,length){
 const i=map.get(rawToMainRea(raw));
 if(!i||i.flow!==flow||i.length!==length||
   !Array.from(bytes.subarray(raw,raw+length)).every(v=>Number.isInteger(v)))
  throw new Error('original MAIN Ghidra source opcode/boundary changed at '+raw.toString(16));
 return i;
}
function callRecord(bytes,mz,map,raw,destRaw,loadSegment){
 expectOpcode(map,raw,bytes,'CALL_FAR',5);
 if(bytes[raw]!==0x9a||
   mz.entries.filter(e=>e.relative===raw+3-HEADER).length!==1)
  throw new Error('original MZ relocated FAR CALL lacks unique relocation');
 const off=word(bytes,raw+1),seg=word(bytes,raw+3);
 if(HEADER+seg*16+off!==destRaw||
    physically(loadSegment,destRaw)!==((loadSegment+seg)*16+off))
  throw new Error('original relocated FAR target diverged from Ghidra evidence');
 return Object.freeze({raw,destRaw,off,seg});
}
function covered(map,from,to,bytes,{endFlow='RETURN'}={}){
 const starts=new Set();
 let returns=0;
 for(let pos=from;pos<to;){
  const inst=map.get(rawToMainRea(pos));
  if(!inst||inst.length<1||pos+inst.length>to)
   throw new Error('original callee instruction coverage incomplete: '+pos.toString(16));
  if(inst.flow==='CALL_FAR'||inst.flow==='CALL_NEAR')
   throw new Error('unverified internal helper calls another source');
  if(Number.isSafeInteger(inst.targetRea)&&
     (inst.targetRea<rawToMainRea(from)||inst.targetRea>=rawToMainRea(to)||
      !map.has(inst.targetRea)))
   throw new Error('original helper branch target outside verified source');
  if(inst.flow==='RETURN')returns++;
  starts.add(pos);
  pos+=inst.length;
 }
 if(endFlow==='RETURN'&&(returns!==1||bytes[to-1]!==0xcb))
  throw new Error('original helper far-return not source-authenticated');
 return starts;
}
export function verifyOriginalMainFarChain(bytes,parts,{loadSegment=0x2000}={}){
 if(!(bytes instanceof Uint8Array)||
    createHash('sha256').update(bytes).digest('hex')!==
    MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('Korean MAIN.EXE original SHA-256 mismatch');
 if(!u16(loadSegment)||loadSegment>0x5000||
    !Array.isArray(parts)||parts.length!==3)
  throw new Error('three original Korean Ghidra source windows required');
 const first=verifyOriginalMainInitPrefix(bytes,parts[0],{loadSegment});
 const mz=inspectMzForLoad(bytes);
 if(mz.headerBytes!==HEADER||mz.entries.length!==5245)
  throw new Error('original MAIN relocations unexpectedly changed');
 const m2=indexPart(parts[1],0x20000,0x30000);
 const m3=indexPart(parts[2],0x30000,0x40000);
 const m1=new Map(parts[0].instructions.map(i=>[i.reaAddress,i]));
 // Original parent CALL is PUSH CS; E8, and its callee uses RETF.
 // This exact pairing allows a true source-produced far return frame,
 // rather than placing guessed return words on the synthetic SS stack.
 expectOpcode(m1,PARENT_ENTRY,bytes,'FALLTHROUGH',1);
 const parentNear=expectOpcode(m1,PARENT_E8,bytes,'CALL_NEAR',3);
 const displacement=word(bytes,PARENT_E8+1);
 const signed=displacement>=0x8000?displacement-0x10000:displacement;
 if(bytes[PARENT_ENTRY]!==0x0e||bytes[PARENT_E8]!==0xe8||
    PARENT_E8+3+signed!==0x1b49b||
    parentNear.targetRea!==rawToMainRea(0x1b49b))
  throw new Error('original parent PUSH CS/E8 does not target MAIN initializer');
 for(const [pos,opcode] of [[0x1b4f6,0x5e],[0x1b4f7,0x5f],[MAP_INIT_RETURN,0xcb]]){
  expectOpcode(m1,pos,bytes,pos===MAP_INIT_RETURN?'RETURN':'FALLTHROUGH',1);
  if(bytes[pos]!==opcode)
   throw new Error('original initializer final POP/RETF changed');
 }
 const firstCall=callRecord(bytes,mz,m1,
  FIRST_CALL,FIRST_TARGET,loadSegment);
 const secondCall=callRecord(bytes,mz,m2,SECOND_CALL,SECOND_TARGET,loadSegment);
 const ownerFillCall=callRecord(bytes,mz,m1,OWNER_FILL_SELECT,
  SECOND_TARGET,loadSegment);
 // Original parent: DS:[0C16] index -> already authenticated
 // relocated selector -> returned AX segment -> ES:0000..02FF := FF.
 const ownerFillStarts=new Set();
 for(let raw=OWNER_FILL_BEGIN;raw<OWNER_FILL_END;){
  const inst=m1.get(rawToMainRea(raw));
  if(!inst||!Number.isSafeInteger(inst.length)||inst.length<1||
     raw+inst.length>OWNER_FILL_END)
   throw new Error('original ES-fill owner Ghidra coverage incomplete');
  if(inst.flow==='CALL_NEAR'||inst.flow==='RETURN'||inst.flow==='INTERRUPT'||
     (inst.flow==='CALL_FAR'&&raw!==OWNER_FILL_SELECT))
   throw new Error('original ES-fill owner unexpected control transfer');
  if(Number.isSafeInteger(inst.targetRea)&&
     (inst.targetRea<rawToMainRea(OWNER_FILL_BEGIN)||
      inst.targetRea>=rawToMainRea(OWNER_FILL_END)||
      !m1.has(inst.targetRea)))
   throw new Error('original ES-fill loop exits source-authenticated region');
  ownerFillStarts.add(raw);raw+=inst.length;
 }
 if(ownerFillStarts.size!==12||bytes[OWNER_FILL_BEGIN]!==0xa1||
    bytes[0x1b683]!==0x8b||bytes[0x1b686]!==0x26||
    bytes[0x1b68a]!==0xff||bytes[0x1b68e]!==0x81||
    bytes[0x1b692]!==0x7c)
  throw new Error('original ES:768-byte loop source bytes changed');
 for(const [pos,len] of [[0x27e32,1],[0x27e33,2],
   [0x27e35,3],[0x27e38,1],[0x27e39,1],[0x27e3a,3]])
  expectOpcode(m2,pos,bytes,'FALLTHROUGH',len);
 for(const [pos,len] of [[SECOND_TARGET,1],[SECOND_TARGET+1,1]])
  expectOpcode(m3,pos,bytes,'FALLTHROUGH',len);
 const near=expectOpcode(m3,NEAR_CALL,bytes,'CALL_NEAR',3);
 const delta=word(bytes,NEAR_CALL+1);
 const nearDst=NEAR_CALL+3+(delta>=0x8000?delta-0x10000:delta);
 if(bytes[NEAR_CALL]!==0xe8||nearDst!==NEAR_TARGET||
   near.targetRea!==rawToMainRea(NEAR_TARGET)||
   physically(loadSegment,NEAR_TARGET)!==
   physically(loadSegment,SECOND_TARGET)+NEAR_TARGET-SECOND_TARGET)
  throw new Error('original MAIN E8 target is not authenticated');
 const helper=covered(m3,NEAR_TARGET,HELPER_END,bytes);
 // This original first callee has one authentic RETF at 27EC9. The
 // bounded synthetic zero-entry count follows its actual no-iteration
 // path and never invents the ES-based map-record scan semantics.
 const firstTail=covered(m2,SECOND_CALLEE_RETURN,FIRST_TAIL_END,bytes);
 // Authentic zero-span type-1 selector helper: the original near E8 at
 // 3A892 enters 3A846, returning by RETF without visiting 3A866 when
 // the original span count held in DX is exactly zero.
 expectOpcode(m3,TYPE_ONE_SELECTOR_CALL,bytes,'CALL_NEAR',3);
 const nestedDisplacement=word(bytes,TYPE_ONE_SELECTOR_CALL+1);
 const nestedSigned=nestedDisplacement>=0x8000?
   nestedDisplacement-0x10000:nestedDisplacement;
 if(bytes[TYPE_ONE_SELECTOR_CALL]!==0xe8||
    TYPE_ONE_SELECTOR_CALL+3+nestedSigned!==TYPE_ONE_HELPER_START)
  throw new Error('original type-1 E8 destination changed');
 const typeOneHelper=new Set();
 let typeOneReturns=0;
 for(let raw=TYPE_ONE_HELPER_START;raw<TYPE_ONE_HELPER_END;){
  const inst=m3.get(rawToMainRea(raw));
  if(!inst||!Number.isSafeInteger(inst.length)||inst.length<1||
     raw+inst.length>TYPE_ONE_HELPER_END)
   throw new Error('original type-1 helper Ghidra boundary incomplete');
  if(inst.flow==='RETURN')typeOneReturns++;
  if(inst.flow==='CALL_FAR'||inst.flow==='INTERRUPT'||
     (inst.flow==='CALL_NEAR'&&
       (raw!==TYPE_ONE_NESTED_UNVERIFIED_CALL||
        inst.targetRea!==rawToMainRea(0x3a975))))
   throw new Error('unverified original type-1 helper call/interrupt');
  if(Number.isSafeInteger(inst.targetRea)&&
     raw!==TYPE_ONE_NESTED_UNVERIFIED_CALL&&
     (inst.targetRea<rawToMainRea(TYPE_ONE_HELPER_START)||
      inst.targetRea>=rawToMainRea(TYPE_ONE_HELPER_END)||
      !m3.has(inst.targetRea)))
   throw new Error('type-1 helper conditional branch escapes source');
  typeOneHelper.add(raw);raw+=inst.length;
 }
 if(typeOneReturns!==1||bytes[TYPE_ONE_HELPER_END-1]!==0xcb||
    bytes[TYPE_ONE_NESTED_UNVERIFIED_CALL]!==0xe8)
  throw new Error('original type-1 helper RETF/source changed');
 const tail=new Set();
 let tailReturns=0;
 for(let raw=NEAR_RETURN;raw<SECOND_TAIL_END;){
  const ins=m3.get(rawToMainRea(raw));
  if(!ins||!Number.isSafeInteger(ins.length)||ins.length<1||
     raw+ins.length>SECOND_TAIL_END)
   throw new Error('original second-callee tail instruction boundary missing');
  if(ins.flow==='RETURN')tailReturns++;
  if(ins.flow==='CALL_FAR'||ins.flow==='INTERRUPT'||
     (ins.flow==='CALL_NEAR'&&
      (raw!==TYPE_ONE_SELECTOR_CALL||
       ins.targetRea!==rawToMainRea(0x3a846))))
   throw new Error('original selector contains unproven external control flow');
  if(Number.isSafeInteger(ins.targetRea)&&raw!==TYPE_ONE_SELECTOR_CALL&&
     (ins.targetRea<rawToMainRea(NEAR_RETURN)||
      ins.targetRea>=rawToMainRea(SECOND_TAIL_END)||
      !m3.has(ins.targetRea)))
   throw new Error('original selector branch leaves verified region');
  tail.add(raw);
  raw+=ins.length;
 }
 if(tailReturns!==3||bytes[0x3a899]!==0xcb||
    bytes[0x3a8a3]!==0xcb||bytes[0x3a8a7]!==0xcb)
  throw new Error('original selector three far-return sites changed');
 const half=loadSegment*16;
 if(half+bytes.length>0x100000)
  throw new Error('original guest image would overlap physical real-mode wrap');
 return Object.freeze({first,firstCall,secondCall,near,helper,
   ownerFillCall,ownerFillStarts:Object.freeze([...ownerFillStarts]),
   parentSourcePhysical:physically(loadSegment,PARENT_ENTRY),
   parentSourceCS:loadSegment+0x1000,parentSourceIP:0x626a,
   parentReturnIP:0x626e,
   helperSourceStarts:Object.freeze([...helper]),
   secondTailSourceStarts:Object.freeze([...tail]),
   typeOneHelperSourceStarts:Object.freeze([...typeOneHelper]),
   verifiedTypeOneHelperBoundaries:typeOneHelper.size,
   firstTailSourceStarts:Object.freeze([...firstTail]),
   verifiedFirstTailBoundaries:firstTail.size,
   verifiedSecondTailBoundaries:tail.size,
   loadSegment,verifiedOriginalHelperStarts:helper.size,
   farCallCount:2,nearCallCount:1,ownerHash:MAIN_NEW_GAME_SOURCE_SHA256});
}
function assertAt(cpu,cs,ip,sp,reason){
 if(cpu.get16('CS')!==cs||cpu.get16('IP')!==ip||
    cpu.get16('SP')!==sp)
  throw new Error(reason);
}
function executeOneFar(cpu,bytes,call,loadSegment){
 // The source may be executing through a different CS:IP representation
 // with the same physical address. Preserve its actual architectural CS.
 if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
    physically(loadSegment,call.raw))
  throw new Error('original chained FAR CALL not at verified guest address');
 if(cpu.read8(cpu.get16('CS'),cpu.get16('IP'))!==0x9a||
    cpu.read16(cpu.get16('CS'),(cpu.get16('IP')+1)&65535)!==call.off||
    cpu.read16(cpu.get16('CS'),(cpu.get16('IP')+3)&65535)!==
      loadSegment+call.seg)
  throw new Error('original relocated guest 9A bytes mismatch');
 const pre={cs:cpu.get16('CS'),ip:cpu.get16('IP'),sp:cpu.get16('SP')};
 cpu.step();
 if(cpu.get16('CS')!==loadSegment+call.seg||
    cpu.get16('IP')!==call.off||
    cpu.get16('SP')!==pre.sp-4||
    cpu.read16(cpu.get16('SS'),pre.sp-4)!==
      ((pre.ip+5)&65535)||
    cpu.read16(cpu.get16('SS'),pre.sp-2)!==pre.cs)
  throw new Error('original 8086 FAR CALL stack/target mismatch');
 return Object.freeze({...pre,destinationCS:cpu.get16('CS'),
  destinationIP:cpu.get16('IP')});
}
export async function probeOriginalMainFarChain(bytes,parts,{
 inputWord=0,recordType=0,recordValue=0x1234,
 recordSpanLength=0,selectorSideValue=0x1357,
 fillIndex=6,fillSegment=0x9000,loadSegment=0x2000
}={}){
 if(!u16(inputWord)||!u16(recordValue)||
    !u16(recordType)||recordType>255||
    !u16(recordSpanLength)||!u16(selectorSideValue)||
    (recordType===1&&recordSpanLength!==0)||
    !u16(fillIndex)||
    fillIndex>=20||fillIndex===inputWord||
    !u16(fillSegment)||fillSegment<0x9000||fillSegment>0xf000)
  throw new Error('synthetic original selector input/record must be u16/u8');
 const proof=verifyOriginalMainFarChain(bytes,parts,{loadSegment});
 const mz=inspectMzForLoad(bytes);
 const cpu=new RealMode8086();
 await loadVerifiedMz(cpu,bytes,{loadSegment,pspSegment:0x1000,
  allocationParagraphs:Math.max(Math.ceil(mz.imageBytes/16)+mz.minExtra,
  Math.ceil((mz.ss*16+mz.sp)/16)),
  expectedSha256:MAIN_NEW_GAME_SOURCE_SHA256});
 // Source code and game data are authentic; DOS runtime DS/SS are
 // explicitly test-only, never asserted to be original DOS state.
 cpu.write16(0x7000,0x0c1e,inputWord);
 // Source DS:C12E loop bound is not yet traced to a live DOS state;
 // zero is an explicit isolated-input test, NOT a discovered game value.
 cpu.write16(0x7000,0xc12e,0);
 // Synthetic private writable segment (no source code overlap).
 // The selection comes from a different entry than the first callee.
 cpu.write16(0x7000,0x0c16,fillIndex);
 cpu.write8(0x7000,0xbff0+7*fillIndex,0);
 cpu.write16(0x7000,0xbff0+7*fillIndex+1,fillSegment);
 cpu.write8(fillSegment,0xffff,0x39);
 for(let i=0;i<OWNER_FILL_LENGTH;i++)
  cpu.write8(fillSegment,i,0x5a);
 cpu.write8(fillSegment,OWNER_FILL_LENGTH,0x73);
 // Explicit synthetic selector: 7 bytes per entry beginning at BFF0.
 // Source-backed index helper computes BFF0 + input * 7 for 0..19.
 // Never pretend these values came from an original DOS startup state.
 if(inputWord<20){
  const recordOffset=0xbff0+inputWord*7;
  cpu.write8(0x7000,recordOffset,recordType);
  cpu.write16(0x7000,recordOffset+1,recordValue);
  cpu.write16(0x7000,recordOffset+3,recordSpanLength);
  cpu.write16(0x7000,recordOffset+5,recordValue);
 }
 cpu.write16(0x7000,0xbce8,selectorSideValue);
 // Execute the original parent PUSH CS and near E8 instructions first.
 // Parent SS:SP is a declared synthetic test input, but the return
 // address words themselves are produced solely by actual 8086 CPU steps.
 cpu.set16('CS',proof.parentSourceCS);cpu.set16('IP',proof.parentSourceIP);
 cpu.set16('SS',0x8000);cpu.set16('SP',0x8004);
 cpu.set16('FLAGS',0x202);
 if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
    proof.parentSourcePhysical)
  throw new Error('original parent call physical source mismatch');
 cpu.step();cpu.step();
 if(cpu.get16('CS')!==proof.first.startCS||
    cpu.get16('IP')!==proof.first.startIP||
    cpu.get16('SP')!==0x8000||
    cpu.read16(0x8000,0x8000)!==proof.parentReturnIP||
    cpu.read16(0x8000,0x8002)!==proof.parentSourceCS)
  throw new Error('original parent 8086 PUSH CS / E8 stack diverged');
 const init=executeMainInitSourcePrefix(cpu,bytes,proof.first);
 assertAt(cpu,proof.first.startCS,proof.first.startIP+
  FIRST_CALL-0x1b49b,0x7ffc,'original initializer failed to reach 1st FAR');
 const f1=executeOneFar(cpu,bytes,proof.firstCall,loadSegment);
 let calleeSteps=0;
 for(const pos of [0x27e32,0x27e33,0x27e35,0x27e38,0x27e39,0x27e3a]){
  if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
    physically(loadSegment,pos))
   throw new Error('first original callee left source instruction boundary');
  cpu.step();calleeSteps++;
 }
 const f2=executeOneFar(cpu,bytes,proof.secondCall,loadSegment);
 for(const pos of [SECOND_TARGET,SECOND_TARGET+1]){
  if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
     physically(loadSegment,pos))
   throw new Error('second original callee prologue left source boundary');
  cpu.step();calleeSteps++;
 }
 if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
    physically(loadSegment,NEAR_CALL)||cpu.read8(cpu.get16('CS'),cpu.get16('IP'))!==0xe8)
  throw new Error('original E8 callsite not reached');
 const beforeNear={cs:cpu.get16('CS'),ip:cpu.get16('IP'),sp:cpu.get16('SP')};
 cpu.step();calleeSteps++;
 if(cpu.get16('CS')!==beforeNear.cs||
    cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
    physically(loadSegment,NEAR_TARGET)||
    cpu.get16('SP')!==beforeNear.sp-2||
    cpu.read16(cpu.get16('SS'),beforeNear.sp-2)!==
     ((beforeNear.ip+3)&65535))
  throw new Error('original nested E8 return stack or target differs');
 const verified=new Set(proof.helperSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 let helperSteps=0;
 for(;helperSteps<48;helperSteps++){
  const current=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(current===physically(loadSegment,NEAR_RETURN)&&
     cpu.get16('CS')===beforeNear.cs&&
     cpu.get16('IP')===((beforeNear.ip+3)&65535))break;
  if(!verified.has(current))
   throw new Error('original index helper escaped source-authenticated instructions');
  cpu.step();
 }
 if(helperSteps===48||cpu.get16('SP')!==beforeNear.sp+2)
  throw new Error('original nested E8/PUSH CS/RETF failed to return');
 const mapped=cpu.get16('AX');
 const expected=inputWord<20?0xbff0+inputWord*7:0;
 if(mapped!==expected)
  throw new Error('original guest index helper diverged from its verified computation');
 // Continue the *actual* selector from 3A87E until one of its authentic
 // RETF instructions returns into the original first callee at 27E42.
 // For record-type 1 the source calls another E8 at 3A892; the target
 // is not validated here and is deliberately not executed.
 const tail=new Set(proof.secondTailSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 const typeOneAllowed=new Set(proof.typeOneHelperSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 let typeOneHelperSteps=0,tailSteps=0;
 for(;tailSteps<32;tailSteps++){
  const p=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(cpu.get16('CS')===f2.cs&&cpu.get16('IP')===((f2.ip+5)&65535)&&
     p===physically(loadSegment,SECOND_CALLEE_RETURN))break;
  if(!tail.has(p))
   throw new Error('original selector left verified 8086 tail boundary');
  if(p===physically(loadSegment,TYPE_ONE_SELECTOR_CALL)){
   if(recordType!==1||recordSpanLength!==0)
    throw new Error('original type-1 selector source branch not admitted');
   const sourceCS=cpu.get16('CS'),sourceIP=cpu.get16('IP');
   const sourceSP=cpu.get16('SP');
   if(cpu.read8(sourceCS,sourceIP)!==0xe8)
    throw new Error('original type-1 selector E8 guest opcode mutated');
   cpu.step();tailSteps++;
   if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,TYPE_ONE_HELPER_START)||
      cpu.get16('CS')!==sourceCS||
      cpu.get16('SP')!==sourceSP-2||
      cpu.read16(cpu.get16('SS'),sourceSP-2)!==
       ((sourceIP+3)&65535))
    throw new Error('original type-1 helper E8 stack/source target diverged');
   let returned=false;
   for(let j=0;j<45;j++){
    const at=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
    if(at===physically(loadSegment,TYPE_ONE_SELECTOR_CALL+3)&&
       cpu.get16('CS')===sourceCS&&
       cpu.get16('IP')===((sourceIP+3)&65535)){
      returned=true;break;
    }
    if(!typeOneAllowed.has(at)||
       at===physically(loadSegment,TYPE_ONE_NESTED_UNVERIFIED_CALL))
     throw new Error('original type-1 helper entered unverified nonzero span');
    cpu.step();tailSteps++;typeOneHelperSteps++;
   }
   if(!returned||cpu.get16('SP')!==sourceSP)
    throw new Error('original type-1 helper failed authentic RETF return');
   continue;
  }
  cpu.step();
 }
 if(tailSteps===32||cpu.get16('SP')!==f2.sp||
    cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,SECOND_CALLEE_RETURN))
  throw new Error('original nested selector failed authentic FAR return');
 const selectorResult=cpu.get16('AX');
 const expectedResult=inputWord>=20?0:
   recordType===0?recordValue:recordType===1?selectorSideValue:0;
 if(selectorResult!==expectedResult)
  throw new Error('original selector return AX disagrees with synthetic record');
 // Follow the original 27E32 caller through its epilogue. On a synthetic
 // zero-entry map loop, the source CMP/JG at 27EBE does not enter the
 // unknown ES record scanner: it returns by its real RETF at 27EC9.
 const firstTail=new Set(proof.firstTailSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 let firstTailSteps=0;
 for(;firstTailSteps<96;firstTailSteps++){
  const p=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(cpu.get16('CS')===f1.cs&&cpu.get16('IP')===((f1.ip+5)&65535)&&
     p===physically(loadSegment,FIRST_CALLEE_RETURN))break;
  if(!firstTail.has(p))
   throw new Error('first original callee left verified 8086 tail boundary');
  cpu.step();
 }
 if(firstTailSteps===96||cpu.get16('SP')!==f1.sp||
    cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,FIRST_CALLEE_RETURN))
  throw new Error('original first callee failed to RETF to initializer');
 // The last three original bytes of the initializer are POP SI, POP DI,
 // RETF; return through the actual PUSH CS/E8 parent frame above.
 for(const [pos,opcode] of [[0x1b4f6,0x5e],[0x1b4f7,0x5f],[MAP_INIT_RETURN,0xcb]]){
  if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,pos)||
     cpu.read8(cpu.get16('CS'),cpu.get16('IP'))!==opcode)
   throw new Error('original initializer return path was not reached');
  cpu.step();
 }
 if(cpu.get16('CS')!==proof.parentSourceCS||
    cpu.get16('IP')!==proof.parentReturnIP||
    cpu.get16('SP')!==0x8004||
    cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,PARENT_RETURN))
  throw new Error('original initializer failed authentic parent E8/RETF return');
 // Execute original parent second selector + real 768-byte REP-free
 // ES-write loop. The original caller's prologue before 1B66A is not
 // reconstructed, so STOP just before its 1B694 epilogue.
 const ownerAllowed=new Set(proof.ownerFillStarts.map(raw=>
  physically(loadSegment,raw)));
 const nestedAllowed=new Set(proof.helperSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 const selectorAllowed=new Set(proof.secondTailSourceStarts.map(raw=>
  physically(loadSegment,raw)));
 let followSteps=0,secondSelectionSteps=0,secondIndexSteps=0,
  ownerSecondCallCount=0;
 while(followSteps<10000){
  const p=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(p===physically(loadSegment,OWNER_FILL_END)&&
      cpu.get16('CS')===proof.parentSourceCS)break;
  if(!ownerAllowed.has(p))
   throw new Error('original parent ES-fill instruction left verified source');
  if(p===physically(loadSegment,OWNER_FILL_SELECT)){
   const frame=executeOneFar(cpu,bytes,proof.ownerFillCall,loadSegment);
   ownerSecondCallCount++;
   for(const expectedRaw of [SECOND_TARGET,SECOND_TARGET+1,NEAR_CALL]){
    if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,expectedRaw))
     throw new Error('original second selector prologue mismatch');
    cpu.step();secondSelectionSteps++;
   }
   if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
       physically(loadSegment,NEAR_TARGET))
    throw new Error('source-authenticated second E8 helper not entered');
   const indexReturnIp=cpu.read16(cpu.get16('SS'),cpu.get16('SP'));
   const indexReturnCs=cpu.read16(cpu.get16('SS'),cpu.get16('SP')+2);
   for(let i=0;i<48;i++){
    const q=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
    if(q===physically(loadSegment,NEAR_RETURN)&&
       cpu.get16('CS')===indexReturnCs&&
       cpu.get16('IP')===indexReturnIp)break;
    if(!nestedAllowed.has(q))
     throw new Error('original second selector helper escaped source');
    cpu.step();secondIndexSteps++;
   }
   if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
     physically(loadSegment,NEAR_RETURN))
    throw new Error('original second selector helper did not return');
   for(let i=0;i<32;i++){
    const q=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
    if(q===physically(loadSegment,OWNER_FILL_SELECT+5)&&
       cpu.get16('CS')===frame.cs&&
       cpu.get16('IP')===((frame.ip+5)&65535))break;
    if(!selectorAllowed.has(q)||q===physically(loadSegment,TYPE_ONE_SELECTOR_CALL))
     throw new Error('original second selector entered unverified source');
    cpu.step();secondSelectionSteps++;
   }
   if(cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,OWNER_FILL_SELECT+5)||
      cpu.get16('SP')!==frame.sp||
      cpu.get16('AX')!==fillSegment)
    throw new Error('original second selector returned wrong segment/stack');
   continue;
  }
  cpu.step();followSteps++;
 }
 if(followSteps===10000||ownerSecondCallCount!==1||
   cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
     physically(loadSegment,OWNER_FILL_END)||
   cpu.get16('ES')!==fillSegment||
   cpu.read8(fillSegment,0xffff)!==0x39||
   cpu.read8(fillSegment,OWNER_FILL_LENGTH)!==0x73||
   cpu.get16('SI')!==OWNER_FILL_LENGTH||
   Array.from({length:OWNER_FILL_LENGTH},(_,i)=>
     cpu.read8(fillSegment,i)).some(v=>v!==255))
  throw new Error('original 8086 ES 768-byte clear/fill diverged');
 return Object.freeze({
  sourceHash:MAIN_NEW_GAME_SOURCE_SHA256,
  executedInitializerInstructions:init.steps,
  executedCalleePrefixInstructions:calleeSteps,
  executedIndexHelperInstructions:helperSteps,
  executedSecondCalleeTailInstructions:tailSteps,
  executedTypeOneHelperInstructions:typeOneHelperSteps,
  executedFirstCalleeTailInstructions:firstTailSteps,
  executedParentCallInstructions:2,
  executedInitializerFinalReturnInstructions:3,
  executedParentESFillInstructions:followSteps,
  executedSecondSelectorInstructions:secondSelectionSteps+secondIndexSteps+1,
  executedOriginalGuestInstructions:init.steps+calleeSteps+helperSteps+
    tailSteps+firstTailSteps+2+2+3+followSteps+
    secondSelectionSteps+secondIndexSteps+1,
  verifiedIndexHelperBoundaries:proof.verifiedOriginalHelperStarts,
  actualChainedFarCalls:2,actualNestedNearCalls:1,
  originalInputWord:inputWord,originalIndexOffset:mapped,
  returnedToRaw:NEAR_RETURN,
  secondCalleeReturnedToRaw:SECOND_CALLEE_RETURN,
  firstCalleeReturnedToRaw:FIRST_CALLEE_RETURN,
  originalInitializerReturnedToRaw:PARENT_RETURN,
  completedBoundedInitializerFunction:true,
  verifiedSecondCalleeTailBoundaries:proof.verifiedSecondTailBoundaries,
  verifiedTypeOneHelperBoundaries:proof.verifiedTypeOneHelperBoundaries,
  verifiedFirstCalleeTailBoundaries:proof.verifiedFirstTailBoundaries,
  syntheticRecordType:recordType,syntheticRecordValue:recordValue,
  syntheticRecordSpanLength:recordSpanLength,
  syntheticSelectorSideValue:selectorSideValue,
  originalSelectorResult:selectorResult,
  syntheticFirstCalleeLoopCount:0,
  ownerFillStoppedAtRaw:OWNER_FILL_END,
  ownerFillSegment:fillSegment,
  ownerFillVerifiedBytes:OWNER_FILL_LENGTH,
  ownerFillOriginalSelectorCalls:ownerSecondCallCount,
  stoppedBeforeParentStackEpilogue:true,
  originalDosRuntimeVerified:false,freshGameReady:false
 });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [exe,w1,w2,w3]=process.argv.slice(2);
 if(!exe||!w1||!w2||!w3){console.error('Usage: node original-main-far-chain-cpu-probe.mjs private/MAIN.EXE Ghidra-10000.json Ghidra-20000.json Ghidra-30000.json');process.exitCode=2;}
 else try{
  const bytes=fs.readFileSync(exe),parts=[w1,w2,w3].map(p=>JSON.parse(fs.readFileSync(p,'utf8')));
  const points=[0,1,2,7,18,19,20,65535];
  const results=[];
  for(const inputWord of points)results.push(await probeOriginalMainFarChain(bytes,parts,{inputWord}));
  results.push(await probeOriginalMainFarChain(bytes,parts,{inputWord:7,recordType:2,recordValue:0x5678}));
  const typeOne=await probeOriginalMainFarChain(bytes,parts,{
   inputWord:7,recordType:1,recordSpanLength:0,selectorSideValue:0x2468});
  results.push(typeOne);
  if(typeOne.originalSelectorResult!==0x2468||
     typeOne.executedTypeOneHelperInstructions<8)
   throw new Error('original zero-span type-1 helper not executed');
  let rejectedUnverifiedSelector=false;
  try{await probeOriginalMainFarChain(bytes,parts,{
   inputWord:7,recordType:1,recordSpanLength:1});}
  catch(error){
   if(!String(error.message).includes('synthetic original selector input'))throw error;
   rejectedUnverifiedSelector=true;
  }
  if(!rejectedUnverifiedSelector)throw new Error('unverified type-1 positive span unexpectedly executed');
  console.log(JSON.stringify({testedInputs:points.length+3,
   completedSelectorCases:results.length,rejectedUnverifiedSelector,
   guestInstructions:results.reduce((sum,x)=>sum+x.executedOriginalGuestInstructions,0),
   allReturned:results.every(x=>x.originalInitializerReturnedToRaw===PARENT_RETURN&&x.ownerFillStoppedAtRaw===OWNER_FILL_END),
   results},null,2));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
}