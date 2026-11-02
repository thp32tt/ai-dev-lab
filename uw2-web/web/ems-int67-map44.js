// Explicitly provisioned LIM EMS 4.x AH=44h page-mapping device for the
// 8086 browser port. No EMS handle/page/frame is inferred from MAIN.EXE or
// the host machine. The caller must own all 16-KiB logical pages up front.
// This adapter is a bounded, opt-in test/runtime device, NOT a claim that
// the original DOS EMM installation or page tables have been recovered.
import {RealMode8086} from '../web/realmode-8086.js';
const PAGE_BYTES=0x4000,FRAME_SLOTS=4;
const u16=x=>Number.isInteger(x)&&x>=0&&x<=0xffff;
export const EMS44_PAGE_BYTES=PAGE_BYTES;
export const EMS44_FRAME_SLOTS=FRAME_SLOTS;
export const EMS44_STATUS=Object.freeze({
 OK:0,INVALID_HANDLE:0x83,INVALID_LOGICAL_PAGE:0x8a,
 INVALID_PHYSICAL_PAGE:0x8b
});
export function installExplicitEms44(cpu,{
 handle,frameSegment,pages
}={}){
 if(!(cpu instanceof RealMode8086)||!u16(handle)||handle===0||
    !u16(frameSegment)||frameSegment<0x9000||frameSegment>0xf000||
    frameSegment%0x400!==0||
    !Array.isArray(pages)||pages.length<1||pages.length>64||
    pages.some(p=>!(p instanceof Uint8Array)||p.length!==PAGE_BYTES)||
    new Set(pages).size!==pages.length)
  throw new Error('explicit, uniquely backed EMS handle, 4-slot frame and 16-KiB pages required');
 const framePhysical=frameSegment<<4;
 if(framePhysical+4*PAGE_BYTES>cpu.memory.length)
  throw new Error('EMS four-page frame exceeds real-mode memory');
 // Preserve ownership of the frame; do not overwrite potentially live
 // conventional DOS/VGA code/data without an explicitly empty frame.
 if(cpu.interruptAdapters.has(0x67)||cpu.interruptVectors.has(0x67))
  throw new Error('INT 67h is already owned by another guest/vector/adapter');
 const backing=pages.map(p=>p.slice());
 const mapped=[null,null,null,null],seen=[];
 let active=true;
 const location=physical=>framePhysical+physical*PAGE_BYTES;
 const persist=physical=>{
  const logical=mapped[physical];
  if(logical===null)return;
  backing[logical].set(cpu.memory.subarray(location(physical),location(physical)+PAGE_BYTES));
 };
 const snapshot=()=>Object.freeze({
  handle,frameSegment,pageCount:backing.length,
  physicalToLogical:Object.freeze([...mapped]),
  events:seen.length
 });
 const handler=(guest)=>{
  if(!active||guest!==cpu)throw new Error('retired or foreign EMM adapter');
  if(guest.get8('AH')!==0x44)
   throw new Error('unimplemented INT 67h EMS function: fail closed');
  const physical=guest.get8('AL'),logical=guest.get16('BX'),
    supplied=guest.get16('DX');
  let status=EMS44_STATUS.OK;
  if(supplied!==handle)status=EMS44_STATUS.INVALID_HANDLE;
  else if(physical>=FRAME_SLOTS)status=EMS44_STATUS.INVALID_PHYSICAL_PAGE;
  else if(logical!==0xffff&&logical>=backing.length)
   status=EMS44_STATUS.INVALID_LOGICAL_PAGE;
  else if(logical!==0xffff&&mapped.some((item,i)=>
   i!==physical&&item===logical))
   throw new Error('EMS alias of one logical page in multiple physical slots is not validated');
  if(status===0&&mapped[physical]!==logical){
   persist(physical);
   if(logical===0xffff){
    cpu.memory.fill(0,location(physical),location(physical)+PAGE_BYTES);
    mapped[physical]=null;
   }else{
    cpu.memory.set(backing[logical],location(physical));
    mapped[physical]=logical;
   }
  }
  guest.set8('AH',status);
  seen.push(Object.freeze({physical,logical,handle:supplied,status}));
 };
 cpu.installInterruptAdapter(0x67,handler);
 return Object.freeze({
  snapshot,
  events:()=>Object.freeze([...seen]),
  pageCopy:logical=>{
   if(!Number.isInteger(logical)||logical<0||logical>=backing.length)
    throw new RangeError('explicit EMS logical page out of range');
   const physical=mapped.indexOf(logical);
   if(physical!==-1)persist(physical);
   return backing[logical].slice();
  },
  close:()=>{
   if(!active)throw new Error('EMS adapter already closed');
   for(let physical=0;physical<FRAME_SLOTS;physical++)persist(physical);
   cpu.removeInterruptAdapter(0x67,handler);
   active=false;
  }
 });
}
