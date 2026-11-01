import assert from 'node:assert/strict';
import {renderSeaView,WORLD_CELL_W,WORLD_CELL_H}
 from '../web/world-map.js';
import {UW2_WORLD_PALETTE} from '../web/koei-image.js';
// Standalone Canvas2D pixel witness for the ACTUAL shipping native renderer.
// Synthetic indices only, independent expected map and sprite RGBA, no DOS CPU.
const savedDocument=globalThis.document;
const made=[];
globalThis.document={createElement(type){
  assert.equal(type,'canvas');
  const canvas={width:0,height:0};
  const surface={imageSmoothingEnabled:true,calls:[],createImageData(w,h){
    return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};
  },putImageData(image,x,y){
    assert.equal(x,0);assert.equal(y,0);
    this.calls.push(Uint8ClampedArray.from(image.data));
    this.latest=Uint8ClampedArray.from(image.data);
  }};
  canvas.getContext=t=>{assert.equal(t,'2d');return surface;};
  canvas.surface=surface;made.push(canvas);return canvas;
}};
try{
  const cells=new Uint8Array(WORLD_CELL_W*WORLD_CELL_H);
  // Land/island placement includes world wrap and viewport boundary pixels.
  cells[0]=15;cells[WORLD_CELL_W*2+2]=15;
  const tiles=Array.from({length:128},(_,id)=>{
    const t=new Uint8Array(16*16);
    for(let y=0;y<16;y++)for(let x=0;x<16;x++)
      t[y*16+x]=(id+x+y)&15;
    return t;
  });
  const seaShips=Array.from({length:16},(_,frame)=>{
    const pixels=new Uint8Array(32*32);
    for(let i=0;i<pixels.length;i++)
      pixels[i]=i%9===0?255:(frame+i)%16;
    return pixels;
  });
  const assets={cells,quad:new Uint8Array(1024),tiles,seaShips};
  const draws=[];
  const target={imageSmoothingEnabled:true,drawImage(surface,x,y){
    assert.ok(surface.surface?.latest);
    draws.push({width:surface.width,height:surface.height,x,y,
      bytes:Uint8ClampedArray.from(surface.surface.latest)});
  }};
  const state={x:0,y:0,heading:0,steps:0};
  const bounds=renderSeaView(target,assets,state,9,11,3,3);
  assert.deepEqual(bounds,{startX:-1,startY:-1,width:48,height:48});
  assert.equal(made.length,2);assert.equal(draws.length,2);
  assert.equal(target.imageSmoothingEnabled,false);
  const expectedColor=(tileId,x,y)=>UW2_WORLD_PALETTE[(tileId+x+y)&15];
  const expected=new Uint8ClampedArray(48*48*4);
  for(let vy=0;vy<3;vy++)for(let vx=0;vx<3;vx++){
    const wx=((vx-1)%2160+2160)%2160,wy=vy-1;
    const tileId=wy<0?0x41:wx<2&&wy<2?15:0;
    // worldChipAt 4-bit quadrant mask of 15 returns land on every subchip.
    const index=tileId===15?0x41:tileId;
    for(let y=0;y<16;y++)for(let x=0;x<16;x++){
      const c=expectedColor(index,x,y);
      const i=((vy*16+y)*48+vx*16+x)*4;
      expected.set([...c,255],i);
    }
  }
  // Derive expected physical world tile IDs independently of the pixel
  // draw function, including the polar land sentinel.
  assert.deepEqual(draws[0].bytes,expected);
  const ship=seaShips[8]; // 16 frames -> sail set1, heading north, parity0.
  const shipExpected=new Uint8ClampedArray(32*32*4);
  for(let i=0;i<ship.length;i++){
    const c=ship[i]===255?null:UW2_WORLD_PALETTE[ship[i]];
    shipExpected.set(c?[...c,255]:[0,0,0,0],i*4);
  }
  assert.deepEqual(draws[1].bytes,shipExpected);
  // Each later frame repaints reused surfaces instead of creating new DOM
  // canvases or leaking the last frame's pixels.
  seaShips[8][0]=3;
  state.steps=2;
  renderSeaView(target,assets,state,9,11,3,3);
  assert.equal(made.length,2);
  assert.equal(draws.length,4);
  assert.deepEqual([...draws[3].bytes.slice(0,4)],
    [...UW2_WORLD_PALETTE[3],255]);
  renderSeaView(target,assets,{...state,heading:2,steps:1},9,11,2,2);
  assert.equal(made.length,4); // new dimension gets one reusable pair
  assert.throws(()=>renderSeaView(target,{...assets,seaShips:[]},state,0,0,2,2),
    /original ship sprite frames unavailable/);
  assert.throws(()=>renderSeaView(target,{...assets,tiles:[]},state,0,0,2,2),
    /original tile unavailable/);
  assert.throws(()=>renderSeaView(target,assets,{...state,x:NaN},0,0,2,2),
    /finite ship state/);
  assert.throws(()=>renderSeaView(target,assets,state,0,0,41,2),
    /viewport exceeds/);
}finally{if(savedDocument===undefined)delete globalThis.document;
 else globalThis.document=savedDocument;}
console.log('UW2 native original-index sea Canvas reused, repaint/transparent & tile failure: PASS');
