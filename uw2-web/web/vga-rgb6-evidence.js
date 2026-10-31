// Diagnostic-only evidence bridge, not a substitute original renderer.
// A native VGA 4-plane pixel index -> observed attribute-controller palette
// -> observed DAC RGB6 triplet. Preserve raw 6-bit channels; DO NOT guess
// CRT gamma, scale to 8-bit, or invent missing BIOS palette entries.
export function captureGroundedVgaMode12Rgb6Rect(witness,attribute,dac,
  {x,y,width,height}={}){
  if(!witness||typeof witness.captureGroundedIndexedRect!=='function'||
     !attribute||typeof attribute.getGroundedDacIndex!=='function'||
     !dac||typeof dac.sampleKnownColor6!=='function')
    throw new TypeError('VGA RGB6 capture requires witnessed planes, attribute, and DAC devices');
  const indexed=witness.captureGroundedIndexedRect(x,y,width,height);
  const rgb=new Uint8Array(indexed.length*3),palette=new Map();
  for(let i=0;i<indexed.length;i++){
    const index=indexed[i];
    if(!palette.has(index)){
      const dacIndex=attribute.getGroundedDacIndex(index);
      palette.set(index,dac.sampleKnownColor6(dacIndex));
    }
    const color=palette.get(index),dest=i*3;
    rgb[dest]=color.red;rgb[dest+1]=color.green;rgb[dest+2]=color.blue;
  }
  return Object.freeze({
    width,height,channels:3,componentBits:6,
    fidelity:'OBSERVED_VGA_PLANE_ATTRIBUTE_DAC_RGB6_ONLY__NOT_CRT_PARITY',
    pixels:rgb // owned result, never mutable internal register/VRAM evidence
  });
}
