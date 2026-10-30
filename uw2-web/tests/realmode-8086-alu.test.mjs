import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic 8086 arithmetic, wrapping, width and status flags; NOT DOS traces.
const cpu=new RealMode8086();
cpu.set16('AX',0xffff);cpu.set16('FLAGS',0x202);
cpu.load(Uint8Array.of(0x05,0x01,0x00),0,0); // ADD AX,1
cpu.step();
assert.equal(cpu.get16('AX'),0);
for(const bit of ['CF','ZF','AF','PF','IF'])assert.equal(cpu.flag(bit),true);
assert.equal(cpu.flag('OF'),false);assert.equal(cpu.flag('SF'),false);
assert.equal(cpu.ip,3);
const sub=new RealMode8086();sub.set8('AL',0);
sub.load(Uint8Array.of(0x2c,0x01),0,0); // SUB AL,1
sub.step();assert.equal(sub.get8('AL'),255);
for(const bit of ['CF','SF','AF','PF'])assert.equal(sub.flag(bit),true);
assert.equal(sub.flag('OF'),false);
const cmp=new RealMode8086();cmp.set8('AL',0x7f);
cmp.load(Uint8Array.of(0x3c,0x80,0x7f,0x02,0x90,0x90),0,0);
cmp.step();assert.equal(cmp.get8('AL'),0x7f);
assert.equal(cmp.flag('CF'),true);
assert.equal(cmp.flag('OF'),true);
assert.equal(cmp.flag('SF'),true);
cmp.step();assert.equal(cmp.ip,6); // JG signed, 0x7f > -0x80
const mem=new RealMode8086();
mem.set16('DS',0x200);mem.set16('SS',0x300);
mem.set16('BP',0x80);mem.set16('BX',0x20);
mem.write16(0x300,0x7e,0);
mem.write16(0x200,0x20,1);
// CMP word ptr SS:[BP-2],-1 ; ADD word ptr DS:[BX],-1
mem.load(Uint8Array.of(0x83,0x7e,0xfe,0xff,0x83,0x07,0xff),0,0);
mem.step();
assert.equal(mem.read16(0x300,0x7e),0);
assert.equal(mem.flag('CF'),true);assert.equal(mem.flag('ZF'),false);
mem.step();
assert.equal(mem.read16(0x200,0x20),0);
assert.equal(mem.flag('ZF'),true);
const general=new RealMode8086();
general.set16('AX',0xff00);general.set16('BX',0x00ff);
general.load(Uint8Array.of(0x01,0xd8,0x31,0xd8,0x85,0xd8),0,0);
// ADD AX,BX; XOR AX,BX; TEST AX,BX (must not mutate operands)
general.step();assert.equal(general.get16('AX'),0xffff);
general.step();assert.equal(general.get16('AX'),0xff00);
general.step();assert.equal(general.get16('AX'),0xff00);
assert.equal(general.get16('BX'),0x00ff);
assert.equal(general.flag('ZF'),true);
const inc=new RealMode8086();
inc.set16('AX',0x7fff);inc.set16('FLAGS',0x203);
inc.load(Uint8Array.of(0x40,0x48),0,0); // INC AX; DEC AX
inc.step();assert.equal(inc.get16('AX'),0x8000);
assert.equal(inc.flag('CF'),true);assert.equal(inc.flag('OF'),true);
inc.step();assert.equal(inc.get16('AX'),0x7fff);
assert.equal(inc.flag('CF'),true);assert.equal(inc.flag('OF'),true);
const stack=new RealMode8086();
stack.set16('SS',0x100);stack.set16('SP',0x100);
stack.load(Uint8Array.of(0x54,0x5b,0x9c,0x9d),0,0); // 8086 PUSH SP; POP BX; PUSHF; POPF
stack.step();assert.equal(stack.get16('SP'),0xfe);
assert.equal(stack.read16(0x100,0xfe),0xfe); // pre-decremented value on 8086
stack.step();assert.equal(stack.get16('BX'),0xfe);
assert.equal(stack.get16('SP'),0x100);
stack.set16('FLAGS',0x8d7);
stack.step();stack.set16('FLAGS',2);stack.step();
assert.equal(stack.get16('FLAGS'),0x8d7);
for(let op=0x70;op<=0x7f;op++){
  const test=new RealMode8086();test.set16('FLAGS',0x2);
  test.load(Uint8Array.of(op,0xfe),0,0);
  test.step();assert.equal(test.ip===0||test.ip===2,true);
}
// Test unsigned and signed opposite edge; reject unsupported arithmetic encodings.
const branch=new RealMode8086();branch.set16('FLAGS',0x3); // CF=1
branch.load(Uint8Array.of(0x72,0x02,0x90,0x90,0x73,0xfc),0,0);
branch.step();assert.equal(branch.ip,4);
branch.step();assert.equal(branch.ip,6);
const bad=new RealMode8086();
bad.load(Uint8Array.of(0x82,0xdb,0x01),0,0); // undocumented group alias is not admitted
assert.throws(()=>bad.step(),/unsupported 8086 opcode 82/);
const dos=new RealMode8086();dos.load(Uint8Array.of(0xcd,0x21),0,0);
assert.throws(()=>dos.step(),/INT 21 has no installed vector\/DOS adapter: fail closed/);
console.log('UW2 P3 ALU/condition/stack synthetic 8086 regression: PASS');
