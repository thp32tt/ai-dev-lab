// A click on a *source-admitted*, currently visible harbor marker
// enters the existing atomic native-web port call. This is NOT a DOS
// emulator, speculative pathfinder, or a new invented game port position.
import {UI_LAYOUT} from './ui-layout.js';
import {originalSeaCameraOrigin} from './native-original-sea-camera.js';
import {WORLD_CHIP_W,WORLD_CHIP_H} from './world-map.js';

const admissible=new Set([
 'SOURCE_RING_4X4','NATIVE_SOURCE_NEAREST_SEA_2CHIP_RECOVERY'
]);

export function nativeReadySeaPortMarker(seaState,readyPort){
 if(!seaState||!readyPort||
    !Number.isSafeInteger(seaState.x)||!Number.isSafeInteger(seaState.y)||
    !Number.isSafeInteger(readyPort.x)||!Number.isSafeInteger(readyPort.y)||
    seaState.x<0||seaState.x>=WORLD_CHIP_W||
    seaState.y<0||seaState.y>=WORLD_CHIP_H||
    readyPort.x<0||readyPort.x>=WORLD_CHIP_W||
    readyPort.y<0||readyPort.y>=WORLD_CHIP_H||
    !Number.isSafeInteger(readyPort.id)||readyPort.id<0||readyPort.id>129||
    typeof readyPort.name!=='string'||!readyPort.name.trim()||
    !admissible.has(readyPort.approach))return null;

 // A caller is allowed to highlight only a unique nearby harbor returned
 // from findPortCallTarget + canBuildNativePortArrival, not arbitrary ports.
 let dx=readyPort.x-seaState.x;
 if(dx>WORLD_CHIP_W/2)dx-=WORLD_CHIP_W;
 if(dx<-WORLD_CHIP_W/2)dx+=WORLD_CHIP_W;
 const dy=readyPort.y-seaState.y;
 if(dx!==readyPort.dx||dy!==readyPort.dy||
    Math.abs(dx)>2||Math.abs(dy)>2||
    (dx>=0&&dx<=1&&dy>=0&&dy<=1))return null;

 const camera=originalSeaCameraOrigin(seaState.x,seaState.y);
 if(!camera)return null;
 const col=readyPort.x-camera.startX;
 const row=readyPort.y-camera.startY;
 const viewport=UI_LAYOUT.viewport;
 if(col<0||col>=viewport.tiles||row<0||row>=viewport.tiles)return null;

 const x=viewport.x+col*16,y=viewport.y+row*16;
 return Object.freeze({
  x,y,w:16,h:16,portId:readyPort.id,portName:readyPort.name,
  // 4px extra finger tolerance, clipped to the original 384x384 map.
  tapX:Math.max(viewport.x,x-4),tapY:Math.max(viewport.y,y-4),
  tapRight:Math.min(viewport.x+viewport.w,x+20),
  tapBottom:Math.min(viewport.y+viewport.h,y+20)
 });
}
export function nativeSeaPortMarkerContains(point,marker){
 return !!marker&&!!point&&Number.isFinite(point.x)&&Number.isFinite(point.y)&&
   point.x>=marker.tapX&&point.x<marker.tapRight&&
   point.y>=marker.tapY&&point.y<marker.tapBottom;
}
export function nativeReadySeaPortPointerHit(point,seaState,readyPort){
 return nativeSeaPortMarkerContains(point,nativeReadySeaPortMarker(seaState,readyPort));
}
