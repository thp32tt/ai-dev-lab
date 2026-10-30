import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {executeKoeiReturnGuard,nextKoeiExecutable} from '../web/koei-exit-flow.js';

const c=new RealMode8086();
c.set16('AX',0xabcd);
assert.equal(c.get8('AH'),0xab);
assert.equal(c.get8('AL'),0xcd);
c.set8('AH',0);assert.equal(c.get16('AX'),0x00cd);
c.set8('AL',0x80);assert.equal(c.get16('AX'),0x0080);
assert.equal(c.physical(0xffff,0x10),0);
c.write16(0xffff,0x0f,0x1234);
assert.equal(c.read8(0xffff,0x0f),0x34);
assert.equal(c.read8(0xffff,0x10),0x12);
c.set16('SS',0x100);c.set16('SP',0);
c.push16(0xbeef);assert.equal(c.get16('SP'),0xfffe);
assert.equal(c.pop16(),0xbeef);assert.equal(c.get16('SP'),0);
assert.throws(()=>c.set16('AX',65536),/uint16/);
assert.throws(()=>c.load(new Uint8Array(65537),0,0),/exceeds/);

// Exact 8086 flag semantics: OR AH,AH; JNZ +2, then OR AL,AL; JZ +2.
const f=new RealMode8086();
f.set16('AX',0x8000);
f.set16('FLAGS',0x803); // CF+OF initially set
f.load(Uint8Array.of(0x0a,0xe4,0x75,0x02,0x90,0x90),0,0);
f.step();
assert.equal(f.flag('CF'),false);assert.equal(f.flag('OF'),false);
assert.equal(f.flag('ZF'),false);assert.equal(f.flag('SF'),true);
f.step();assert.equal(f.ip,6);
const z=new RealMode8086();
z.load(Uint8Array.of(0x0a,0xc0,0x74,0xfe),0,0);
z.step();assert.equal(z.flag('ZF'),true);assert.equal(z.flag('PF'),true);
z.step();assert.equal(z.ip,2); // signed rel8 -2 returns to JZ at 2

// Near CALL/RET, signed jump and separate SS:SP stack segment.
const n=new RealMode8086();
n.set16('CS',0x100);n.set16('SS',0x200);n.set16('SP',0x100);
n.load(Uint8Array.of(0xe8,0x02,0x00,0x90,0x90,0xc3),0x100,0);
n.step();assert.equal(n.ip,5);assert.equal(n.read16(0x200,0xfe),3);
n.step();assert.equal(n.ip,3);assert.equal(n.get16('SP'),0x100);

// Far CALL/RET must push CS then IP, with IP popped before CS.
const far=new RealMode8086();
far.set16('CS',0x100);far.set16('SS',0x200);far.set16('SP',0x100);
far.load(Uint8Array.of(0x9a,0x07,0x00,0x23,0x01),0x100,0);
far.load(Uint8Array.of(0xcb),0x123,7);
far.step();assert.equal(far.get16('CS'),0x123);assert.equal(far.ip,7);
assert.equal(far.read16(0x200,0xfc),5);
assert.equal(far.read16(0x200,0xfe),0x100);
far.step();assert.equal(far.get16('CS'),0x100);assert.equal(far.ip,5);
assert.equal(far.get16('SP'),0x100);

// Unsupported DOS INT or memory ModR/M never silently reinterpret game state.
const unsupported=new RealMode8086();
unsupported.load(Uint8Array.of(0xcd,0x21),0,0);
assert.throws(()=>unsupported.step(),/INT 21 has no installed vector\/DOS adapter: fail closed/);
// A ModR/M memory operand is now decoded, never fabricated or silently ignored.
const supportedMem=new RealMode8086();
supportedMem.set16('BX',0x100);supportedMem.set16('SI',3);
supportedMem.set8('AL',0x80);supportedMem.write8(0,0x103,1);
supportedMem.load(Uint8Array.of(0x0a,0x00),0,0);
supportedMem.step();assert.equal(supportedMem.get8('AL'),0x81);

// All return bytes, including signed-bit edges, checked against independently
// recorded KOEI.COM guard outcomes. These are SYNTHETIC, not real DOS traces.
for(let ah=0;ah<256;ah++){
  assert.equal(executeKoeiReturnGuard('openAH',ah),ah!==0);
  assert.equal(executeKoeiReturnGuard('mainAH',ah),ah!==0);
  assert.equal(nextKoeiExecutable('OPEN.EXE',{terminationType:ah,returnCode:0}),
    ah===0?'MAIN.EXE':null);
  for(const al of [0,1,127,128,255]){
    assert.equal(nextKoeiExecutable('MAIN.EXE',{terminationType:ah,returnCode:al}),
      ah===0&&al!==0?'END.EXE':null);
  }
}
for(let al=0;al<256;al++)
  assert.equal(executeKoeiReturnGuard('mainAL',al),al===0);
assert.throws(()=>executeKoeiReturnGuard('mainAH',256),/unsigned DOS/);
assert.throws(()=>nextKoeiExecutable('OPEN.EXE',{terminationType:0}),/unsigned DOS/);

// 8086 16-bit memory address forms, displacement signs, segment defaults,
// moffs transfers, and byte/word boundary wrapping. Synthetic CPU tests only.
const mem=new RealMode8086();
mem.set16('DS',0x200);mem.set16('SS',0x300);
mem.set16('BP',0x100);mem.set16('BX',0x20);mem.set16('SI',0x10);
mem.write16(0x300,0xfe,0x1234);
mem.write16(0x200,0xfe,0x5678);
mem.load(Uint8Array.of(0x8b,0x46,0xfe,0x3e,0x8b,0x46,0xfe),0,0);
mem.step();assert.equal(mem.get16('AX'),0x1234); // SS:[BP-2]
mem.step();assert.equal(mem.get16('AX'),0x5678); // DS override for one instruction
mem.set16('CS',0x400);mem.set16('IP',0);
mem.load(Uint8Array.of(0x8b,0x40,0x7f,0x8b,0x80,0x00,0x80),0x400,0);
mem.write16(0x200,0xaf,0x1919); // [BX+SI+127]
mem.write16(0x200,(0x30-0x8000)&0xffff,0x7878);
mem.step();assert.equal(mem.get16('AX'),0x1919);
mem.step();assert.equal(mem.get16('AX'),0x7878);
mem.set16('CS',0x500);mem.set16('IP',0);
mem.load(Uint8Array.of(0x89,0x1e,0xff,0xff,0x8b,0x06,0xff,0xff),0x500,0);
mem.set16('BX',0xa1b2);
mem.step();assert.equal(mem.read8(0x200,0xffff),0xb2);
assert.equal(mem.read8(0x200,0),0xa1);
mem.step();assert.equal(mem.get16('AX'),0xa1b2);
mem.set16('CS',0x600);mem.set16('IP',0);
mem.set16('ES',0x700);
mem.load(Uint8Array.of(0x26,0xc6,0x06,0x34,0x12,0x81,
  0x26,0xa0,0x34,0x12,0x26,0xa2,0x35,0x12),0x600,0);
mem.step();assert.equal(mem.read8(0x700,0x1234),0x81);
mem.step();assert.equal(mem.get8('AL'),0x81);
mem.step();assert.equal(mem.read8(0x700,0x1235),0x81);
mem.set16('CS',0x800);mem.set16('IP',0);
mem.set16('AX',0x8000);mem.set16('BX',0x100);
mem.write16(0x200,0x100,0x0001);
mem.load(Uint8Array.of(0x0b,0x07),0x800,0); // OR AX,[BX]
mem.step();assert.equal(mem.get16('AX'),0x8001);
assert.equal(mem.flag('SF'),true);assert.equal(mem.flag('ZF'),false);
assert.equal(mem.flag('PF'),false); // parity of low byte 0x01
assert.equal(mem.flag('CF'),false);assert.equal(mem.flag('OF'),false);
// Invalid group encodings and unhandled instructions never substitute behavior.
const badMov=new RealMode8086();
badMov.load(Uint8Array.of(0xc7,0x0e,0x20,0x00,0x34,0x12),0,0);
assert.throws(()=>badMov.step(),/fail closed/);
const badPrefix=new RealMode8086();
badPrefix.load(new Uint8Array(10).fill(0x26),0,0);
assert.throws(()=>badPrefix.step(),/prefix budget exceeded/);

console.log('UW2 P3 8086 real-mode memory/segment and KOEI guard synthetic regression: PASS');
