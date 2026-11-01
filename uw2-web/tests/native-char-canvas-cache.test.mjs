import assert from 'node:assert/strict';
import {drawHeroSprite,drawFolkSprite,heroFrameIndex}
 from '../web/char.js';
const oldDoc=globalThis.document,oldImageData=globalThis.ImageData;
const created=[],draws=[];
globalThis.document={createElement:type=>{
 assert.equal(type,'canvas');
 const canvas={width:0,height:0};
 canvas.getContext=()=>({putImageData:(img,x,y)=>{
  assert.equal(x,0);assert.equal(y,0);
  canvas.data=Uint8ClampedArray.from(img.data);
 }});
 created.push(canvas);return canvas;
}};
globalThis.ImageData=class{constructor(data,width,height){
 assert.equal(width,32);assert.equal(height,32);this.data=data;
}};
try{
 const pixels=new Uint8ClampedArray(4096);
 pixels[0]=11;pixels[3]=255;
 const chars={heroes:[[...Array(8)].map(()=>pixels)],
  folk:[...Array(24)].map(()=>pixels)};
 const target={imageSmoothingEnabled:true,drawImage:(canvas,x,y)=>{
  draws.push({canvas,x,y,data:Uint8ClampedArray.from(canvas.data)});
 }};
 const st={playerX:12,playerY:14,facing:'right',stepParity:0};
 assert.equal(drawHeroSprite(target,chars,0,st,16,16),true);
 assert.equal(created.length,1);assert.deepEqual([draws[0].x,draws[0].y],[208,240]);
 for(let i=0;i<100;i++)drawHeroSprite(target,chars,0,{...st,stepParity:i&1},16,16);
 assert.equal(created.length,1); // same exact original decoded frame reused
 assert.equal(target.imageSmoothingEnabled,false);
 drawFolkSprite(target,chars,16,0,0,16,16);
 assert.equal(created.length,1); // same RGBA reference across hero/folk
 pixels[0]=44;
 drawHeroSprite(target,chars,0,st,16,16);
 assert.equal(created.length,2); // source mutation invalidates old Canvas pixels
 assert.equal(draws.at(-1).data[0],44);
 assert.equal(draws[0].data[0],11);
 const second=Uint8ClampedArray.from(pixels);
 chars.heroes[0][heroFrameIndex('right',0)]=second;
 drawHeroSprite(target,chars,0,st,16,16);
 assert.equal(created.length,3); // separate decoded original source identity
 assert.throws(()=>drawFolkSprite(target,{folk:[new Uint8ClampedArray(3)]},0,0,0),
  /32x32 RGBA/);
}finally{
 if(oldDoc===undefined)delete globalThis.document;else globalThis.document=oldDoc;
 if(oldImageData===undefined)delete globalThis.ImageData;else globalThis.ImageData=oldImageData;
}
console.log('UW2 original CHAR sprites native Canvas shared across browser walks and source-pixel mutation: PASS');
