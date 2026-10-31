import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installOriginalVgaAttributeController} from '../web/vga-attribute-ports.js';
import {installVgaDacWriteRecorder} from '../web/vga-dac-ports.js';
import {createOriginalVgaMode12PlaneWitness} from '../web/vga-mode12-planar-witness.js';
import {captureGroundedVgaMode12Rgb6Rect} from '../web/vga-rgb6-evidence.js';
const cpu=new RealMode8086();
const writes=[];
const attr=installOriginalVgaAttributeController(cpu,{
 allowKnownReadback:true,maxWrites:32,maxReads:4,onRegisterWrite:e=>{writes.push(e);}
});
const dac=installVgaDacWriteRecorder(cpu,{onColor:()=>{},allowKnownReadback:true});
assert.throws(()=>cpu.writeIOPort(0x3c0,8,0x10),/flip-flop unknown/);
assert.throws(()=>attr.noteInputStatusRead(0x123),/3BAh\/3DAh/);
// Status register is external: the real 8086 IN notifies the 3C0 flip-flop
// while returning a separately supplied, explicitly synthetic status byte.
cpu.registerIOPort(0x3da,{in8:()=>{attr.noteInputStatusRead(0x3da);return 8;}});
cpu.set16('DX',0x3da);
cpu.load(Uint8Array.of(0xec),0x200,0);cpu.set16('CS',0x200);
cpu.step();
assert.equal(cpu.get8('AL'),8);
assert.equal(attr.getState().phase,'index');
const set=(index,value)=>{
 cpu.readIOPort(0x3da,8);
 cpu.writeIOPort(0x3c0,8,index);
 cpu.writeIOPort(0x3c0,8,value);
};
set(0x10,0x01);  // planar graphics mode, palette P4/P5 from entries
set(0x12,15);
set(0x14,0);
set(5,0x12);    // pixel 5 -> DAC palette 0x12
set(10,0x21);   // pixel 10 -> DAC palette 0x21
cpu.readIOPort(0x3da,8);
cpu.writeIOPort(0x3c0,8,0x20|5); // normal display enable, select slot5
assert.equal(attr.getGroundedDacIndex(5),0x12);
assert.equal(attr.getGroundedDacIndex(10),0x21);
assert.equal(cpu.readIOPort(0x3c1,8),0x12);
assert.equal(cpu.readIOPort(0x3c1,8),0x12); // 3C1 read must not toggle
assert.equal(attr.getState().phase,'data');
assert.equal(writes.length,5);
assert.equal(attr.writtenCount(),5);
assert.throws(()=>attr.getGroundedDacIndex(16),/uint4/);
assert.throws(()=>attr.getGroundedDacIndex(0),/not witnessed/);
cpu.readIOPort(0x3da,8);
cpu.writeIOPort(0x3c0,8,0x35); // 0x15 reserved index, display bit5 set
assert.throws(()=>cpu.writeIOPort(0x3c0,8,10),/reserved index/);
assert.equal(attr.writtenCount(),5);
cpu.readIOPort(0x3da,8);
cpu.writeIOPort(0x3c0,8,0x25);
assert.equal(cpu.readIOPort(0x3c1,8),0x12);
assert.equal(cpu.readIOPort(0x3c1,8),0x12);
assert.throws(()=>cpu.readIOPort(0x3c1,8),/budget exhausted/);
const writeDac=(index,red,green,blue)=>{
 cpu.writeIOPort(0x3c8,8,index);
 for(const n of [red,green,blue])cpu.writeIOPort(0x3c9,8,n);
};
writeDac(0x12,63,0,20);
writeDac(0x21,0,31,63);
assert.deepEqual(dac.sampleKnownColor6(0x12),{red:63,green:0,blue:20});
assert.throws(()=>dac.sampleKnownColor6(0x13),/observed/);
assert.equal(dac.knownReadCount(),0);
const planes=createOriginalVgaMode12PlaneWitness({maxObservedWrites:3});
for(const [index,value] of [[3,0],[5,2],[6,5],[8,255]])
 planes.noteIndexedRegister({device:'graphics-controller',index,value});
planes.noteIndexedRegister({device:'sequencer',index:2,value:15});
planes.observeNativeByte({physical:0xa0000,value:5});
planes.observeNativeByte({physical:0xa0001,value:10});
const result=captureGroundedVgaMode12Rgb6Rect(planes,attr,dac,{
 x:0,y:0,width:16,height:1
});
assert.equal(result.componentBits,6);
assert.deepEqual([...result.pixels.slice(0,6)],[63,0,20,63,0,20]);
assert.deepEqual([...result.pixels.slice(24,30)],[0,31,63,0,31,63]);
result.pixels.fill(0);
assert.equal(dac.sampleKnownColor6(0x12).red,63);
assert.equal(planes.readPixelIndex(0,0),5);
assert.throws(()=>captureGroundedVgaMode12Rgb6Rect(planes,attr,dac,{
 x:16,y:0,width:8,height:1}),/unverified/);
// P4/P5 override: replace the palette middle bits with Color Select 1:0;
// Color Select 3:2 always supplies DAC upper bits.
set(0x10,0x81);set(0x14,0x0d); // 0D=> DAC bits 7:6=11, P5:P4=01
cpu.readIOPort(0x3da,8);cpu.writeIOPort(0x3c0,8,0x25);
assert.equal(attr.getGroundedDacIndex(5),0xd2);
assert.equal(attr.getGroundedDacIndex(10),0xd1);
assert.throws(()=>captureGroundedVgaMode12Rgb6Rect(planes,attr,dac,{
 x:0,y:0,width:8,height:1}),/observed/);
cpu.readIOPort(0x3da,8);cpu.writeIOPort(0x3c0,8,5);
assert.throws(()=>attr.getGroundedDacIndex(5),/display enable/);
const untouched=new RealMode8086();
const unknown=installOriginalVgaAttributeController(untouched);
assert.throws(()=>unknown.getGroundedDacIndex(5),/display enable/);
assert.throws(()=>untouched.readIOPort(0x3c1,8),/opt-in/);
assert.throws(()=>installOriginalVgaAttributeController(untouched),/already owned/);
// No stale palette/display state after an externally accepted BIOS AH00.
attr.invalidateAfterBiosModeSet({mode:0x12});
dac.invalidateAfterBiosModeSet({mode:0x12});
assert.throws(()=>attr.getGroundedDacIndex(5),/display enable/);
assert.throws(()=>dac.sampleKnownColor6(0x12),/observed/);
assert.throws(()=>cpu.writeIOPort(0x3c0,8,5),/flip-flop unknown/);
assert.throws(()=>cpu.readIOPort(0x3c1,8),/witnessed register/);
assert.throws(()=>attr.invalidateAfterBiosModeSet({mode:-1}),/uint8/);
assert.throws(()=>dac.invalidateAfterBiosModeSet({mode:256}),/uint8/);
set(0x10,1);set(0x12,15);set(0x14,0);set(5,0x12);
cpu.readIOPort(0x3da,8);cpu.writeIOPort(0x3c0,8,0x25);
writeDac(0x12,4,8,12);
assert.deepEqual(dac.sampleKnownColor6(attr.getGroundedDacIndex(5)),{
 red:4,green:8,blue:12
});
console.log('UW2 witnessed 8086 3C0 flip-flop, attribute-to-DAC Mode12 palette and original RGB6 rectangular evidence: PASS (synthetic)');
