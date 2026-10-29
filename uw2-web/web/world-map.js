import { decodeLS11 } from "./ls11.js";
import { UW2_WORLD_PALETTE } from "./koei-image.js";
import { environmentAt } from "./windcur.js";
import { fleetSeaSpeed } from "./sea-speed.js";

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

function decodeSeaShips(raw) {
  const first = 0x4000;
  if (raw.length <= first) return [];
  const count = Math.floor((raw.length - first) / 0x400);
  const frames = [];
  for (let k = 0; k < count; k++) {
    const o = first + k * 0x400;
    const px = new Uint8Array(32 * 32);
    px.fill(255);
    for (let i = 0; i < 0x200; i++) {
      const b = raw[o + i], m = raw[o + 0x200 + i];
      const y = Math.floor((i * 2) / 32), x = (i * 2) % 32;
      const hi = b >> 4, lo = b & 15, mh = m >> 4, ml = m & 15;
      if (mh !== 0xF) px[y * 32 + x] = hi;
      if (ml !== 0xF) px[y * 32 + x + 1] = lo;
    }
    frames.push(px);
  }
  return frames;
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
  const chunk11 = d.decoded[11].data;
  const tiles=decodeWorldTiles(chunk11);
  const seaShips=decodeSeaShips(chunk11);
  return {cells,quad,tiles,seaShips};
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
  const ships = assets.seaShips ?? [];
  if (ships.length) {
    const facingMap = [0,1,1,1,2,3,3,3];
    const set = ships.length >= 16 ? 1 : 0; // Korean DOS: 0=oar, 1=sail
    const frame = Math.min(ships.length - 1, set * 8 + facingMap[state.heading & 7] * 2 + (state.steps & 1));
    const sp = ships[frame];
    const sc = document.createElement("canvas"); sc.width = 32; sc.height = 32;
    const sctx = sc.getContext("2d"); const simg = sctx.createImageData(32,32);
    for (let i=0;i<sp.length;i++) {
      const ci=sp[i], p=i*4;
      if (ci===255) { simg.data[p+3]=0; continue; }
      const c=UW2_WORLD_PALETTE[ci] ?? [0,0,0];
      simg.data[p]=c[0]; simg.data[p+1]=c[1]; simg.data[p+2]=c[2]; simg.data[p+3]=255;
    }
    sctx.putImageData(simg,0,0);
    ctx.drawImage(sc,sx,sy);
  } else {
    ctx.save();ctx.strokeStyle="#ffe680";ctx.lineWidth=3;ctx.strokeRect(sx+1,sy+1,30,30);
    ctx.fillStyle="rgba(255,238,128,.24)";ctx.fillRect(sx,sy,32,32);ctx.restore();
  }
  return {startX,startY,width:w,height:h};
}

const DIRS=[
  [0,-1],[1,-1],[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1]
];
export function findPortCallTarget(state, ports) {
  if (!state || !Array.isArray(ports)) return null;
  for (const port of ports) {
    if (!port?.name) continue;
    let dx = port.x - state.x;
    // World X wraps.
    if (dx > WORLD_CHIP_W / 2) dx -= WORLD_CHIP_W;
    if (dx < -WORLD_CHIP_W / 2) dx += WORLD_CHIP_W;
    const dy = port.y - state.y;
    // Original Port Call scans the 12 positions in the 4x4 ring around the
    // fleet's occupied 2x2 block.
    const inRing = dx >= -1 && dx <= 2 && dy >= -1 && dy <= 2 &&
      !(dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1);
    if (inRing) return { ...port, dx, dy };
  }
  return null;
}

export class SeaRuntime{
  constructor(assets,start,windRaw=null,month=1,fleet=null,dateTime=null){
    this.assets=assets;
    this.x=start.x; this.y=start.y;
    this.heading=0;
    this.steps=0;
    this.ticks=0;
    this.accX=0; this.accY=0;
    this.lastEvent="set-sail";
    this.windRaw=windRaw;
    this.month=month;
    this.fleet=fleet;
    this.dateTime=dateTime ? {...dateTime} : {year:1501,month,day:1,timeTick:0,hour:0,minute:0};
  }

  turn(delta){
    this.heading=(this.heading+delta+8)%8;
    this.lastEvent="turn";
    return this.snapshot();
  }

  _advanceClock(){
    this.dateTime.timeTick=(this.dateTime.timeTick+1)%72;
    if(this.dateTime.timeTick===0){
      const monthDays=[31,28,31,30,31,30,31,31,30,31,30,31];
      this.dateTime.day++;
      const max=monthDays[(this.dateTime.month-1)%12] ?? 30;
      if(this.dateTime.day>max){
        this.dateTime.day=1;
        this.dateTime.month++;
        if(this.dateTime.month>12){this.dateTime.month=1;this.dateTime.year++;}
        this.month=this.dateTime.month;
      }
    }
    this.dateTime.hour=Math.floor(this.dateTime.timeTick/3);
    this.dateTime.minute=(this.dateTime.timeTick%3)*20;
  }

  _attemptDelta(mx,my){
    if(mx===0&&my===0) return false;
    const nx=((this.x+mx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W;
    const ny=this.y+my;
    if(canFleetStand(this.assets,nx,ny)){
      this.x=nx; this.y=ny; this.steps++;
      return true;
    }
    // Preserve useful coast-sliding when a diagonal target is blocked.
    if(mx!==0&&my!==0){
      const xx=((this.x+mx)%WORLD_CHIP_W+WORLD_CHIP_W)%WORLD_CHIP_W;
      if(canFleetStand(this.assets,xx,this.y)){this.x=xx;this.steps++;return true;}
      if(canFleetStand(this.assets,this.x,this.y+my)){this.y+=my;this.steps++;return true;}
    }
    return false;
  }

  tick(){
    const environment=this.windRaw ? environmentAt(this.windRaw,this.month,this.x,this.y) : null;
    const speedInfo=fleetSeaSpeed(this.fleet,this.heading,environment?.wind ?? {dir:0,speed:0});
    const [hdx,hdy]=DIRS[this.heading];
    const current=environment?.current ?? {dir:0,speed:0};
    const [cdx,cdy]=DIRS[current.dir&7];

    const vx=hdx*speedInfo.speed + cdx*current.speed;
    const vy=hdy*speedInfo.speed + cdy*current.speed;
    this.accX+=vx; this.accY+=vy;

    let mx=0,my=0;
    if(this.accX>=60){mx=1;this.accX-=60;}
    else if(this.accX<0){mx=-1;this.accX+=60;}
    if(this.accY>=60){my=1;this.accY-=60;}
    else if(this.accY<0){my=-1;this.accY+=60;}

    const crossed=mx!==0||my!==0;
    const moved=this._attemptDelta(mx,my);
    if(crossed&&!moved){
      if(mx>0)this.accX=59; else if(mx<0)this.accX=0;
      if(my>0)this.accY=59; else if(my<0)this.accY=0;
      this.lastEvent="coast-block";
    } else {
      this.lastEvent=moved ? "sail" : "accumulate";
    }
    this.ticks++;
    this._advanceClock();
    return moved;
  }

  move(){ return this.tick(); }

  snapshot(){
    const environment=this.windRaw ? environmentAt(this.windRaw,this.month,this.x,this.y) : null;
    const speed=fleetSeaSpeed(this.fleet,this.heading,environment?.wind ?? {dir:0,speed:0});
    return {
      x:this.x,y:this.y,heading:this.heading,steps:this.steps,ticks:this.ticks,
      accX:this.accX,accY:this.accY,
      speed,lastEvent:this.lastEvent,month:this.month,dateTime:{...this.dateTime},environment,
    };
  }
}