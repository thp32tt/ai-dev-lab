import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {parseSaveSlots} from '../web/binary.js';
import {decodeWorldAssets,findNearestSea,SeaRuntime,worldChipAt}
 from '../web/world-map.js';
import {UW2_WORLD_PALETTE} from '../web/koei-image.js';
import {parseWindCur} from '../web/windcur.js';
// N100 owner-only actual original files; GitHub CI syntax checks this test
// WITHOUT publishing or loading copyrighted data. This tests the same
// browser-native raster path called by app.js, not reference DOS frame parity.
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const hash=x=>createHash('sha256').update(x).digest('hex');
const names={
 'DATA1.LZW':'b2c6f3430cb5b66c09bf77d7454b1346883f6c3eb62003848bf25ee0010907dc',
 'KOUKAI2.DAT':'ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9',
 'WINDCUR.DAT':'2a005353a2a09b13bd8b09e208b99abb5cd26d95aa429a50aab9803fb5caf337',
 'WORLDMAP.LZW':'135e89cb1c894a8a70c67168898b816fab00a6a7d13a61f5965bacfaec6986fa'
};
const read=name=>{
 const b=fs.readFileSync(join(root,name));
 assert.equal(hash(b),names[name]);
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
};
const assets=decodeWorldAssets(read('WORLDMAP.LZW'),read('DATA1.LZW'));
const wind=parseWindCur(read('WINDCUR.DAT'));
const slot=parseSaveSlots(read('KOUKAI2.DAT'))[1];
assert.equal(slot.portWorld.x,288);
assert.equal(slot.portWorld.y,240);
assert.equal(slot.fleet.ships[0].oared,false);
const start=findNearestSea(assets,slot.portWorld.x,slot.portWorld.y,40);
assert.deepEqual(start,{x:286,y:238});
const state=new SeaRuntime(assets,start,wind,slot.dateTime.month,slot.fleet,slot.dateTime).snapshot();
assert.equal(state.flagshipOared,false);
const created=[];
const originalDoc=globalThis.document;
globalThis.document={createElement:()=>{
 const canvas={width:0,height:0};
 const context={createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
   putImageData(im){canvas.last=Uint8ClampedArray.from(im.data);}};
 canvas.getContext=()=>context;created.push(canvas);return canvas;
}};
const draw=[];
const dest={drawImage:(c,x,y)=>draw.push({c,x,y,data:Uint8ClampedArray.from(c.last)})};
try{
 const result=(await import('../web/world-map.js')).renderSeaView(dest,assets,state,16,16,23,23);
 assert.equal(result.width,368);assert.equal(result.height,368);
 assert.equal(created.length,2);
 assert.equal(draw.length,2);
 const actual=draw[0].data,expected=new Uint8ClampedArray(368*368*4);
 for(let ty=0;ty<23;ty++)for(let tx=0;tx<23;tx++){
  const cx=((result.startX+tx)%2160+2160)%2160;
  const cy=result.startY+ty;
  const originalTile=assets.tiles[worldChipAt(assets,cx,cy)];
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const rgb=UW2_WORLD_PALETTE[originalTile[y*16+x]];
   expected.set([...rgb,255],((ty*16+y)*368+tx*16+x)*4);
  }
 }
 assert.deepEqual(actual,expected);
 assert.equal(assets.seaShips.length,32);
 const spriteFrame=assets.seaShips[16];
 const expectedSprite=new Uint8ClampedArray(4096);
 for(let i=0;i<1024;i++){
  const idx=spriteFrame[i];
  expectedSprite.set(idx===0||idx===255?[0,0,0,0]:[...UW2_WORLD_PALETTE[idx],255],i*4);
 }
 assert.deepEqual(draw[1].data,expectedSprite);
 // Change to source-backed oared classification for the same ship indices;
 // this alters only sprite bank and never the original world tile pixels.
 const oared={...state,flagshipOared:true};
 (await import('../web/world-map.js')).renderSeaView(dest,assets,oared,16,16,23,23);
 assert.equal(created.length,2);
 const spriteOar=assets.seaShips[0];
 for(let i=0;i<1024;i++){
  const idx=spriteOar[i];
  expectedSprite.set(idx===255?[0,0,0,0]:[...UW2_WORLD_PALETTE[idx],255],i*4);
 }
 assert.deepEqual(draw[3].data,expectedSprite);
 assert.deepEqual(draw[2].data,expected);
 console.log(JSON.stringify({
  result:'OWNER_ORIGINAL_WEB_NATIVE_SEA_CANVAS_PIXEL_PARITY',
  files:Object.keys(names),viewportPixels:368*368,originalShipFrames:assets.seaShips.length,
  originalDateTime:slot.dateTime,joaoStart:start,
  nativeSurfaceCount:created.length,outputs:draw.length,
  source:'KOREAN_ORIGINAL_WORLDMAP_DATA1_WINDCUR_KOUKAI2',
  boundary:'SAME_JS_PIXEL_SOURCE_ONLY__NOT_REFERENCE_DOS_VGA_FRAME_PARITY'
 }));
}finally{
 if(originalDoc===undefined)delete globalThis.document;
 else globalThis.document=originalDoc;
}
