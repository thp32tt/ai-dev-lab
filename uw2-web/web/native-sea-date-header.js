// Korean GRAPH.DAT #4 original sea scroll already contains fixed ink in
// the 480..624 top-right panel. Draw the complete, source-clock-backed
// date/time in ONE bounded row, clearing only the parchment writing area.
// Pixel color (243,227,211) is the verified background RGB of GRAPH #4;
// scroll edges, decorative corners and voyage HUD remain source pixels.
import {measureUw2Text,drawUw2Text} from './font.js';
import {validNativeCheckpointClock} from './native-checkpoint-integrity.js';

export const SEA_HEADER_INK_BOUNDS=Object.freeze({
 x:498,y:14,w:121,h:20,textX:501,textY:16,textW:115
});
const paper='#f3e3d3';
const ink='#24160c';

export function layoutNativeSeaDateHeader(date,font){
 if(!validNativeCheckpointClock(date))return null;
 const hh=String(date.hour).padStart(2,'0');
 const mm=String(date.minute).padStart(2,'0');
 const value=`${date.year}.${date.month}.${date.day} ${hh}:${mm}`;
 const measured=font?.glyphs?measureUw2Text(font,value):value.length*8;
 if(!Number.isFinite(measured)||measured<=0)return null;
 const bounds=SEA_HEADER_INK_BOUNDS;
 const scale=Math.min(1,bounds.textW/measured);
 if(!(scale>0)||scale<0.5)return null;
 return Object.freeze({text:value,scale,width:measured*scale,
  x:bounds.textX,y:bounds.textY,box:bounds});
}

export function paintNativeSeaDateHeader(ctx,font,date){
 const layout=layoutNativeSeaDateHeader(date,font);
 if(!layout||!ctx)return null;
 const {x,y,w,h}=layout.box;
 ctx.save();
 ctx.fillStyle=paper;
 ctx.fillRect(x,y,w,h);
 ctx.beginPath();
 ctx.rect(x,y,w,h);
 ctx.clip();
 if(font?.glyphs){
  drawUw2Text(ctx,font,layout.text,layout.x,layout.y,{
   color:ink,scale:layout.scale
  });
 }else{
  // Initial font fetch can lag behind GRAPH. Preserve a single
  // bounded line with the native browser fallback rather than overlap.
  ctx.fillStyle=ink;
  ctx.font='12px monospace';
  ctx.textBaseline='top';
  ctx.fillText(layout.text,layout.x,layout.y,layout.box.textW);
 }
 ctx.restore();
 return layout;
}
