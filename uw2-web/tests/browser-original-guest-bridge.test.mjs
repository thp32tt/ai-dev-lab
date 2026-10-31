import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createBrowserOriginalGuestBridge} from '../web/browser-original-guest-bridge.js';

// A browser input target is caller-owned. Synthetic trusted-event fixtures
// check source filtering; they DO NOT claim a real Browser KeyboardEvent run.
const listeners=new Map();
let removes=0;
const target={
  addEventListener(type,callback){listeners.set(type,callback);},
  removeEventListener(type,callback){
    if(listeners.get(type)===callback){listeners.delete(type);removes++;}
  }
};
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xb4,0x00,0xcd,0x16,0xa2,0x00,0x02,
  0xb8,0x00,0x4c,0xcd,0x21),0x200,0);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);
installDosInt21(cpu);
const bridge=createBrowserOriginalGuestBridge({cpu,target,maxQueuedKeys:1});
assert.equal(bridge.runSlice(10).reason,'WAIT_BIOS_INT16_AH00');
assert.equal(cpu.get16('IP'),2);
const key=(code,k,trust=true)=>({
  type:'keydown',isTrusted:trust,code,key:k,cancelable:true,
  preventDefault(){this.prevented=true;}
});
const rejected=key('KeyQ','q',false);
listeners.get('keydown')(rejected);
assert.equal(bridge.snapshot().queue.pending,0);
const good=key('KeyA','a');
listeners.get('keydown')(good);
assert.equal(good.prevented,true);
const overflow=key('KeyB','b');
listeners.get('keydown')(overflow);
assert.equal(overflow.prevented,undefined);
assert.equal(bridge.snapshot().keyboard.accepted,1);
assert.equal(bridge.snapshot().keyboard.ignored,1);
assert.equal(bridge.snapshot().keyboard.overflow,1);
const done=bridge.runSlice(10);
assert.equal(done.reason,'TERMINATED');
assert.equal(done.totalExecutedSteps,5);
assert.equal(cpu.read8(0x200,0x200),97);
assert.equal(bridge.snapshot().queue.consumed,1);
assert.equal(bridge.snapshot().detached,true); // child reached DOS termination
assert.equal(cpu.interruptAdapters.has(0x16),false); // no stranded owner
bridge.detach();bridge.detach();
assert.equal(removes,1);
assert.equal(listeners.has('keydown'),false);
assert.equal(bridge.snapshot().keyboard.attached,false);
assert.equal(bridge.snapshot().detached,true);
assert.ok(Object.isFrozen(bridge.snapshot()));
assert.throws(()=>createBrowserOriginalGuestBridge({cpu:new RealMode8086(),
  target:{}}),/event target/);
assert.throws(()=>createBrowserOriginalGuestBridge({cpu:{},target}),/staged/);
const preOwned=new RealMode8086();
preOwned.installInterruptAdapter(0x16,()=>undefined);
assert.throws(()=>createBrowserOriginalGuestBridge({cpu:preOwned,target}),
  /already registered/);
assert.equal(listeners.size,0); // failure leaves no browser listener
assert.equal(removes,2);
const limited=new RealMode8086();
limited.load(Uint8Array.of(0x90,0x90),0x300,0);
limited.set16('CS',0x300);
const cap=createBrowserOriginalGuestBridge({cpu:limited,target,
  maxTotalSteps:1});
assert.equal(cap.runSlice(10).reason,'TOTAL_STEP_BUDGET_EXHAUSTED');
assert.equal(cap.snapshot().execution.remainingSteps,0);
cap.detach();
assert.equal(limited.interruptAdapters.has(0x16),false);
const rejectCpu=new RealMode8086();
rejectCpu.set16('CS',0x350);
rejectCpu.set16('DX',0x388);
rejectCpu.load(Uint8Array.of(0xec),0x350,0); // original IN AL,DX without device
const failBridge=createBrowserOriginalGuestBridge({cpu:rejectCpu,target});
assert.throws(()=>failBridge.runSlice(1),/no device adapter: fail closed/);
assert.equal(failBridge.snapshot().detached,true);
assert.equal(rejectCpu.interruptAdapters.has(0x16),false);
assert.equal(listeners.size,0);
console.log('UW2 opt-in browser trusted BIOS event -> same native guest CPU wait/resume: PASS (synthetic)');
