import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic arithmetic and control flow. No Korean original DOS execution.
const adc=new RealMode8086();adc.set8('AL',0x7f);adc.set16('FLAGS',0x203);
adc.load(Uint8Array.of(0x14,0x00),0,0); // ADC AL,0 with CF=1
adc.step();assert.equal(adc.get8('AL'),0x80);
assert.equal(adc.flag('CF'),false);assert.equal(adc.flag('OF'),true);
assert.equal(adc.flag('AF'),true);assert.equal(adc.flag('SF'),true);
assert.equal(adc.flag('IF'),true);

const sbb=new RealMode8086();sbb.set8('AL',0x80);sbb.set16('FLAGS',3);
sbb.load(Uint8Array.of(0x1c,0x00),0,0); // SBB AL,0; signed -128-1
sbb.step();assert.equal(sbb.get8('AL'),0x7f);
assert.equal(sbb.flag('CF'),false);
assert.equal(sbb.flag('OF'),true);assert.equal(sbb.flag('AF'),true);

const borrow=new RealMode8086();borrow.set16('AX',0);borrow.set16('FLAGS',3);
borrow.load(Uint8Array.of(0x1d,0x00,0x00),0,0);
borrow.step();assert.equal(borrow.get16('AX'),0xffff);
assert.equal(borrow.flag('CF'),true);assert.equal(borrow.flag('OF'),false);
assert.equal(borrow.flag('SF'),true);assert.equal(borrow.flag('PF'),true);

const chain=new RealMode8086();
chain.set16('AX',0xffff);chain.set16('BX',0);chain.set16('FLAGS',0x203);
chain.load(Uint8Array.of(0x11,0xd8,0x19,0xd8),0,0); // ADC AX,BX; SBB AX,BX
chain.step();assert.equal(chain.get16('AX'),0);
assert.equal(chain.flag('CF'),true);assert.equal(chain.flag('ZF'),true);
chain.step();assert.equal(chain.get16('AX'),0xffff);
assert.equal(chain.flag('CF'),true);

const group=new RealMode8086();
group.set16('DS',0x200);group.set16('BX',0x40);group.set16('FLAGS',3);
group.write16(0x200,0x40,0x1234);
group.load(Uint8Array.of(0x83,0x17,0xff,0x83,0x1f,0x00),0,0);
// ADC [BX],-1 with CF1 = unchanged and CF1; SBB [BX],0 with CF1 -> -1.
group.step();assert.equal(group.read16(0x200,0x40),0x1234);
assert.equal(group.flag('CF'),true);
group.step();assert.equal(group.read16(0x200,0x40),0x1233);
assert.equal(group.flag('CF'),false);

const branch=new RealMode8086();branch.set16('CX',2);
branch.set16('FLAGS',0x403); // CF + DF: LOOP must preserve all flags
branch.load(Uint8Array.of(0xe2,0xfe),0,0);
branch.step();assert.equal(branch.ip,0);assert.equal(branch.get16('CX'),1);
branch.step();assert.equal(branch.ip,2);assert.equal(branch.get16('CX'),0);
assert.equal(branch.get16('FLAGS'),0x403);

const wrap=new RealMode8086();wrap.set16('CX',0);
wrap.load(Uint8Array.of(0xe2,0xfe),0,0);wrap.step();
assert.equal(wrap.get16('CX'),0xffff);assert.equal(wrap.ip,0);

const loope=new RealMode8086();loope.set16('CX',2);loope.set16('FLAGS',0x42);
loope.load(Uint8Array.of(0xe1,0xfe,0xe0,0xfc),0,0);
loope.step();assert.equal(loope.ip,0);assert.equal(loope.get16('CX'),1);
loope.set16('FLAGS',2);
loope.step();assert.equal(loope.ip,2);assert.equal(loope.get16('CX'),0);
loope.set16('CX',2);loope.step();assert.equal(loope.ip,0);
assert.equal(loope.get16('CX'),1); // LOOPNE jumps with ZF=0

const jcxz=new RealMode8086();jcxz.set16('CX',0);
jcxz.load(Uint8Array.of(0xe3,0xfe),0,0);
jcxz.step();assert.equal(jcxz.ip,0);assert.equal(jcxz.get16('CX'),0);
jcxz.set16('CX',2);jcxz.step();assert.equal(jcxz.ip,2);
assert.equal(jcxz.get16('CX'),2);

const carry=new RealMode8086();carry.load(Uint8Array.of(0xf9,0xf5,0xf9,0xf8),0,0);
carry.step();assert.equal(carry.flag('CF'),true);
carry.step();assert.equal(carry.flag('CF'),false);
carry.step();assert.equal(carry.flag('CF'),true);
carry.step();assert.equal(carry.flag('CF'),false);
console.log('UW2 P3 8086 ADC/SBB carry and LOOP/JCXZ synthetic regression: PASS');
