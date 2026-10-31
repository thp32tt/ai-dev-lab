import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
import {installVgaMode12ReadPlaneAdapter} from '../web/vga-mode12-read-adapter.js';

const cpu=new RealMode8086();
const witness=createOriginalVgaMode12PlaneWitness({maxObservedWrites:10});
const reg=(device,index,value)=>witness.noteIndexedRegister({device,index,value});
for(const [i,v] of [[1,0],[3,0],[5,0],[6,5],[8,255]])
  reg('graphics-controller',i,v);
for(let plane=0;plane<4;plane++){
  reg('sequencer',2,1<<plane);
  witness.observeNativeByte({physical:0xa0000,value:0x11<<plane});
}
assert.equal(witness.getState().fullyCoveredBytes,1);
assert.equal(cpu.memory[0xa0000],0); // guest linear memory is not a plane
reg('graphics-controller',4,0);
const reader=installVgaMode12ReadPlaneAdapter(cpu,witness,{maxReads:7});
for(let p=0;p<4;p++){
  reg('graphics-controller',4,p);
  assert.equal(cpu.read8(0xa000,0),0x11<<p);
}
assert.equal(reader.readCount(),4);
assert.equal(cpu.read8(0x2000,0),0); // normal guest RAM read
assert.equal(reader.readCount(),4);
reg('graphics-controller',4,2);
cpu.load(Uint8Array.of(0xa0,0x00,0x00),0x100,0); // native MOV AL,[0000h]
cpu.set16('CS',0x100);
cpu.set16('DS',0xa000);
cpu.step();
assert.equal(cpu.get8('AL'),0x44);
assert.equal(reader.readCount(),5);
assert.throws(()=>cpu.read8(0xa000,1),/unverified/);
assert.equal(reader.readCount(),5); // only successful original reads count
reg('graphics-controller',5,8); // read mode 1 requires latch/compare modeling
assert.throws(()=>cpu.read8(0xa000,0),/GC02\/GC07/);
reg('graphics-controller',5,0);
reg('graphics-controller',6,0x0c); // B8000 map, not A000
assert.throws(()=>cpu.read8(0xa000,0),/A000 aperture/);
reg('graphics-controller',6,0x08); // B0000 map, not A000
assert.throws(()=>cpu.read8(0xa000,0),/A000 aperture/);
reg('graphics-controller',6,0x04); // text mode, A000 map bits alone insufficient
assert.throws(()=>cpu.read8(0xa000,0),/A000 aperture/);
reg('graphics-controller',6,0x07); // odd/even chain is not planar-mode12
assert.throws(()=>cpu.read8(0xa000,0),/A000 aperture/);
reg('graphics-controller',6,5);
reg('graphics-controller',4,4);
assert.throws(()=>cpu.read8(0xa000,0),/GC04/);
reg('graphics-controller',4,0);
assert.throws(()=>cpu.read8(0xa000,0x9600),/unverified/);
assert.equal(reader.readCount(),5);
assert.equal(cpu.read8(0xa000,0),0x11);
assert.equal(cpu.read8(0xa000,0),0x11);
assert.equal(reader.readCount(),7);
assert.throws(()=>cpu.read8(0xa000,0),/read budget exhausted/);
assert.throws(()=>cpu.installMemoryReadProvider(()=>0),/single synchronous/);
cpu.removeMemoryReadProvider();
assert.equal(cpu.read8(0xa000,0),0); // no silent device-plane response after detach
assert.equal(reader.readCount(),7);

const separate=new RealMode8086();
separate.installMemoryReadProvider(()=>Promise.resolve(1));
assert.throws(()=>separate.read8(0x100,0),/async 8086 memory-read provider/);
separate.removeMemoryReadProvider();
separate.installMemoryReadProvider(()=>256);
assert.throws(()=>separate.read8(0x100,0),/uint8 or undefined/);
separate.removeMemoryReadProvider();
separate.installMemoryReadProvider(()=>undefined);
assert.equal(separate.read8(0x100,0),0);
assert.throws(()=>installVgaMode12ReadPlaneAdapter(new RealMode8086(),null),/evidence witness/);
assert.throws(()=>installVgaMode12ReadPlaneAdapter(new RealMode8086(),witness,{maxReads:0}),/budget/);
// Native 8086 MOV [moffs8],AL must expand VGA write-mode-2 bits into
// physical planes; MOV AL,[moffs8] must return GC04's selected plane,
// rather than the source 05h byte stored in linear guest RAM.
const native=new RealMode8086();
const nativePlanes=createOriginalVgaMode12PlaneWitness();
const writeReg=(device,index,value)=>nativePlanes.noteIndexedRegister({device,index,value});
for(const [i,v] of [[3,0],[5,2],[6,5],[8,255],[4,0]])
  writeReg('graphics-controller',i,v);
writeReg('sequencer',2,15);
native.load(Uint8Array.of(
  0xb0,5,          // MOV AL,05h
  0xa2,0,0,        // MOV [0000h],AL -> mode2 plane0=FF, plane1=00
  0xb0,0,          // MOV AL,00h
  0xa0,0,0         // MOV AL,[0000h] -> plane0, FFh
),0x100,0);
native.set16('CS',0x100);
native.set16('DS',0xa000);
native.installMemoryWriteObserver(event=>{
  if(event.physical>=0xa0000&&event.physical<0xb0000)
    nativePlanes.observeNativeByte(event);
});
installVgaMode12ReadPlaneAdapter(native,nativePlanes);
native.step();native.step();native.step();native.step();
assert.equal(native.memory[0xa0000],5);
assert.equal(native.get8('AL'),255);
assert.equal(nativePlanes.readPixelIndex(0,0),5);
writeReg('graphics-controller',4,1);
assert.equal(native.read8(0xa000,0),0);
writeReg('graphics-controller',4,2);
assert.equal(native.read8(0xa000,0),255);

// A BIOS mode change invalidates the old plane and old configuration.
// No implicitly cleared-to-zero pixels; the caller must witness all four
// planes under newly observed configuration before sampling again.
import {installBiosInt10} from '../web/bios-int10.js';
installBiosInt10(native,{setMode:({mode})=>nativePlanes.invalidateAfterBiosModeSet({mode})});
native.set16('AX',0x0012);
native.dispatchInterrupt(0x10);
assert.equal(nativePlanes.readPixelIndex(0,0),null);
assert.throws(()=>native.read8(0xa000,0),/GC05 planar mode/);
assert.throws(()=>nativePlanes.captureGroundedIndexedRect(0,0,1,1),/unverified/);
for(const [i,v] of [[1,0],[3,0],[5,2],[6,5],[8,255],[4,0]])
  writeReg('graphics-controller',i,v);
writeReg('sequencer',2,15);
nativePlanes.observeNativeByte({physical:0xa0000,value:10});
assert.equal(nativePlanes.readPixelIndex(0,0),10);
assert.equal(native.read8(0xa000,0),0);
assert.equal(nativePlanes.getState().fullyCoveredBytes,1);
assert.throws(()=>nativePlanes.invalidateAfterBiosModeSet({mode:-1}),/video mode byte/);
console.log('UW2 original VGA selected read plane, 8086 MOV write-read and BIOS mode-epoch discard: PASS (synthetic)');
