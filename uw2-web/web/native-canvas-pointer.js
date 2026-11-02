// Browser-only pointer hit testing for the already rendered native menu UI.
// Original game assets, save bytes and DOS program state are never modified.
import {SYSTEM_UI_LAYOUT} from './system-ui.js';
import {UI_LAYOUT} from './ui-layout.js';
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

// Building menus and scrollable lists use the exact native GRAPH #22
// parchment origin (104,136) and the row baselines actually drawn by app.js.
// A pointer changes a selection; it never purchases, borrows or sails on its own.
const validPoint=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
export function nativeDialoguePointerInside(point){
 const b=UI_LAYOUT.dialogue;
 return !!validPoint(point)&&point.x>=b.x&&point.x<b.x+b.w&&
   point.y>=b.y&&point.y<b.y+b.h;
}
export function nativeBuildingMenuPointerHit(point,optionCount){
 const b=UI_LAYOUT.dialogue;
 if(!validPoint(point)||!Number.isSafeInteger(optionCount)||optionCount<1||
    point.x<b.x+12||point.x>=b.x+b.w-12)return null;
 // Menu entries are drawn at baseline y+30+i*16, at most six visible.
 const row=Math.floor((point.y-(b.y+14))/16);
 return row>=0&&row<Math.min(optionCount,6)?row:null;
}
export function nativeModalRowPointerHit(point,{rowCount,selectedIndex=0,title=true}={}){
 const b=UI_LAYOUT.dialogue;
 if(!validPoint(point)||!Number.isSafeInteger(rowCount)||rowCount<1||
    !Number.isSafeInteger(selectedIndex)||
    point.x<b.x+12||point.x>=b.x+b.w-12)return null;
 // drawOriginalModalRows scrolls the seven-row window with the cursor.
 const start=selectedIndex>=7?selectedIndex-6:0;
 const firstY=b.y+(title?30:14);
 const visible=Math.min(7,Math.max(0,rowCount-start));
 const row=Math.floor((point.y-firstY)/16);
 return row>=0&&row<visible?start+row:null;
}
