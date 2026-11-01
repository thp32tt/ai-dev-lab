import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {KOREAN_OPGRAPH_JS_DECODE_EVIDENCE as known} from '../web/opgraph-korean-evidence.js';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
import {decodeOpeningVerifiedArchive,UW2_OPENING_PALETTE}
 from '../web/opening.js';
import {originalGraphIndexedRgba,createNativeGraphCanvas}
 from '../web/native-graph-canvas.js';
// PRIVATE USER-OWNED ORIGINAL OPGRAPH.LZW; public test source contains no
// copyrighted assets, source images, frame images or reference DOS state.
// This tests actual original GRAPH resources to a pure web pixel surface,
// NOT game timing, 8086 execution, or reference VGA scene parity.
const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(root,'OPGRAPH.LZW'));
const hash=x=>createHash('sha256').update(x).digest('hex');
assert.equal(hash(original),known.sourceSha256);
const verified=await prepareOriginalOpgraphArchive(original,{
 expectedSha256:known.sourceSha256,expectedPartCount:known.partCount,
 expectedDecodedSha256:known.decodedSha256
});
const decoded=decodeOpeningVerifiedArchive(verified);
assert.equal(decoded.recordCount,108);
assert.equal(verified.totalDecodedBytes,512912);
let sourcePixelCount=0,renderPixelCount=0,transparencyPixelCount=0;
const renderEvidence=[];
for(const [partIndex,part] of decoded.parts.entries()){
 for(const [recordIndex,img] of part.records.entries()){
  const {width,height,indices}=img;
  sourcePixelCount+=indices.length;
  // Actual browser entrypoint's native indexed->RGBA implementation.
  const frame=originalGraphIndexedRgba(img,{
    palette:UW2_OPENING_PALETTE,transparentZero:false
  });
  assert.equal(frame.rgba.length,width*height*4);
  assert.equal(frame.width,width);assert.equal(frame.height,height);
  renderPixelCount+=frame.rgba.length/4;
  for(let i=0;i<indices.length;i++){
   const color=UW2_OPENING_PALETTE[indices[i]],at=4*i;
   assert.deepEqual([...frame.rgba.subarray(at,at+4)],[...color,255]);
  }
  if(partIndex===0&&recordIndex===10){
   assert.equal(width,640);assert.equal(height,128);
   let calls=0;
   const canvas=createNativeGraphCanvas(img,{
    palette:UW2_OPENING_PALETTE,transparentZero:true,
    canvasFactory:()=>({
      getContext:()=>({putImageData:(data,x,y)=>{
       calls++;assert.equal(x,0);assert.equal(y,0);
       assert.equal(data.rgba.length,width*height*4);
      }})
    }),
    imageDataFactory:(rgba,w,h)=>({rgba,w,h})
   });
   assert.equal(canvas.width,640);assert.equal(canvas.height,128);
   assert.equal(calls,1);
  }
  transparencyPixelCount+=indices.filter(x=>x===0).length;
  renderEvidence.push({partIndex,recordIndex,width,height,pixels:indices.length});
 }
}
assert.equal(sourcePixelCount,3235136);
assert.equal(renderPixelCount,sourcePixelCount);
assert.equal(renderEvidence.length,108);
console.log(JSON.stringify({
 result:'OWNER_ORIGINAL_OPGRAPH_DIRECT_BROWSER_RGBA_NO_DOS_CPU',
 sourceSha256:known.sourceSha256,parts:verified.partCount,
 records:decoded.recordCount,sourcePixelCount,renderPixelCount,
 transparencyPixelCount,sourceByteLength:original.length,
 fidelity:'ORIGINAL_RESOURCE_JS_GRAPH_RGBA__NO_ORIGINAL_OPEN_VGA_FRAME_PARITY'
}));
