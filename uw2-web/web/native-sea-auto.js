import {SeaRuntime} from './world-map.js';

// Browser-only helper. Auto-sail must not turn a windless, currentless
// stationary fleet into a 220ms wall-clock drain of days/provisions/interest.
// Manual steps remain available, since an explicit wait can advance time.
export function advanceNativeSeaAuto(runtime,onVoyageTick){
  if(!(runtime instanceof SeaRuntime)||typeof onVoyageTick!=='function')
    throw new TypeError('native sea auto requires a live SeaRuntime and synchronous voyage tick');
  if(!runtime.hasNetMotion()){
    runtime.lastEvent='auto-no-net-motion';
    return Object.freeze({advanced:false,reason:'auto-no-net-motion'});
  }
  const result=onVoyageTick();
  if(result&&typeof result.then==='function')
    throw new TypeError('native sea auto voyage tick must be synchronous');
  return Object.freeze({advanced:true,reason:runtime.lastEvent});
}
