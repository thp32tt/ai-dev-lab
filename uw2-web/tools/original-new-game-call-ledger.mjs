#!/usr/bin/env node
// Original Korean MAIN.EXE fresh-game initializer: SHA-pinned source calls
// correlated against a separately exported Ghidra 16-bit instruction ledger.
// Read-only investigation, NOT initialization, a gameplay stub or a DOS run.
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectOriginalNewGameInit,MAIN_NEW_GAME_SOURCE_SHA256}
 from './original-new-game-init-proof.mjs';

export const MAIN_MZ_IMAGE_RAW_OFFSET=0x5400;
export const MAIN_REA_IMAGE_BASE=0x10000;
export const MAIN_GHIDRA_WINDOW_START=0x10000;
export const MAIN_GHIDRA_WINDOW_END=0x20000;
const MAX_WINDOW=0x50; // bounded evidence only; NOT assumed function sizes
const within=(n,lo,hi)=>Number.isSafeInteger(n)&&n>=lo&&n<hi;
export const rawToMainRea=raw=>raw-MAIN_MZ_IMAGE_RAW_OFFSET+MAIN_REA_IMAGE_BASE;
export const reaToMainRaw=rea=>rea-MAIN_REA_IMAGE_BASE+MAIN_MZ_IMAGE_RAW_OFFSET;

export function inspectMainNewGameCallLedger(original,ghidra){
 const witness=inspectOriginalNewGameInit(original);
 if(!ghidra||ghidra.moduleName!=='MAIN.EXE'||
    ghidra.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
    ghidra.loadBase!==MAIN_REA_IMAGE_BASE||
    ghidra.windowStart!==MAIN_GHIDRA_WINDOW_START||
    ghidra.windowEnd!==MAIN_GHIDRA_WINDOW_END||
    !Array.isArray(ghidra.instructions))
   throw new Error('Korean MAIN Ghidra instruction source window invalid');
 const byAddress=new Map();
 for(const instruction of ghidra.instructions){
  // Ghidra exported windowStart/End are image-space offsets; each
  // instruction reaAddress already includes the canonical loadBase.
  if(!within(instruction?.reaAddress,
      ghidra.windowStart+ghidra.loadBase,
      ghidra.windowEnd+ghidra.loadBase)||
     !within(instruction.length,1,16)||typeof instruction.flow!=='string')
   throw new Error('original Ghidra instruction record malformed');
  if(byAddress.has(instruction.reaAddress))
   throw new Error('duplicate original Ghidra instruction boundary');
  byAddress.set(instruction.reaAddress,instruction);
 }
 // A plausible raw byte sequence without the independently recovered
 // instruction boundary MUST NOT be declared an original 8086 call.
 const calls=witness.calls.map(({at,to,role})=>{
  const rea=rawToMainRea(at),targetRea=rawToMainRea(to);
  const inst=byAddress.get(rea);
  if(!inst||inst.length!==3||inst.flow!=='CALL_NEAR'||
     inst.targetRea!==targetRea)
   throw new Error('original new-game near call Ghidra/raw mismatch at 0x'+at.toString(16));
  if(!byAddress.has(targetRea))
   throw new Error('new-game initializer entry absent from Ghidra instruction ledger');
  // Expose bounded local instructions only. Unresolved branch targets and
  // external ownership are deliberately reported, not reinterpreted.
  const window=[...byAddress.values()]
   .filter(x=>x.reaAddress>=targetRea&&x.reaAddress<targetRea+MAX_WINDOW)
   .sort((a,b)=>a.reaAddress-b.reaAddress);
  const directCalls=window.filter(x=>x.flow==='CALL_NEAR'||
    x.flow==='CALL_FAR').map(x=>Object.freeze({
    atRea:x.reaAddress,flow:x.flow,
    ...(Number.isSafeInteger(x.targetRea)?{targetRea:x.targetRea}:{})
  }));
  const branches=window.filter(x=>x.flow.startsWith('JUMP')||
    x.flow.startsWith('JCC')).map(x=>Object.freeze({
    atRea:x.reaAddress,flow:x.flow,
    ...(Number.isSafeInteger(x.targetRea)?{targetRea:x.targetRea}:{})
  }));
  return Object.freeze({
   role,callRaw:at,callRea:rea,targetRaw:to,targetRea,
   observedInstructionCount:window.length,
   directCalls:Object.freeze(directCalls),
   branches:Object.freeze(branches),
   status:'GHIDRA_SOURCE_BOUND_WINDOW__CALLEE_SEMANTICS_UNCLASSIFIED'
  });
 });
 return Object.freeze({
  originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  ghidraWindow:[ghidra.windowStart,ghidra.windowEnd],
  callCount:calls.length,calls:Object.freeze(calls),
  sourceFill:witness.initializationFill,
  freshGameReady:false,
  unresolved:witness.unresolved,
  fidelity:'KOREAN_MAIN_SHA_AND_GHIDRA_DIRECT_CALL_BOUNDARIES__NO_DOS_REFERENCE_INITIALIZATION'
 });
}
export function verifyMainNewGameCallLedger(original,ghidra){
 const sha=createHash('sha256').update(original).digest('hex');
 if(sha!==MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('original Korean MAIN executable SHA-256 mismatch');
 return inspectMainNewGameCallLedger(original,ghidra);
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
 if(process.argv.length!==4){
  console.error('Usage: node original-new-game-call-ledger.mjs /private/MAIN.EXE /private/MAIN-020000-030000.json');
  process.exitCode=2;
 }else try{
  console.log(JSON.stringify(verifyMainNewGameCallLedger(
   fs.readFileSync(process.argv[2]),
   JSON.parse(fs.readFileSync(process.argv[3],'utf8'))),null,2));
 }catch(e){console.error(String(e));process.exitCode=1;}
}
