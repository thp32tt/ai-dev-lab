import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createBrowserDosChildBridge} from '../web/browser-dos-child-bridge.js';
import {createOriginalMasterPicCommandWitness}
  from '../web/guest-pic8259-command-witness.js';

// Synthetic browser event target and explicit synthetic external IRQ0 edges.
// No real DOS PIC snapshot/IRQ timing or actual browser isTrusted claim.
const listeners=new Map();let removed=0;
const target={
  addEventListener(type,fn){
    if(listeners.has(type))throw new Error('duplicate browser listener');
    listeners.set(type,fn);
  },
  removeEventListener(type,fn){
    if(listeners.get(type)===fn){listeners.delete(type);removed++;}
  }
};
const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
  CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0x100,FLAGS:2};
const cpu=new RealMode8086();
cpu.set16('CS',0x200);cpu.set16('SS',0x200);
cpu.set16('SP',0xfffe);cpu.set16('IP',0x1234);
const parent=captureDosCpuFrame(cpu);
cpu.load(Uint8Array.of(
  0xfb,0x90,             // STI; NOP (STI IRQ shadow)
  0xb4,0x00,0xcd,0x16,  // MOV AH,00; BIOS keyboard wait
  0xa2,0x00,0x02,       // MOV [0200],AL (real ASCII)
  0xb8,0x00,0x4c,0xcd,0x21
),0x300,0x100);
cpu.load(Uint8Array.of(
  0xb0,0x20,  // MOV AL,20h
  0xe6,0x20,  // native OUT 20h,AL (real EOI instruction)
  0xcf        // native IRET (not EOI)
),0x440,0x100);
cpu.installInterruptVector(8,0x440,0x100);
installDosInt21(cpu);
const events=[];
const pic=createOriginalMasterPicCommandWitness({
  irq0OwnerCpu:cpu,initialIrq0InService:false,
  onCommand:event=>{events.push(event);}
});
cpu.registerIOPort(0x20,pic.port20);
const bridge=createBrowserDosChildBridge({
  cpu,target,initialFrame:frame,maxQueuedKeys:2,
  maxTotalSteps:24,maxQueuedExternalIrqs:2,picCommandWitness:pic
});
const firstEdge={vector:8,source:'explicit-synthetic-browser-host-IRQ0-A'};
const secondEdge={vector:8,source:'explicit-synthetic-browser-host-IRQ0-B'};
assert.equal(bridge.enqueueExternalIrqEdge(firstEdge).accepted,1);
assert.equal(bridge.enqueueExternalIrqEdge(secondEdge).accepted,2);
assert.equal(bridge.snapshot().child.irqEdges.pending,2);
assert.equal(bridge.runSlice(1).irq.reason,'MASKED_IF_CLEAR'); // STI
assert.equal(bridge.runSlice(1).irq.reason,'DEFERRED_AFTER_STI_OR_SS'); // NOP
assert.equal(bridge.runSlice(1).irq.delivered,true); // ISR MOV AL,20h
assert.equal(pic.snapshot().irq0InService,true);
const held=bridge.runSlice(1); // PIC blocked; OUT 20h,AL executes
assert.equal(held.irq.reason,'DEFERRED_PIC_IRQ0_IN_SERVICE');
assert.equal(pic.snapshot().irq0Eois,1);
assert.equal(pic.snapshot().irq0InService,false);
assert.equal(bridge.runSlice(1).irq.reason,'MASKED_IF_CLEAR'); // ISR IRET
assert.equal(bridge.runSlice(1).irq.delivered,true); // second ISR
assert.equal(pic.snapshot().irq0Delivered,2);
assert.equal(bridge.snapshot().child.irqEdges.pending,0);
assert.equal(bridge.runSlice(2).irq,null); // second OUT 20h / IRET
assert.equal(pic.snapshot().irq0Eois,2);
assert.equal(pic.snapshot().irq0InService,false);
const waiting=bridge.runSlice(10);
assert.equal(waiting.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(waiting.state,'ACTIVE');
assert.equal(bridge.snapshot().queue.pending,0);
assert.equal(listeners.has('keydown'),true);
const untrusted={type:'keydown',isTrusted:false,code:'KeyA',key:'a',
  preventDefault(){}};
listeners.get('keydown')(untrusted);
assert.equal(bridge.snapshot().queue.pending,0);
const trusted={type:'keydown',isTrusted:true,code:'KeyA',key:'a',cancelable:true,
  preventDefault(){this.prevented=true;}};
listeners.get('keydown')(trusted);
assert.equal(trusted.prevented,true);
const done=bridge.runSlice(10);
assert.equal(done.state,'COMPLETED');
assert.equal(done.reason,'TERMINATED');
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(cpu.read8(0x300,0x200),97);
assert.equal(events.length,2);
assert.deepEqual(events.map(e=>e.value),[0x20,0x20]);
assert.equal(bridge.snapshot().child.irqEdges.delivered,2);
assert.equal(bridge.snapshot().child.irqEdges.picDeferred,1);
assert.equal(bridge.snapshot().detached,true);
assert.equal(listeners.size,0);
assert.equal(removed,1);
assert.throws(()=>bridge.enqueueExternalIrqEdge(firstEdge),/not active/);

// An invalid PIC binding must not leave a trusted browser keyboard listener
// attached, nor should it partially stage the suspended parent CPU.
const badCpu=new RealMode8086();
badCpu.set16('CS',0x250);badCpu.set16('SS',0x250);
const wrongPic=createOriginalMasterPicCommandWitness({
  irq0OwnerCpu:badCpu,initialIrq0InService:false
});
const before=captureDosCpuFrame(badCpu);
assert.throws(()=>createBrowserDosChildBridge({
  cpu:badCpu,target,initialFrame:frame,picCommandWitness:wrongPic
}),/exact guest port 20h handler/);
assert.deepEqual(captureDosCpuFrame(badCpu),before);
assert.equal(listeners.size,0);
assert.equal(removed,2);
console.log('UW2 explicit browser IRQ0 source -> PIC native EOI/IRET plus trusted-key wait/resume: PASS (synthetic)');
