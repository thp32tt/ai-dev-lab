import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {createOriginalMasterPicCommandWitness}
  from '../web/guest-pic8259-command-witness.js';
import {createExternalGuestIrqEdgeQueue} from '../web/guest-external-irq-queue.js';

// All input bytes, IRQ edges, and initial PIC service state are SYNTHETIC.
// Only actual guest OUT 20h,20h may release an opted-in in-service IRQ0.
const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
  CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0x100,FLAGS:0x202};
const makeCpu=(handler)=>{
  const cpu=new RealMode8086();
  cpu.set16('CS',0x200);cpu.set16('SS',0x200);
  cpu.set16('SP',0xfffe);cpu.set16('IP',0x1234);
  cpu.load(Uint8Array.of(0x90,0x90,0x90,0xb8,0,0x4c,0xcd,0x21),0x300,0x100);
  cpu.load(handler,0x500,0x100);
  cpu.installInterruptVector(8,0x500,0x100);
  installDosInt21(cpu);
  return cpu;
};
const cpu=makeCpu(Uint8Array.of(
  0xb0,0x20, // MOV AL,20h
  0xe6,0x20, // OUT 20h,AL (real native CPU instruction)
  0xcf       // IRET (not an EOI)
));
const parent=captureDosCpuFrame(cpu);
const seen=[];
const pic=createOriginalMasterPicCommandWitness({
  irq0OwnerCpu:cpu,initialIrq0InService:false,
  onCommand:event=>{seen.push(event);}
});
cpu.registerIOPort(0x20,pic.port20);
const child=createStagedDosChildContinuation(cpu,{
  initialFrame:frame,maxTotalSteps:32,picCommandWitness:pic
});
child.enqueueExternalIrqEdge({vector:8,source:'explicit-synthetic-first'});
child.enqueueExternalIrqEdge({vector:8,source:'explicit-synthetic-second'});
const first=child.runSlice(1);
assert.equal(first.irq.delivered,true);
assert.equal(pic.snapshot().irq0InService,true);
assert.equal(pic.snapshot().irq0Delivered,1);
assert.equal(pic.snapshot().commands,0);
const delayed=child.runSlice(1);
assert.equal(delayed.irq.reason,'DEFERRED_PIC_IRQ0_IN_SERVICE');
assert.equal(delayed.irq.delivered,false);
assert.equal(delayed.irqEdges.pending,1);
assert.equal(pic.snapshot().commands,1); // Actual guest OUT 20h,AL
assert.equal(pic.snapshot().irq0Eois,1);
assert.equal(pic.snapshot().irq0InService,false);
assert.equal(seen[0].value,0x20);
assert.equal(child.runSlice(1).irq.reason,'MASKED_IF_CLEAR'); // IRET restores IF
assert.equal(child.runSlice(1).irq.delivered,true);
assert.equal(pic.snapshot().irq0Delivered,2);
assert.equal(pic.snapshot().irq0InService,true);
assert.equal(child.runSlice(1).irq,null); // no third edge; second handler executes native EOI
assert.equal(pic.snapshot().commands,2);
assert.equal(pic.snapshot().irq0Eois,2);
assert.equal(child.runSlice(1).irq,null); // second handler executes native IRET
let end;
do{end=child.runSlice(5);}while(end.state==='ACTIVE'&&end.reason!=='TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(end.state,'COMPLETED');
assert.equal(end.result.returnCode,0);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(child.snapshot().irqEdges.delivered,2);
assert.equal(child.snapshot().irqEdges.picDeferred,1);
assert.equal(pic.snapshot().irq0InService,false);

// IRET alone does not clear PIC service. The second explicit IRQ must
// remain pending even when the guest has restored its own IF bit.
const withoutEoi=makeCpu(Uint8Array.of(0xcf));
const noEoiPic=createOriginalMasterPicCommandWitness({
 irq0OwnerCpu:withoutEoi,initialIrq0InService:false
});
withoutEoi.registerIOPort(0x20,noEoiPic.port20);
const stuck=createStagedDosChildContinuation(withoutEoi,{
 initialFrame:frame,maxTotalSteps:20,picCommandWitness:noEoiPic
});
stuck.enqueueExternalIrqEdge({vector:8,source:'first'});
stuck.enqueueExternalIrqEdge({vector:8,source:'second'});
assert.equal(stuck.runSlice(1).irq.delivered,true); // ISR IRET executed
assert.equal(withoutEoi.flag('IF'),true);
assert.equal(stuck.runSlice(1).irq.reason,'DEFERRED_PIC_IRQ0_IN_SERVICE');
assert.equal(stuck.snapshot().irqEdges.pending,1);
assert.equal(stuck.snapshot().irqEdges.delivered,1);
assert.equal(noEoiPic.snapshot().irq0Eois,0);
assert.equal(stuck.abort().irqEdges.discarded,1);

// Gate state is explicitly source provided; never infer an initial clear PIC.
assert.throws(()=>createOriginalMasterPicCommandWitness({
 irq0OwnerCpu:cpu
}),/explicit initial/);
assert.throws(()=>createOriginalMasterPicCommandWitness({
 initialIrq0InService:false
}),/requires a guest CPU/);
const initialHeld=createOriginalMasterPicCommandWitness({
 irq0OwnerCpu:cpu,initialIrq0InService:true
});
assert.equal(initialHeld.canAdmitIrq0(cpu,{vector:8,source:'edge'}),false);
assert.throws(()=>initialHeld.canAdmitIrq0(withoutEoi,{
 vector:8,source:'edge'
}),/exact opted-in/);
assert.throws(()=>initialHeld.canAdmitIrq0(cpu,{
 vector:9,source:'edge'
}),/only explicit IVT 08h/);
assert.throws(()=>createExternalGuestIrqEdgeQueue(cpu,{
 picCommandWitness:createOriginalMasterPicCommandWitness()
}),/exact original CPU witness/);
assert.throws(()=>createExternalGuestIrqEdgeQueue(cpu,{
 picCommandWitness:noEoiPic
}),/exact original CPU witness/);
const otherQueue=createExternalGuestIrqEdgeQueue(cpu,{
 picCommandWitness:initialHeld
});
assert.throws(()=>otherQueue.enqueue({vector:9,source:'second PIC line'}),
 /verified guest IVT|other interrupt lines/);
assert.equal(otherQueue.snapshot().accepted,0);
assert.equal(initialHeld.snapshot().irq0InService,true);
const rejecting=createOriginalMasterPicCommandWitness({
 irq0OwnerCpu:cpu,initialIrq0InService:true,
 onCommand:()=>Promise.resolve()
});
assert.throws(()=>rejecting.port20.out8(0x20,0x20,cpu),
 /async master PIC/);
assert.equal(rejecting.snapshot().irq0InService,true);
assert.equal(rejecting.snapshot().commands,0);
assert.throws(()=>rejecting.port20.out8(0x20,0x20,withoutEoi),
 /non-owning guest CPU/);
console.log('UW2 opt-in original guest IRQ0 in-service and native PIC EOI gate: PASS (synthetic)');
