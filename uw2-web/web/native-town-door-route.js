// Source-backed accessible navigation to actual Korean ZA_DAT town doors.
// We only plan, never move a player or edit the DOS save. The existing native
// per-tile staged movement owns each step and detects source door entry.
import {canStandAt} from './town.js';
const directions=Object.freeze([
 Object.freeze(['up',0,-1]),Object.freeze(['right',1,0]),
 Object.freeze(['down',0,1]),Object.freeze(['left',-1,0])
]);
const safeInt=n=>Number.isSafeInteger(n);
const isDoor=d=>d&&safeInt(d.id)&&d.id>=0&&d.id<12&&
 safeInt(d.x)&&safeInt(d.y)&&d.x>=0&&d.x<=94&&
 d.y>=0&&d.y<=94&&d.present===true;
export function nativeTownSourceDoorChoices(snapshot,doors){
 if(!snapshot||snapshot.building||snapshot.talk||!Array.isArray(doors)||
    !safeInt(snapshot.portId))return [];
 return doors.filter(isDoor).map(d=>Object.freeze({
   id:d.id,name:typeof d.name==='string'?d.name.slice(0,40):'건물 '+d.id,
   x:d.x,y:d.y
 }));
}
const nearActor=(actors,x,y)=>actors.some(a=>a?.active===true&&
 safeInt(a.x)&&safeInt(a.y)&&Math.abs(a.x-x)<=1&&Math.abs(a.y-y)<=1);
export function planNativeTownDoorRoute({snapshot:s,doors,assets,buildingId,maxSteps=225}={}){
 if(!s||!assets||!Array.isArray(s.actors)||!Array.isArray(doors)||
    !safeInt(s.portId)||s.portId<0||s.building||s.talk||
    !safeInt(s.viewX)||!safeInt(s.viewY)||
    !safeInt(s.playerX)||!safeInt(s.playerY)||
    !safeInt(s.mapX)||!safeInt(s.mapY)||
    s.mapX!==s.viewX+s.playerX||s.mapY!==s.viewY+s.playerY||
    !safeInt(buildingId)||buildingId<0||buildingId>11||
    !safeInt(maxSteps)||maxSteps<1||maxSteps>512)return null;
 const choice=nativeTownSourceDoorChoices(s,doors).find(d=>d.id===buildingId);
 if(!choice||!canStandAt(assets,s.portId,s.mapX,s.mapY)||
    !canStandAt(assets,s.portId,choice.x,choice.y)||
    nearActor(s.actors,choice.x,choice.y)||
    (choice.x===s.mapX&&choice.y===s.mapY))return null;
 const blockedDoors=new Set(nativeTownSourceDoorChoices(s,doors)
  .filter(d=>d.id!==buildingId).map(d=>d.y*96+d.x));
 const index=(x,y)=>y*96+x,from={x:s.mapX,y:s.mapY};
 const visited=new Map([[index(from.x,from.y),null]]);
 const queue=[[from.x,from.y]];let reached=false;
 // Source 96x96 town, bounds 0..94 for 32px player sprites.
 for(let i=0;i<queue.length&&!reached&&i<9025;i++){
  const [cx,cy]=queue[i];
  for(const [direction,dx,dy] of directions){
   const x=cx+dx,y=cy+dy,k=index(x,y);
   if(x<0||x>94||y<0||y>94||visited.has(k)||
      blockedDoors.has(k)||nearActor(s.actors,x,y)||
      !canStandAt(assets,s.portId,x,y))continue;
   visited.set(k,{parent:index(cx,cy),direction,x,y});
   if(x===choice.x&&y===choice.y){reached=true;break;}
   queue.push([x,y]);
  }
 }
 if(!reached)return null;
 const moves=[];let at=index(choice.x,choice.y);
 while(at!==index(from.x,from.y)){
  const hop=visited.get(at);
  if(!hop||moves.length>=maxSteps)return null;
  moves.push(Object.freeze({direction:hop.direction,x:hop.x,y:hop.y}));
  at=hop.parent;
 }
 moves.reverse();
 return Object.freeze({portId:s.portId,from:Object.freeze(from),
  goal:Object.freeze({x:choice.x,y:choice.y}),
  targetBuildingId:buildingId,moves:Object.freeze(moves)});
}
