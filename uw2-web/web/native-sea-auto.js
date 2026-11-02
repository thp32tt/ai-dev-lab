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
 if(!runtime.hasNetMotion())return hold(runtime,'auto-no-net-motion');
 const result=onVoyageTick();
 if(result&&typeof result.then==='function')
  throw new TypeError('native sea auto voyage tick must be synchronous');
 if(result&&typeof result==='object'&&result.advanced===false){
  const reason=typeof result.reason==='string'?result.reason:'native-voyage-hold';
  return hold(runtime,reason);
 }
 // The atomic voyage path returns a NEW runtime, replacing the live one.
 const next=result?.sea instanceof SeaRuntime?result.sea:runtime;
 try{if(portReady)port=portReady(next.snapshot());}
 catch{return hold(next,'auto-port-probe-unavailable');}
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
