import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createBrowserDosChildBridge} from '../web/browser-dos-child-bridge.js';
// This is an artificial event-target fixture. It does not impersonate
// real browser isTrusted semantics or the user's keyboard layout.
const listeners=new Map();let removed=0;
const target={
 addEventListener(t,callback){listeners.set(t,callback);},
 removeEventListener(t,callback){
   if(listeners.get(t)===callback){listeners.delete(t);removed++;}
 }
};
const cpu=new RealMode8086();
cpu.set16('CS',0x200);cpu.set16('SS',0x200);
cpu.set16('SP',0x1000);cpu.set16('IP',0x4321);
const parent=captureDosCpuFrame(cpu);
cpu.load(Uint8Array.of(
  0xb4,0,0xcd,0x16,0xa2,0x00,0x02,0xb8,0,0x4c,0xcd,0x21
),0x500,0);
installDosInt21(cpu);
const frame={AX:0,CX:0,DX:0,BX:0,SP:0x1000,BP:0,SI:0,DI:0,
 CS:0x500,DS:0x500,ES:0x500,SS:0x500,IP:0,FLAGS:0x202};
const b=createBrowserDosChildBridge({
 cpu,target,initialFrame:frame,maxQueuedKeys:1,maxTotalSteps:8
});
const stop=b.runSlice(10);
assert.equal(stop.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(stop.steps,1);
assert.equal(stop.childFrame.IP,2);
assert.equal(b.runSlice(1).sliceSteps,0);
assert.equal(b.snapshot().queue.pending,0);
const key=(trusted)=>({type:'keydown',isTrusted:trusted,
 key:'a',code:'KeyA',cancelable:true,
 preventDefault(){this.prevented=true;}});
const invalid=key(false);
listeners.get('keydown')(invalid);
assert.equal(b.snapshot().queue.pending,0);
const pressed=key(true);
listeners.get('keydown')(pressed);
assert.equal(pressed.prevented,true);
const complete=b.runSlice(10);
assert.equal(complete.state,'COMPLETED');
assert.equal(complete.reason,'TERMINATED');
assert.equal(complete.result.returnCode,0);
assert.equal(complete.steps,5);
assert.deepEqual(captureDosCpuFrame(cpu),parent);
assert.equal(cpu.read8(0x500,0x200),97);
assert.equal(b.snapshot().queue.consumed,1);
assert.equal(cpu.interruptAdapters.has(0x16),false); // child owned BIOS released
assert.equal(b.snapshot().detached,true); // auto detach on real child exit
assert.equal(listeners.has('keydown'),false);
b.detach();b.detach();
assert.equal(removed,1);
assert.equal(b.snapshot().detached,true);
assert.equal(listeners.size,0);
const occupied=new RealMode8086();
occupied.installInterruptAdapter(0x16,()=>{});
assert.throws(()=>createBrowserDosChildBridge({
 cpu:occupied,target,initialFrame:frame
}),/ownership collision/);
assert.equal(listeners.size,0);
assert.equal(removed,2);
const pending=new RealMode8086();
pending.load(Uint8Array.of(0x90,0x90),0x600,0);
const pFrame={...frame,CS:0x600,DS:0x600,ES:0x600,SS:0x600};
const abortBridge=createBrowserDosChildBridge({
 cpu:pending,target,initialFrame:pFrame
});
assert.equal(abortBridge.runSlice(1).state,'ACTIVE');
assert.equal(abortBridge.abort().state,'ABORTED');
assert.equal(abortBridge.snapshot().detached,true); // explicit abort owns cleanup
assert.equal(pending.interruptAdapters.has(0x16),false);
abortBridge.detach();
assert.equal(listeners.size,0);
const faultCpu=new RealMode8086();
faultCpu.load(Uint8Array.of(0xec),0x700,0);
faultCpu.set16('DX',0x388);
const faultParent=captureDosCpuFrame(faultCpu);
const faultFrame={...frame,CS:0x700,DS:0x700,ES:0x700,SS:0x700};
const faultBridge=createBrowserDosChildBridge({
  cpu:faultCpu,target,initialFrame:faultFrame
});
assert.throws(()=>faultBridge.runSlice(1),/no device adapter: fail closed/);
assert.equal(faultBridge.snapshot().child.state,'FAULTED');
assert.equal(faultBridge.snapshot().detached,true);
assert.equal(faultCpu.interruptAdapters.has(0x16),false);
assert.deepEqual(captureDosCpuFrame(faultCpu),faultParent);
assert.equal(listeners.size,0);
assert.ok(Object.isFrozen(b.snapshot()));
console.log('UW2 browser trusted key to original DOS child pause/resume/parent-frame restoration: PASS (synthetic)');
