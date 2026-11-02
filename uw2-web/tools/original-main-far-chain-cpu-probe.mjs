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
const UNVERIFIED_SELECTOR_CALL=0x3a892;
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
 const firstCall=callRecord(bytes,mz,
  new Map(parts[0].instructions.map(i=>[i.reaAddress,i])),
  FIRST_CALL,FIRST_TARGET,loadSegment);
 const secondCall=callRecord(bytes,mz,m2,SECOND_CALL,SECOND_TARGET,loadSegment);
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
 // The complete source-authenticated selector tail has three genuine
 // RETF exits. One source E8 at 3A892 reaches an unproven downstream
 // helper, so the executor must reject that branch rather than stub it.
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
      (raw!==UNVERIFIED_SELECTOR_CALL||
       ins.targetRea!==rawToMainRea(0x3a846))))
   throw new Error('original selector contains unproven external control flow');
  if(Number.isSafeInteger(ins.targetRea)&&raw!==UNVERIFIED_SELECTOR_CALL&&
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
   helperSourceStarts:Object.freeze([...helper]),
   secondTailSourceStarts:Object.freeze([...tail]),
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
 inputWord=0,recordType=0,recordValue=0x1234,loadSegment=0x2000
}={}){
 if(!u16(inputWord)||!u16(recordValue)||
    !u16(recordType)||recordType>255)
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
 // Explicit synthetic selector: 7 bytes per entry beginning at BFF0.
 // Source-backed index helper computes BFF0 + input * 7 for 0..19.
 // Never pretend these values came from an original DOS startup state.
 if(inputWord<20){
  const recordOffset=0xbff0+inputWord*7;
  cpu.write8(0x7000,recordOffset,recordType);
  cpu.write16(0x7000,recordOffset+1,recordValue);
 }
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
 let tailSteps=0;
 for(;tailSteps<32;tailSteps++){
  const p=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(cpu.get16('CS')===f2.cs&&cpu.get16('IP')===((f2.ip+5)&65535)&&
     p===physically(loadSegment,SECOND_CALLEE_RETURN))break;
  if(!tail.has(p))
   throw new Error('original selector left verified 8086 tail boundary');
  if(p===physically(loadSegment,UNVERIFIED_SELECTOR_CALL))
   throw new Error('original selector unverified E8 callee: stop before mutation');
  cpu.step();
 }
 if(tailSteps===32||cpu.get16('SP')!==f2.sp||
    cpu.physical(cpu.get16('CS'),cpu.get16('IP'))!==
      physically(loadSegment,SECOND_CALLEE_RETURN))
  throw new Error('original nested selector failed authentic FAR return');
 const selectorResult=cpu.get16('AX');
 const expectedResult=inputWord>=20?0:recordType===0?recordValue:0;
 if(selectorResult!==expectedResult)
  throw new Error('original selector return AX disagrees with synthetic record');
 return Object.freeze({
  sourceHash:MAIN_NEW_GAME_SOURCE_SHA256,
  executedInitializerInstructions:init.steps,
  executedCalleePrefixInstructions:calleeSteps,
  executedIndexHelperInstructions:helperSteps,
  executedSecondCalleeTailInstructions:tailSteps,
  executedOriginalGuestInstructions:init.steps+calleeSteps+helperSteps+tailSteps+2,
  verifiedIndexHelperBoundaries:proof.verifiedOriginalHelperStarts,
  actualChainedFarCalls:2,actualNestedNearCalls:1,
  originalInputWord:inputWord,originalIndexOffset:mapped,
  returnedToRaw:NEAR_RETURN,
  secondCalleeReturnedToRaw:SECOND_CALLEE_RETURN,
  verifiedSecondCalleeTailBoundaries:proof.verifiedSecondTailBoundaries,
  syntheticRecordType:recordType,syntheticRecordValue:recordValue,
  originalSelectorResult:selectorResult,
  stoppedBeforeUnclassifiedFirstCalleeLoop:true,
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
  let rejectedUnverifiedSelector=false;
  try{await probeOriginalMainFarChain(bytes,parts,{inputWord:7,recordType:1});}
  catch(error){
   if(!String(error.message).includes('unverified E8 callee'))throw error;
   rejectedUnverifiedSelector=true;
  }
  if(!rejectedUnverifiedSelector)throw new Error('unverified original E8 selector unexpectedly executed');
  console.log(JSON.stringify({testedInputs:points.length+2,
   completedSelectorCases:results.length,rejectedUnverifiedSelector,
   guestInstructions:results.reduce((sum,x)=>sum+x.executedOriginalGuestInstructions,0),
   allReturned:results.every(x=>x.secondCalleeReturnedToRaw===SECOND_CALLEE_RETURN),
   results},null,2));
 }catch(e){console.error(e.stack||String(e));process.exitCode=1;}
}