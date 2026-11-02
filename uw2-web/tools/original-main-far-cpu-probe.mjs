#!/usr/bin/env node
// Read-only, original-source byte verification plus actual 8086 FAR CALL
// instruction execution. This is an isolated architectural CPU probe,
// NOT original DOS startup, new-game state, or target callee execution.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';
import {verifyMainNewGameFarTargets}
 from './original-new-game-far-targets.mjs';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';
import {inspectMainNewGameCallLedger,rawToMainRea} from './original-new-game-call-ledger.mjs';
const u16=(v)=>Number.isSafeInteger(v)&&v>=0&&v<=65535;

// Execute only the 5-byte CALL FAR instruction, never any callee code. All
// instructions have already been independently admitted by original SHA,
// original MZ relocation and Ghidra target-boundary evidence.
export function runIsolatedRelocatedFarCalls(cpu,{
 loadSegment,headerBytes,edges,stackSegment=0x8000,initialSP=0xfffe
}={}){
 if(!(cpu instanceof RealMode8086)||!u16(loadSegment)||
    !u16(stackSegment)||!u16(initialSP)||initialSP<4||
    initialSP%2!==0||!Number.isSafeInteger(headerBytes)||headerBytes<28||
    !Array.isArray(edges)||edges.length<1||edges.length>64)
  throw new Error('explicit owned 8086 image and bounded isolated stack required');
 const plan=edges.map(edge=>{
  if(!edge||edge.status!=='MZ_RELOCATED_DIRECT_FAR__GHIDRA_TARGET_BOUNDARY'||
     edge.sourceLength!==5||!edge.targetBoundaryPresent||
     !Number.isSafeInteger(edge.sourceRaw)||edge.sourceRaw<headerBytes||
     !u16(edge.segmentAddend)||!u16(edge.targetOffset)||
     !Number.isSafeInteger(edge.sourceRea)||edge.sourceRea<0||
     !Number.isSafeInteger(edge.targetRea)||edge.targetRea<0)
   throw new Error('isolated native far probe requires source-authenticated target');
  const rel=edge.sourceRaw-headerBytes;
  const sourceCS=loadSegment+(rel>>>4),sourceIP=rel&15;
  const desiredCS=(loadSegment+edge.segmentAddend)&65535;
  const source=cpu.physical(sourceCS,sourceIP);
  if(source+5>cpu.memory.length||
     cpu.read8(sourceCS,sourceIP)!==0x9a||
     cpu.read16(sourceCS,sourceIP+1)!==edge.targetOffset||
     cpu.read16(sourceCS,sourceIP+3)!==desiredCS)
   throw new Error('relocated 8086 CALL FAR source bytes changed: fail closed');
  return {edge,sourceCS,sourceIP,desiredCS};
 });
 const results=[];
 for(const item of plan){
  const {edge,sourceCS,sourceIP,desiredCS}=item;
  cpu.set16('CS',sourceCS);cpu.set16('IP',sourceIP);
  cpu.set16('SS',stackSegment);cpu.set16('SP',initialSP);
  cpu.set16('FLAGS',0x0202);
  const preFlags=cpu.get16('FLAGS');
  const expectedReturnIP=(sourceIP+5)&65535;
  cpu.step();
  const sp=cpu.get16('SP');
  if(cpu.get16('CS')!==desiredCS||
     cpu.get16('IP')!==edge.targetOffset||
     sp!==initialSP-4||
     cpu.read16(stackSegment,sp)!==expectedReturnIP||
     cpu.read16(stackSegment,sp+2)!==sourceCS||
     cpu.get16('FLAGS')!==preFlags)
   throw new Error('actual 8086 FAR CALL instruction diverged from verified original target');
  results.push(Object.freeze({
   sourceRaw:edge.sourceRaw,targetRaw:edge.targetRaw,
   executedInstruction:'8086_CALL_FAR_9A',
   destinationCS:desiredCS,destinationIP:edge.targetOffset,
   returnCS:sourceCS,returnIP:expectedReturnIP,stackWordsPushed:2
  }));
 }
 return Object.freeze({
  executedOriginalInstructions:results.length,
  calls:Object.freeze(results),
  fidelity:'AUTHENTIC_RELOCATED_9A_SINGLE_INSTRUCTIONS__SYNTHETIC_STACK__NO_ORIGINAL_DOS_REFERENCE'
 });
}
// Execute one authenticated E8 rel16 instruction at each of the five
// original Korean MAIN fresh-game initializer callsites. The source bytes
// and their Ghidra target boundaries are checked before touching CPU state.
// These are independent one-instruction probes, NOT a chained game launch.
export function runIsolatedOriginalNearCalls(cpu,{
 loadSegment,headerBytes,calls,stackSegment=0x8000,initialSP=0xfffe
}={}){
 if(!(cpu instanceof RealMode8086)||!u16(loadSegment)||
    !u16(stackSegment)||!u16(initialSP)||initialSP<2||
    initialSP%2!==0||!Number.isSafeInteger(headerBytes)||headerBytes<28||
    !Array.isArray(calls)||calls.length<1||calls.length>32)
  throw new Error('explicit original near-call evidence and bounded stack required');
 const plan=calls.map(call=>{
  if(!call||call.status!=='GHIDRA_SOURCE_BOUND_WINDOW__CALLEE_SEMANTICS_UNCLASSIFIED'||
     !Number.isSafeInteger(call.callRaw)||call.callRaw<headerBytes||
     !Number.isSafeInteger(call.targetRaw)||call.targetRaw<headerBytes||
     !Number.isSafeInteger(call.callRea)||call.callRea<0||
     !Number.isSafeInteger(call.targetRea)||call.targetRea<0||
     !Number.isSafeInteger(call.observedInstructionCount)||call.observedInstructionCount<1||
     call.callRea!==rawToMainRea(call.callRaw)||
     call.targetRea!==rawToMainRea(call.targetRaw))
   throw new Error('original near-call source/Ghidra target provenance invalid');
  const rel=call.callRaw-headerBytes;
  const targetRel=call.targetRaw-headerBytes;
  // Near E8 does not change CS. Both offsets must occupy one proven
  // 64-KiB segment window. Aligning each source to a separate paragraph
  // (valid for 9A FAR) would incorrectly wrap a backward E8 target.
  const windowBase=Math.floor(Math.min(rel,targetRel)/65536)*65536;
  if(rel-windowBase>65535||targetRel-windowBase>65535)
   throw new Error('original near CALL spans an unproven code segment');
  const sourceCS=loadSegment+(windowBase>>>4),sourceIP=rel-windowBase;
  if(!u16(sourceCS))
   throw new Error('original near CALL source outside loaded 8086 segment');
  const source=cpu.physical(sourceCS,sourceIP);
  if(source+3>cpu.memory.length||cpu.read8(sourceCS,sourceIP)!==0xe8)
   throw new Error('original near CALL source opcode changed: fail closed');
  const displacement=cpu.read16(sourceCS,(sourceIP+1)&65535);
  const signed=displacement&0x8000?displacement-0x10000:displacement;
  const returnIP=(sourceIP+3)&0xffff,targetIP=(returnIP+signed)&0xffff;
  const targetPhysical=cpu.physical(sourceCS,targetIP);
  const expectedPhysical=(loadSegment*16+call.targetRaw-headerBytes)&0xfffff;
  if(targetPhysical!==expectedPhysical)
   throw new Error('original near CALL decoded target diverged from Ghidra evidence');
  return {call,sourceCS,sourceIP,returnIP,targetIP};
 });
 const results=[];
 for(const {call,sourceCS,sourceIP,returnIP,targetIP} of plan){
  cpu.set16('CS',sourceCS);cpu.set16('IP',sourceIP);
  cpu.set16('SS',stackSegment);cpu.set16('SP',initialSP);
  cpu.set16('FLAGS',0x0202);
  const preFlags=cpu.get16('FLAGS');
  cpu.step();
  const sp=cpu.get16('SP');
  if(cpu.get16('CS')!==sourceCS||cpu.get16('IP')!==targetIP||
     sp!==initialSP-2||cpu.read16(stackSegment,sp)!==returnIP||
     cpu.get16('FLAGS')!==preFlags)
   throw new Error('original 8086 E8 near call diverged from verified source target/stack');
  results.push(Object.freeze({
   sourceRaw:call.callRaw,targetRaw:call.targetRaw,
   executedInstruction:'8086_CALL_NEAR_E8',
   destinationCS:sourceCS,destinationIP:targetIP,
   returnIP,stackWordsPushed:1
  }));
 }
 return Object.freeze({
  executedOriginalInstructions:results.length,
  calls:Object.freeze(results),
  fidelity:'AUTHENTIC_E8_SINGLE_INSTRUCTIONS__SYNTHETIC_STACK__NO_ORIGINAL_DOS_REFERENCE'
 });
}
export async function probeOriginalMainFarCallCpu(original,parts,{
 loadSegment=0x2000,pspSegment=0x1000
}={}){
 // Reject altered Korean bytes before any execution/memory mutation.
 const evidence=verifyMainNewGameFarTargets(original,parts);
 if(evidence.directAuthenticated!==9||
    evidence.calleeBoundaryMatched!==9||evidence.unresolved!==0)
  throw new Error('unresolved Korean MAIN fresh-game transfer cannot execute');
 const cpu=new RealMode8086();
 const mz=inspectMzForLoad(original);
 const imageParas=Math.ceil(mz.imageBytes/16);
 // Original MZ stack/extra *size* is verified, but its initial CONTENT is
 // unknown. Synthetic allocation used only to stage this single opcode.
 const allocationParagraphs=Math.max(imageParas+mz.minExtra,
  Math.ceil((mz.ss*16+mz.sp)/16));
 await loadVerifiedMz(cpu,original,{
  loadSegment,pspSegment,allocationParagraphs,
  expectedSha256:MAIN_NEW_GAME_SOURCE_SHA256
 });
 const nearWitness=inspectMainNewGameCallLedger(original,
  parts.find(part=>part?.windowStart===0x10000));
 if(nearWitness.callCount!==5||nearWitness.calls.length!==5)
  throw new Error('five authentic Korean MAIN initializer near CALLs required');
 const near=runIsolatedOriginalNearCalls(cpu,{
  loadSegment,headerBytes:mz.headerBytes,calls:nearWitness.calls
 });
 const far=runIsolatedRelocatedFarCalls(cpu,{
  loadSegment,headerBytes:mz.headerBytes,edges:evidence.edges
 });
 return Object.freeze({
  originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  originalRelocations:evidence.mzRelocations,
  executedOriginalInstructions:near.executedOriginalInstructions+
   far.executedOriginalInstructions,
  executedOriginalNearInstructions:near.executedOriginalInstructions,
  executedOriginalFarInstructions:far.executedOriginalInstructions,
  nearCalls:near.calls,calls:far.calls,
  fidelity:'AUTHENTIC_E8_AND_RELOCATED_9A_ISOLATED_INSTRUCTIONS__NO_ORIGINAL_DOS_REFERENCE',
  freshGameReady:false
 });
}
const isMain=process.argv[1]&&
 path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
 const [exe,...ledgers]=process.argv.slice(2);
 if(!exe||ledgers.length!==5){
  console.error('Usage: original-main-far-cpu-probe.mjs /private/MAIN.EXE 5-Ghidra-JSON-windows');
  process.exitCode=2;
 }else try{
  console.log(JSON.stringify(await probeOriginalMainFarCallCpu(
   fs.readFileSync(exe),
   ledgers.map(p=>JSON.parse(fs.readFileSync(p,'utf8')))),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
