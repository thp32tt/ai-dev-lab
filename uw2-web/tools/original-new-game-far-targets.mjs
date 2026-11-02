#!/usr/bin/env node
// Korean MAIN.EXE new-game initializer: authenticated relocated FAR transfers.
// Reads the owner's original EXE and exported Ghidra instruction boundaries.
// Never executes DOS code, invents target functions or mutates game assets.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseMzHeader} from './original-inventory.mjs';
import {inspectMainNewGameCallLedger,reaToMainRaw,rawToMainRea}
 from './original-new-game-call-ledger.mjs';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';

const valid=(v,lo,hi)=>Number.isSafeInteger(v)&&v>=lo&&v<hi;
const validatedInstructionIndex=parts=>{
 if(!Array.isArray(parts)||!parts.length||parts.length>8)
  throw new Error('bounded authentic Ghidra instruction windows required');
 const byRea=new Map(),windows=new Set();
 for(const part of parts){
  if(!part||part.moduleName!=='MAIN.EXE'||part.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
     part.loadBase!==0x10000||
     !valid(part.windowStart,0,0x100000)||
     !valid(part.windowEnd,part.windowStart+1,0x100001)||
     !Array.isArray(part.instructions)||
     windows.has(part.windowStart))
   throw new Error('Ghidra Korean MAIN window identity/bounds invalid');
  windows.add(part.windowStart);
  for(const inst of part.instructions){
   if(!valid(inst?.reaAddress,part.loadBase+part.windowStart,
       part.loadBase+part.windowEnd)||
      !valid(inst.length,1,16)||typeof inst.flow!=='string')
    throw new Error('Ghidra Korean MAIN instruction boundary malformed');
   if(byRea.has(inst.reaAddress))
    throw new Error('overlapping duplicate Ghidra instruction boundary');
   byRea.set(inst.reaAddress,inst);
  }
 }
 return {byRea,windowStarts:[...windows].sort((a,b)=>a-b)};
};
export function inspectMainNewGameFarTargets(original,parts){
 const image=Buffer.from(original);
 const primary=parts?.find(p=>p?.windowStart===0x10000);
 if(!primary)throw new Error('Ghidra source initializer window unavailable');
 const witness=inspectMainNewGameCallLedger(image,primary);
 const mz=parseMzHeader(image,'MAIN.EXE');
 if(mz.headerBytes!==0x5400||mz.declaredBytes!==image.length||
    mz.relocationCount!==5245)
  throw new Error('Korean MAIN original MZ header and 5245 relocations required');
 const {byRea,windowStarts}=validatedInstructionIndex(parts);
 const relocationCountByRaw=new Map();
 for(const entry of mz.relocationTargets){
  const raw=mz.headerBytes+entry.imageOffset;
  relocationCountByRaw.set(raw,(relocationCountByRaw.get(raw)||0)+1);
 }
 let directAuthenticated=0,unresolved=0,calleeBoundaryMatched=0;
 const edges=[];
 for(const owner of witness.calls){
  for(const call of owner.directCalls.filter(x=>x.flow==='CALL_FAR')){
   const atRea=call.atRea,raw=reaToMainRaw(atRea),inst=byRea.get(atRea);
   if(!valid(raw,mz.headerBytes,mz.declaredBytes)||
      !inst||inst.flow!=='CALL_FAR')
    throw new Error('Ghidra original far-call source instruction mismatch');
   // Only an immediate 9A / length-5 instruction whose segment word has
   // exactly one ORIGINAL MZ relocation is a relocatable direct target.
   // Other far calls might be FF /3 indirect; do not guess their targets.
   const direct=inst.length===5&&image[raw]===0x9a&&
     relocationCountByRaw.get(raw+3)===1;
   if(!direct){
    unresolved++;
    edges.push(Object.freeze({ownerRole:owner.role,sourceRaw:raw,
     sourceRea:atRea,sourceLength:inst.length,
     status:'UNRESOLVED_INDIRECT_OR_UNRELOCATED_FAR_TRANSFER'}));
    continue;
   }
   const targetOffset=image.readUInt16LE(raw+1);
   const sourceSegmentAddend=image.readUInt16LE(raw+3);
   const relative=sourceSegmentAddend*16+targetOffset;
   const targetRaw=relative<mz.imageBytes?relative+mz.headerBytes:null;
   const targetRea=targetRaw===null?null:rawToMainRea(targetRaw);
   const entry=targetRea===null?null:byRea.get(targetRea);
   if(entry)calleeBoundaryMatched++;
   directAuthenticated++;
   edges.push(Object.freeze({
    ownerRole:owner.role,sourceRaw:raw,sourceRea:atRea,
    sourceLength:5,segmentAddend:sourceSegmentAddend,
    targetOffset,targetRaw,targetRea,
    targetBoundaryPresent:!!entry,
    status:entry?'MZ_RELOCATED_DIRECT_FAR__GHIDRA_TARGET_BOUNDARY':
     'MZ_RELOCATED_DIRECT_FAR__TARGET_BOUNDARY_UNVERIFIED'
   }));
  }
 }
 return Object.freeze({
  originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  mzRelocations:mz.relocationCount,initializerCalls:witness.callCount,
  observedFarCalls:edges.length,directAuthenticated,unresolved,
  calleeBoundaryMatched,
  ghidraWindows:Object.freeze(windowStarts),
  edges:Object.freeze(edges),
  freshGameReady:false,
  fidelity:'ORIGINAL_MAIN_RAW_9A_MZ_RELOCATION_AND_GHIDRA_BOUNDARIES_ONLY__NO_DOS_REFERENCE_EXECUTION'
 });
}
export function verifyMainNewGameFarTargets(original,parts){
 if(!(original instanceof Uint8Array)||
  crypto.createHash('sha256').update(original).digest('hex')!==
   MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('Korean original MAIN SHA-256 mismatch: fail closed');
 return inspectMainNewGameFarTargets(original,parts);
}
const isMain=process.argv[1]&&new URL('file://'+process.argv[1]).href===import.meta.url;
if(isMain){
 const [path,...jsonPaths]=process.argv.slice(2);
 if(!path||!jsonPaths.length){
  console.error('Usage: original-new-game-far-targets.mjs /private/MAIN.EXE /private/MAIN-010000-020000.json [other Ghidra windows...]');
  process.exitCode=2;
 }else try{
  const report=verifyMainNewGameFarTargets(fs.readFileSync(path),
    jsonPaths.map(p=>JSON.parse(fs.readFileSync(p,'utf8'))));
  console.log(JSON.stringify(report,null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}
