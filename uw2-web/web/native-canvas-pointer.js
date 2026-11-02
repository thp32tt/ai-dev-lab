// Browser-only pointer hit testing for the already rendered native menu UI.
// Original game assets, save bytes and DOS program state are never modified.
import {SYSTEM_UI_LAYOUT} from './system-ui.js';
import {originalNewGameSelectorHit} from './native-new-game-layout.js';

export function nativeCanvasPointerPoint(event,canvas){
  if(!event||!canvas||typeof canvas.getBoundingClientRect!=='function')
    return null;
  const rect=canvas.getBoundingClientRect();
  const borderX=canvas.clientLeft??0,borderY=canvas.clientTop??0;
  const width=canvas.clientWidth,height=canvas.clientHeight;
  if(![event.clientX,event.clientY,rect.left,rect.top,borderX,borderY,
       width,height,canvas.width,canvas.height].every(Number.isFinite)||
     width<=0||height<=0||canvas.width<=0||canvas.height<=0)
    return null;
  const x=(event.clientX-rect.left-borderX)*canvas.width/width;
  const y=(event.clientY-rect.top-borderY)*canvas.height/height;
  if(x<0||y<0||x>=canvas.width||y>=canvas.height)return null;
  return Object.freeze({x,y});
}

export function nativeSystemMenuPointerHit(point,optionCount=SYSTEM_UI_LAYOUT.menu.count){
  const box=SYSTEM_UI_LAYOUT.menu;
  if(!point||!Number.isSafeInteger(optionCount)||optionCount<0||
     point.x<box.x||point.x>=box.x+box.w||
     point.y<box.y||point.y>=box.y+box.h)return null;
  const index=Math.floor((point.y-box.textY)/box.rowH);
  return index>=0&&index<Math.min(box.count,optionCount)?index:null;
}

export function nativeLoadSlotPointerHit(point){
  const box=SYSTEM_UI_LAYOUT.slots;
  if(!point||point.x<192||point.x>=448||
     point.y<box.y||point.y>=box.y+box.rowH*box.count)return null;
  return Math.floor((point.y-box.y)/box.rowH);
}

export function nativeNewGameHeroPointerHit(point){
  return originalNewGameSelectorHit(point);
}
