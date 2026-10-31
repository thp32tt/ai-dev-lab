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
console.log('UW2 external IRQ0 guest IVT IF gate/IRET and bounded DOS child frame regression: PASS');
