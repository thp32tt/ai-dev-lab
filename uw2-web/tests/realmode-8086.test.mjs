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
assert.throws(()=>unsupported.step(),/unsupported 8086 opcode cd/);
const unsupportedMem=new RealMode8086();
unsupportedMem.load(Uint8Array.of(0x0a,0x00),0,0);
assert.throws(()=>unsupportedMem.step(),/fail closed/);

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
console.log('UW2 P3 8086 real-mode subset/KOEI original guard synthetic regression: PASS');
