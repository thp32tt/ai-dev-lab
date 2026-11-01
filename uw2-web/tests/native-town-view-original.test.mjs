import assert from 'node:assert/strict';
import fs from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {parseSaveSlots} from '../web/binary.js';
import {decodePortAssets,renderTownView} from '../web/port-map.js';
import {UW2_WORLD_PALETTE} from '../web/koei-image.js';
// Owner-only private test: Korean original source images, no assets in Git.
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const pins={
 'PORTCHIP.LZW':'e3c5253c12dc24d3e3d8fa8294d4160a116601ba67ebb4190e49c64cd37cc95b',
 'PORTMAP.LZW':'ed3161c45b038fbc715840e9798bc4a2d3c5615d036b27c8048e93c8c6b7c25d',
 'CHIP_NO.DAT':'0f76440952571894b10b07780a6a21426c2ebc0d1911dfb4ac823e22b0b1a516',
 'KOUKAI2.DAT':'ab81fcf9a38fa2bd8d3f7dc328287e80f0dcf74b92d3891e511c8fa230aa62e9'
};
const read=name=>{
 const b=fs.readFileSync(join(root,name));
 assert.equal(createHash('sha256').update(b).digest('hex'),pins[name]);
 return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
};
const assets=decodePortAssets(read('PORTCHIP.LZW'),read('PORTMAP.LZW'),read('CHIP_NO.DAT'));
const slot=parseSaveSlots(read('KOUKAI2.DAT'))[1];
assert.equal(slot.port,39);
assert.deepEqual(slot.portState,{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52});
const old=globalThis.document,created=[],draws=[];
globalThis.document={createElement:()=>{
 const c={width:0,height:0};
 c.getContext=()=>({
  createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
  putImageData:im=>{c.last=Uint8ClampedArray.from(im.data);}
 });
 created.push(c);return c;
}};
try{
 const ctx={drawImage:c=>draws.push(Uint8ClampedArray.from(c.last))};
 const meta=renderTownView(ctx,assets,slot.port,slot.portState,16,16,false);
 assert.deepEqual([meta.width,meta.height,meta.playerScreenX,meta.playerScreenY],
 [384,384,208,240]);
 const bank=assets.banks[meta.bankId],map=assets.maps[slot.port];
 const expected=new Uint8ClampedArray(384*384*4);
 for(let vy=0;vy<24;vy++)for(let vx=0;vx<24;vx++){
  const x=slot.portState.viewX+vx,y=slot.portState.viewY+vy;
  const tile=bank[map[y*96+x]];
  for(let ty=0;ty<16;ty++)for(let tx=0;tx<16;tx++){
   const rgb=UW2_WORLD_PALETTE[tile[ty*16+tx]];
   expected.set([...rgb,255],((vy*16+ty)*384+vx*16+tx)*4);
  }
 }
 assert.deepEqual(draws[0],expected);
 renderTownView(ctx,assets,slot.port,{
  ...slot.portState,viewX:slot.portState.viewX+1
 },16,16,false);
 assert.equal(created.length,1);
 assert.notDeepEqual(draws[1],draws[0]);
 console.log(JSON.stringify({result:'OWNER_ORIGINAL_NATIVE_TOWN_384x384_PIXEL_MATCH',
  pixels:384*384,portId:39,bank:meta.bankId,sourceSha256:pins['PORTMAP.LZW'],
  nativeCanvases:created.length,
  boundary:'SAME_ORIGINAL_SOURCE_JS_PIXEL_PARITY__NOT_DOS_REFERENCE_FRAME'}));
}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old;}
