import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createBrowserOriginalGuestBridge} from '../web/browser-original-guest-bridge.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const handler=Uint8Array.of(0xcf);
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(
  0xb8,0,0x35,0xcd,0x21, // DOS AH35 query 00
  0xcd,0x66,            // unowned native FMDRV INT66
  0xb4,0,0xcd,0x16,     // BIOS AH00 wait
  0xb8,0,0x4c,0xcd,0x21 // DOS AH4C exit
),0x500,0);
cpu.load(handler,0x620,0);
cpu.set16('CS',0x500);cpu.set16('DS',0x500);
cpu.set16('SS',0x500);cpu.set16('SP',0xfffe);
installDosInt21(cpu);
const listeners=new Map();let removed=0;
const target={
 addEventListener(name,fn){listeners.set(name,fn);},
 removeEventListener(name,fn){
  if(listeners.get(name)===fn){listeners.delete(name);removed++;}
 }
};
const bridge=createBrowserOriginalGuestBridge({
 cpu,target,maxTotalSteps:20,pauseOnMissingDosIvt:true,
 pauseOnMissingGuestInterrupt:true
});
const first=bridge.runSlice(20);
assert.equal(first.reason,'WAIT_EXTERNAL_DOS_IVT_VECTOR');
assert.equal(first.totalExecutedSteps,1);
assert.equal(first.waiting.missingInterruptVector,0);
assert.equal(cpu.get16('IP'),3);
const held=bridge.runSlice(20);
assert.equal(held.steps,0);
assert.equal(held.totalExecutedSteps,1);
assert.equal(listeners.has('keydown'),true);
const vector=Uint8Array.of(0x12,0x34,0x56,0x78);
await assert.rejects(bridge.supplyPinnedDosIvtVector({
 number:1,bytes:vector,expectedSha256:hash(vector)
}),/must match active source wait/);
await assert.rejects(bridge.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:'0'.repeat(64)
}),/SHA-256 mismatch/);
assert.equal(bridge.snapshot().execution.waiting.missingInterruptVector,0);
await bridge.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:hash(vector)
});
assert.equal(bridge.snapshot().execution.waiting,null);
const second=bridge.runSlice(20);
assert.equal(second.reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
assert.equal(second.waiting.missingInterruptVector,0x66);
assert.equal(second.totalExecutedSteps,2);
assert.equal(cpu.get16('IP'),5);
// Handler comes from an externally owned original driver in production;
// this synthetic fixture uses an explicit IRET ROM, never a guessed FMDRV.
cpu.installInterruptVector(0x66,0x620,0);
const keyWait=bridge.runSlice(20);
assert.equal(keyWait.reason,'WAIT_BIOS_INT16_AH00');
assert.equal(keyWait.totalExecutedSteps,5);
assert.equal(cpu.get16('IP'),9);
const key={type:'keydown',isTrusted:true,code:'KeyA',key:'a',cancelable:true,
  preventDefault(){this.prevented=true;}};
listeners.get('keydown')(key);
assert.equal(key.prevented,true);
const done=bridge.runSlice(20);
assert.equal(done.reason,'TERMINATED');
assert.equal(done.totalExecutedSteps,8);
assert.equal(cpu.terminated.returnCode,0);
assert.equal(bridge.snapshot().detached,true);
assert.equal(bridge.snapshot().keyboard.attached,false);
assert.equal(removed,1);
assert.equal(listeners.size,0);
await assert.rejects(bridge.supplyPinnedDosIvtVector({
 number:0,bytes:vector,expectedSha256:hash(vector)
}),/detached\/faulted/);
console.log('UW2 browser original direct guest DOS vector/driver/keyboard source waits: PASS (synthetic)');
