import assert from 'node:assert/strict';
import {decodeGraphRecord,UW2_MAIN_VGA_PALETTE} from '../web/graph-format.js';
import {UW2_OPENING_PALETTE} from '../web/opening.js';
import {originalGraphIndexedRgba,createNativeGraphCanvas}
 from '../web/native-graph-canvas.js';
// A real GRAPH record's literal word (not fake markup, not DOS CPU) is
// decoded by existing JS and converted directly to native Canvas2D bytes.
const rec=new Uint8Array(23);
rec[0]=4;rec[2]=1;rec[20]=0x38;rec[21]=0x84;rec[22]=0x21;
const decoded=decodeGraphRecord(rec);
assert.equal(decoded.width,4);
assert.equal(decoded.height,1);
const frame=originalGraphIndexedRgba(decoded,{palette:UW2_MAIN_VGA_PALETTE});
assert.equal(frame.rgba.length,16);
for(let i=0;i<4;i++){
 const c=UW2_MAIN_VGA_PALETTE[decoded.indices[i]];
 assert.deepEqual([...frame.rgba.slice(i*4,i*4+4)],[...c,255]);
}
const chosen=Uint8Array.of(0,1,15,0);
const image={width:4,height:1,indices:chosen};
const transparent=originalGraphIndexedRgba(image,{
 palette:UW2_OPENING_PALETTE,transparentZero:true
});
assert.deepEqual([...transparent.rgba],[0,0,0,0,...UW2_OPENING_PALETTE[1],255,
 ...UW2_OPENING_PALETTE[15],255,0,0,0,0]);
assert.equal(transparent.rgba[3],0);
assert.equal(originalGraphIndexedRgba(image,{palette:UW2_OPENING_PALETTE}).rgba[3],255);
let put=null,ctx=null;
const canvas=createNativeGraphCanvas(image,{
 palette:UW2_OPENING_PALETTE,transparentZero:true,
 canvasFactory:()=>({width:0,height:0,getContext:()=>ctx={
  imageSmoothingEnabled:true,
  putImageData:(frame,x,y)=>{put={frame,x,y};}
 }}),
 imageDataFactory:(data,w,h)=>({data,width:w,height:h})
});
assert.equal(canvas.width,4);assert.equal(canvas.height,1);
assert.equal(ctx.imageSmoothingEnabled,false);
assert.equal(put.x,0);assert.equal(put.y,0);
assert.deepEqual(put.frame.data,transparent.rgba);
assert.throws(()=>originalGraphIndexedRgba({...image,indices:new Uint8Array(3)},
 {palette:UW2_MAIN_VGA_PALETTE}),/pixel count/);
assert.throws(()=>originalGraphIndexedRgba({...image,indices:Uint8Array.of(0,1,16,0)},
 {palette:UW2_MAIN_VGA_PALETTE}),/color index/);
assert.throws(()=>originalGraphIndexedRgba(image,{palette:[]}),/16-entry/);
assert.throws(()=>originalGraphIndexedRgba(image,{palette:UW2_MAIN_VGA_PALETTE,transparentZero:'yes'}),/boolean/);
assert.throws(()=>originalGraphIndexedRgba({width:641,height:1,indices:new Uint8Array(641)},
 {palette:UW2_MAIN_VGA_PALETTE}),/bounds/);
console.log('UW2 browser-native source GRAPH indices → 16-color RGBA → Canvas2D: PASS');
