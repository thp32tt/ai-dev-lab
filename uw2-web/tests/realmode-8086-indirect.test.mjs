import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic indirect transitions; original EXE call targets/trace UNTESTED.
const cpu=new RealMode8086();
cpu.set16('CS',0x100);cpu.set16('SS',0x200);cpu.set16('SP',0x100);
cpu.set16('DS',0x300);cpu.set16('BX',0x40);cpu.set16('SI',2);
cpu.write16(0x300,0x42,0x1234);cpu.write16(0x300,0x44,0x5678);
cpu.load(Uint8Array.of(0xff,0x18,0xff,0x28),0x100,0); // CALL FAR [BX+SI], JMP FAR [BX+SI]
cpu.load(Uint8Array.of(0xcb),0x5678,0x1234); // RETF
cpu.step();assert.equal(cpu.get16('CS'),0x5678);assert.equal(cpu.ip,0x1234);
assert.equal(cpu.get16('SP'),0xfc);
assert.equal(cpu.read16(0x200,0xfc),2);
assert.equal(cpu.read16(0x200,0xfe),0x100);
cpu.step();assert.equal(cpu.get16('CS'),0x100);assert.equal(cpu.ip,2);
cpu.step();assert.equal(cpu.get16('CS'),0x5678);assert.equal(cpu.ip,0x1234);
assert.equal(cpu.get16('SP'),0x100); // Far JMP does not write stack
// Segment override for an indirect far target reads the pointer from ES.
const ov=new RealMode8086();ov.set16('CS',0x120);
ov.set16('DS',0x200);ov.set16('ES',0x300);ov.set16('BX',0x20);
ov.write16(0x200,0x20,0xabcd);ov.write16(0x200,0x22,0x1111);
ov.write16(0x300,0x20,0x4321);ov.write16(0x300,0x22,0x2222);
ov.load(Uint8Array.of(0x26,0xff,0x28),0x120,0);
ov.step();assert.equal(ov.get16('CS'),0x2222);assert.equal(ov.ip,0x4321);
// FF /2 and /4 transfer exact near offsets, CALL pushes return IP.
const near=new RealMode8086();near.set16('CS',0x100);
near.set16('SS',0x200);near.set16('SP',0x100);near.set16('AX',7);
near.load(Uint8Array.of(0xff,0xd0,0xff,0xe0,0x90,0x90,0x90,0xc3),0x100,0);
near.step();assert.equal(near.ip,7);assert.equal(near.read16(0x200,0xfe),2);
near.step();assert.equal(near.ip,2);near.step();assert.equal(near.ip,7);
// FF /0,/1 preserve CF while updating overflow/zero.
const calc=new RealMode8086();calc.set16('DS',0x400);calc.set16('BX',0x10);
calc.write16(0x400,0x10,0x7fff);calc.set16('FLAGS',0x3);
calc.load(Uint8Array.of(0xff,0x07,0xff,0x0f),0,0);
calc.step();assert.equal(calc.read16(0x400,0x10),0x8000);
assert.equal(calc.flag('OF'),true);assert.equal(calc.flag('CF'),true);
calc.step();assert.equal(calc.read16(0x400,0x10),0x7fff);
assert.equal(calc.flag('CF'),true);
// 8086 PUSH SP also applies to indirect FF /6 register form.
const sp=new RealMode8086();sp.set16('SS',0x100);sp.set16('SP',0x100);
sp.load(Uint8Array.of(0xff,0xf4),0,0);sp.step();
assert.equal(sp.read16(0x100,0xfe),0xfe);
// MOV DS,AX / MOV AX,DS; LES memory pointer, no fabricated CS loads.
const seg=new RealMode8086();seg.set16('AX',0x500);
seg.load(Uint8Array.of(0x8e,0xd8,0x8c,0xd8),0,0);
seg.step();assert.equal(seg.get16('DS'),0x500);
seg.set16('AX',0);seg.step();assert.equal(seg.get16('AX'),0x500);
const les=new RealMode8086();
les.set16('DS',0x200);les.write16(0x200,0x20,0x7777);
les.write16(0x200,0x22,0x4567);
les.load(Uint8Array.of(0xc4,0x06,0x20,0x00),0,0);
les.step();assert.equal(les.get16('AX'),0x7777);assert.equal(les.get16('ES'),0x4567);
const bad=new RealMode8086();
bad.load(Uint8Array.of(0xff,0xd8),0,0); // FF /3 register invalid
assert.throws(()=>bad.step(),/far pointer requires memory/);
const badSeg=new RealMode8086();badSeg.load(Uint8Array.of(0x8e,0xc8),0,0);
assert.throws(()=>badSeg.step(),/fail closed/);
const badLes=new RealMode8086();badLes.load(Uint8Array.of(0xc4,0xc0),0,0);
assert.throws(()=>badLes.step(),/requires memory/);
// IRET pops IP, CS, FLAGS; near RET imm cleans up caller stack.
const ret=new RealMode8086();ret.set16('SS',0x300);ret.set16('SP',0x100);
ret.write16(0x300,0x100,0x0020);ret.write16(0x300,0x102,0x1234);
ret.write16(0x300,0x104,0x0203);ret.load(Uint8Array.of(0xcf),0,0);
ret.step();assert.equal(ret.ip,0x20);assert.equal(ret.get16('CS'),0x1234);
assert.equal(ret.get16('SP'),0x106);assert.equal(ret.get16('FLAGS'),0x203);
const clean=new RealMode8086();clean.set16('SS',0x200);clean.set16('SP',0x100);
clean.write16(0x200,0x100,0x0010);
clean.load(Uint8Array.of(0xc2,0x06,0x00),0,0);
clean.step();assert.equal(clean.ip,0x10);assert.equal(clean.get16('SP'),0x108);
const pushSeg=new RealMode8086();pushSeg.set16('CS',0x100);
pushSeg.set16('SS',0x200);pushSeg.set16('SP',0x100);
pushSeg.load(Uint8Array.of(0x0e,0x1f),0x100,0);
pushSeg.step();pushSeg.step();assert.equal(pushSeg.get16('DS'),0x100);
assert.equal(pushSeg.get16('SP'),0x100);
console.log('UW2 P3 far indirect/segment/IRET synthetic 8086 regression: PASS');
