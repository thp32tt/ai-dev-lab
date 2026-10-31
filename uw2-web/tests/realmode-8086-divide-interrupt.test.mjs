import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// SYNTHETIC original 8086 divide-error INT 0 delivery; real DOS trace UNTESTED.
const create=(instruction, ax, divisor, flags=0xb03)=>{
  const c=new RealMode8086();
  c.set16('CS',0x100);c.set16('SS',0x200);c.set16('SP',0x100);
  c.set16('AX',ax);c.set16('BX',divisor);c.set16('FLAGS',flags);
  c.load(Uint8Array.from(instruction),0x100,0);
  c.installInterruptVector(0,0x500,0x30);
  c.load(Uint8Array.of(0xcf),0x500,0x30); // IRET via real CPU state
  return c;
};
const zero=create([0xf7,0xf3],0x1234,0); // DIV BX / 0
zero.step();
assert.equal(zero.get16('CS'),0x500);
assert.equal(zero.get16('IP'),0x30);
assert.equal(zero.get16('SP'),0xfa);
assert.equal(zero.read16(0x200,0xfa),2); // original 8086 next-instruction return IP
assert.equal(zero.read16(0x200,0xfc),0x100);
assert.equal(zero.read16(0x200,0xfe),0xb03);
assert.equal(zero.get16('AX'),0x1234);assert.equal(zero.get16('BX'),0);
assert.equal(zero.flag('IF'),false);assert.equal(zero.flag('TF'),false);
zero.step();
assert.equal(zero.get16('CS'),0x100);assert.equal(zero.get16('IP'),2);
assert.equal(zero.get16('SP'),0x100);assert.equal(zero.get16('FLAGS'),0xb03);
const over=create([0xf6,0xf3],0x1234,1); // DIV BL yields > FFh
over.step();
assert.equal(over.get16('IP'),0x30);
assert.equal(over.read16(0x200,0xfa),2);
assert.equal(over.get16('AX'),0x1234);
const signed=create([0xf6,0xfb],0x8000,1); // IDIV BL signed quotient overflow
signed.step();assert.equal(signed.get16('CS'),0x500);
assert.equal(signed.get16('AX'),0x8000);
const missing=new RealMode8086();
missing.load(Uint8Array.of(0xf7,0xf3),0,0);
assert.throws(()=>missing.step(),/divide error: zero divisor/);
assert.equal(missing.get16('SP'),0);
const missingOverflow=new RealMode8086();
missingOverflow.set16('AX',0x1234);missingOverflow.set16('BX',1);
missingOverflow.load(Uint8Array.of(0xf6,0xf3),0,0);
assert.throws(()=>missingOverflow.step(),/divide error: quotient overflow/);
console.log('UW2 P3 8086 DIV/IDIV INT0 installed-vector delivery synthetic regression: PASS');
