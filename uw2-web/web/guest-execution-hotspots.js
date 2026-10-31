// Bounded ORIGINAL guest instruction-site and register-state repeat telemetry.
// Instruction addresses and CPU snapshots are observations, not verified
// DOS/game control flow. A repeated register state DOES NOT prove a stall:
// unseen RAM, port/device state and a synthetic IRQ clock may have changed.
import {RealMode8086} from './realmode-8086.js';

const regNames=Object.freeze(['AX','BX','CX','DX','SI','DI','SP','BP','DS','ES','SS','FLAGS']);
const valid=(v,min,max,label)=>{
  if(!Number.isSafeInteger(v)||v<min||v>max)
    throw new RangeError(label+' must be a bounded safe integer');
  return v;
};
export function createGuestExecutionHotspotRecorder({
  startStep=0,sampleEvery=127,maxSites=4096,maxStates=8192,top=16
}={}){
  valid(startStep,0,15000000,'hotspot start step');
  valid(sampleEvery,1,65535,'hotspot sampling interval');
  valid(maxSites,1,65536,'hotspot site budget');
  valid(maxStates,1,65536,'hotspot register-state budget');
  valid(top,1,64,'hotspot top count');
  const sites=new Map(),states=new Map();
  let lastStep=-1,boundaries=0,samples=0,siteOverflow=0,stateOverflow=0;
  let repeatSamples=0;
  const address=(cs,ip)=>cs.toString(16).padStart(4,'0')+':'+ip.toString(16).padStart(4,'0');
  const observeInstruction=(entry,cpu)=>{
    if(!(cpu instanceof RealMode8086)||!entry||typeof entry!=='object')
      throw new TypeError('guest hotspot requires an 8086 instruction-boundary witness');
    const {steps,cs,ip}=entry;
    valid(steps,0,15000000,'instruction step');
    valid(cs,0,65535,'guest CS');valid(ip,0,65535,'guest IP');
    if(steps<=lastStep)throw new Error('guest hotspot steps must increase monotonically');
    lastStep=steps;boundaries++;
    if(steps<startStep||(steps-startStep)%sampleEvery!==0)return;
    if(cpu.get16('CS')!==cs||cpu.get16('IP')!==ip)
      throw new Error('guest hotspot boundary does not match live CPU: fail closed');
    samples++;
    const key=address(cs,ip);
    let site=sites.get(key);
    if(!site){
      if(sites.size===maxSites){siteOverflow++;}
      else{
        site={address:key,cs,ip,visits:0,firstStep:steps,lastStep:steps};
        sites.set(key,site);
      }
    }
    if(site){site.visits++;site.lastStep=steps;}
    // Do not read guest code, RAM, secrets, binaries, I/O or pixels.
    // Registers alone cannot establish a deterministic infinite loop.
    const signature=key+'/'+regNames.map(name=>cpu.get16(name).toString(16)).join('/');
    let state=states.get(signature);
    if(state){state.visits++;state.lastStep=steps;repeatSamples++;}
    else if(states.size===maxStates)stateOverflow++;
    else states.set(signature,{address:key,cs,ip,visits:1,
      firstStep:steps,lastStep:steps});
  };
  const summarize=()=>{
    const rank=map=>Array.from(map.values()).sort((a,b)=>
      b.visits-a.visits||a.address.localeCompare(b.address));
    const freezeRows=rows=>Object.freeze(rows.slice(0,top).map(x=>Object.freeze({...x})));
    return Object.freeze({
      startStep,sampleEvery,boundariesObserved:boundaries,
      samples,trackedSites:sites.size,trackedRegisterStates:states.size,
      untrackedSiteSamples:siteOverflow,untrackedRegisterStateSamples:stateOverflow,
      repeatedRegisterStateSamples:repeatSamples,
      topSites:freezeRows(rank(sites)),topRepeatedRegisterStates:freezeRows(rank(states)),
      completion:'HOLD_REGISTER_REPETITION_IS_NOT_A_DOS_STALL_PROOF',
      fidelity:'GUEST_CPU_BOUNDARIES_ONLY__ORIGINAL_DOS_REFERENCE_AND_DEVICE_PROGRESS_UNTESTED'
    });
  };
  return Object.freeze({observeInstruction,summarize});
}
