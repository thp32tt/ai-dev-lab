import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic instruction semantics only: original DOS and browser remain UNTESTED.
function execute(bytes, setup=()=>{}) {
  const cpu=new RealMode8086();
  setup(cpu);
  cpu.load(Uint8Array.from(bytes),0x100,0);
  cpu.set16('CS',0x100);
  cpu.step();
  return cpu;
}
const flags=cpu=>cpu.get16('FLAGS');

const test=execute([0xf6,0xc0,0x80],c=>{
  c.set8('AL',0x80);c.set16('FLAGS',0xa13);
});
assert.equal(test.get8('AL'),0x80);
assert.equal(test.flag('CF'),false);
assert.equal(test.flag('OF'),false);
assert.equal(test.flag('SF'),true);
assert.equal(test.flag('ZF'),false);
assert.equal(test.flag('IF'),true);
assert.equal(test.flag('DF'),false);

const wordTest=execute([0xf7,0x06,0x20,0,0x0f,0x0f],c=>{
  c.write16(0,0x20,0xf000);c.set16('FLAGS',0x903);
});
assert.equal(wordTest.read16(0,0x20),0xf000);
assert.equal(wordTest.flag('ZF'),true);
assert.equal(wordTest.flag('CF'),false);
assert.equal(wordTest.flag('OF'),false);

const not=execute([0xf6,0xd0],c=>{
  c.set8('AL',0x55);c.set16('FLAGS',0xa47);
});
assert.equal(not.get8('AL'),0xaa);
assert.equal(flags(not),0xa47);

const neg=execute([0xf7,0xd8],c=>c.set16('AX',0x8000));
assert.equal(neg.get16('AX'),0x8000);
assert.equal(neg.flag('CF'),true);
assert.equal(neg.flag('OF'),true);
assert.equal(neg.flag('SF'),true);

const negZero=execute([0xf6,0xd8],c=>c.set8('AL',0));
assert.equal(negZero.get8('AL'),0);
assert.equal(negZero.flag('CF'),false);
assert.equal(negZero.flag('ZF'),true);

const mul8=execute([0xf6,0xe3],c=>{
  c.set8('AL',0x10);c.set8('BL',0x10);c.set16('FLAGS',0x242);
});
assert.equal(mul8.get16('AX'),0x100);
assert.equal(mul8.flag('CF'),true);assert.equal(mul8.flag('OF'),true);
assert.equal(mul8.flag('ZF'),true); // undefined flag preserved
assert.equal(mul8.flag('IF'),true);

const mul16=execute([0xf7,0xe3],c=>{
  c.set16('AX',0x8000);c.set16('BX',2);
});
assert.equal(mul16.get16('AX'),0);
assert.equal(mul16.get16('DX'),1);
assert.equal(mul16.flag('CF'),true);

const imul8=execute([0xf6,0xeb],c=>{
  c.set8('AL',0xf0);c.set8('BL',4);c.set16('FLAGS',0x803);
});
assert.equal(imul8.get16('AX'),0xffc0);
assert.equal(imul8.flag('CF'),false);
assert.equal(imul8.flag('OF'),false);

const imul16=execute([0xf7,0xeb],c=>{
  c.set16('AX',0x8000);c.set16('BX',2);
});
assert.equal(imul16.get16('AX'),0);
assert.equal(imul16.get16('DX'),0xffff);
assert.equal(imul16.flag('CF'),true);assert.equal(imul16.flag('OF'),true);

const div8=execute([0xf6,0xf3],c=>{
  c.set16('AX',0x0102);c.set8('BL',0x10);c.set16('FLAGS',0xa53);
});
assert.equal(div8.get8('AL'),0x10);
assert.equal(div8.get8('AH'),2);
assert.equal(flags(div8),0xa53);

const div16=execute([0xf7,0xf3],c=>{
  c.set16('AX',0);c.set16('DX',1);c.set16('BX',3);
});
assert.equal(div16.get16('AX'),0x5555);
assert.equal(div16.get16('DX'),1);

const idiv8=execute([0xf6,0xfb],c=>{
  c.set16('AX',0xff9c);c.set8('BL',0xf9);
});
assert.equal(idiv8.get8('AL'),14);
assert.equal(idiv8.get8('AH'),0xfe);

const idiv16=execute([0xf7,0xfb],c=>{
  c.set16('DX',0xffff);c.set16('AX',0xff9c);c.set16('BX',7);
});
assert.equal(idiv16.get16('AX'),0xfff2);
assert.equal(idiv16.get16('DX'),0xfffe);

for(const [bytes,setup,error] of [
  [[0xf6,0xf3],c=>{c.set16('AX',0x1234);c.set8('BL',0);},/zero divisor/],
  [[0xf6,0xf3],c=>{c.set16('AX',0x200);c.set8('BL',1);},/quotient overflow/],
  [[0xf7,0xfb],c=>{c.set16('DX',0x8000);c.set16('AX',0);c.set16('BX',0xffff);},/quotient overflow/],
  [[0xf6,0xc8],()=>{},/Group-3 \/1/]
]){
  const cpu=new RealMode8086();
  setup(cpu);cpu.load(Uint8Array.from(bytes),0x100,0);
  cpu.set16('CS',0x100);
  const ax=cpu.get16('AX'),dx=cpu.get16('DX'),fl=cpu.get16('FLAGS');
  assert.throws(()=>cpu.step(),error);
  assert.equal(cpu.get16('AX'),ax);
  assert.equal(cpu.get16('DX'),dx);
  assert.equal(cpu.get16('FLAGS'),fl);
}
console.log('UW2 P3 8086 Group-3 F6/F7 synthetic regression: PASS');
