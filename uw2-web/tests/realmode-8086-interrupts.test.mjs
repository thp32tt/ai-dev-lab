import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Entirely synthetic interrupt-vector/stack instruction semantics.
// No actual DOS kernel, INT 21h service, original EXE or browser has run.
const create=(bytes,setup=()=>{})=>{
  const c=new RealMode8086();c.set16('CS',0x100);c.set16('SS',0x200);
  c.set16('SP',0x100);setup(c);
  c.load(Uint8Array.from(bytes),0x100,0);return c;
};
const enter=create([0xcd,0x21],c=>{
  c.installInterruptVector(0x21,0x300,0x20);
  c.load(Uint8Array.from([0xcf]),0x300,0x20); // IRET only; no fake DOS return.
  c.set16('FLAGS',0xb03); // OF+TF+IF+CF.
});
assert.equal(enter.read16(0,0x84),0x20);
assert.equal(enter.read16(0,0x86),0x300);
enter.step();
assert.equal(enter.get16('CS'),0x300);
assert.equal(enter.get16('IP'),0x20);
assert.equal(enter.get16('SP'),0xfa);
assert.equal(enter.read16(0x200,0xfa),2); // return IP (after int imm8)
assert.equal(enter.read16(0x200,0xfc),0x100); // return CS
assert.equal(enter.read16(0x200,0xfe),0xb03); // saved FLAGS
assert.equal(enter.flag('IF'),false);
assert.equal(enter.flag('TF'),false);
assert.equal(enter.flag('OF'),true);
assert.equal(enter.flag('CF'),true);
enter.step(); // Real IRET, not a hand-written JS branch.
assert.equal(enter.get16('CS'),0x100);
assert.equal(enter.get16('IP'),2);
assert.equal(enter.get16('SP'),0x100);
assert.equal(enter.get16('FLAGS'),0xb03);

// INT3 pushes the 1-byte return address, even though CD 03 also exists.
const breakpoint=create([0xcc],c=>c.installInterruptVector(3,0x400,0x30));
breakpoint.step();
assert.equal(breakpoint.get16('CS'),0x400);
assert.equal(breakpoint.get16('IP'),0x30);
assert.equal(breakpoint.read16(0x200,0xfa),1);
// INTO only enters interrupt 4 on overflow; otherwise it does not access IVT.
const noOverflow=create([0xce],c=>c.set16('FLAGS',0x202));
noOverflow.step();
assert.equal(noOverflow.get16('IP'),1);
assert.equal(noOverflow.get16('SP'),0x100);
const overflow=create([0xce],c=>{
  c.installInterruptVector(4,0x500,0x40);c.set16('FLAGS',0x802);
});
overflow.step();
assert.equal(overflow.get16('CS'),0x500);
assert.equal(overflow.get16('IP'),0x40);
assert.equal(overflow.read16(0x200,0xfa),1);

// Missing DOS/BIOS host implementation MUST NOT jump to a blank IVT entry.
for(const bytes of [[0xcd,0x21],[0xcc]]){
  const c=create(bytes,x=>x.set16('FLAGS',0xb13));
  const memoryBefore=c.read16(0x200,0xfa);
  assert.throws(()=>c.step(),/no installed vector\/DOS adapter: fail closed/);
  assert.equal(c.get16('CS'),0x100);
  assert.equal(c.get16('SP'),0x100);
  assert.equal(c.get16('FLAGS'),0xb13);
  assert.equal(c.read16(0x200,0xfa),memoryBefore);
}
const missingInto=create([0xce],c=>c.set16('FLAGS',0x802));
assert.throws(()=>missingInto.step(),/no installed vector/);
assert.equal(missingInto.get16('SP'),0x100);

// Exact vector bounds and non-destructive rejection.
const invalid=create([0x90]);
assert.throws(()=>invalid.installInterruptVector(256,0x400,0),/uint8/);
assert.throws(()=>invalid.installInterruptVector(-1,0x400,0),/uint8/);
assert.throws(()=>invalid.installInterruptVector(0x21,-1,0),/uint16/);
assert.equal(invalid.interruptVectors.size,0);
console.log('UW2 P3 8086 INT3/INT/INTO/IRET vector synthetic regression: PASS');
