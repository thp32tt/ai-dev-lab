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
 return Object.freeze({advanced:true,reason:next.lastEvent});
}
