import {canStandAt} from './town.js';
import {UI_LAYOUT} from './ui-layout.js';
// One click plans legal original PORTMAP tiles. Actual movements MUST pass
// through the existing atomic source-town movement owner in app.js.
const dirs=[['up',0,-1],['right',1,0],['down',0,1],['left',-1,0]];
const int=Number.isSafeInteger;
export function nativeTownClickDestination(point,s){
 if(!point||!s||!Number.isFinite(point.x)||!Number.isFinite(point.y)||
    ![s.viewX,s.viewY,s.playerX,s.playerY,s.mapX,s.mapY,s.portId].every(int)||
    s.viewX<0||s.viewX>72||s.viewY<0||s.viewY>72||
    s.playerX<0||s.playerX>22||s.playerY<0||s.playerY>22||
    s.mapX!==s.viewX+s.playerX||s.mapY!==s.viewY+s.playerY)return null;
 const b=UI_LAYOUT.viewport;
 if(point.x<b.x||point.y<b.y||point.x>=b.x+b.w||point.y>=b.y+b.h)return null;
 const px=Math.floor((point.x-b.x)/16),py=Math.floor((point.y-b.y)/16);
 return px<=22&&py<=22?{x:s.viewX+px,y:s.viewY+py}:null;
}
const nearActor=(actors,x,y)=>actors.some(a=>a?.active===true&&int(a.x)&&int(a.y)&&
 Math.abs(a.x-x)<=1&&Math.abs(a.y-y)<=1);
export function planNativeTownClickRoute({point,snapshot:s,assets,maxSteps=88}={}){
 const goal=nativeTownClickDestination(point,s);
 if(!goal||!assets||!Array.isArray(s.actors)||s.talk||s.building||
    !int(maxSteps)||maxSteps<1||maxSteps>256||!int(s.portId)||s.portId<0||
    !canStandAt(assets,s.portId,s.mapX,s.mapY)||
    !canStandAt(assets,s.portId,goal.x,goal.y)||
    nearActor(s.actors,goal.x,goal.y)||
    goal.x===s.mapX&&goal.y===s.mapY)return null;
 const from={x:s.mapX,y:s.mapY},id=(x,y)=>y*96+x;
 const nodes=[[from.x,from.y]],prev=new Map([[id(from.x,from.y),null]]);
 let found=false;
 for(let i=0;i<nodes.length&&!found&&i<529;i++){
  const [x0,y0]=nodes[i];
  for(const [direction,dx,dy] of dirs){
   const x=x0+dx,y=y0+dy,k=id(x,y);
   if(x<s.viewX||x>s.viewX+22||y<s.viewY||y>s.viewY+22||
      prev.has(k)||nearActor(s.actors,x,y)||
      !canStandAt(assets,s.portId,x,y))continue;
   prev.set(k,{parent:id(x0,y0),direction,x,y});
   if(x===goal.x&&y===goal.y){found=true;break;}
   nodes.push([x,y]);
  }
 }
 if(!found)return null;
 const moves=[];let at=id(goal.x,goal.y);
 while(at!==id(from.x,from.y)){
  const hop=prev.get(at);
  if(!hop||moves.length>=maxSteps)return null;
  moves.push(Object.freeze({direction:hop.direction,x:hop.x,y:hop.y}));
  at=hop.parent;
 }
 moves.reverse();
 return Object.freeze({from:Object.freeze(from),goal:Object.freeze(goal),
  portId:s.portId,moves:Object.freeze(moves)});
}
export function nativeTownClickRouteNext(route,index,s){
 if(!route||!s||!int(index)||index<0||index>=route.moves?.length||
    s.portId!==route.portId||s.building||s.talk||!int(s.mapX)||!int(s.mapY))
    return null;
 const prev=index===0?route.from:route.moves[index-1];
 return s.mapX===prev.x&&s.mapY===prev.y?route.moves[index]:null;
}
