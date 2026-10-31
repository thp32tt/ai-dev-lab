import assert from 'node:assert/strict';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
const make=()=>createOriginalVgaMode12PlaneWitness({maxObservedWrites:50000});
const mode=(w,mask=15)=>{
  for(const [device,index,value] of [
    ['graphics-controller',3,0],['graphics-controller',5,2],
    ['graphics-controller',8,255],['sequencer',2,mask]
  ])w.noteIndexedRegister({device,index,value});
};
const w=make();
assert.equal(w.readPixelIndex(0,0),null);
assert.throws(()=>w.captureCompleteIndexedFrame(),/not every pixel/);
assert.throws(()=>w.observeNativeByte({physical:0xa0000,value:15}),/exact observed/);
mode(w);
w.observeNativeByte({physical:0xa0000,value:5});
assert.deepEqual(Array.from({length:8},(_,x)=>w.readPixelIndex(x,0)),[5,5,5,5,5,5,5,5]);
w.observeNativeByte({physical:0xa0001,value:10});
assert.equal(w.readPixelIndex(8,0),10);
assert.equal(w.readPixelIndex(15,0),10);
assert.equal(w.readPixelIndex(16,0),null);
assert.deepEqual(w.getState(),{
 width:640,height:480,strideBytes:80,observedWrites:2,
 visibleWrites:2,fullyCoveredBytes:2,visibleBytes:38400,configKnown:true,
 graphicsMode:2,sequencerMapMask:15,
 fidelity:'ORIGINAL_CPU_WRITE_MODE2_VGA_PLANES_ONLY__NO_BIOS_OR_FRAME_PARITY'
});
const masks=make();mode(masks,1);
masks.observeNativeByte({physical:0xa0000,value:1});
assert.equal(masks.readPixelIndex(0,0),null);
masks.noteIndexedRegister({device:'sequencer',index:2,value:14});
masks.observeNativeByte({physical:0xa0000,value:14});
assert.equal(masks.readPixelIndex(0,0),15);
assert.equal(masks.getState().fullyCoveredBytes,1);
const rejected=make();mode(rejected);
rejected.noteIndexedRegister({device:'graphics-controller',index:8,value:0x7f});
assert.throws(()=>rejected.observeNativeByte({physical:0xa0000,value:1}),/exact observed/);
assert.equal(rejected.readPixelIndex(0,0),null);
const budget=createOriginalVgaMode12PlaneWitness({maxObservedWrites:1});mode(budget);
budget.observeNativeByte({physical:0xa0000,value:0});
assert.throws(()=>budget.observeNativeByte({physical:0xa0001,value:0}),/budget exceeded/);
const frame=make();mode(frame);
for(let off=0;off<38400;off++)
 frame.observeNativeByte({physical:0xa0000+off,value:off===0?0xf:0});
const pixels=frame.captureCompleteIndexedFrame();
assert.equal(pixels.length,640*480);
assert.deepEqual(pixels.slice(0,9),Uint8Array.of(15,15,15,15,15,15,15,15,0));
assert.equal(pixels[640*479+639],0);
assert.equal(frame.getState().fullyCoveredBytes,38400);
assert.throws(()=>frame.readPixelIndex(640,0),/outside 640x480/);
assert.throws(()=>frame.readPixelIndex(0,480),/outside 640x480/);
console.log('UW2 original VGA write-mode2 exact 4-plane 640x480 bitplane color/witness coverage contract: PASS');
