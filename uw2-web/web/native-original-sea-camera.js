// Exact 16-bit signed-positive sea camera origin arithmetic identified in
// Korean MAIN.EXE raw 0x1B5C9..0x1B627 (SHA-256 1718bbbb...).
// The original uses a 720-chip X segment, 24-chip visible window,
// x-11 focus, and clamps the Y origin to [0..1056].
// This is a native JS projection of verified MZ source arithmetic,
// NOT a DOS/8086 emulator or a reconstructed fresh-game state.
export const ORIGINAL_SEA_CAMERA_SEGMENT_CHIPS=720;
export const ORIGINAL_SEA_CAMERA_WINDOW_CHIPS=24;
export const ORIGINAL_SEA_CAMERA_Y_MAX=1056;
const MAX_X=2160,MAX_Y=1080;
export function originalSeaCameraOrigin(x,y){
 if(!Number.isSafeInteger(x)||!Number.isSafeInteger(y)||
    x<0||x>=MAX_X||y<0||y>=MAX_Y)return null;
 const base=Math.floor(x/ORIGINAL_SEA_CAMERA_SEGMENT_CHIPS)*
  ORIGINAL_SEA_CAMERA_SEGMENT_CHIPS;
 const startX=Math.max(base,Math.min(base+
  ORIGINAL_SEA_CAMERA_SEGMENT_CHIPS-ORIGINAL_SEA_CAMERA_WINDOW_CHIPS,x-11));
 const startY=Math.max(0,Math.min(ORIGINAL_SEA_CAMERA_Y_MAX,y-11));
 return Object.freeze({startX,startY,shipTileX:x-startX,shipTileY:y-startY});
}
