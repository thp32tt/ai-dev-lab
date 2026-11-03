#!/usr/bin/env node
// Execute the Korean MAIN.EXE's REAL source instructions for EMS wrappers,
// backed by an explicitly owned LIM EMS device (no fabricated DOS boot).
// This is a bounded isolated CPU test, not game state or a DOS reference run.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';
import {installManagedEmsOriginalServices} from '../web/ems-int67-manager.js';
import {MAIN_NEW_GAME_SOURCE_SHA256} from './original-new-game-init-proof.mjs';
import {rawToMainRea} from './original-new-game-call-ledger.mjs';
const HEADER=0x5400,LOAD=0x2000;
export const KOREAN_MAIN_EMS_WRAPPERS=Object.freeze({
 status:[0x3a8d0,0x3a8d9],physicalCount:[0x3a8f1,0x3a90a],
 pages:[0x3a90a,0x3a929],frame:[0x3a929,0x3a943],
 allocate:[0x3a943,0x3a95e],physicalArray:[0x3a95e,0x3a975],
 map:[0x3a975,0x3a98b],free:[0x3a98b,0x3a99b]
});
const entries=new Map(Object.entries(KOREAN_MAIN_EMS_WRAPPERS));
const physical=raw=>LOAD*16+raw-HEADER;
export function verifyKoreanMainEmsWrappers(bytes,ghidra){
 if(!(bytes instanceof Uint8Array)||
    createHash('sha256').update(bytes).digest('hex')!==
    MAIN_NEW_GAME_SOURCE_SHA256)
  throw new Error('Korean MAIN original SHA-256 mismatch: fail closed');
 if(!ghidra||ghidra.moduleName!=='MAIN.EXE'||
    ghidra.sha256!==MAIN_NEW_GAME_SOURCE_SHA256||
    ghidra.loadBase!==0x10000||ghidra.windowStart!==0x30000||
    ghidra.windowEnd!==0x40000||
    !Array.isArray(ghidra.instructions))
  throw new Error('original Ghidra Korean EMS window is not admitted');
 const mz=inspectMzForLoad(bytes);
 if(mz.headerBytes!==HEADER)
  throw new Error('original Korean MAIN MZ header moved');
 const index=new Map(ghidra.instructions.map(x=>[x.reaAddress,x]));
 const approved={};
 for(const [name,[start,end]] of entries){
  const starts=new Set(),interrupts=[];
  for(let raw=start;raw<end;){
   const op=index.get(rawToMainRea(raw));
   if(!op||!Number.isInteger(op.length)||op.length<1||
      op.length>15||raw+op.length>end)
    throw new Error('Korean EMS wrapper Ghidra instruction coverage incomplete: '+name);
   if(op.flow==='CALL_FAR'||op.flow==='CALL_NEAR'||
      (op.flow==='INTERRUPT'&&
       (bytes[raw]!==0xcd||bytes[raw+1]!==0x67)))
    throw new Error('Korean EMS wrapper contains unverified original call: '+name);
   if(Number.isInteger(op.targetRea)&&
      (op.targetRea<rawToMainRea(start)||
       op.targetRea>=rawToMainRea(end)||
       !index.has(op.targetRea)))
    throw new Error('Korean EMS wrapper branch leaves proven source: '+name);
   if(op.flow==='INTERRUPT')interrupts.push(raw);
   starts.add(physical(raw));
   raw+=op.length;
  }
  if(interrupts.length!==1||bytes[end-1]!==0xcb)
   throw new Error('Korean EMS original INT67/RETF coverage not exact: '+name);
  approved[name]=Object.freeze({start,end,
   starts:Object.freeze(starts),interruptRaw:interrupts[0]});
 }
 return Object.freeze(approved);
}
export async function runKoreanMainEmsLifecycle(bytes,ghidra,{
 totalPages=6,frameSegment=0xc000
}={}){
 if(!Number.isInteger(totalPages)||totalPages<2||totalPages>32||
    frameSegment!==0xc000)
  throw new Error('explicit and bounded test EMS frame/pages required');
 const proof=verifyKoreanMainEmsWrappers(bytes,ghidra);
 const cpu=new RealMode8086();
 const mz=inspectMzForLoad(bytes);
 await loadVerifiedMz(cpu,bytes,{
  loadSegment:LOAD,pspSegment:0x1000,
  allocationParagraphs:Math.max(Math.ceil(mz.imageBytes/16)+mz.minExtra,
   Math.ceil((mz.ss*16+mz.sp)/16)),
  expectedSha256:MAIN_NEW_GAME_SOURCE_SHA256
 });
 const device=installManagedEmsOriginalServices(cpu,{
  frameSegment,totalPages,frameReserved:true
 });
 let executed=0;
 const run=(name,args=[])=>{
  const evidence=proof[name];
  if(!evidence||args.length>3||args.some(x=>!Number.isInteger(x)||x<0||x>65535))
   throw new Error('unknown EMS source wrapper or invalid test argument');
  const rel=evidence.start-HEADER;
  const cs=LOAD+(rel>>>4),ip=rel&15;
  cpu.set16('CS',cs);cpu.set16('IP',ip);
  cpu.set16('SS',0x8000);cpu.set16('SP',0x8000);
  cpu.set16('DS',0x7000);cpu.set16('ES',0x7000);
  cpu.set16('FLAGS',0x202);
  cpu.write16(0x8000,0x8000,0x100);
  cpu.write16(0x8000,0x8002,0x4000);
  for(let i=0;i<args.length;i++)cpu.write16(0x8000,0x8004+2*i,args[i]);
  let count=0,interrupts=0;
  for(;count<80;count++){
   if(cpu.get16('CS')===0x4000&&cpu.get16('IP')===0x100)break;
   const p=cpu.physical(cpu.get16('CS'),cpu.get16('IP'));
   if(!evidence.starts.has(p))
    throw new Error('authentic EMS source instruction escaped admitted '+name);
   if(p===physical(evidence.interruptRaw))interrupts++;
   cpu.step();
  }
  if(count===80||interrupts!==1||cpu.get16('SP')!==0x8004)
   throw new Error('original EMS helper failed bounded RETF to test caller: '+name);
  executed+=count;
  return Object.freeze({ax:cpu.get16('AX'),steps:count});
 };
 const ptr=0x0b00;
 if(run('status').ax!==0)throw new Error('original EMS status wrapper failed');
 if(run('frame',[ptr]).ax!==0||
    cpu.read16(0x7000,ptr)!==frameSegment)
  throw new Error('original EMS page-frame wrapper mismatch');
 if(run('pages',[ptr+2,ptr+4]).ax!==0||
    cpu.read16(0x7000,ptr+2)!==totalPages||
    cpu.read16(0x7000,ptr+4)!==totalPages)
  throw new Error('original EMS count wrapper mismatch');
 if(run('physicalCount',[ptr+6]).ax!==0||
    cpu.read16(0x7000,ptr+6)!==4)
  throw new Error('original EMS physical entry count wrapper mismatch');
 if(run('physicalArray',[ptr+0x20]).ax!==0)
  throw new Error('original EMS physical array wrapper mismatch');
 for(let i=0;i<4;i++)
  if(cpu.read16(0x7000,ptr+0x20+i*4)!==frameSegment+i*0x400||
     cpu.read16(0x7000,ptr+0x22+i*4)!==i)
   throw new Error('original EMS mappable segment/number pair differs');
 if(run('allocate',[2,ptr+0x10]).ax!==0)
  throw new Error('original EMS allocation wrapper failed');
 const handle=cpu.read16(0x7000,ptr+0x10);
 if(handle===0)throw new Error('original EMS handle was not returned');
 if(run('map',[handle,0,0]).ax!==0)
  throw new Error('original source AH44 page-map wrapper failed');
 cpu.write8(frameSegment,0x27,0x6e);
 if(run('map',[handle,0,1]).ax!==0||
    device.pageCopy(handle,0)[0x27]!==0x6e)
  throw new Error('original AH44 helper failed page writeback');
 cpu.write8(frameSegment,0x27,0xa3);
 if(run('map',[handle,0,0]).ax!==0||
    cpu.read8(frameSegment,0x27)!==0x6e||
    device.pageCopy(handle,1)[0x27]!==0xa3)
  throw new Error('original AH44 helper failed bank restoration');
 if(run('free',[handle]).ax!==0)
  throw new Error('original AH45 release wrapper failed');
 if(device.snapshot().freePages!==totalPages||
    device.snapshot().activeHandles!==0||
    cpu.read8(frameSegment,0x27)!==0)
  throw new Error('original EMS release did not reclaim private pages');
 const report=Object.freeze({
  originalSourceSha256:MAIN_NEW_GAME_SOURCE_SHA256,
  originalGuestInstructions:executed,
  originalWrappers:Object.freeze([...entries.keys()]),
  wrapperCount:entries.size,originalInt67Count:device.events().length,
  allocatedThenFreedHandle:handle,
  totalPages,frameSegment,
  authenticGuestRetfVerified:true,
  privateMemoryBankWritebackVerified:true,
  originalDosStartupVerified:false,
  browserGameplayVerified:false
 });
 device.close();
 return report;
}
if(process.argv[1]&&pathToFileURL(process.argv[1]).href===import.meta.url){
 const [exe,ghidra]=process.argv.slice(2);
 if(!exe||!ghidra){console.error('Usage: node original-main-ems-lifecycle-cpu-probe.mjs /private/MAIN.EXE /private/MAIN-030000-040000.json');process.exitCode=2;}
 else try{
  console.log(JSON.stringify(await runKoreanMainEmsLifecycle(
   readFileSync(exe),JSON.parse(readFileSync(ghidra,'utf8'))),null,2));
 }catch(error){console.error(error.stack||String(error));process.exitCode=1;}
}
