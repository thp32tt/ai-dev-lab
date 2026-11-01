import assert from 'node:assert/strict';
import {drawOpeningNative,drawOpeningFit,UW2_OPENING_PALETTE}
 from '../web/opening.js';
const originalDoc=globalThis.document,originalImageData=globalThis.ImageData;
const canvas=[];let created=0;
globalThis.document={
 createElement:kind=>{
  assert.equal(kind,'canvas');created++;
  const c={width:0,height:0,ctx:{
   imageSmoothingEnabled:true,putImageData(){this.puts=(this.puts??0)+1;}
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
 drawOpeningNative(target,{width:4,height:1,indices:Uint8Array.of(1,2,3,4)},0,0);
 assert.equal(created,4); // different decoded verified source identity
 assert.equal(target.imageSmoothingEnabled,false);
 assert.equal(images.length,7);
}finally{
 if(originalDoc===undefined)delete globalThis.document;else globalThis.document=originalDoc;
 if(originalImageData===undefined)delete globalThis.ImageData;else globalThis.ImageData=originalImageData;
}
console.log('UW2 native opening reuses source-verified GRAPH Canvas per palette/alpha variant: PASS');
