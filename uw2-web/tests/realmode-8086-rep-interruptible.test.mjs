import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {deliverExternalMaskableIrq} from '../web/guest-irq-boundary.js';

// Synthetic original-8086 instruction behavior, NOT a measured DOSBox or
// real PIT/PIC reference. Explicit microstep mode is opt-in and bounded.
const make=(code)=>{
  const cpu=new RealMode8086(new Uint8Array(0x100000),{interruptibleRepStrings:true});
  cpu.set16('CS',0x100);cpu.set16('DS',0x200);cpu.set16('ES',0x300);
  cpu.set16('SS',0x500);cpu.set16('SP',0xfffe);
  cpu.set16('FLAGS',0x202);
  cpu.load(Uint8Array.from(code),0x100,0);
  return cpu;
};
assert.throws(()=>new RealMode8086(undefined,{interruptibleRepStrings:'yes'}),/must be boolean/);
const mov=make([0xf3,0xa4,0x90]); // REP MOVSB, NOP
mov.installInterruptVector(8,0x700,0x100);
mov.load(Uint8Array.of(0xcf),0x700,0x100); // original guest IRET
mov.set16('SI',0x20);mov.set16('DI',0x30);mov.set16('CX',3);
for(let i=0;i<3;i++)mov.write8(0x200,0x20+i,0xa1+i);
mov.step();
assert.equal(mov.get16('IP'),0);
assert.equal(mov.get16('CX'),2);
assert.equal(mov.get16('SI'),0x21);
assert.equal(mov.get16('DI'),0x31);
assert.equal(mov.read8(0x300,0x30),0xa1);
assert.equal(mov.read8(0x300,0x31),0);
const edge=deliverExternalMaskableIrq(mov,{vector:8,source:'EXPLICIT_TEST_IRQ0'});
assert.equal(edge.delivered,true);
assert.equal(mov.read16(0x500,0xfff8),0); // IRET resumes original REP prefix
assert.equal(mov.get16('CS'),0x700);
mov.step(); // ISR IRET
assert.equal(mov.get16('CS'),0x100);
assert.equal(mov.get16('IP'),0);
mov.step(); // second byte: not a replay of the first byte
assert.equal(mov.get16('CX'),1);
assert.equal(mov.get16('IP'),0);
mov.step();
assert.equal(mov.get16('CX'),0);
assert.equal(mov.get16('IP'),2);
assert.deepEqual([0,1,2].map(i=>mov.read8(0x300,0x30+i)),[0xa1,0xa2,0xa3]);
mov.step();assert.equal(mov.get16('IP'),3);

// Different prefix orders, DF, and 16-bit segment-index wrap do not lose
// architectural prefix/IP provenance across a split REP iteration.
const reversed=make([0xfd,0x26,0xf3,0xa5,0xfc]); // STD; ES: REP MOVSW; CLD
reversed.set16('SI',0);reversed.set16('DI',0);reversed.set16('CX',2);
reversed.write16(0x300,0,0x1122);
reversed.write16(0x300,0xfffe,0x3344);
reversed.step();assert.equal(reversed.flag('DF'),true);
reversed.step();assert.equal(reversed.get16('IP'),1);
assert.equal(reversed.get16('CX'),1);
assert.equal(reversed.get16('SI'),0xfffe);
assert.equal(reversed.get16('DI'),0xfffe);
reversed.step();assert.equal(reversed.get16('IP'),4);
assert.equal(reversed.read16(0x300,0),0x1122);
assert.equal(reversed.read16(0x300,0xfffe),0x3344);
reversed.step();assert.equal(reversed.flag('DF'),false);

const cmps=make([0xf3,0xa6]);
cmps.set16('CX',3);
[1,2,3].forEach((v,i)=>cmps.write8(0x200,i,v));
[1,9,3].forEach((v,i)=>cmps.write8(0x300,i,v));
cmps.step();assert.equal(cmps.get16('IP'),0);
assert.equal(cmps.flag('ZF'),true);
assert.equal(cmps.get16('CX'),2);
cmps.step();assert.equal(cmps.get16('IP'),2);
assert.equal(cmps.flag('ZF'),false);
assert.equal(cmps.flag('CF'),true);
assert.equal(cmps.get16('CX'),1);
assert.equal(cmps.get16('SI'),2);
assert.equal(cmps.get16('DI'),2);

const scas=make([0xf2,0xae]); // REPNE SCASB
scas.set16('CX',4);scas.set8('AL',0x80);scas.set16('DI',0x80);
[1,2,0x80,9].forEach((v,i)=>scas.write8(0x300,0x80+i,v));
scas.step();assert.equal(scas.get16('IP'),0);
scas.step();assert.equal(scas.get16('IP'),0);
scas.step();assert.equal(scas.get16('IP'),2);
assert.equal(scas.flag('ZF'),true);
assert.equal(scas.get16('CX'),1);
assert.equal(scas.get16('DI'),0x83);

const stos=make([0xf2,0xab]); // REPNE STOSW ignores ZF
stos.set16('AX',0xdead);stos.set16('DI',0xfffe);stos.set16('CX',2);
stos.step();assert.equal(stos.get16('IP'),0);
assert.equal(stos.read16(0x300,0xfffe),0xdead);
stos.step();assert.equal(stos.get16('IP'),2);
assert.equal(stos.read16(0x300,0),0xdead);
const lods=make([0xf3,0xad]); // REP LODSW
lods.set16('CX',2);lods.set16('SI',0x10);
lods.write16(0x200,0x10,0x1234);lods.write16(0x200,0x12,0x5678);
lods.step();assert.equal(lods.get16('IP'),0);
assert.equal(lods.get16('AX'),0x1234);
lods.step();assert.equal(lods.get16('IP'),2);
assert.equal(lods.get16('AX'),0x5678);
assert.equal(lods.get16('SI'),0x14);
const zero=make([0xf3,0xa4]);
zero.set16('CX',0);zero.step();assert.equal(zero.get16('IP'),2);
assert.equal(zero.get16('SI'),0);assert.equal(zero.get16('DI'),0);

// A STI or SS-load inhibits IRQs until AFTER the *whole* next REP
// instruction, even when host microstep mode is explicitly enabled.
for(const [name,program,setup,start] of [
  ['STI',[0xfb,0xf3,0xa4],cpu=>cpu.set16('FLAGS',2),1],
  ['MOV SS,AX',[0x8e,0xd0,0xf3,0xa4],cpu=>cpu.set16('AX',0x500),2],
  ['POP SS',[0x17,0xf3,0xa4],cpu=>{
    cpu.set16('SP',0x100);cpu.write16(0x500,0x100,0x500);
  },1]
]){
  const c=make(program);
  c.installInterruptVector(8,0x700,0x100);
  c.set16('CX',3);c.set16('SI',0x20);c.set16('DI',0x30);
  c.write8(0x200,0x20,1);c.write8(0x200,0x21,2);c.write8(0x200,0x22,3);
  setup(c);
  c.step();assert.equal(c.get16('IP'),start,name);
  assert.equal(c.isMaskableIrqShadowed(),true,name);
  if(c.flag('IF'))assert.equal(deliverExternalMaskableIrq(c,{vector:8,source:name}).reason,
    'DEFERRED_AFTER_STI_OR_SS');
  c.step(); // next entire instruction, not the first of three iterations
  assert.equal(c.get16('IP'),program.length,name);
  assert.equal(c.get16('CX'),0,name);
  assert.equal(c.isMaskableIrqShadowed(),false,name);
  assert.deepEqual([0,1,2].map(i=>c.read8(0x300,0x30+i)),[1,2,3],name);
}

// Default core behavior and historic instruction-count budgets are retained.
const atomic=new RealMode8086();
atomic.load(Uint8Array.of(0xf3,0xa4),0,0);
atomic.set16('DS',0x200);atomic.set16('ES',0x300);
atomic.set16('CX',3);
[7,8,9].forEach((v,i)=>atomic.write8(0x200,i,v));
atomic.step();
assert.equal(atomic.get16('IP'),2);
assert.equal(atomic.get16('CX'),0);
assert.deepEqual([0,1,2].map(i=>atomic.read8(0x300,i)),[7,8,9]);
console.log('UW2 8086 optional REP per-iteration IRQ/IRET resume, CX/DF/flags, prefix rewind, STI/SS shadow: PASS');
