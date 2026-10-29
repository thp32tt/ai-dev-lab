import { decodeLS11 } from "./ls11.js";
import { readGraphRecords, decodeGraphRecord, graphIndicesToRgba } from "./graph-format.js";

export function decodeOpeningArchive(arrayBuffer) {
  const archive=decodeLS11(arrayBuffer);
  const parts=archive.decoded.map((part,partIndex)=>{
    const records=readGraphRecords(part.data).map((record,recordIndex)=>({
      partIndex,
      recordIndex,
      ...decodeGraphRecord(record),
    }));
    return {partIndex,records};
  });
  return {
    magic: archive.magic,
    parts,
    recordCount: parts.reduce((n,p)=>n+p.records.length,0),
  };
}

export function flattenOpening(opening) {
  return opening.parts.flatMap(p=>p.records);
}

function imageCanvas(image) {
  const c=document.createElement("canvas");
  c.width=image.width; c.height=image.height;
  const x=c.getContext("2d");
  x.putImageData(new ImageData(graphIndicesToRgba(image.indices),image.width,image.height),0,0);
  return c;
}

export function drawOpeningFit(ctx,image,x,y,w,h) {
  const src=imageCanvas(image);
  const scale=Math.min(w/image.width,h/image.height);
  const dw=Math.max(1,Math.round(image.width*scale));
  const dh=Math.max(1,Math.round(image.height*scale));
  const dx=Math.round(x+(w-dw)/2);
  const dy=Math.round(y+(h-dh)/2);
  ctx.imageSmoothingEnabled=false;
  ctx.drawImage(src,dx,dy,dw,dh);
  return {dx,dy,dw,dh};
}

export function chooseTitleLikeRecord(opening) {
  const all=flattenOpening(opening);
  return all.find(x=>x.width===640 && x.height===128)
      ?? all.find(x=>x.width===640)
      ?? all[0]
      ?? null;
}

export function chooseOpeningGallery(opening,limit=12) {
  const all=flattenOpening(opening);
  const large=all.filter(x=>x.width*x.height>=20000 && x.height>=80);
  const chosen=[];
  const seen=new Set();
  for(const image of large){
    const key=`${image.width}x${image.height}`;
    if(!seen.has(key) || chosen.length<4){
      chosen.push(image);
      seen.add(key);
    }
    if(chosen.length>=limit) break;
  }
  return chosen.length ? chosen : all.slice(0,limit);
}