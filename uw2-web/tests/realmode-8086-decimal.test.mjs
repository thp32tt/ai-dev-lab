import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Synthetic 8086 decimal/IF semantics ONLY. No original DOS, browser,
// Korean assets, save, FM driver, or device execution is claimed.
const CF=1, PF=4, AF=0x10, ZF=0x40, SF=0x80, IF=0x200, DF=0x400;
const exercise=(bytes,ax,flags=IF|DF)=>{
  const cpu=new RealMode8086();
  cpu.set16('CS',0x100);cpu.set16('AX',ax);cpu.set16('FLAGS',flags);
  cpu.load(Uint8Array.from(bytes),0x100,0);cpu.step();
  assert.equal(cpu.get16('IP'),bytes.length);
  assert.equal(cpu.flag('DF'),!!(flags&DF));
  return cpu;
};
const daa=exercise([0x27],0x009b);
assert.equal(daa.get16('AX'),0x0001);
assert.equal(daa.flag('AF'),true);assert.equal(daa.flag('CF'),true);
assert.equal(daa.flag('ZF'),false);assert.equal(daa.flag('PF'),false);
const daaAF=exercise([0x27],0x0009,IF|AF);
assert.equal(daaAF.get8('AL'),0x0f);
assert.equal(daaAF.flag('AF'),true);assert.equal(daaAF.flag('CF'),false);
const daaZero=exercise([0x27],0x0000);
assert.equal(daaZero.get8('AL'),0);
assert.equal(daaZero.flag('ZF'),true);assert.equal(daaZero.flag('PF'),true);
const das=exercise([0x2f],0x009b);
assert.equal(das.get8('AL'),0x35);
assert.equal(das.flag('AF'),true);assert.equal(das.flag('CF'),true);
const dasCF=exercise([0x2f],0x0001,IF|CF);
assert.equal(dasCF.get8('AL'),0xa1);
assert.equal(dasCF.flag('CF'),true);assert.equal(dasCF.flag('AF'),false);
const aaa=exercise([0x37],0x000a);
assert.equal(aaa.get16('AX'),0x0100);
assert.equal(aaa.flag('CF'),true);assert.equal(aaa.flag('AF'),true);
const aas=exercise([0x3f],0x030a);
assert.equal(aas.get16('AX'),0x0204);
assert.equal(aas.flag('AF'),true);assert.equal(aas.flag('CF'),true);
const aaaNo=exercise([0x37],0x1209,IF|CF|AF&0); // no correction
assert.equal(aaaNo.get16('AX'),0x1209);
assert.equal(aaaNo.flag('CF'),false);assert.equal(aaaNo.flag('AF'),false);
const aam=exercise([0xd4,0x0a],42,IF|DF|CF|AF);
assert.equal(aam.get16('AX'),0x0402);
assert.equal(aam.flag('CF'),true);assert.equal(aam.flag('AF'),true);
assert.equal(aam.flag('PF'),false);assert.equal(aam.flag('ZF'),false);
const aam16=exercise([0xd4,0x10],0x002f);
assert.equal(aam16.get16('AX'),0x020f);
const aamZero=exercise([0xd4,10],0);
assert.equal(aamZero.flag('ZF'),true);assert.equal(aamZero.flag('PF'),true);
const aad=exercise([0xd5,0x0a],0x0304);
assert.equal(aad.get16('AX'),0x0022);
assert.equal(aad.flag('PF'),true);assert.equal(aad.flag('ZF'),false);
const aadWrap=exercise([0xd5,0x10],0x80f0);
assert.equal(aadWrap.get16('AX'),0x00f0);
assert.equal(aadWrap.flag('SF'),true);
const invalid= new RealMode8086();
invalid.set16('AX',0xabcd);invalid.set16('FLAGS',IF|AF|CF);
invalid.load(Uint8Array.of(0xd4,0),0,0);
assert.throws(()=>invalid.step(),/AAM base zero raises INT 0/);
assert.equal(invalid.get16('AX'),0xabcd);
assert.equal(invalid.get16('FLAGS'),IF|AF|CF|2);
// AAM base=00h is a real #DE/type-0 interrupt, not an unconditional host
// error when an original DOS vector or explicit CPU adapter is installed.
const trapped=new RealMode8086();
trapped.set16('CS',0x1000);trapped.set16('SS',0x3000);
trapped.set16('SP',0x0100);trapped.set16('AX',0xabcd);
trapped.set16('FLAGS',IF|AF|CF|DF);
trapped.load(Uint8Array.of(0xd4,0x00),0x1000,0);
trapped.installInterruptVector(0,0x5000,0x0020);
trapped.step();
assert.equal(trapped.get16('CS'),0x5000);
assert.equal(trapped.get16('IP'),0x0020);
assert.equal(trapped.get16('AX'),0xabcd); // no result written on fault
assert.equal(trapped.get16('SP'),0x00fa);
assert.equal(trapped.read16(0x3000,0x00fa),2); // saved post-immediate IP
assert.equal(trapped.read16(0x3000,0x00fc),0x1000);
assert.equal(trapped.read16(0x3000,0x00fe),IF|AF|CF|DF|2);
assert.equal(trapped.flag('IF'),false);
const adapterFault=new RealMode8086();
adapterFault.load(Uint8Array.of(0xd4,0),0,0);
adapterFault.set16('AX',0xbeef);
let faults=0;
adapterFault.installInterruptAdapter(0,()=>{faults++;});
adapterFault.step();
assert.equal(faults,1);
assert.equal(adapterFault.get16('AX'),0xbeef);
assert.equal(adapterFault.get16('IP'),2);
// CLI and STI change only IF while preserving arithmetic and direction flags.
const ifState=new RealMode8086();
ifState.set16('FLAGS',IF|DF|AF|CF|PF);
ifState.load(Uint8Array.of(0xfa,0xfb),0,0);
ifState.step();
assert.equal(ifState.flag('IF'),false);
assert.equal(ifState.flag('DF'),true);
assert.equal(ifState.flag('CF'),true);
ifState.step();
assert.equal(ifState.flag('IF'),true);
assert.equal(ifState.get16('FLAGS'),IF|DF|AF|CF|PF|2);
// Later-generation PUSHA remains out-of-contract.
const not8086=new RealMode8086();
not8086.load(Uint8Array.of(0x60),0,0);
assert.throws(()=>not8086.step(),/unsupported 8086 opcode/);
console.log('UW2 P3 8086 BCD adjust AAM/AAD and CLI/STI synthetic regression: PASS');
