import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
import {installVgaMode12ReadPlaneAdapter} from '../web/vga-mode12-read-adapter.js';

const make=()=>createOriginalVgaMode12PlaneWitness({maxObservedWrites:100});
const gc=(w,index,value)=>w.noteIndexedRegister({device:'graphics-controller',index,value});
const seq=(w,index,value)=>w.noteIndexedRegister({device:'sequencer',index,value});
const configure=w=>{
  for(const [i,v] of [[0,0],[1,0],[2,10],[3,0],[4,0],[5,2],[6,5],[7,15],[8,255]])
    gc(w,i,v);
  seq(w,2,15);
};
const w=make();
configure(w);
// GC05 bit 3 selects read compare independently of write mode bits 1:0.
gc(w,5,0x0a); // read mode1, write mode2
assert.equal(w.getState().configKnown,true);
w.observeNativeByte({physical:0xa0000,value:10});
w.observeNativeByte({physical:0xa0001,value:5});
assert.equal(w.readSelectedPlaneByte(0xa0000),255);
assert.equal(w.readSelectedPlaneByte(0xa0001),0);
gc(w,5,0x08); // read mode1, write mode0
assert.equal(w.getState().configKnown,true);
w.observeNativeByte({physical:0xa0002,value:0xa5}); // all 4 planes a5
gc(w,5,0);
for(let p=0;p<4;p++){
  gc(w,4,p);
  assert.equal(w.readSelectedPlaneByte(0xa0002),0xa5);
}
gc(w,5,0x09); // read mode1 + write mode1
assert.equal(w.getState().configKnown,true);
w.observeNativeByte({physical:0xa0003,value:0}); // copy the A5 latches
gc(w,5,0);
assert.equal(w.readSelectedPlaneByte(0xa0003),0xa5);
// Mode3: CPU byte is rotated and ANDed with GC08 to form a write mask;
// GC00 determines color on all four planes (ignores GC01).
const m=make();configure(m);
m.observeNativeByte({physical:0xa0000,value:5}); // FF 00 FF 00
gc(m,4,0);
m.readSelectedPlaneByte(0xa0000); // latch all source planes
gc(m,0,0x0a);
gc(m,1,0); // mode3 always uses GC00
gc(m,8,0xf0);
gc(m,5,3);
m.observeNativeByte({physical:0xa0001,value:0xac}); // effective 0xA0
const dest=0xa0001;
for(const [p,v] of [[0,0x5f],[1,0xa0],[2,0x5f],[3,0xa0]]){
 gc(m,4,p);
 assert.equal(m.readSelectedPlaneByte(dest),v);
}
assert.equal(m.getState().mode3Writes,1);
// Rotate right by one: 81h -> C0h, mask F0h -> C0h.
// Reload verified source latches to avoid self-copying the destination.
gc(m,4,0);m.readSelectedPlaneByte(0xa0000);
gc(m,3,1);
m.observeNativeByte({physical:0xa0002,value:0x81});
gc(m,4,0);assert.equal(m.readSelectedPlaneByte(0xa0002),0x3f);
gc(m,4,1);assert.equal(m.readSelectedPlaneByte(0xa0002),0xc0);
assert.equal(m.readPixelIndex(8,0),10); // first dest pixel is color 10
// All-byte mode3 color write does not require a previously loaded latch.
const fill=make();configure(fill);
gc(fill,0,0x06);gc(fill,5,3);
fill.observeNativeByte({physical:0xa0000,value:255});
assert.equal(fill.readPixelIndex(0,0),6);
assert.equal(fill.getState().fullyCoveredBytes,1);
// A masked write with unobserved latches must remain entirely uncommitted.
const noLatches=make();configure(noLatches);
gc(noLatches,0,0xf);gc(noLatches,5,3);gc(noLatches,8,0x7f);
assert.throws(()=>noLatches.observeNativeByte({physical:0xa0000,value:255}),/verified latch/);
assert.equal(noLatches.getState().observedWrites,0);
assert.equal(noLatches.readPixelIndex(0,0),null);
for(const bad of [0x13,0x22,0x14,0x43,0x83]){
 gc(noLatches,5,bad);
 assert.equal(noLatches.getState().configKnown,false);
 assert.throws(()=>noLatches.observeNativeByte({physical:0xa0000,value:255}),/GC06 graphics A000/);
}
// Integration: original 8086 REP MOVSB with both DS and ES at VGA A000.
// Each native source read refreshes all four latches; write mode1 copies
// them to a *different* VRAM address, independent of guest RAM shadows.
const cpu=new RealMode8086();
const native=make();configure(native);
native.observeNativeByte({physical:0xa0100,value:5});
native.observeNativeByte({physical:0xa0101,value:10});
gc(native,5,1);gc(native,4,0);seq(native,2,15);
installVgaMode12ReadPlaneAdapter(cpu,native);
cpu.installMemoryWriteObserver(e=>{
 if(e.physical>=0xa0000&&e.physical<0xb0000)native.observeNativeByte(e);
});
cpu.load(Uint8Array.of(0xf3,0xa4),0x0200,0);
cpu.set16('CS',0x0200);
cpu.set16('DS',0xa000);cpu.set16('ES',0xa000);
cpu.set16('SI',0x0100);cpu.set16('DI',0x0120);cpu.set16('CX',2);
cpu.step();
assert.equal(cpu.get16('CX'),0);
assert.equal(cpu.get16('SI'),0x0102);
assert.equal(cpu.get16('DI'),0x0122);
for(const [p,v] of [[0,0],[1,255],[2,0],[3,255]]){
 gc(native,4,p);
 assert.equal(native.readSelectedPlaneByte(0xa0121),v);
}
assert.equal(native.getState().mode1Writes,2);
assert.equal(cpu.memory[0xa0120],255); // CPU-visible byte != 4-plane color
assert.equal(native.readPixelIndex(0,0),null); // offscreen VRAM is not a frame
console.log('UW2 native VGA independent GC05 modes, write mode3, and 8086 REP MOVSB latch copy: PASS (synthetic)');
