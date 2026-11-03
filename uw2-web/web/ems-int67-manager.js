// An explicitly provisioned LIM EMS lifecycle for the authentic 8086
// port. The owner must RESERVE an empty 64-KiB frame. This is not
// automatic EMM386 detection and does not reconstruct MAIN.EXE startup.
// Supports precisely original MAIN.EXE-observed AH 40/41/42/43/44/45/58.
// All other services fail closed rather than invent guest DOS behavior.
import {RealMode8086} from './realmode-8086.js';

export const MANAGED_EMS_PAGE_BYTES=0x4000;
export const MANAGED_EMS_FRAME_SLOTS=4;
export const MANAGED_EMS_STATUS=Object.freeze({
 OK:0,INVALID_HANDLE:0x83,OUT_OF_TOTAL:0x87,OUT_OF_FREE:0x88,
 INVALID_LOGICAL:0x8a,INVALID_PHYSICAL:0x8b
});
const SIZE=MANAGED_EMS_PAGE_BYTES, SLOTS=MANAGED_EMS_FRAME_SLOTS;
const u16=v=>Number.isInteger(v)&&v>=0&&v<=65535;
export function installManagedEmsOriginalServices(cpu,{
 frameSegment,totalPages,maxHandles=16,frameReserved=false
}={}){
 if(!(cpu instanceof RealMode8086)||!u16(frameSegment)||
    frameSegment<0x9000||frameSegment>0xf000||
    frameSegment%0x400!==0||!Number.isInteger(totalPages)||
    totalPages<1||totalPages>128||!Number.isInteger(maxHandles)||
    maxHandles<1||maxHandles>128||frameReserved!==true)
  throw new Error('EMS requires explicitly reserved 64-KiB frame, 1..128 owned pages and handle limit');
 const frame=frameSegment<<4;
 if(frame+4*SIZE>cpu.memory.length||
    cpu.memory.subarray(frame,frame+4*SIZE).some(Boolean))
  throw new Error('EMS frame not empty or not fully present: refuse alias');
 if(cpu.interruptAdapters.has(0x67)||cpu.interruptVectors.has(0x67))
  throw new Error('INT 67h already has an owner/vector: refuse override');
 const handles=new Map(),slots=[null,null,null,null],events=[];
 let nextHandle=1,closed=false,used=0;
 const phys=index=>frame+index*SIZE;
 const writeBack=index=>{
  const m=slots[index];
  if(!m)return;
  const record=handles.get(m.handle);
  if(!record)throw new Error('EMS live slot refers to released handle');
  record[m.logical].set(cpu.memory.subarray(phys(index),phys(index)+SIZE));
 };
 const releaseSlot=index=>{
  if(slots[index])writeBack(index);
  slots[index]=null;
  cpu.memory.fill(0,phys(index),phys(index)+SIZE);
 };
 const fail=(code)=>cpu.set8('AH',code);
 const onInterrupt=guest=>{
  if(closed||guest!==cpu)throw new Error('retired/foreign EMS owner');
  const op=guest.get8('AH'),sub=guest.get8('AL');
  let status=0;
  if(op===0x40){ /* manager status available */ }
  else if(op===0x41)guest.set16('BX',frameSegment);
  else if(op===0x42){
   guest.set16('BX',totalPages-used);
   guest.set16('DX',totalPages);
  }else if(op===0x43){
   const count=guest.get16('BX');
   if(count<1||count>totalPages)status=MANAGED_EMS_STATUS.OUT_OF_TOTAL;
   else if(count>totalPages-used||handles.size>=maxHandles)
    status=MANAGED_EMS_STATUS.OUT_OF_FREE;
   else{
    let attempts=0;
    while(handles.has(nextHandle)&&attempts++<65535)
     nextHandle=(nextHandle%65534)+1;
    if(handles.has(nextHandle))throw new Error('EMS handle namespace exhausted');
    const h=nextHandle;
    nextHandle=(h%65534)+1;
    handles.set(h,Array.from({length:count},()=>new Uint8Array(SIZE)));
    used+=count;
    guest.set16('DX',h);
   }
  }else if(op===0x44){
   const physical=sub,logical=guest.get16('BX'),
     handle=guest.get16('DX'),record=handles.get(handle);
   if(!record)status=MANAGED_EMS_STATUS.INVALID_HANDLE;
   else if(physical>=SLOTS)status=MANAGED_EMS_STATUS.INVALID_PHYSICAL;
   else if(logical!==0xffff&&logical>=record.length)
    status=MANAGED_EMS_STATUS.INVALID_LOGICAL;
   else if(logical!==0xffff&&slots.some((s,i)=>
     i!==physical&&s?.handle===handle&&s?.logical===logical))
    throw new Error('unverified duplicated EMS logical-page alias: fail closed');
   else{
    const current=slots[physical];
    if(logical===0xffff){
     if(current)releaseSlot(physical);
    }else if(current?.handle!==handle||current?.logical!==logical){
     releaseSlot(physical);
     cpu.memory.set(record[logical],phys(physical));
     slots[physical]={handle,logical};
    }
   }
  }else if(op===0x45){
   const handle=guest.get16('DX'),record=handles.get(handle);
   if(!record)status=MANAGED_EMS_STATUS.INVALID_HANDLE;
   else{
    for(let i=0;i<SLOTS;i++)
     if(slots[i]?.handle===handle)releaseSlot(i);
    handles.delete(handle);
    used-=record.length;
   }
  }else if(op===0x58){
   if(sub===1)guest.set16('CX',SLOTS);
   else if(sub===0){
    const es=guest.get16('ES'),di=guest.get16('DI');
    const start=guest.physical(es,di);
    if(di>0xfff0||start+SLOTS*4>cpu.memory.length||
       (start<frame+4*SIZE&&start+SLOTS*4>frame))
     throw new Error('EMS 58h physical address array buffer is unowned/wrapped/aliases frame');
    for(let i=0;i<SLOTS;i++){
     guest.write16(es,di+i*4,frameSegment+i*0x400);
     guest.write16(es,di+i*4+2,i);
    }
    guest.set16('CX',SLOTS);
   }else throw new Error('unimplemented EMS AH58 subfunction: fail closed');
  }else throw new Error('unimplemented EMS INT67 service: fail closed');
  fail(status);
  events.push(Object.freeze({ah:op,sub,status}));
 };
 cpu.installInterruptAdapter(0x67,onInterrupt);
 return Object.freeze({
  snapshot:()=>Object.freeze({
   frameSegment,totalPages,freePages:totalPages-used,
   activeHandles:handles.size,
   physicalToLogical:Object.freeze(slots.map(s=>s?{...s}:null)),
   eventCount:events.length
  }),
  events:()=>Object.freeze([...events]),
  pageCopy:(handle,logical)=>{
   const pages=handles.get(handle);
   if(!pages||!Number.isInteger(logical)||logical<0||logical>=pages.length)
    throw new Error('cannot copy unowned logical EMS page');
   const i=slots.findIndex(s=>s?.handle===handle&&s?.logical===logical);
   if(i>=0)writeBack(i);
   return pages[logical].slice();
  },
  close:()=>{
   if(closed)throw new Error('EMS lifecycle already closed');
   for(let i=0;i<SLOTS;i++)releaseSlot(i);
   cpu.removeInterruptAdapter(0x67,onInterrupt);
   closed=true;handles.clear();used=0;
  }
 });
}
