import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
// SYNTHETIC 8086 FE /0, /1 only; actual Korean executable UNTESTED.
const run=(bytes,setup)=>{
  const c=new RealMode8086();c.set16('CS',0x100);setup(c);
  c.load(Uint8Array.from(bytes),0x100,0);c.step();return c;
};
const inc=run([0xfe,0xc0],c=>{c.set8('AL',0x7f);c.set16('FLAGS',0x203);});
assert.equal(inc.get8('AL'),0x80);
assert.equal(inc.flag('OF'),true);assert.equal(inc.flag('SF'),true);
assert.equal(inc.flag('CF'),true);assert.equal(inc.flag('ZF'),false);
const wrap=run([0xfe,0xc8],c=>{c.set8('AL',0);c.set16('FLAGS',0x202);});
assert.equal(wrap.get8('AL'),255);
assert.equal(wrap.flag('AF'),true);assert.equal(wrap.flag('CF'),false);
const memory=run([0x36,0xfe,0x46,0xff],c=>{
  c.set16('DS',0x200);c.set16('SS',0x300);c.set16('BP',0x40);
  c.write8(0x300,0x3f,255);c.write8(0x200,0x3f,5);
  c.set16('FLAGS',0x203);
});
assert.equal(memory.read8(0x300,0x3f),0);
assert.equal(memory.read8(0x200,0x3f),5);
assert.equal(memory.flag('ZF'),true);
assert.equal(memory.flag('CF'),true);
const unknown=new RealMode8086();
unknown.load(Uint8Array.of(0xfe,0xd0),0,0);
assert.throws(()=>unknown.step(),/unsupported 8086 FE extension/);
console.log('UW2 P3 8086 FE byte INC/DEC synthetic regression: PASS');
