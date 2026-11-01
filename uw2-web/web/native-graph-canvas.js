// Production browser-native GRAPH indexed pixels -> Canvas2D image bytes.
// No guest DOS/8086 CPU, BIOS, VGA device, fake animation or invented palette.
// Palette & GRAPH indices come from verified Korean original source adapters.
// Frame placement, original timing and actual on-screen parity are separate.
const bounded=(n,label,max)=>{
  if(!Number.isSafeInteger(n)||n<1||n>max)
    throw new RangeError(label+' outside original 640x400 GRAPH bounds');
  return n;
};
export function originalGraphIndexedRgba(image,{palette,transparentZero=false}={}){
  if(!image||typeof image!=='object')
    throw new TypeError('native GRAPH render requires decoded original image');
  const w=bounded(image.width,'GRAPH width',640);
  const h=bounded(image.height,'GRAPH height',400);
  if(w%4!==0)throw new RangeError('GRAPH width must be four-pixel aligned');
  if(!(image.indices instanceof Uint8Array)||image.indices.length!==w*h)
    throw new Error('native GRAPH pixel count must match decoded source');
  if(!Array.isArray(palette)||palette.length!==16)
    throw new Error('native GRAPH requires explicit 16-entry source palette');
  if(typeof transparentZero!=='boolean')
    throw new TypeError('native GRAPH transparent index-0 flag must be boolean');
  for(let i=0;i<16;i++){
    const color=palette[i];
    if(!Array.isArray(color)||color.length!==3||
       color.some(v=>!Number.isInteger(v)||v<0||v>255))
      throw new Error('native GRAPH palette source must contain RGB8 triplets');
  }
  const pixels=new Uint8ClampedArray(w*h*4);
  for(let i=0;i<image.indices.length;i++){
    const index=image.indices[i];
    if(index>15)throw new Error('native GRAPH source color index outside 4-bit palette');
    const c=palette[index],p=i*4;
    pixels[p]=c[0];pixels[p+1]=c[1];pixels[p+2]=c[2];
    pixels[p+3]=transparentZero&&index===0?0:255;
  }
  return Object.freeze({width:w,height:h,rgba:pixels,
    fidelity:'DIRECT_SOURCE_GRAPH_INDICES_TO_BROWSER_RGBA__FRAME_PARITY_UNTESTED'});
}
export function createNativeGraphCanvas(image,{
  palette,transparentZero=false,
  canvasFactory=()=>document.createElement('canvas'),
  imageDataFactory=(pixels,w,h)=>new ImageData(pixels,w,h)
}={}){
  const frame=originalGraphIndexedRgba(image,{palette,transparentZero});
  if(typeof canvasFactory!=='function'||typeof imageDataFactory!=='function')
    throw new TypeError('native GRAPH browser Canvas2D factories required');
  const canvas=canvasFactory();
  if(!canvas||typeof canvas.getContext!=='function')
    throw new TypeError('native GRAPH Canvas2D surface unavailable');
  canvas.width=frame.width;canvas.height=frame.height;
  const ctx=canvas.getContext('2d');
  if(!ctx||typeof ctx.putImageData!=='function')
    throw new Error('native GRAPH Canvas2D pixel API missing');
  ctx.imageSmoothingEnabled=false;
  ctx.putImageData(imageDataFactory(frame.rgba,frame.width,frame.height),0,0);
  return canvas;
}
