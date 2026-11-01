import {canStandAt} from './town.js';
// The original Korean KOUKAI2.DAT is a READ-ONLY source snapshot. Native
// gameplay runs on a deep copy; original DOS save write is still unverified.
export function openNativeSaveSession(original){
 if(!original||original.empty||!Number.isInteger(original.index)||
    original.index<0||original.index>9||!original.portState)
   throw new Error('native game session requires validated original save slot');
 return structuredClone(original);
}
const between=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export function syncNativeTownSession(session,snapshot,assets){
 if(!session||!snapshot||!assets||!between(session.port,0,100)||
    snapshot.portId!==session.port)
   return Object.freeze({updated:false,reason:'PORT_OWNER_MISMATCH'});
 const {viewX,viewY,playerX,playerY,mapX,mapY}=snapshot;
 if(!between(viewX,0,72)||!between(viewY,0,72)||
    !between(playerX,0,22)||!between(playerY,0,22)||
    !between(mapX,0,94)||!between(mapY,0,94)||
    mapX!==viewX+playerX||mapY!==viewY+playerY||
    !canStandAt(assets,session.port,mapX,mapY))
   return Object.freeze({updated:false,reason:'ORIGINAL_TOWN_GEOMETRY_UNVERIFIED'});
 const actors=snapshot.actors;
 if(!Array.isArray(actors)||actors.length>8||
    actors.some(a=>!a||!between(a.slot,0,7)||
      !between(a.x,0,255)||!between(a.y,0,255)||
      !between(a.type,0,255)||typeof a.active!=='boolean'||
      ((a.x===255||a.y===255)&&a.active)))
   return Object.freeze({updated:false,reason:'SOURCE_TOWN_ACTORS_UNVERIFIED'});
 const nextPosition={viewX,viewY,playerX,playerY,mapX,mapY};
 const nextActors=structuredClone(actors);
 session.portState=nextPosition;
 session.townActors=nextActors;
 return Object.freeze({updated:true,reason:'IN_MEMORY_NATIVE_TOWN_STATE_ONLY'});
}
