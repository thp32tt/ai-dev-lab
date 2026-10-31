import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
import {installVgaMode12ReadPlaneAdapter} from '../web/vga-mode12-read-adapter.js';
const w=createOriginalVgaMode12PlaneWitness({maxObservedWrites:20});
const reg=(device,index,value)=>w.noteIndexedRegister({device,index,value});
for(const [index,value] of [[0,0],[1,0],[2,5],[3,0],[4,0],[5,0],[6,5],[7,15],[8,255]])
 reg('graphics-controller',index,value);
reg('sequencer',2,15);
const addr=0xa0000;
const samples=[0xaa,0xcc,0xf0,0x0f];
for(let p=0;p<4;p++){
 reg('sequencer',2,1<<p);
 w.observeNativeByte({physical:addr,value:samples[p]});
}
reg('sequencer',2,15);
assert.equal(w.getState().fullyCoveredBytes,1);
assert.equal(w.readSelectedPlaneByte(addr),0xaa);
reg('graphics-controller',5,8);
assert.equal(w.readSelectedPlaneByte(addr),0x20); // 0101 compare all planes
reg('graphics-controller',7,1);
assert.equal(w.readSelectedPlaneByte(addr),0xaa); // only plane 0 matters
reg('graphics-controller',7,15);
reg('graphics-controller',2,0);
assert.equal(w.readSelectedPlaneByte(addr),~(0xaa|0xcc|0xf0|0x0f)&255);
reg('graphics-controller',2,5);
reg('graphics-controller',5,1);
w.observeNativeByte({physical:addr+1,value:0}); // mode 1 copies all 4 read latches
reg('graphics-controller',5,8);
assert.equal(w.readSelectedPlaneByte(addr+1),0x20);
assert.equal(w.getState().mode1Writes,1);
reg('graphics-controller',5,0);
reg('graphics-controller',4,3);
assert.equal(w.readSelectedPlaneByte(addr+1),0x0f);
// The full 64-KiB addressable plane is valid memory. Off-screen 0x9600
// bytes must NOT be called visible video pixels or counted as frame coverage.
reg('graphics-controller',5,2);
w.observeNativeByte({physical:0xa9600,value:5});
assert.equal(w.getState().visibleWrites,5);
assert.equal(w.getState().fullyCoveredBytes,2);
reg('graphics-controller',4,2);
assert.equal(w.readSelectedPlaneByte(0xa9600),255);
reg('graphics-controller',4,1);
assert.equal(w.readSelectedPlaneByte(0xa9600),0);
assert.equal(w.readPixelIndex(16,0),null);
assert.throws(()=>w.readSelectedPlaneByte(0xb0000),/outside A0000/);
// Bitmask/ROP uses last read latches, not destination VRAM or linear RAM.
reg('graphics-controller',5,0);
reg('graphics-controller',4,0);
w.readSelectedPlaneByte(addr); // load AA/CC/F0/0F latches again
reg('sequencer',2,1);
reg('graphics-controller',8,0x0f);
w.observeNativeByte({physical:addr+2,value:0xf0}); // mask only low 4 bits
assert.equal(w.readPixelIndex(16,0),null); // other three planes still unknown
assert.equal(w.readSelectedPlaneByte(addr+2),0xa0);
reg('graphics-controller',3,0x08); // AND with prior latch
reg('graphics-controller',8,255);
w.observeNativeByte({physical:addr+3,value:0x3f});
assert.equal(w.readSelectedPlaneByte(addr+3),0x20); // 3F & A0
reg('graphics-controller',3,0);
reg('graphics-controller',8,255);
// The 8086 device provider routes native reads through both VGA read modes.
const cpu=new RealMode8086(),cpuW=createOriginalVgaMode12PlaneWitness();
const wr=(device,index,value)=>cpuW.noteIndexedRegister({device,index,value});
for(const [index,value] of [[2,1],[3,0],[4,0],[5,2],[6,5],[7,1],[8,255]])
 wr('graphics-controller',index,value);
wr('sequencer',2,15);
cpuW.observeNativeByte({physical:0xa0000,value:1});
installVgaMode12ReadPlaneAdapter(cpu,cpuW);
wr('graphics-controller',5,10); // read mode1 with write mode2
cpu.load(Uint8Array.of(0xa0,0,0),0x100,0);
cpu.set16('CS',0x100);cpu.set16('DS',0xa000);
cpu.step();
assert.equal(cpu.get8('AL'),255);
const missing=createOriginalVgaMode12PlaneWitness();
for(const [index,value] of [[0,0],[1,0],[3,0],[4,0],[5,0],[6,5],[8,0x0f]])
 missing.noteIndexedRegister({device:'graphics-controller',index,value});
missing.noteIndexedRegister({device:'sequencer',index:2,value:1});
assert.throws(()=>missing.observeNativeByte({physical:0xa0000,value:1}),/latch plane/);
assert.equal(missing.getState().observedWrites,0);
missing.noteIndexedRegister({device:'graphics-controller',index:8,value:255});
missing.observeNativeByte({physical:0xa0000,value:0x55});
assert.equal(missing.readSelectedPlaneByte(0xa0000),0x55);
missing.noteIndexedRegister({device:'graphics-controller',index:5,value:1});
missing.noteIndexedRegister({device:'sequencer',index:2,value:2});
assert.throws(()=>missing.observeNativeByte({physical:0xa0001,value:0}),/verified latch/);
assert.equal(missing.getState().observedWrites,1);
missing.invalidateAfterBiosModeSet({mode:0x12});
assert.equal(missing.getState().configKnown,false);
assert.throws(()=>missing.readSelectedPlaneByte(0xa0000),/GC05/);
console.log('UW2 VGA 64KiB planar, read-mode1 comparisons, read-latch write modes 0/1/2: PASS (synthetic)');
