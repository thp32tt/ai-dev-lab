import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// 8086 default must not silently interpret instructions that require 80186.
for(const instruction of [
  [0x60],[0x61],[0x68,0,0],[0x6a,0],
  [0x69,0xc0,0,0],[0x6b,0xc0,0],[0xc8,0,0,0],[0xc9]
]){
 const cpu=new RealMode8086();
 cpu.set16('SS',0x500);cpu.set16('SP',0x100);
 cpu.load(Uint8Array.from(instruction),0,0);
 assert.throws(()=>cpu.step(),/80186.*explicit capability: fail closed/);
 assert.equal(cpu.get16('SP'),0x100);
}
assert.throws(()=>new RealMode8086(undefined,{enable80186Instructions:1}),/capability must be boolean/);
const cpu=new RealMode8086(undefined,{enable80186Instructions:true});
cpu.set16('SS',0x500);cpu.set16('SP',0x100);
for(const [name,value] of Object.entries({
 AX:0x1111,CX:0x2222,DX:0x3333,BX:0x4444,
 BP:0x5555,SI:0x6666,DI:0x7777
}))cpu.set16(name,value);
cpu.set16('FLAGS',0x8d7);
cpu.load(Uint8Array.of(0x60,0x61),0,0);
cpu.step();
assert.equal(cpu.get16('SP'),0xf0);
const expected=[0x1111,0x2222,0x3333,0x4444,0x100,0x5555,0x6666,0x7777];
for(let i=0;i<8;i++)
 assert.equal(cpu.read16(0x500,0xfe-2*i),expected[i]);
// The stack-saved SP is ignored by POPA, not loaded as a GP register.
cpu.write16(0x500,0xf6,0xffff);
cpu.step();
assert.equal(cpu.get16('SP'),0x100);
for(const [name,value] of Object.entries({
 AX:0x1111,CX:0x2222,DX:0x3333,BX:0x4444,
 BP:0x5555,SI:0x6666,DI:0x7777
}))assert.equal(cpu.get16(name),value);
assert.equal(cpu.get16('FLAGS'),0x8d7);

const imm=new RealMode8086(undefined,{enable80186Instructions:true});
imm.set16('SS',0x600);imm.set16('SP',0x200);
imm.load(Uint8Array.of(0x68,0x34,0x12,0x6a,0x80,0x6a,0x7f),0,0);
imm.runSteps(3);
assert.equal(imm.get16('SP'),0x1fa);
assert.equal(imm.pop16(),0x007f);
assert.equal(imm.pop16(),0xff80);
assert.equal(imm.pop16(),0x1234);
assert.equal(imm.get16('SP'),0x200);

const mul=new RealMode8086(undefined,{enable80186Instructions:true});
mul.set16('DS',0x700);mul.set16('BX',7);
mul.set16('FLAGS',0x2d7);
mul.load(Uint8Array.of(
  0x6b,0xc3,0xfb,               // IMUL AX,BX,-5 => -35, fits
  0x69,0x0e,0x20,0x00,0x02,0x00, // IMUL CX,[0020h],2 => overflow
  0x69,0xd3,0x00,0x00,         // IMUL DX,BX,0 => 0
  0x6b,0xc3,0x00),0,0);         // IMUL AX,BX,0, no overflow
mul.write16(0x700,0x20,0x7fff);
mul.step();
assert.equal(mul.get16('AX'),0xffdd);
assert.equal(mul.flag('CF'),false);assert.equal(mul.flag('OF'),false);
assert.equal(mul.flag('ZF'),true); // undefined ZF retained
mul.step();
assert.equal(mul.get16('CX'),0xfffe);
assert.equal(mul.flag('CF'),true);assert.equal(mul.flag('OF'),true);
mul.step();assert.equal(mul.get16('DX'),0);
assert.equal(mul.flag('CF'),false);
mul.step();assert.equal(mul.get16('AX'),0);

const frame=new RealMode8086(undefined,{enable80186Instructions:true});
frame.set16('SS',0x800);frame.set16('SP',0x100);frame.set16('BP',0x120);
frame.write16(0x800,0x11e,0xabcd);
frame.set16('FLAGS',0x2d7);
frame.load(Uint8Array.of(0xc8,0x10,0x00,0x02,0xc9),0,0);
frame.step();
assert.equal(frame.get16('BP'),0xfe);
assert.equal(frame.get16('SP'),0xea);
assert.equal(frame.read16(0x800,0xfe),0x120); // old BP
assert.equal(frame.read16(0x800,0xfc),0xabcd); // parent frame link
assert.equal(frame.read16(0x800,0xfa),0xfe); // new frame link
frame.step();
assert.equal(frame.get16('BP'),0x120);
assert.equal(frame.get16('SP'),0x100);
assert.equal(frame.get16('FLAGS'),0x2d7);
// The upper three level bits are ignored by the 80186 ENTER encoding.
const level=new RealMode8086(undefined,{enable80186Instructions:true});
level.set16('SS',0x900);level.set16('BP',0x88);level.set16('SP',0x100);
level.load(Uint8Array.of(0xc8,0x00,0x00,0xe0,0xc9),0,0);
level.runSteps(2);
assert.equal(level.get16('SP'),0x100);
assert.equal(level.get16('BP'),0x88);

// 80186 C0/C1 shift and stack/IMUL capability gates are independent.
const shiftsOnly=new RealMode8086(undefined,{enable80186Shifts:true});
shiftsOnly.load(Uint8Array.of(0x60),0,0);
assert.throws(()=>shiftsOnly.step(),/explicit capability/);
const advancedOnly=new RealMode8086(undefined,{enable80186Instructions:true});
advancedOnly.load(Uint8Array.of(0xc1,0xeb,0x04),0,0);
assert.throws(()=>advancedOnly.step(),/immediate shift requires explicit capability/);
console.log('UW2 80186 opt-in stack, signed IMUL, frame and legacy 8086 gate: PASS');
