import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Independently SHA-pinned KOEI.COM raw 0x2AC = C1 EB 04:
// Intel 80186/286 immediate-count SHR BX,4, preceded by MOV BX,0390h.
const old=new RealMode8086();
old.set16('BX',0x0390);
old.load(Uint8Array.of(0xc1,0xeb,0x04),0,0);
assert.throws(()=>old.step(),/requires explicit capability/);
assert.equal(old.get16('BX'),0x0390);

const word=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
word.set16('BX',0x0390);
word.load(Uint8Array.of(0xc1,0xeb,0x04,0x90),0,0);
word.step();
assert.equal(word.get16('BX'),0x0039);
assert.equal(word.get16('IP'),3);
assert.equal(word.flag('ZF'),false);
assert.equal(word.flag('CF'),false);
word.step();assert.equal(word.get16('IP'),4);

const byte=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
byte.set8('AL',0x81);
byte.set16('FLAGS',0x203);
byte.load(Uint8Array.of(0xc0,0xe8,0x01),0,0); // SHR AL,1
byte.step();
assert.equal(byte.get8('AL'),0x40);
assert.equal(byte.flag('CF'),true);
assert.equal(byte.flag('OF'),true);
assert.equal(byte.flag('ZF'),false);
assert.equal(byte.flag('IF'),true);

const zero=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
zero.set16('BX',0x0300);
zero.set16('FLAGS',0x803);
zero.load(Uint8Array.of(0xc1,0xe3,0x00),0,0); // SHL BX,0
zero.step();
assert.equal(zero.get16('BX'),0x0300);
assert.equal(zero.get16('FLAGS'),0x803);
assert.equal(zero.get16('IP'),3);

const memory=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
memory.set16('DS',0x200);memory.set16('ES',0x300);
memory.write16(0x200,0x1234,0x00ff);
memory.write16(0x300,0x1234,0x8000);
memory.load(Uint8Array.of(0x26,0xc1,0x2e,0x34,0x12,0x01),0,0);
memory.step(); // ES override: SHR word [1234],1
assert.equal(memory.read16(0x300,0x1234),0x4000);
assert.equal(memory.read16(0x200,0x1234),0x00ff);

const unsupported=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
unsupported.load(Uint8Array.of(0xc1,0xeb,0x20),0,0);
assert.throws(()=>unsupported.step(),/unverified 80186 immediate shift count >31/);
const missing=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
missing.load(Uint8Array.of(0xc1,0xf3,0x01),0,0);
assert.throws(()=>missing.step(),/unsupported 80186 Group-2 \/6/);
const unrelated=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
unrelated.load(Uint8Array.of(0x68,0x01,0x00),0,0);
assert.throws(()=>unrelated.step(),/unsupported 8086 opcode 68/);
assert.throws(()=>new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:1}),/must be boolean/);
console.log('UW2 verified original KOEI 80186 immediate-shift CPU capability synthetic regression: PASS');
