import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// SYNTHETIC 8086 instruction tests; not original Korean DOS execution traces.
const rep=new RealMode8086();
rep.set16('CS',0x100);rep.set16('DS',0x200);rep.set16('ES',0x300);
rep.set16('SI',0x20);rep.set16('DI',0xffff);rep.set16('CX',2);
rep.write8(0x200,0x20,0x11);rep.write8(0x200,0x21,0x12);
rep.write8(0x300,0x20,0x71);rep.write8(0x300,0x21,0x72);
rep.load(Uint8Array.of(0x26,0xf3,0xa4),0x100,0); // ES override + REP MOVSB
rep.step();
assert.equal(rep.read8(0x300,0xffff),0x71); // override affects source
assert.equal(rep.read8(0x300,0),0x72); // 16-bit DI wraps; ES is destination
assert.equal(rep.get16('SI'),0x22);assert.equal(rep.get16('DI'),1);
assert.equal(rep.get16('CX'),0);assert.equal(rep.ip,3);

const backwards=new RealMode8086();
backwards.set16('CS',0x100);backwards.set16('DS',0x200);
backwards.set16('ES',0x300);backwards.set16('SI',0);backwards.set16('DI',0);
backwards.set16('CX',2);
backwards.write16(0x200,0,0x1234);
backwards.write16(0x200,0xfffe,0x5678);
backwards.load(Uint8Array.of(0xfd,0xf3,0xa5,0xfc),0x100,0); // STD, REP MOVSW, CLD
backwards.step();assert.equal(backwards.flag('DF'),true);
backwards.step();assert.equal(backwards.read16(0x300,0),0x1234);
assert.equal(backwards.read16(0x300,0xfffe),0x5678);
assert.equal(backwards.get16('SI'),0xfffc);
assert.equal(backwards.get16('DI'),0xfffc);
backwards.step();assert.equal(backwards.flag('DF'),false);

const search=new RealMode8086();
search.set16('CS',0x100);search.set16('ES',0x400);
search.set16('DI',0x30);search.set16('CX',4);search.set8('AL',0x80);
for(const [i,b] of [1,2,0x80,9].entries())search.write8(0x400,0x30+i,b);
search.load(Uint8Array.of(0xf2,0xae),0x100,0); // REPNE SCASB
search.step();
assert.equal(search.get16('DI'),0x33);
assert.equal(search.get16('CX'),1);
assert.equal(search.flag('ZF'),true);
assert.equal(search.get8('AL'),0x80);

const compare=new RealMode8086();
compare.set16('CS',0x100);compare.set16('DS',0x200);
compare.set16('ES',0x400);compare.set16('CX',3);
for(const [i,b] of [1,2,3].entries())compare.write8(0x200,i,b);
for(const [i,b] of [1,9,3].entries())compare.write8(0x400,i,b);
compare.load(Uint8Array.of(0xf3,0xa6),0x100,0); // REPE CMPSB
compare.step();assert.equal(compare.get16('CX'),1);
assert.equal(compare.get16('SI'),2);assert.equal(compare.get16('DI'),2);
assert.equal(compare.flag('ZF'),false);assert.equal(compare.flag('CF'),true);

const store=new RealMode8086();
store.set16('CS',0x100);store.set16('ES',0x300);
store.set16('AX',0xdead);store.set16('DI',0xfffe);store.set16('CX',2);
store.load(Uint8Array.of(0xf2,0xab),0x100,0); // REPNE STOSW still repeats unconditionally
store.step();assert.equal(store.read16(0x300,0xfffe),0xdead);
assert.equal(store.read16(0x300,0),0xdead);
assert.equal(store.get16('DI'),2);assert.equal(store.get16('CX'),0);

const load=new RealMode8086();
load.set16('CS',0x100);load.set16('DS',0x500);
load.set16('SI',0x10);load.set16('CX',2);
load.write16(0x500,0x10,0x1234);load.write16(0x500,0x12,0x5678);
load.load(Uint8Array.of(0xf3,0xad),0x100,0); // REP LODSW loads last source
load.step();assert.equal(load.get16('AX'),0x5678);
assert.equal(load.get16('SI'),0x14);assert.equal(load.get16('CX'),0);

const zero=new RealMode8086();
zero.set16('CS',0x100);zero.set16('ES',0x300);
zero.set16('AX',0xabcd);zero.set16('CX',0);zero.set16('FLAGS',0x82);
zero.load(Uint8Array.of(0xf3,0xab),0x100,0);
zero.step();assert.equal(zero.ip,2);
assert.equal(zero.get16('DI'),0);
assert.equal(zero.read16(0x300,0),0);
assert.equal(zero.get16('FLAGS'),0x82);

const one=new RealMode8086();
one.set16('CS',0x100);one.set16('DS',0x200);one.set16('ES',0x300);
one.set16('CX',9);
one.write8(0x200,0,7);one.write8(0x300,0,5);
one.load(Uint8Array.of(0xa6),0x100,0);
one.step();assert.equal(one.get16('CX'),9);
assert.equal(one.flag('ZF'),false);
assert.equal(one.get16('SI'),1);assert.equal(one.get16('DI'),1);

const unknown=new RealMode8086();
unknown.load(Uint8Array.of(0xf3,0x90),0,0);
assert.throws(()=>unknown.step(),/REP prefix\/opcode combination: fail closed/);
const prefix=new RealMode8086();
prefix.load(new Uint8Array(10).fill(0x26),0,0);
assert.throws(()=>prefix.step(),/prefix budget exceeded/);
console.log('UW2 P3 8086 string/REP/DF synthetic regression: PASS');
