import assert from 'node:assert/strict';
import {drawOpeningNative,drawOpeningFit,drawOpeningCaption,UW2_OPENING_PALETTE}
 from '../web/opening.js';
const originalDoc=globalThis.document,originalImageData=globalThis.ImageData;
const canvas=[];let created=0;
globalThis.document={
 createElement:kind=>{
  assert.equal(kind,'canvas');created++;
  const c={width:0,height:0,ctx:{
   imageSmoothingEnabled:true,putImageData(frame){this.puts=(this.puts??0)+1;this.lastFrame=frame;}
  },getContext(type){assert.equal(type,'2d');return this.ctx;}};
  canvas.push(c);return c;
 }
};
globalThis.ImageData=class {
 constructor(data,width,height){this.data=data;this.width=width;this.height=height;}
};
try{
 const images=[];
 const target={
  imageSmoothingEnabled:true,
  drawImage:(src,...args)=>{images.push({src,args});}
 };
 const first={width:4,height:1,indices:Uint8Array.of(1,2,3,4)};
 assert.deepEqual(drawOpeningNative(target,first,6,7),
   {dx:6,dy:7,dw:4,dh:1});
 assert.deepEqual(drawOpeningNative(target,first,9,7),
   {dx:9,dy:7,dw:4,dh:1});
 assert.equal(images[0].src,images[1].src);
 assert.equal(created,1);
 assert.equal(canvas[0].ctx.puts,1);
 drawOpeningFit(target,first,0,0,8,2);
 assert.equal(created,1); // same native surface for scaled draw
 drawOpeningNative(target,first,0,0,{transparentZero:true});
 assert.equal(created,2);
 drawOpeningNative(target,first,0,0,{transparentZero:true});
 assert.equal(created,2);
 const alt=[...UW2_OPENING_PALETTE.map(c=>[...c])];
 drawOpeningNative(target,first,0,0,{palette:alt});
 assert.equal(created,3);
 drawOpeningNative(target,first,0,0,{palette:alt});
 assert.equal(created,3);
 // Native palette cycling on the same array MUST invalidate stale RGBA.
 alt[1][0]=(alt[1][0]+1)&255;
 drawOpeningNative(target,first,0,0,{palette:alt});
 assert.equal(created,4);
 drawOpeningNative(target,first,0,0,{palette:alt});
 assert.equal(created,4);
 alt[1][0]=999;
 assert.throws(()=>drawOpeningNative(target,first,0,0,{palette:alt}),/RGB8 triplets/);
 alt[1][0]=0;
 drawOpeningNative(target,first,0,0,{palette:alt});
 assert.equal(created,5);
 drawOpeningNative(target,{width:4,height:1,indices:Uint8Array.of(1,2,3,4)},0,0);
 assert.equal(created,6); // different decoded verified source identity
 assert.equal(target.imageSmoothingEnabled,false);
 assert.equal(images.length,11);
 // The ten original OPGRAPH story-caption records have black index-0
 // corners. Caption background must be opaque, unlike mask-backed eye sprites.
 const caption={width:4,height:2,indices:Uint8Array.of(0,3,0,4,0,0,5,0)};
 const opening={parts:Array.from({length:14},()=>({records:[]}))};
 opening.parts[13].records[2]=caption;
 assert.deepEqual(drawOpeningCaption(target,{width:640,height:400},opening,2),
   {dx:318,dy:392,dw:4,dh:2});
 const frame=images.at(-1).src.ctx.lastFrame.data;
 assert.deepEqual([...frame.slice(0,4)],[0,0,0,255],
   'source index-zero caption background is opaque black');
 assert.equal(frame[7],255,'nonblack caption foreground remains opaque');
 assert.equal(images.length,12);
}finally{
 if(originalDoc===undefined)delete globalThis.document;else globalThis.document=originalDoc;
 if(originalImageData===undefined)delete globalThis.ImageData;else globalThis.ImageData=originalImageData;
}
console.log('UW2 native opening reuses source-verified GRAPH Canvas per palette/alpha variant: PASS');
