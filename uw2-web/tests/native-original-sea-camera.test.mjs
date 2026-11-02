import assert from 'node:assert/strict';
import {originalSeaCameraOrigin as camera,
 ORIGINAL_SEA_CAMERA_SEGMENT_CHIPS as segment,
 ORIGINAL_SEA_CAMERA_WINDOW_CHIPS as view}
 from '../web/native-original-sea-camera.js';
import {renderSeaView,WORLD_CELL_W,WORLD_CELL_H} from '../web/world-map.js';

// Independent expected 16-bit positive-source camera values. MAIN.EXE
// raw 0x1B5C9: div 0x2D0; x-11 clamped to [segment-base,
// base+0x2B8]; y-11 clamped to [0,0x420].
assert.equal(segment,720);
assert.equal(view,24);
const examples=[
 [0,0,0,0,0,0],
 [11,11,0,0,11,11],
 [12,12,1,1,11,11],
 [707,1068,696,1056,11,12],
 [719,1079,696,1056,23,23],
 [720,0,720,0,0,0],
 [731,10,720,0,11,10],
 [1439,1079,1416,1056,23,23],
 [1440,1000,1440,989,0,11],
 [2159,1079,2136,1056,23,23]
];
for(const [x,y,startX,startY,shipTileX,shipTileY] of examples)
 assert.deepEqual(camera(x,y),{startX,startY,shipTileX,shipTileY});
for(const p of [[-1,0],[2160,0],[0,1080],[0,-1],[1.5,2],[NaN,3],['0',0]])
 assert.equal(camera(...p),null);
for(let x=0;x<2160;x+=7)for(let y=0;y<1080;y+=113){
 const c=camera(x,y),base=Math.floor(x/720)*720;
 assert.ok(c.startX>=base&&c.startX<=base+696);
 assert.ok(c.startY>=0&&c.startY<=1056);
 assert.ok(c.shipTileX>=0&&c.shipTileX<24);
 assert.ok(c.shipTileY>=0&&c.shipTileY<24);
 assert.equal(c.startX+c.shipTileX,x);
 assert.equal(c.startY+c.shipTileY,y);
}
const priorDocument=globalThis.document;
const captures=[];
globalThis.document={createElement(name){
 assert.equal(name,'canvas');
 const elem={width:0,height:0};
 const ctx={createImageData(w,h){return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},
  putImageData(img){this.latest=img;}};
 elem.getContext=()=>ctx;
 return elem;
}};
try{
 const assets={
  cells:new Uint8Array(WORLD_CELL_W*WORLD_CELL_H),
  quad:new Uint8Array(2048),
  tiles:Array.from({length:128},()=>new Uint8Array(256)),
  seaShips:Array.from({length:16},()=>new Uint8Array(1024))
 };
 const target={imageSmoothingEnabled:true,drawImage(...args){captures.push(args);}};
 const edgeState={x:719,y:1079,steps:0,heading:0,flagshipOared:false};
 const rect=renderSeaView(target,assets,edgeState,96,8,24,24);
 assert.deepEqual(rect,{startX:696,startY:1056,width:384,height:384});
 assert.equal(captures.length,2);
 // GRAPH #4 world viewport is (96,8)..(480,392), no ship pixels
 // may overwrite the original on-screen HUD after the rightmost tile.
 assert.equal(captures[0].length,3);
 assert.equal(captures[1].length,9);
 assert.deepEqual(captures[1].slice(1),[0,0,16,16,464,376,16,16]);
 captures.length=0;
 const seam=renderSeaView(target,assets,{...edgeState,x:720,y:0},96,8,24,24);
 assert.deepEqual(seam,{startX:720,startY:0,width:384,height:384});
 assert.equal(captures[1].length,3);
 assert.deepEqual(captures[1].slice(1),[96,8]);
 captures.length=0;
 assert.throws(()=>renderSeaView(target,assets,{...edgeState,x:2160},96,8,24,24),
  /original sea camera source coordinate/);
 assert.equal(captures.length,0);
 // The former centered synthetic 3x3 test viewport stays unchanged.
 const small=renderSeaView(target,assets,{...edgeState,x:0,y:0},9,11,3,3);
 assert.equal(small.startX,-1);
 assert.equal(small.startY,-1);
}finally{
 if(priorDocument===undefined)delete globalThis.document;
 else globalThis.document=priorDocument;
}
console.log('UW2 Korean MAIN 0x1B5C9 native sea camera source 720-band/24-tile clamp, sprite HUD clipping, world seam and old synthetic viewport PASS');
