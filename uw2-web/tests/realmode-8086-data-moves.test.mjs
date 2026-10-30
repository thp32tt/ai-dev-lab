import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic 8086 data transfer/flag tests; Korean DOS and browser UNTESTED.
function run(bytes,setup=()=>{}){
  const cpu=new RealMode8086();cpu.set16('CS',0x100);
  setup(cpu);cpu.load(Uint8Array.from(bytes),0x100,0);cpu.step();return cpu;
}
const exchange=run([0x93],c=>{
  c.set16('AX',0xabcd);c.set16('BX',0x1234);c.set16('FLAGS',0xa53);
});
assert.equal(exchange.get16('AX'),0x1234);
assert.equal(exchange.get16('BX'),0xabcd);
assert.equal(exchange.get16('FLAGS'),0xa53);

const xchg8=run([0x86,0xe0],c=>c.set16('AX',0xabcd));
assert.equal(xchg8.get16('AX'),0xcdab);

const memory=run([0x36,0x87,0x06,0x40,0],c=>{
  c.set16('SS',0x200);c.set16('DS',0x300);
  c.set16('AX',0x1234);c.write16(0x200,0x40,0xbeef);
  c.write16(0x300,0x40,0xcafe);c.set16('FLAGS',0x443);
});
assert.equal(memory.get16('AX'),0xbeef);
assert.equal(memory.read16(0x200,0x40),0x1234);
assert.equal(memory.read16(0x300,0x40),0xcafe);
assert.equal(memory.get16('FLAGS'),0x443);

const lea=run([0x8d,0x68,0x07],c=>{
  c.set16('BX',0xfff0);c.set16('SI',0x20);c.set16('BP',0x99);
  c.set16('FLAGS',0x853);
});
assert.equal(lea.get16('BP'),0x17);
assert.equal(lea.get16('FLAGS'),0x853);
assert.throws(()=>run([0x8d,0xc0]),/LEA requires memory/);

const popMem=run([0x8f,0x06,0x40,0],c=>{
  c.set16('SS',0x200);c.set16('SP',0x10);
  c.set16('DS',0x300);c.write16(0x200,0x10,0xface);
});
assert.equal(popMem.read16(0x300,0x40),0xface);
assert.equal(popMem.get16('SP'),0x12);
const badPop=new RealMode8086();badPop.set16('SP',0x20);
badPop.load(Uint8Array.of(0x8f,0xc8),0,0);
assert.throws(()=>badPop.step(),/POP r\/m/);
assert.equal(badPop.get16('SP'),0x20);

const cbw=run([0x98],c=>{c.set8('AL',0x90);c.set16('FLAGS',0x853);});
assert.equal(cbw.get16('AX'),0xff90);
assert.equal(cbw.get16('FLAGS'),0x853);
const cwd=run([0x99],c=>c.set16('AX',0x8001));
assert.equal(cwd.get16('DX'),0xffff);
const cwdPositive=run([0x99],c=>{c.set16('AX',0x7fff);c.set16('DX',0xffff);});
assert.equal(cwdPositive.get16('DX'),0);

const sahf=run([0x9e],c=>{
  c.set8('AH',0xd5);c.set16('FLAGS',0xa02);
});
assert.equal(sahf.get16('FLAGS'),0xad7);
const lahf=run([0x9f],c=>{c.set16('FLAGS',0xa55);c.set16('AX',0x1234);});
assert.equal(lahf.get8('AH'),0x57);
assert.equal(lahf.get8('AL'),0x34);

const testAl=run([0xa8,0xf0],c=>{c.set8('AL',0x0f);c.set16('FLAGS',0x803);});
assert.equal(testAl.get8('AL'),0x0f);
assert.equal(testAl.flag('ZF'),true);
assert.equal(testAl.flag('CF'),false);
assert.equal(testAl.flag('OF'),false);
const testAx=run([0xa9,0xff,0x00],c=>c.set16('AX',0xff00));
assert.equal(testAx.get16('AX'),0xff00);
assert.equal(testAx.flag('ZF'),true);

const xlat=run([0x26,0xd7],c=>{
  c.set16('DS',0x200);c.set16('ES',0x300);
  c.set16('BX',0xfff0);c.set8('AL',0x20);
  c.write8(0x200,0x10,0xee);c.write8(0x300,0x10,0x42);
  c.set16('FLAGS',0x843);
});
assert.equal(xlat.get8('AL'),0x42);
assert.equal(xlat.get16('FLAGS'),0x843);

console.log('UW2 P3 8086 XCHG/LEA/POP/CBW/CWD/SAHF/LAHF/TEST/XLAT synthetic regression: PASS');
