// Korean MAIN.EXE selector geometry. Source evidence:
// MAIN.EXE raw 0x1B21B builds six entries from DS:AB6E; raw 0x1B25C
// extends each entry by exactly 64 horizontal and 80 vertical pixels,
// raw 0x1B2A3 selects from six, raw 0x1B2B stores AL at DS:1241h.
// Coordinates are original intrinsic 640x400 pixels, NOT CSS positions.
// The full original selection backdrop and fresh campaign initializer
// remain unverified; this module does not invent either of them.
const points=Object.freeze([
  [56,184],[104,280],[184,56],[280,80],[328,256],[512,168]
]);
export const ORIGINAL_NEW_GAME_SELECTOR_RECTS=Object.freeze(
  points.map(([x,y],id)=>Object.freeze({id,x,y,w:64,h:80}))
);
export function originalNewGameSelectorRect(id){
  return Number.isSafeInteger(id)&&id>=0&&id<6
    ?ORIGINAL_NEW_GAME_SELECTOR_RECTS[id]:null;
}
export function originalNewGameSelectorHit(point){
  if(!point||!Number.isFinite(point.x)||!Number.isFinite(point.y))return null;
  for(const box of ORIGINAL_NEW_GAME_SELECTOR_RECTS){
    if(point.x>=box.x&&point.x<box.x+box.w&&
       point.y>=box.y&&point.y<box.y+box.h)return box.id;
  }
  return null;
}
