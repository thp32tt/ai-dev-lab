import {PortWalkingRuntime} from './town.js';
import {syncNativeTownSession} from './native-save-session.js';
import {prepareNativeTownTimeTransition} from './native-town-time-transaction.js';

// Browser-native source town exit: stage calendar and PORTMAP/PORTCHIP
// geometry before committing the view and the original-shaped save copy.
// No DOS 8086 runtime or unverified new building rule is involved.
const coord=['viewX','viewY','playerX','playerY','mapX','mapY'];
const hold=reason=>({allowed:false,reason});
export function prepareNativeTownBuildingExit({session,runtime,assets,kind,ticks}={}){
 if(!(runtime instanceof PortWalkingRuntime)||!session||!assets||
   runtime.slot!==session||runtime.portAssets!==assets||
   runtime.portId!==session.port||!session.portState||
   !Array.isArray(session.townActors)||!Array.isArray(runtime.actors))
  return hold('native-building-exit-owner-invalid');
 try{
  const before=runtime.snapshot();
  if(!runtime.insideBuilding||!before.building||
     !Array.isArray(runtime.doors)||!runtime.doors.includes(runtime.insideBuilding))
   return hold('native-building-source-door-invalid');
  if(!coord.every(k=>before[k]===session.portState[k])||
     JSON.stringify(before.actors)!==JSON.stringify(session.townActors))
   return hold('native-building-exit-session-drift');
  const proof=syncNativeTownSession({port:session.port},before,assets);
  if(!proof.updated)return hold(proof.reason);
  const time=prepareNativeTownTimeTransition({session,kind,ticks});
  if(!time.allowed)return hold(time.reason);
  const draft=Object.assign(Object.create(PortWalkingRuntime.prototype),runtime);
  draft.actors=runtime.actors.map(a=>({...a}));
  draft.insideBuilding={...runtime.insideBuilding};
  if(!draft.leaveBuilding())return hold('native-building-exit-unavailable');
  const candidate={port:session.port};
  const landing=syncNativeTownSession(candidate,draft.snapshot(),assets);
  if(!landing.updated)return hold(landing.reason);
  return {allowed:true,session,runtime,kind,
   updates:{...time.updates,portState:candidate.portState,
     townActors:candidate.townActors},
   fields:{viewX:draft.viewX,viewY:draft.viewY,
     playerX:draft.playerX,playerY:draft.playerY,
     insideBuilding:draft.insideBuilding,
     lastEvent:kind==='lodge'?'lodge-check-in':draft.lastEvent},
   source:'NATIVE_BROWSER_BUILDING_EXIT_POSITION_TIME_ATOMIC'
  };
 }catch{return hold('native-building-exit-unavailable');}
}
export function commitNativeTownBuildingExit(tx){
 if(!tx?.allowed||!tx.session||!tx.runtime||
    tx.runtime.slot!==tx.session)return false;
 Object.assign(tx.runtime,tx.fields);
 Object.assign(tx.session,tx.updates);
 return true;
}
