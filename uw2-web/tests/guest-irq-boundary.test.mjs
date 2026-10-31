import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {runStagedDosComChild,captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {deliverExternalMaskableIrq} from '../web/guest-irq-boundary.js';
import {installDosInt21} from '../web/dos-int21.js';

const cpu=new RealMode8086();
cpu.installInterruptVector(8,0x500,0x100);
// Hardware IRQ8 synthetic handler increments a guest RAM tick counter
// and returns using the real 8086 IRET implementation (no faked return).
// INC word ptr [0200h]; IRET
cpu.load(Uint8Array.of(0xff,0x06,0x00,0x02,0xcf),0x500,0x100);
cpu.load(Uint8Array.of(0x90,0x90,0xb8,0x00,0x4c,0xcd,0x21),0x300,0x100);
installDosInt21(cpu);
cpu.set16('CS',0x200);cpu.set16('IP',0x111);
cpu.set16('SP',0xfffe);cpu.set16('SS',0x200);
const parent=captureDosCpuFrame(cpu);
const frame={AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0x100,FLAGS:0x202};
let injected=0;
const result=runStagedDosComChild(cpu,{initialFrame:frame,maxSteps:32,
 onInstructionBoundary:({steps,cs,ip},guest)=>{
   assert.equal(typeof steps,'number');
   if(steps===1){
     const response=deliverExternalMaskableIrq(guest,{vector:8,source:'explicit-test-IRQ0'});
     assert.equal(response.delivered,true);
     assert.equal(guest.get16('CS'),0x500);
     injected++;
   }
 }});
assert.equal(result.terminationType,0);
assert.equal(result.returnCode,0);
assert.equal(injected,1);
assert.equal(cpu.read16(0x300,0x200),1);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
const masked=new RealMode8086();
masked.installInterruptVector(8,0x500,0);
masked.set16('FLAGS',2);
const before=captureDosCpuFrame(masked);
const denied=deliverExternalMaskableIrq(masked,{vector:8,source:'test-IRQ0'});
assert.equal(denied.delivered,false);
assert.equal(denied.reason,'MASKED_IF_CLEAR');
assert.deepEqual(captureDosCpuFrame(masked),before);
const unknown=new RealMode8086();
unknown.set16('FLAGS',0x202);
assert.throws(()=>deliverExternalMaskableIrq(unknown,{vector:8,source:'test-IRQ0'}),/no installed guest vector/);
assert.throws(()=>deliverExternalMaskableIrq(cpu,{vector:8}),/declare device source/);
assert.throws(()=>deliverExternalMaskableIrq(cpu,{vector:256,source:'test'}),/uint8/);
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:frame,maxSteps:10,onInstructionBoundary:()=>Promise.resolve()}),/async DOS instruction boundary/);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
// One-instruction 8086 hardware-interrupt inhibition. Software INT
// instructions are intentionally unaffected; external IRQs have their
// own dedicated delivery boundary instead of being injected in step().
const delayed=new RealMode8086();
delayed.installInterruptVector(8,0x700,0x100);
delayed.load(Uint8Array.of(0xfb,0x90,0x90),0x600,0x100); // STI, NOP, NOP
delayed.set16('CS',0x600);delayed.set16('IP',0x100);
delayed.set16('SS',0x600);delayed.set16('SP',0xfffe);
delayed.set16('FLAGS',2);
delayed.step();
assert.equal(delayed.flag('IF'),true);
assert.equal(delayed.isMaskableIrqShadowed(),true);
const defer=deliverExternalMaskableIrq(delayed,{vector:8,source:'external-IRQ0'});
assert.equal(defer.delivered,false);
assert.equal(defer.reason,'DEFERRED_AFTER_STI_OR_SS');
assert.equal(delayed.get16('CS'),0x600);
delayed.step(); // complete the next instruction before IRQ acceptance
assert.equal(delayed.isMaskableIrqShadowed(),false);
assert.equal(deliverExternalMaskableIrq(delayed,{vector:8,source:'external-IRQ0'}).delivered,true);
assert.equal(delayed.get16('CS'),0x700);

for(const [name,program,setup] of [
  ['POP SS',Uint8Array.of(0x17,0x90),c=>{
    c.set16('SS',0x600);c.set16('SP',0x100);
    c.write16(0x600,0x100,0x650);
  }],
  ['MOV SS,AX',Uint8Array.of(0x8e,0xd0,0x90),c=>c.set16('AX',0x650)]
]){
  const c=new RealMode8086();
  c.installInterruptVector(8,0x700,0x100);
  c.load(program,0x600,0x200);
  c.set16('CS',0x600);c.set16('IP',0x200);
  c.set16('FLAGS',0x202);
  c.set16('SS',0x600);c.set16('SP',0xfffe);
  setup(c);
  c.step();
  assert.equal(c.get16('SS'),0x650,name);
  assert.equal(c.isMaskableIrqShadowed(),true,name);
  assert.equal(deliverExternalMaskableIrq(c,{vector:8,source:name}).reason,
    'DEFERRED_AFTER_STI_OR_SS');
  c.step();
  assert.equal(c.isMaskableIrqShadowed(),false,name);
  assert.equal(deliverExternalMaskableIrq(c,{vector:8,source:name}).delivered,true,name);
}
const nested=new RealMode8086();
nested.load(Uint8Array.of(0xfb,0xfb,0x90),0x600,0x100);
nested.set16('CS',0x600);nested.set16('IP',0x100);
nested.set16('FLAGS',2);
nested.step();nested.step(); // second STI renews inhibition
assert.equal(nested.isMaskableIrqShadowed(),true);
nested.step();assert.equal(nested.isMaskableIrqShadowed(),false);
const parentShadow=new RealMode8086();
parentShadow.load(Uint8Array.of(0xfb),0x600,0x100);
parentShadow.load(Uint8Array.of(0xb8,0,0x4c,0xcd,0x21),0x610,0x100);
installDosInt21(parentShadow);
parentShadow.set16('CS',0x600);parentShadow.set16('IP',0x100);
parentShadow.set16('FLAGS',2);parentShadow.step();
const prior=captureDosCpuFrame(parentShadow);
runStagedDosComChild(parentShadow,{initialFrame:{...frame,CS:0x610},
  onInstructionBoundary:({steps},guest)=>{
    if(steps===0)assert.equal(guest.isMaskableIrqShadowed(),false);
  }
});
assert.deepEqual(captureDosCpuFrame(parentShadow),prior);
assert.equal(parentShadow.isMaskableIrqShadowed(),true);
console.log('UW2 original 8086 STI/POP SS/MOV SS one-instruction IRQ shadow, nested STI, DOS EXEC isolation and IRQ guest IVT: PASS');
