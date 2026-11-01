import {findPortCallTarget,SeaRuntime,WORLD_CHIP_W,WORLD_CHIP_H} from './world-map.js';
import {buildNativePortArrival} from './native-port-arrival.js';
import {PortWalkingRuntime} from './town.js';
import {validNativeVoyageFleet} from './buildings.js';
import {validNativeCheckpointClock} from './native-checkpoint-integrity.js';

// Native-browser sea -> port transaction. This is a source-backed scene
// transition, not a DOS INT/8086 execution or an original DOS-save write.
// Do not touch the caller's session/runtime/scene until the full town
// runtime has been constructed successfully.
const within=(v,min,max)=>Number.isSafeInteger(v)&&v>=min&&v<=max;
const timeKeys=['year','month','day','timeTick','hour','minute'];
const sameClock=(a,b)=>timeKeys.every(k=>a?.[k]===b?.[k]);
const reject=reason=>({allowed:false,reason});

export function prepareNativePortCall({
  session,runtime,portCatalog,portDoors,portAssets
}={}){
  if(!(runtime instanceof SeaRuntime)||!session||
     !Array.isArray(portCatalog)||!portCatalog.length||
     !Array.isArray(portDoors)||!portAssets||
     runtime.fleet!==session.fleet||
     !validNativeVoyageFleet(session)||
     !validNativeCheckpointClock(session.dateTime)||
     !validNativeCheckpointClock(runtime.dateTime)||
     !sameClock(runtime.dateTime,session.dateTime)||
     runtime.month!==runtime.dateTime.month||
     !within(runtime.x,0,WORLD_CHIP_W-1)||
     !within(runtime.y,0,WORLD_CHIP_H-2))
    return reject('port-session-invalid');
  let state,port,arrival,town;
  try {
    state=runtime.snapshot();
    if(!state||state.x!==runtime.x||state.y!==runtime.y||
       state.month!==runtime.month||
       !validNativeCheckpointClock(state.dateTime)||
       !sameClock(state.dateTime,session.dateTime))
      return reject('port-sea-snapshot-invalid');
    // Only the already-verified unique original 4x4 source ring or
    // explicitly labeled 2-chip browser recovery can choose a port.
    port=findPortCallTarget(state,portCatalog);
    if(!port)return reject('no-port-call');
    arrival=buildNativePortArrival({
      port,seaState:state,previous:session,portDoors,portAssets,
      portCatalog
    });
    if(!arrival)return reject('port-map-unavailable');
    town=new PortWalkingRuntime(arrival,portAssets,portDoors);
    if(town.portId!==port.mapId||
       town.mapX!==arrival.portState.mapX||
       town.mapY!==arrival.portState.mapY)
      return reject('port-runtime-position-invalid');
  } catch {
    // If a source actor record, clone or new town runtime is malformed,
    // neither the user's sea position nor gameplay state is replaced.
    return reject('port-runtime-unavailable');
  }
  return {allowed:true,port,session:arrival,town,
    source:'NATIVE_SOURCE_PORT_CALL_ATOMIC_TOWN_TRANSITION'};
}
