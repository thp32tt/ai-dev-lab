// Opt-in bounded evidence of genuine guest memory writes and DOS file events
// during original 8086 instruction execution. No device register guesses,
// memory snapshots, binary bytes or synthetic progress are generated.
import {RealMode8086} from './realmode-8086.js';

const integer=(v,min,max,label)=>{
  if(!Number.isSafeInteger(v)||v<min||v>max)
    throw new RangeError(label+' must be a bounded integer');
  return v;
};
export function createGuestProgressWitness({
  stepsPerWindow=4096,maxWindows=128,maxAddressesPerWindow=8192
}={}){
  integer(stepsPerWindow,1,1000000,'progress window size');
  integer(maxWindows,1,1024,'progress window count');
  integer(maxAddressesPerWindow,1,65536,'progress address capacity');
  let lastStep=-1,window=null,seen=new Set(),windows=[],discardedWindows=0;
  const totals={instructionBoundaries:0,writeEvents:0,changedWrites:0,
    ramWrites:0,vgaApertureWrites:0,upperMemoryWrites:0,
    fileEvents:0,fileReadBytes:0,uniqueAddressOverflows:0};
  const open=(step)=>{
    if(window){
      windows.push(Object.freeze({...window,uniquePhysicalAddresses:seen.size}));
      // The active new window consumes one slot as well.
      if(windows.length>=maxWindows){windows.shift();discardedWindows++;}
    }
    window={firstStep:step,lastStep:step,instructionBoundaries:0,
      writeEvents:0,changedWrites:0,ramWrites:0,vgaApertureWrites:0,
      upperMemoryWrites:0,fileEvents:0,fileReadBytes:0,uniqueAddressOverflows:0};
    seen=new Set();
  };
  const observeInstruction=({steps,cs,ip}={},cpu)=>{
    if(!(cpu instanceof RealMode8086))
      throw new TypeError('progress witness requires real-mode 8086 CPU');
    integer(steps,0,15000000,'guest progress step');
    integer(cs,0,65535,'guest progress CS');
    integer(ip,0,65535,'guest progress IP');
    if(steps<=lastStep)
      throw new Error('progress witness steps must be monotonically increasing');
    if(cpu.get16('CS')!==cs||cpu.get16('IP')!==ip)
      throw new Error('progress witness cannot observe mismatched CPU boundary');
    if(!window||Math.floor(steps/stepsPerWindow)!==
        Math.floor(window.firstStep/stepsPerWindow))open(steps);
    lastStep=steps;
    totals.instructionBoundaries++;window.instructionBoundaries++;window.lastStep=steps;
  };
  const observeMemoryWrite=(event,cpu)=>{
    if(!(cpu instanceof RealMode8086)||!window)
      throw new Error('progress memory write requires active witnessed instruction');
    if(!event||typeof event!=='object')
      throw new TypeError('progress memory witness requires CPU source event');
    integer(event.physical,0,0xfffff,'progress physical write address');
    integer(event.value,0,255,'progress written byte');
    integer(event.previous,0,255,'progress previous byte');
    if(!Number.isInteger(event.segment)||!Number.isInteger(event.offset)||
       cpu.physical(event.segment,event.offset)!==event.physical)
      throw new Error('progress memory physical provenance mismatch');
    for(const dest of [totals,window]){
      dest.writeEvents++;
      if(event.value!==event.previous)dest.changedWrites++;
      if(event.physical<0xa0000)dest.ramWrites++;
      else if(event.physical<0xc0000)dest.vgaApertureWrites++;
      else dest.upperMemoryWrites++;
    }
    if(!seen.has(event.physical)){
      if(seen.size<maxAddressesPerWindow)seen.add(event.physical);
      else {totals.uniqueAddressOverflows++;window.uniqueAddressOverflows++;}
    }
    // CPU write8 performs the actual memory update after this passive observer.
  };
  const observeFileEvent=event=>{
    if(!window)
      throw new Error('DOS progress event requires active witnessed instruction');
    if(!event||typeof event!=='object'||typeof event.operation!=='string')
      throw new TypeError('DOS progress event requires source operation');
    const size=event.operation==='read'?
      integer(event.readBytes,0,65535,'source DOS read byte count'):0;
    totals.fileEvents++;window.fileEvents++;
    totals.fileReadBytes+=size;window.fileReadBytes+=size;
    // Only metadata counters, never file names or payload bytes.
  };
  const summarize=()=>{
    const items=window?
      [...windows,Object.freeze({...window,uniquePhysicalAddresses:seen.size})]:windows;
    return Object.freeze({
      ...totals,stepsPerWindow,discardedWindows,
      windows:Object.freeze(items.map(v=>Object.freeze({...v}))),
      verdict:'OBSERVED_WRITES_AND_FILE_EVENTS_ONLY__NO_INFERRED_STALL_OR_GAME_PROGRESS',
      fidelity:'ORIGINAL_GUEST_CPU_SOURCE_EVENTS__DOS_REFERENCE_AND_DEVICE_TIMING_UNTESTED'
    });
  };
  return Object.freeze({observeInstruction,observeMemoryWrite,observeFileEvent,summarize});
}
