import {PortWalkingRuntime} from './town.js';
import {syncNativeTownSession} from './native-save-session.js';

// Move only a small native town runtime draft (player fields and <=8 actors).
// Validate against original PORTMAP/PORTCHIP geometry before changing the
// active browser game. Original KOUKAI2 bytes and source slots stay immutable.
const coords=['viewX','viewY','playerX','playerY','mapX','mapY'];
const mutable=['viewX','viewY','playerX','playerY','facing','stepParity',
               'talkCounter','lastEvent','insideBuilding','talk','dialogueActor'];
const refuse=reason=>({allowed:false,reason});
export function prepareNativeTownMovement({session,runtime,assets,direction,rng}={}){
 if(!(runtime instanceof PortWalkingRuntime)||runtime.slot!==session||
    !session||!assets||runtime.portAssets!==assets||
    runtime.portId!==session.port||!session.portState||
    !Array.isArray(runtime.actors)||!Array.isArray(session.townActors))
   return refuse('native-town-owner-invalid');
 try{
   const prior=runtime.snapshot();
   if(!coords.every(k=>prior[k]===session.portState[k])||
      JSON.stringify(runtime.actors)!==JSON.stringify(session.townActors))
     return refuse('native-town-session-drift');
   // Check existing position/actors too, not just proposed movement.
   const before={port:session.port};
   const priorCheck=syncNativeTownSession(before,prior,assets);
   if(!priorCheck.updated)return refuse(priorCheck.reason);
   const staged=Object.assign(Object.create(PortWalkingRuntime.prototype),runtime);
   staged.actors=runtime.actors.map(a=>({...a}));
   staged.talk=runtime.talk?{...runtime.talk}:null;
   staged.dialogueActor=runtime.dialogueActor?
     {...runtime.dialogueActor}:null;
   if(typeof rng==='function')
     staged.advanceActors=()=>PortWalkingRuntime.prototype.advanceActors.call(staged,rng);
   const movement=staged.move(direction);
   const candidate={port:session.port};
   const result=syncNativeTownSession(candidate,staged.snapshot(),assets);
   if(!result.updated)return refuse(result.reason);
   const updates={portState:candidate.portState,townActors:candidate.townActors};
   // Only recognized fields may be committed: never copy a test RNG,
   // source assets, rendered DOM or an untrusted runtime's dynamic hooks.
   const fields=Object.fromEntries(mutable.map(k=>[k,staged[k]]));
   return {allowed:true,movement,updates,fields,session,runtime,
     source:'BROWSER_NATIVE_TOWN_MOVE_SOURCE_GEOMETRY_ATOMIC'};
 }catch{return refuse('native-town-move-unavailable');}
}
export function commitNativeTownMovement(prepared){
 if(!prepared?.allowed||!prepared.session||!prepared.runtime)return false;
 Object.assign(prepared.runtime,prepared.fields);
 Object.assign(prepared.session,prepared.updates);
 return true;
}
