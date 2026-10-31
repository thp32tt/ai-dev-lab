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
assert.throws(()=>cpu.read8(0xa000,0),/read-mode0/);
reg('graphics-controller',5,0);
reg('graphics-controller',6,0x0c); // B8000 map, not A000
assert.throws(()=>cpu.read8(0xa000,0),/A000 aperture/);
reg('graphics-controller',6,5);
reg('graphics-controller',4,4);
assert.throws(()=>cpu.read8(0xa000,0),/GC04/);
reg('graphics-controller',4,0);
assert.throws(()=>cpu.read8(0xa000,0x9600),/outside witnessed visible/);
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
console.log('UW2 original VGA selected read plane CPU A000 mapping and strict unverified-mode rejection: PASS (synthetic)');
