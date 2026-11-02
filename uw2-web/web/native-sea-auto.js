import {SeaRuntime} from './world-map.js';
// Browser auto-sail is convenience, not claimed original DOS autopilot.
// Probe original source port/harbor/terrain readiness both before and after
// the atomic 20-minute voyage; never oversail a reachable original port.
const hold=(runtime,reason)=>{runtime.lastEvent=reason;
 return Object.freeze({advanced:false,reason});};
export function advanceNativeSeaAuto(runtime,onVoyageTick,portReady=null){
 if(!(runtime instanceof SeaRuntime)||typeof onVoyageTick!=='function')
  throw new TypeError('native sea auto requires a live SeaRuntime and synchronous voyage tick');
 if(portReady!==null&&typeof portReady!=='function')
  throw new TypeError('native sea auto port probe must be synchronous');
 let port=null;
 try{if(portReady)port=portReady(runtime.snapshot());}
 catch{return hold(runtime,'auto-port-probe-unavailable');}
 if(port)return hold(runtime,'auto-port-arrived');
 // A failed projection must not run the clock/provision-changing callback.
 let moving;
 try{moving=runtime.hasNetMotion();}
 catch{return hold(runtime,'auto-motion-probe-unavailable');}
 if(!moving)return hold(runtime,'auto-no-net-motion');
 const beforeTicks=runtime.ticks;
 let result;
 try{result=onVoyageTick();}
 catch{return hold(runtime,'auto-voyage-tick-unavailable');}
 if(result&&typeof result.then==='function')
  return hold(runtime,'auto-voyage-async-rejected');
 if(result?.advanced===false){
  const reason=typeof result.reason==='string'?result.reason:'native-voyage-hold';
  return hold(runtime,reason);
 }
 // Only an explicitly accepted, exactly one-tick source-shaped voyage
 // can start a subsequent interval. No implicit success for undefined,
 // false, or an arbitrary callback return. The underlying game transaction
 // owns atomic mutation of the live session, fleet and bank.
 const next=result?.sea;
 if(result?.advanced!==true||!(next instanceof SeaRuntime)||
    next.assets!==runtime.assets||next.windRaw!==runtime.windRaw||
    next.ticks!==beforeTicks+1)
  return hold(runtime,'auto-voyage-result-invalid');
 try{if(portReady)port=portReady(next.snapshot());}
 catch{
  // This tick has already committed. Report it as advanced and STOP,
  // rather than incorrectly claiming the voyage never happened.
  next.lastEvent='auto-port-probe-unavailable';
  return Object.freeze({advanced:true,stopAtProbe:true,reason:'auto-port-probe-unavailable'});
 }
 if(port){
  next.lastEvent='auto-port-arrived';
  return Object.freeze({advanced:true,stopAtPort:true,reason:'auto-port-arrived'});
 }
 // The native 60-subunit integrator marks a crossed world tile blocked
 // by land as coast-block, not the ordinary low-speed accumulate event.
 // The first atomic voyage tick has already committed; stop the timer
 // before charging another 20-minute interval at the same coast.
 if(next.lastEvent==='coast-block'){
  next.lastEvent='auto-coast-block';
  return Object.freeze({advanced:true,stopAtCoast:true,reason:'auto-coast-block'});
 }
 return Object.freeze({advanced:true,reason:next.lastEvent});
}

// An initial source-backed sea anchor is intentionally near the port just
// departed. It is not a new ARRIVAL. Arm the original-port stop only after
// the fleet leaves that port's source catalog call ring; other source ports
// are eligible immediately. The callback retains state within one auto run.
export function createNativeAutoOriginPortProbe({
 originPortId=null,portCandidate,portReady
}={}){
 if(typeof portCandidate!=='function'||typeof portReady!=='function')
  throw new TypeError('native sea auto source-port probes required');
 if(originPortId!==null&&(!Number.isSafeInteger(originPortId)||
    originPortId<0||originPortId>129))
  throw new TypeError('native sea auto original catalog port invalid');
 let originExited=false;
 return state=>{
  const source=portCandidate(state);
  const ready=portReady(state);
  if(!source||source.id!==originPortId)originExited=true;
  if(ready&&ready.id===originPortId&&!originExited)return null;
  return ready;
 };
}
