import {canStandAt} from './town.js';
import {prepareNativePortActorContinuity} from './native-port-actor-memory.js';
// Browser-native port arrival derives coordinates from Korean original
// ZA_DAT.DAT door #3, CHIP_NO/PORTMAP/PORTCHIP collision tiles and the
// KOUKAI2.DAT 130-port source directory. It is NOT a DOS emulator and
// does NOT claim that unobserved local NPC actors were simulated.
const uint=(x,max)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
// Preflight used by the real browser's Port Call button and by the
// actual source-backed town arrival. It only checks original geometry,
// so rendering a nearby port never clones or mutates the active save.
function nativePortLandingGeometry({port,seaState,previous,portDoors,portAssets}={}){
 if(!port||!seaState||!previous||!Array.isArray(portDoors)||
    !portAssets||!Array.isArray(portAssets.maps))
   return null;
 if(!uint(port.id,129)||!uint(port.mapId,100)||
    port.mapId!==(port.id>=100?100:port.id)||
    typeof port.name!=='string'||!port.name.length||
    !uint(port.x,2159)||!uint(port.y,1079)||
    !uint(port.nation,255)||
    !portAssets.maps[port.mapId])
   return null;
 // All fields are sourced directly from PORT table or the actual sea
 // clock. No synthesized landing port, actor positions or game time.
 const time=seaState.dateTime;
 if(!time||!uint(time.year,9999)||time.year<1501||
    !uint(time.month,12)||time.month<1||
    !uint(time.day,31)||time.day<1||
    !uint(time.timeTick,71)||
    time.hour!==Math.floor(time.timeTick/3)||
    time.minute!==(time.timeTick%3)*20)
   return null;
 const harbor=portDoors[port.mapId]?.[3];
 if(!harbor?.present||!uint(harbor.x,94)||!uint(harbor.y,93))
   return null;
 const mapX=harbor.x,mapY=harbor.y+1;
 // Source-grounded collision check, unlike the old blind y+1 shift.
 if(!canStandAt(portAssets,port.mapId,mapX,mapY))return null;
 const viewX=Math.max(0,Math.min(72,mapX-12));
 // Korean saved Danzig original: harbor door Y=51, player Y=52,
 // viewY=38 (relative Y=14). Anchor to door row, not player row.
 const viewY=Math.max(0,Math.min(72,harbor.y-13));
 return {time,mapX,mapY,viewX,viewY};
}

export function canBuildNativePortArrival(args={}){
 return nativePortLandingGeometry(args)!==null;
}

export function buildNativePortArrival(args={}){
 const geometry=nativePortLandingGeometry(args);
 if(!geometry)return null;
 const {port,previous}=args;
 const {time,mapX,mapY,viewX,viewY}=geometry;
 // Persist source-proven people by full original catalog identity before
 // overwriting the active town with a new port. Unknown ports stay empty.
 const actors=prepareNativePortActorContinuity(previous,port);
 return {
  ...previous,
  port:port.mapId,
  portCatalogId:port.id,
  portName:port.name,
  portWorld:{nation:port.nation,x:port.x,y:port.y},
  portMeta:port.meta?structuredClone(port.meta):null,
  dateTime:{...time},
  portState:{
   viewX,viewY,
   playerX:mapX-viewX,playerY:mapY-viewY,
   mapX,mapY
  },
  townActors:actors.townActors,
  portActorMemory:actors.portActorMemory,
  arrivalEvidence:{
   source:'ORIGINAL_PORT_TABLE_ZA_DAT_PORTCHIP_COLLISION',
   actorStatus:actors.actorStatus
  }
 };
}
