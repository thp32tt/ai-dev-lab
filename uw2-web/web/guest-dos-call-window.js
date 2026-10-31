// Bounded, source-backed history of guest INT 21h call sites encountered.
// These are attempted DOS service entries, NOT proof the service succeeded.
// This never stores DOS filenames, guest binary bytes or device snapshots.
import {RealMode8086} from './realmode-8086.js';

const uint=(v,max,name)=>{
  if(!Number.isSafeInteger(v)||v<0||v>max)
    throw new RangeError(name+' must be a bounded unsigned integer');
};
export function createGuestDosCallWindow({maxEvents=4096}={}){
  if(!Number.isSafeInteger(maxEvents)||maxEvents<1||maxEvents>65536)
    throw new RangeError('guest DOS service history capacity must be 1..65536');
  const ring=new Array(maxEvents);
  let next=0,count=0,total=0;
  const observe=(entry,cpu)=>{
    if(!(cpu instanceof RealMode8086))
      throw new TypeError('guest DOS call history requires an 8086 CPU');
    if(!entry||typeof entry!=='object')
      throw new TypeError('guest DOS call requires a native instruction entry');
    uint(entry.ah,255,'DOS AH');
    uint(entry.al,255,'DOS AL');
    uint(entry.cs,65535,'DOS CS');
    uint(entry.ip,65535,'DOS IP');
    if(cpu.get16('CS')!==entry.cs||cpu.get16('IP')!==entry.ip||
       cpu.get8('AH')!==entry.ah||cpu.get8('AL')!==entry.al||
       cpu.read8(entry.cs,entry.ip)!==0xcd||
       cpu.read8(entry.cs,(entry.ip+1)&0xffff)!==0x21)
      throw new Error('guest DOS call does not match CPU INT 21h source: fail closed');
    ring[next]=Object.freeze({ah:entry.ah,al:entry.al,cs:entry.cs,ip:entry.ip});
    next=(next+1)%maxEvents;
    if(count<maxEvents)count++;
    total++;
  };
  const summarize=()=>{
    const calls=[];
    for(let i=0;i<count;i++)calls.push(ring[(next-count+i+maxEvents)%maxEvents]);
    return Object.freeze({
      calls:Object.freeze(calls),
      totalCalls:total,
      discardedCalls:total-count,
      maxEvents,
      fidelity:'SOURCE_GUEST_INT21_ATTEMPTS_ONLY__DOS_SERVICE_SUCCESS_UNTESTED'
    });
  };
  return Object.freeze({observe,summarize});
}
