#!/usr/bin/env node
// Original Korean MAIN.EXE sea camera 0x1B5C9..0x1B627:
// source-authenticated 8086 multi-instruction subroutine execution,
// compared against the shipped browser-native JS sea-camera projection.
// The synthetic DS, stack and coordinates are explicitly test inputs;
// this is NOT a reference DOS gameplay trace or a fresh-game bootstrap.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';
import {originalSeaCameraOrigin} from '../web/native-original-sea-camera.js';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';
import {rawToMainRea} from './original-new-game-call-ledger.mjs';

export const ORIGINAL_CAMERA_RAW_START=0x1b5c9;
export const ORIGINAL_CAMERA_RAW_END=0x1b627;
const MAX_GUEST_STEPS=90;
const u16=n=>Number.isSafeInteger(n)&&n>=0&&n<=65535;

export function executeBoundedGuestSubroutine(cpu,{
 startCS,startIP,endPhysical,sourcePhysical,starts,
 stackSegment=0x8000,stackPointer=0x8000,returnCS=0x1234,returnIP=0x5678,
 maxSteps=MAX_GUEST_STEPS
}={}){
 if(!(cpu instanceof RealMode8086)||![startCS,startIP,stackSegment,
  stackPointer,returnCS,returnIP].every(u16)||!u16(stackPointer+4)||
  !Number.isSafeInteger(sourcePhysical)||sourcePhysical<0||
  !Number.isSafeInteger(endPhysical)||endPhysical<=sourcePhysical||
  endPhysical>cpu.memory.length||!(starts instanceof Set)||
  starts.size<2||!Number.isSafeInteger(maxSteps)||maxSteps<1||
  maxSteps>1024||cpu.physical(startCS,startIP)!==sourcePhysical)
  throw new Error('bounded 8086 source, entry and synthetic return stack required');
 const validStarts=new Set();
 for(const address of starts){
  if(!Number.isSafeInteger(address)||address<sourcePhysical||
     address>=endPhysical)throw new Error('unverified Ghidra function boundary');
  validStarts.add(address);
 }
 if(!validStarts.has(sourcePhysical))
  throw new Error('entry absent from verified instruction boundaries');
 const sentinel=cpu.physical(returnCS,returnIP);
 if(sentinel>=sourcePhysical&&sentinel<endPhysical)
  throw new Error('synthetic return overlaps source function');
 const stackStart=cpu.physical(stackSegment,stackPointer);
 if(stackStart+3>=cpu.memory.length||
    !(stackStart+4<=sourcePhysical||stackStart>=endPhysical))
  throw new Error('synthetic return stack overlaps source');
 cpu.set16('CS',startCS);cpu.set16('IP',startIP);
 cpu.set16('SS',stackSegment);cpu.set16('SP',stackPointer);
 cpu.write16(stackSegment,stackPointer,returnIP);
 cpu.write16(stackSegment,stackPointer+2,returnCS);
 let steps=0;
 for(;steps<maxSteps;steps++){
  const physical=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
  if(physical===sentinel&&cpu.get16('CS')===returnCS&&
     cpu.get16('IP')===returnIP)break;
  if(!validStarts.has(physical))
   throw new Error('8086 function escaped source Ghidra instruction boundary');
  cpu.step();
 }
 if(steps===maxSteps||cpu.get16('CS')!==returnCS||
    cpu.get16('IP')!==returnIP||cpu.get16('SP')!==stackPointer+4)
  throw new Error('original 8086 routine did not reach verified far return');
 return Object.freeze({steps,returned:true});
}

export function originalCameraInstructionBoundaries(original,ghidra,{
 headerBytes=0x5400,loadSegment=0x2000
}={}){
 if(!(original instanceof Uint8Array)||
    createHash('sha256').update(original).digest('hex')!==
    MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('original Korean MAIN.EXE SHA-256 mismatch');
 if(!ghidra||ghidra.moduleName!=='MAIN.EXE'||
    ghidra.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
    ghidra.loadBase!==0x10000||
    ghidra.windowStart!==0x10000||ghidra.windowEnd!==0x20000||
    !Array.isArray(ghidra.instructions))
  throw new Error('source Ghidra original MAIN instruction window missing');
 if(headerBytes!==0x5400||!u16(loadSegment)||
    original.length<ORIGINAL_CAMERA_RAW_END)
  throw new Error('original Korean MAIN MZ camera bounds invalid');
 const physicalStart=loadSegment*16+ORIGINAL_CAMERA_RAW_START-headerBytes;
 const physicalEnd=loadSegment*16+ORIGINAL_CAMERA_RAW_END-headerBytes;
 if(physicalEnd>0x100000)throw new Error('camera exceeds 8086 physical memory');
 const byRea=new Map();
 for(const inst of ghidra.instructions){
  if(inst?.reaAddress>=rawToMainRea(ORIGINAL_CAMERA_RAW_START)&&
     inst.reaAddress<rawToMainRea(ORIGINAL_CAMERA_RAW_END)){
   if(byRea.has(inst.reaAddress))throw new Error('duplicate camera instruction');
   byRea.set(inst.reaAddress,inst);
  }
 }
 const starts=new Set();
 let cursor=ORIGINAL_CAMERA_RAW_START,returns=0;
 while(cursor<ORIGINAL_CAMERA_RAW_END){
  const inst=byRea.get(rawToMainRea(cursor));
  if(!inst||!Number.isSafeInteger(inst.length)||inst.length<1||
     inst.length>15||cursor+inst.length>ORIGINAL_CAMERA_RAW_END)
   throw new Error('camera Ghidra instruction source discontinuity');
  if(inst.flow==='CALL_NEAR'||inst.flow==='CALL_FAR')
   throw new Error('camera has unproven external callee');
  if(Number.isSafeInteger(inst.targetRea)&&
     (inst.targetRea<rawToMainRea(ORIGINAL_CAMERA_RAW_START)||
      inst.targetRea>=rawToMainRea(ORIGINAL_CAMERA_RAW_END)))
   throw new Error('camera jumps outside original source function');
  if(inst.flow==='RETURN')returns++;
  starts.add(physicalStart+cursor-ORIGINAL_CAMERA_RAW_START);
  cursor+=inst.length;
 }
 if(cursor!==ORIGINAL_CAMERA_RAW_END||returns!==2||
    original[ORIGINAL_CAMERA_RAW_END-1]!==0xcb)
  throw new Error('camera far-return structure differs from original');
 return Object.freeze({starts,sourcePhysical:physicalStart,
  endPhysical:physicalEnd,startCS:loadSegment+0x1000,
  startIP:0x61c9,expectedReturns:returns});
}

export function executeOriginalCameraPoint(cpu,original,provenance,x,y){
 const projection=originalSeaCameraOrigin(x,y);
 if(!projection)throw new RangeError('sea camera point outside original world');
 const {sourcePhysical,endPhysical}=provenance;
 if(!(cpu instanceof RealMode8086)||!provenance.starts||
   endPhysical-sourcePhysical!==ORIGINAL_CAMERA_RAW_END-ORIGINAL_CAMERA_RAW_START)
  throw new Error('original camera executable provenance required');
 for(let i=0;i<ORIGINAL_CAMERA_RAW_END-ORIGINAL_CAMERA_RAW_START;i++)
  if(cpu.memory[sourcePhysical+i]!==original[ORIGINAL_CAMERA_RAW_START+i])
   throw new Error('original camera guest source modified: fail closed');
 const DS=0x7000, ptr=0x5000;
 // Read-only source image; all synthetic fields stay outside MZ allocation.
 cpu.set16('DS',DS);
 cpu.write16(DS,0xc6da,ptr);
 cpu.write16(DS,ptr,x);cpu.write16(DS,ptr+2,y);
 cpu.write16(DS,0x0f92,0xffff);cpu.write16(DS,0x0f94,0xffff);
 for(const reg of ['AX','BX','CX','DX','SI','DI','BP'])
  cpu.set16(reg,0);
 cpu.set16('FLAGS',0x0202);
 const result=executeBoundedGuestSubroutine(cpu,{
  ...provenance,stackSegment:0x8000,stackPointer:0x8000
 });
 const startX=cpu.read16(DS,0x0f92),startY=cpu.read16(DS,0x0f94);
 if(startX!==projection.startX||startY!==projection.startY)
  throw new Error('authentic 8086 camera diverged from native browser projection');
 return Object.freeze({x,y,startX,startY,steps:result.steps,
  fidelity:'ORIGINAL_8086_ROUTINE__SYNTHETIC_SOURCE_COORDS__NO_DOS_REFERENCE'});
}
export async function probeOriginalMainSeaCamera(original,ghidra,{
 loadSegment=0x2000,points=[[0,0],[11,11],[12,12],
 [707,1068],[719,1079],[720,0],[731,10],
 [1439,1079],[1440,1000],[2159,1079]]
}={}){
 const provenance=originalCameraInstructionBoundaries(original,ghidra,{
  loadSegment
 });
 const mz=inspectMzForLoad(original);
 const cpu=new RealMode8086();
 await loadVerifiedMz(cpu,original,{
  loadSegment,pspSegment:0x1000,
  allocationParagraphs:Math.max(Math.ceil(mz.imageBytes/16)+mz.minExtra,
   Math.ceil((mz.ss*16+mz.sp)/16)),
  expectedSha256:MAIN_NEW_GAME_SOURCE_SHA256
 });
 if(!Array.isArray(points)||points.length<1||points.length>200)
  throw new Error('bounded original-camera differential test points required');
 const cases=points.map(point=>{
  if(!Array.isArray(point)||point.length!==2)
   throw new Error('original camera coordinate pair required');
  return executeOriginalCameraPoint(cpu,original,provenance,...point);
 });
 return Object.freeze({originalSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  verifiedInstructionCount:provenance.starts.size,
  sampleCount:cases.length,cases:Object.freeze(cases),
  actualGuestInstructionSteps:cases.reduce((s,c)=>s+c.steps,0),
  originalDOSReferenceRun:false,freshGameReady:false});
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [exe,ledger]=process.argv.slice(2);
 if(!exe||!ledger){console.error('Usage: original-main-camera-cpu-probe.mjs private/MAIN.EXE private/MAIN-010000-020000.json');process.exitCode=2;}
 else try{console.log(JSON.stringify(await probeOriginalMainSeaCamera(
  fs.readFileSync(exe),JSON.parse(fs.readFileSync(ledger,'utf8'))
 ),null,2));}
 catch(error){console.error(String(error?.stack??error));process.exitCode=1;}
}
