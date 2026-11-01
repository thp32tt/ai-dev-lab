import assert from 'node:assert/strict';
import {renderTownView,PORT_TILE_SIZE} from '../web/port-map.js';
import {UW2_WORLD_PALETTE} from '../web/koei-image.js';
const oldDoc=globalThis.document;
const created=[],draw=[];
globalThis.document={createElement:()=>{
 const c={width:0,height:0,ctx:{
  createImageData:(w,h)=>({width:w,height:h,data:new Uint8ClampedArray(w*h*4)}),
  putImageData:(image)=>{c.last=Uint8ClampedArray.from(image.data);}
 }};
 c.getContext=()=>c.ctx;created.push(c);return c;
}};
try{
 const tile0=new Uint8Array(256),tile1=new Uint8Array(256);
 for(let i=0;i<256;i++){tile0[i]=i&15;tile1[i]=(i+4)&15;}
 const bank=[tile0,tile1],map=new Uint8Array(96*96);
 map[0]=1;map[96+1]=1;
 const assets={banks:[bank],chipNo:Uint8Array.of(0),maps:[map]};
 const ctx={imageSmoothingEnabled:true,drawImage:(canvas,x,y)=>{
  draw.push({x,y,bytes:Uint8ClampedArray.from(canvas.last)});
 }};
 const state={viewX:0,viewY:0,playerX:12,playerY:12};
 const meta=renderTownView(ctx,assets,0,state,16,16,false);
 assert.deepEqual(meta,{bankId:0,width:384,height:384,
  playerScreenX:208,playerScreenY:208});
 assert.equal(created.length,1);assert.equal(draw.length,1);
 assert.equal(ctx.imageSmoothingEnabled,false);
 const expected=new Uint8ClampedArray(384*384*4);
 for(let vy=0;vy<24;vy++)for(let vx=0;vx<24;vx++){
  const base=(vy===0&&vx===0)||(vy===1&&vx===1)?tile1:tile0;
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
   const rgb=UW2_WORLD_PALETTE[base[y*16+x]];
   expected.set([...rgb,255],((vy*16+y)*384+(vx*16+x))*4);
  }
 }
 assert.deepEqual(draw[0].bytes,expected);
 // Movement/viewport scroll must NOT reuse a stale previous image.
 renderTownView(ctx,assets,0,{...state,viewX:1,viewY:1},16,16,false);
 assert.equal(created.length,1);
 assert.equal(draw.length,2);
 assert.notDeepEqual(draw[1].bytes,draw[0].bytes);
 // A source map edit is observed on the next repaint.
 map[96+1]=0;
 renderTownView(ctx,assets,0,state,16,16,false);
 assert.equal(created.length,1);
 assert.notDeepEqual(draw[2].bytes,draw[0].bytes);
 const bad=Uint8Array.from(tile0);bad[0]=255;
 const before=draw.length;
 assert.throws(()=>renderTownView(ctx,{...assets,banks:[[bad,tile1]]},
  0,state,0,0,false),/tile color unverified/);
 assert.equal(draw.length,before);
 assert.throws(()=>renderTownView(ctx,{...assets,banks:[[]]},
  0,state,0,0,false),/PORTCHIP tile unavailable/);
 // An out-of-bounds source window clears to fully transparent on reuse.
 renderTownView(ctx,assets,0,{...state,viewX:90,viewY:90},0,0,false);
 assert.deepEqual([...draw.at(-1).bytes.slice(-4)],[0,0,0,0]);
 assert.equal(created.length,3); // new synthetic assets each created a surface
}finally{if(oldDoc===undefined)delete globalThis.document;
 else globalThis.document=oldDoc;}
console.log('UW2 actual browser-native original PORTMAP/PORTCHIP 384px town raster reusable/full-repaint: PASS');
