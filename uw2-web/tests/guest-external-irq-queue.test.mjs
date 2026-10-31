import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createExternalGuestIrqEdgeQueue} from '../web/guest-external-irq-queue.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';

const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
  CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0x100,FLAGS:0x002};
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xfb,0x90,0x90,0xb8,0,0x4c,0xcd,0x21),0x300,0x100);
cpu.load(Uint8Array.of(0xff,0x06,0x00,0x02,0xcf),0x500,0x100);
cpu.installInterruptVector(8,0x500,0x100);
cpu.set16('CS',0x200);cpu.set16('IP',0x1234);
cpu.set16('SS',0x200);cpu.set16('SP',0xf000);
const parent=captureDosCpuFrame(cpu);
installDosInt21(cpu);
const child=createStagedDosChildContinuation(cpu,{initialFrame:frame,maxTotalSteps:30,
  maxQueuedExternalIrqs:2});
assert.equal(child.snapshot().irqEdges.accepted,0);
assert.equal(child.runSlice(1).irq,null); // STI is actual instruction, no clock
assert.equal(child.snapshot().steps,1);
const stateBeforeQueue=captureDosCpuFrame(cpu);
child.enqueueExternalIrqEdge({vector:8,source:'captured-device-IRQ0-edge'});
assert.deepEqual(captureDosCpuFrame(cpu),stateBeforeQueue);
assert.equal(child.snapshot().irqEdges.pending,1);
const deferred=child.runSlice(1);
assert.equal(deferred.irq.reason,'DEFERRED_AFTER_STI_OR_SS');
assert.equal(child.snapshot().irqEdges.pending,1);
assert.equal(child.snapshot().irqEdges.deferred,1);
assert.equal(cpu.get16('CS'),0x300);
const delivered=child.runSlice(1);
assert.equal(delivered.irq.delivered,true);
assert.equal(delivered.irq.vector,8);
assert.equal(cpu.get16('CS'),0x500);
assert.equal(child.snapshot().irqEdges.delivered,1);
assert.equal(child.snapshot().irqEdges.pending,0);
assert.equal(cpu.read16(0x300,0x200),1); // Real INC [0200h] from handler
const resumed=child.runSlice(1);
assert.equal(resumed.irq,null);
assert.equal(cpu.get16('CS'),0x300); // Real IRET
let end;
do{end=child.runSlice(2);}while(end.state==='ACTIVE');
assert.equal(end.reason,'TERMINATED');
assert.equal(end.result.returnCode,0);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(child.snapshot().irqEdges.accepted,1);
assert.equal(child.snapshot().irqEdges.delivered,1);
assert.throws(()=>child.enqueueExternalIrqEdge({vector:8,source:'late'}),/not active/);
const paused=createStagedDosChildContinuation(cpu,{initialFrame:frame,maxTotalSteps:20,
 maxQueuedExternalIrqs:1});
assert.throws(()=>paused.enqueueExternalIrqEdge({vector:9,source:'unowned'}),/verified guest IVT/);
paused.enqueueExternalIrqEdge({vector:8,source:'one'});
assert.throws(()=>paused.enqueueExternalIrqEdge({vector:8,source:'two'}),/overflow/);
const noIf=paused.runSlice(1); // before STI: IF=0, IRQ stays queued
assert.equal(noIf.irq.reason,'MASKED_IF_CLEAR');
assert.equal(paused.snapshot().irqEdges.pending,1);
assert.equal(paused.abort().state,'ABORTED');
assert.equal(paused.snapshot().irqEdges.pending,0);
assert.equal(paused.snapshot().irqEdges.discarded,1);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
const q=createExternalGuestIrqEdgeQueue(new RealMode8086(),{maxPending:1});
assert.throws(()=>q.enqueue({vector:8,source:'unowned'}),/verified guest IVT/);
assert.equal(q.snapshot().accepted,0);
assert.throws(()=>createExternalGuestIrqEdgeQueue(cpu,{maxPending:0}),/cap/);
console.log('UW2 external-source IRQ edge queued across native DOS child STI shadow, delivery, IRET and abort: PASS (synthetic)');


// A queued IRQ cannot enter an ISR after the CPU's hard native-step budget
// was reached. IF=0 on the first step leaves it pending until abort.
const budgetCpu=new RealMode8086();
budgetCpu.load(Uint8Array.of(0x90,0x90),0x620,0);
budgetCpu.load(Uint8Array.of(0xcf),0x630,0);
budgetCpu.installInterruptVector(8,0x630,0);
budgetCpu.set16('CS',0x200);budgetCpu.set16('SS',0x200);
budgetCpu.set16('SP',0xfffe);
const budgetFrame={...frame,CS:0x620,DS:0x620,ES:0x620,
 SS:0x620,SP:0xfffe,IP:0,FLAGS:0x002};
const budgetChild=createStagedDosChildContinuation(budgetCpu,{
 initialFrame:budgetFrame,maxTotalSteps:1
});
budgetChild.enqueueExternalIrqEdge({vector:8,source:'explicit-budget-test'});
const firstBudget=budgetChild.runSlice(1);
assert.equal(firstBudget.irq.reason,'MASKED_IF_CLEAR');
assert.equal(firstBudget.reason,'TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(budgetChild.snapshot().irqEdges.pending,1);
const stack=captureDosCpuFrame(budgetCpu);
const noDelivery=budgetChild.runSlice(1);
assert.equal(noDelivery.sliceSteps,0);
assert.equal(noDelivery.irq,null);
assert.deepEqual(captureDosCpuFrame(budgetCpu),stack);
assert.equal(budgetChild.snapshot().irqEdges.delivered,0);
assert.throws(()=>budgetChild.enqueueExternalIrqEdge({
 vector:8,source:'late-irq'
}),/after original instruction budget/);
assert.equal(budgetChild.abort().irqEdges.discarded,1);
