import { decodeLS11 } from "./ls11.js";
import { UW2_WORLD_PALETTE } from "./koei-image.js";

export const WORLD_CELL_W = 1080;
export const WORLD_CELL_H = 540;
export const WORLD_CHIP_W = 2160;
export const WORLD_CHIP_H = 1080;
const TILE = 12;
const BAND = 30;
const TILES_PER_CHUNK = 1350;
const LAND = 15;
const SEA = 0;
const LAND_CHIP = 0x41;
const MIN_CHIP = 0x34;

function buildTemplates() {
  const out = [];
  for (let k = 0; k < 6; k++) {
    const a = new Uint8Array(TILE * TILE);
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        a[y * TILE + x] =
          k === 0 ? (x < 6 ? LAND : SEA) :
          k === 1 ? (x < 6 ? SEA : LAND) :
          k === 2 ? (y < 6 ? LAND : SEA) :
          k === 3 ? (y < 6 ? SEA : LAND) :
          k === 4 ? LAND : SEA;
      }
    }
    out.push(a);
  }
  return out;
}
const TEMPLATES = buildTemplates();

function u16le(a,o){ return a[o] | (a[o+1] << 8); }

function decodeWorldChunk(chunk, band, cells) {
  const tableBytes = TILES_PER_CHUNK * 2;
  if (chunk.length < tableBytes) throw new Error("WORLDMAP chunk too short");
  const tile = new Uint8Array(TILE*TILE);
  for (let i=0;i<TILES_PER_CHUNK;i++) {
    const start=u16le(chunk,i*2);
    const end=i+1<TILES_PER_CHUNK ? u16le(chunk,(i+1)*2) : chunk.length-tableBytes;
    const base=tableBytes+start, limit=tableBytes+end;
    if (base>=chunk.length || limit>chunk.length || limit<=base) throw new Error(`bad WORLDMAP tile ${band}:${i}`);
    const head=chunk[base];
    const template=TEMPLATES[(head&0x7f)-0x78];
    if(!template) throw new Error(`bad WORLDMAP template 0x${head.toString(16)}`);
    if(head&0x80){
      tile.set(template);
    } else {
      if(limit-base<19) throw new Error("truncated WORLDMAP tile");
      const mask=chunk.subarray(base+1,base+19);
      let vi=base+19;
      for(let bit=0;bit<144;bit++){
        if((mask[bit>>3]>>(7-(bit&7)))&1){
          if(vi>=limit) throw new Error("WORLDMAP values exhausted");
          tile[bit]=chunk[vi++];
        } else tile[bit]=template[bit];
      }
      if(vi!==limit) throw new Error(`WORLDMAP tile leftover ${limit-vi}`);
    }
    const ty=Math.floor(i/BAND), tx=band*BAND+(i%BAND);
    for(let y=0;y<TILE;y++){
      cells.set(tile.subarray(y*TILE,y*TILE+TILE),(ty*TILE+y)*WORLD_CELL_W+tx*TILE);
    }
  }
}

function decodeWorldTiles(raw) {
  if(raw.length<16384) throw new Error("DATA1 chunk 11 lacks world tile atlas");
  const tiles=[];
  for(let t=0;t<128;t++){
    const out=new Uint8Array(16*16);
    const base=t*128;
    for(let y=0;y<16;y++){
      for(let x=0;x<16;x++){
        let v=0;
        for(let plane=0;plane<4;plane++){
          const byte=raw[base+plane*32+y*2+(x>>3)];
          v|=((byte>>(7-(x&7)))&1)<<plane;
        }
        out[y*16+x]=v;
      }
    }
    tiles.push(out);
  }
  return tiles;
}

export function decodeWorldAssets(worldBuffer,data1Buffer){
  const w=decodeLS11(worldBuffer);
  if(w.decoded.length!==3) throw new Error(`WORLDMAP parts ${w.decoded.length}, expected 3`);
  const cells=new Uint8Array(WORLD_CELL_W*WORLD_CELL_H);
  w.decoded.forEach((e,i)=>decodeWorldChunk(e.data,i,cells));

  const d=decodeLS11(data1Buffer);
  if(d.decoded.length<19) throw new Error("DATA1 needs 19 parts");
  const quad=d.decoded[18].data;
  if(quad.length!==1024) throw new Error(`DATA1[18] ${quad.length}, expected 1024`);
  const tiles=decodeWorldTiles(d.decoded[11].data);
  return {cells,quad,tiles};
}

export function worldChipAt(assets,x,y){
  x=((x%WORLD_CHIP_W)+WORLD_CHIP_W)%WORLD_CHIP_W;
  if(y<0||y>=WORLD_CHIP_H) return LAND_CHIP;
  const cx=x>>1, cy=y>>1;
  const v=assets.cells[cy*WORLD_CELL_W+cx];
  const qx=x&1,qy=y&1;
  if(v<16){
    const bit=qy===0 ? (qx===0?8:4) : (qx===0?2:1);
    return (v&bit)?LAND_CHIP:SEA;
  }
  const q=assets.quad[v*4+qy*2+qx];
  return q<MIN_CHIP?SEA:q;
}
export function canSailChip(assets,x,y){ return worldChipAt(assets,x,y)<MIN_CHIP; }
export function canFleetStand(assets,x,y){
  return canSailChip(assets,x,y)&&canSailChip(assets,x+1,y)&&canSailChip(assets,x,y+1)&&canSailChip(assets,x+1,y+1);
}

export function findNearestSea(assets,x,y,radius=24){
  if(canFleetStand(assets,x,y)) return {x,y};
  for(let r=1;r<=radius;r++){
    for(let dy=-r;dy<=r;dy++){
      for(const dx of [-r,r]){
        const xx=((x+dx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W, yy=y+dy;
        if(canFleetStand(assets,xx,yy)) return {x:xx,y:yy};
      }
    }
    for(let dx=-r+1;dx<=r-1;dx++){
      for(const dy of [-r,r]){
        const xx=((x+dx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W, yy=y+dy;
        if(canFleetStand(assets,xx,yy)) return {x:xx,y:yy};
      }
    }
  }
  return null;
}

function drawTileToImage(img,pitch,tile,px,py){
  for(let y=0;y<16;y++)for(let x=0;x<16;x++){
    const c=UW2_WORLD_PALETTE[tile[y*16+x]]??[0,0,0];
    const p=((py+y)*pitch+(px+x))*4;
    img.data[p]=c[0];img.data[p+1]=c[1];img.data[p+2]=c[2];img.data[p+3]=255;
  }
}

export function renderSeaView(ctx,assets,state,dx=16,dy=16,tilesWide=23,tilesHigh=23){
  const w=tilesWide*16,h=tilesHigh*16;
  const tmp=document.createElement("canvas");tmp.width=w;tmp.height=h;
  const t=tmp.getContext("2d"),img=t.createImageData(w,h);
  const startX=state.x-Math.floor(tilesWide/2), startY=state.y-Math.floor(tilesHigh/2);
  for(let vy=0;vy<tilesHigh;vy++)for(let vx=0;vx<tilesWide;vx++){
    const wx=((startX+vx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W;
    const wy=startY+vy;
    const id=worldChipAt(assets,wx,wy);
    const tile=assets.tiles[id]??assets.tiles[0];
    drawTileToImage(img,w,tile,vx*16,vy*16);
  }
  t.putImageData(img,0,0);
  ctx.imageSmoothingEnabled=false;ctx.drawImage(tmp,dx,dy);
  const sx=dx+Math.floor(tilesWide/2)*16, sy=dy+Math.floor(tilesHigh/2)*16;
  ctx.save();ctx.strokeStyle="#ffe680";ctx.lineWidth=3;ctx.strokeRect(sx+1,sy+1,30,30);
  ctx.fillStyle="rgba(255,238,128,.24)";ctx.fillRect(sx,sy,32,32);ctx.restore();
  return {startX,startY,width:w,height:h};
}

const DIRS=[
  [0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]
];
export class SeaRuntime{
  constructor(assets,start){
    this.assets=assets;this.x=start.x;this.y=start.y;this.heading=0;this.steps=0;this.lastEvent="set-sail";
  }
  turn(delta){this.heading=(this.heading+delta+8)%8;this.lastEvent="turn";return this.snapshot();}
  move(){
    const [dx,dy]=DIRS[this.heading];
    const nx=((this.x+dx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W, ny=this.y+dy;
    if(canFleetStand(this.assets,nx,ny)){this.x=nx;this.y=ny;this.steps++;this.lastEvent="sail";return true;}
    this.lastEvent="coast-block";return false;
  }
  snapshot(){return {x:this.x,y:this.y,heading:this.heading,steps:this.steps,lastEvent:this.lastEvent};}
}