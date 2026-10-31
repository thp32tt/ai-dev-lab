import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';
import {pendingGuestExternalInterrupt} from '../web/guest-external-interrupt-await.js';

// Synthetic native INT66 contract, never a fake FMDRV driver.
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xcd,0x66,0xb8,0,0x4c,0xcd,0x21),0x400,0);
cpu.set16('CS',0x400);cpu.set16('SS',0x500);cpu.set16('SP',0x100);
installDosInt21(cpu);
const session=createGuestOriginalExecutionSession(cpu,{maxTotalSteps:10});
const before={ip:cpu.get16('IP'),sp:cpu.get16('SP'),
 flags:cpu.get16('FLAGS'),total:session.snapshot().totalExecutedSteps};
for(let i=0;i<5;i++){
 const wait=pendingGuestExternalInterrupt(cpu);
 assert.deepEqual(wait,{reason:'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER',
   cs:0x400,ip:0,missingInterruptVector:0x66,
   requirement:'ORIGINAL_GUEST_INTERRUPT_DRIVER_OR_VERIFIED_IVT_REQUIRED'});
 assert.ok(Object.isFrozen(wait));
 assert.deepEqual({ip:cpu.get16('IP'),sp:cpu.get16('SP'),
   flags:cpu.get16('FLAGS'),total:session.snapshot().totalExecutedSteps},before);
}
// External driver installation is an explicit harness action, never auto.
let calls=0;
cpu.installInterruptAdapter(0x66,()=>{calls++;});
assert.equal(pendingGuestExternalInterrupt(cpu),null);
assert.equal(session.runSlice(10).reason,'TERMINATED');
assert.equal(session.snapshot().totalExecutedSteps,3);
assert.equal(calls,1);
assert.equal(cpu.terminated.returnCode,0);
const unrelated=new RealMode8086();
unrelated.load(Uint8Array.of(0x90),0x400,0);
unrelated.set16('CS',0x400);
assert.equal(pendingGuestExternalInterrupt(unrelated),null);
assert.throws(()=>pendingGuestExternalInterrupt({}),/requires RealMode8086/);
console.log('UW2 exact native INT66 driver wait keeps IP and stack: PASS (synthetic)');
