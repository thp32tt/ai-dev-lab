import assert from 'node:assert/strict';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
const make=()=>createOriginalVgaMode12PlaneWitness({maxObservedWrites:50000});
const mode=(w,mask=15)=>{
  for(const [device,index,value] of [
    ['graphics-controller',3,0],['graphics-controller',5,2],
    ['graphics-controller',6,5],['graphics-controller',8,255],['sequencer',2,mask]
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
 visibleWrites:2,fullyCoveredBytes:2,mode0Writes:0,mode1Writes:0,mode2Writes:2,mode3Writes:0,visibleBytes:38400,planeBytes:65536,configKnown:true,
 graphicsMode:2,sequencerMapMask:15,
 fidelity:'VGA_PLANAR_64K_WRITE0123_READ01_LATCHES__SYNTHETIC_DOS_UNTESTED'
});
const masks=make();mode(masks,1);
masks.observeNativeByte({physical:0xa0000,value:1});
assert.equal(masks.readPixelIndex(0,0),null);
masks.noteIndexedRegister({device:'sequencer',index:2,value:14});
masks.observeNativeByte({physical:0xa0000,value:14});
assert.equal(masks.readPixelIndex(0,0),15);
assert.equal(masks.getState().fullyCoveredBytes,1);
// CPU address A0000h can only populate planar pixels while GC06 actually
// maps that aperture in non-chained graphics mode. These changes must not
// silently turn ordinary guest RAM writes into "original screen" evidence.
const aperture=make();
mode(aperture);
for(const [registerValue,label] of [
  [0x0d,'B800 map'],[0x09,'B000 map'],[0x04,'text mode'],
  [0x07,'odd/even addressing']
]){
  aperture.noteIndexedRegister({device:'graphics-controller',index:6,value:registerValue});
  assert.equal(aperture.getState().configKnown,false,label);
  assert.throws(()=>aperture.observeNativeByte({physical:0xa0000,value:15}),/GC06 graphics A000/,label);
  assert.equal(aperture.getState().observedWrites,0,label);
  assert.equal(aperture.readPixelIndex(0,0),null,label);
}
aperture.noteIndexedRegister({device:'graphics-controller',index:6,value:1});
assert.equal(aperture.getState().configKnown,true);
aperture.observeNativeByte({physical:0xa0000,value:9});
assert.equal(aperture.readPixelIndex(0,0),9);
aperture.noteIndexedRegister({device:'graphics-controller',index:6,value:5});
aperture.observeNativeByte({physical:0xa0001,value:6});
assert.equal(aperture.readPixelIndex(8,0),6);
const noGc6=make();
for(const [device,index,value] of [
  ['graphics-controller',3,0],['graphics-controller',5,2],
  ['graphics-controller',8,255],['sequencer',2,15]
])noGc6.noteIndexedRegister({device,index,value});
assert.throws(()=>noGc6.observeNativeByte({physical:0xa0000,value:7}),/GC06 graphics A000/);
const rejected=make();mode(rejected);
rejected.noteIndexedRegister({device:'graphics-controller',index:8,value:0x7f});
assert.throws(()=>rejected.observeNativeByte({physical:0xa0000,value:1}),/verified latch/);
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
const mode0=make();mode(mode0,15);
mode0.observeNativeByte({physical:0xa0000,value:0});
mode0.noteIndexedRegister({device:'graphics-controller',index:1,value:0});
mode0.noteIndexedRegister({device:'graphics-controller',index:5,value:0});
mode0.noteIndexedRegister({device:'sequencer',index:2,value:1});
mode0.observeNativeByte({physical:0xa0000,value:0x80});
assert.equal(mode0.readPixelIndex(0,0),1);
assert.equal(mode0.readPixelIndex(1,0),0);
assert.equal(mode0.getState().mode0Writes,1);
assert.equal(mode0.getState().mode2Writes,1);
const unknownMode0=make();mode(unknownMode0);
unknownMode0.noteIndexedRegister({device:'graphics-controller',index:5,value:0});
assert.throws(()=>unknownMode0.observeNativeByte({physical:0xa0000,value:0x80}),/requires exact observed/);
unknownMode0.noteIndexedRegister({device:'graphics-controller',index:1,value:1});
assert.throws(()=>unknownMode0.observeNativeByte({physical:0xa0000,value:0x80}),/requires exact observed/);
const literal=make();mode(literal);
literal.noteIndexedRegister({device:'graphics-controller',index:1,value:0});
literal.noteIndexedRegister({device:'graphics-controller',index:5,value:0});
literal.noteIndexedRegister({device:'sequencer',index:2,value:1});
literal.observeNativeByte({physical:0xa0000,value:0xff});
assert.equal(literal.readPixelIndex(0,0),null); // planes 1..3 never initialized
assert.throws(()=>frame.readPixelIndex(640,0),/outside 640x480/);
assert.throws(()=>frame.readPixelIndex(0,480),/outside 640x480/);

const crop=createOriginalVgaMode12PlaneWitness({maxObservedWrites:5});
mode(crop);
assert.throws(()=>crop.captureGroundedIndexedRect(0,0,8,1),/unverified original plane byte/);
crop.observeNativeByte({physical:0xa0000,value:5});
assert.deepEqual(crop.captureGroundedIndexedRect(2,0,4,1),Uint8Array.of(5,5,5,5));
assert.throws(()=>crop.captureGroundedIndexedRect(7,0,2,1),/unverified original plane byte/);
crop.observeNativeByte({physical:0xa0001,value:10});
assert.deepEqual(crop.captureGroundedIndexedRect(6,0,4,1),
  Uint8Array.of(5,5,10,10));
const output=crop.captureGroundedIndexedRect(0,0,8,1);
output.fill(0);
assert.equal(crop.readPixelIndex(0,0),5); // no mutable witness-plane leak
assert.throws(()=>crop.captureGroundedIndexedRect(639,0,2,1),/outside 640x480/);
assert.throws(()=>crop.captureGroundedIndexedRect(0,479,1,2),/outside 640x480/);
assert.throws(()=>crop.captureGroundedIndexedRect(0.5,0,1,1),/outside 640x480/);
assert.throws(()=>crop.captureGroundedIndexedRect(0,0,0,1),/outside 640x480/);
assert.throws(()=>crop.captureGroundedIndexedRect(0,0,8,2),/unverified original plane byte/);


const mapped=make();
mode(mapped); // witnessed graphics GC06=05: only A000-AFFFF
assert.equal(mapped.classifyPhysicalAperture(0xa0000),'GROUNDED_A000');
assert.equal(mapped.classifyPhysicalAperture(0xb0000),'NOT_MAPPED');
mapped.noteIndexedRegister({device:'graphics-controller',index:6,value:1});
assert.equal(mapped.classifyPhysicalAperture(0xb0000),'UNSUPPORTED_MAPPED_APERTURE');
assert.equal(mapped.classifyPhysicalAperture(0xbffff),'UNSUPPORTED_MAPPED_APERTURE');
assert.throws(()=>mapped.observeNativeByte({physical:0xb0000,value:1}),/unsupported mapped VGA aperture/);
assert.equal(mapped.getState().observedWrites,0);
mapped.noteIndexedRegister({device:'graphics-controller',index:6,value:0x0d});
assert.equal(mapped.classifyPhysicalAperture(0xb8000),'UNSUPPORTED_MAPPED_APERTURE');
assert.equal(mapped.classifyPhysicalAperture(0xb0000),'NOT_MAPPED');
assert.equal(mapped.classifyPhysicalAperture(0xa0000),'NOT_MAPPED');
mapped.noteIndexedRegister({device:'graphics-controller',index:6,value:0x09});
assert.equal(mapped.classifyPhysicalAperture(0xb7fff),'UNSUPPORTED_MAPPED_APERTURE');
assert.equal(mapped.classifyPhysicalAperture(0xb8000),'NOT_MAPPED');
console.log('UW2 original VGA write-mode2 exact 4-plane 640x480 bitplane color/witness coverage contract: PASS');
