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
     !u16(edge.sourceRea)||!u16(edge.targetRea))
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
 const result=runIsolatedRelocatedFarCalls(cpu,{
  loadSegment,headerBytes:mz.headerBytes,edges:evidence.edges
 });
 return Object.freeze({
  originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  originalRelocations:evidence.mzRelocations,
  ...result,freshGameReady:false
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
