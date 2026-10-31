import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createStagedDosChildContinuation} from '../web/dos-child-continuation.js';
import {captureDosCpuFrame} from '../web/dos-com-child-runner.js';
import {createPinnedExternalGuestIrqTrace}
 from '../web/guest-pinned-external-irq-trace.js';

const bytes=Uint8Array.of(0,0,0,0,8, 4,0,0,0,8);
const hash=createHash('sha256').update(bytes).digest('hex');
await assert.rejects(()=>createPinnedExternalGuestIrqTrace(bytes,{
 expectedSha256:'0'.repeat(64),source:'external-recorded-IRQ0'
}),/SHA-256 mismatch/);
const tape=await createPinnedExternalGuestIrqTrace(bytes,{
 expectedSha256:hash,source:'explicit-synthetic-fixture-IRQ0'
});
assert.equal(tape.snapshot().eventCount,2);
assert.equal(tape.snapshot().nextStep,0);
assert.ok(Object.isFrozen(tape.snapshot()));
assert.throws(()=>tape.admitAt(1,()=>{}),/event boundary skipped/);
assert.equal(tape.snapshot().admitted,0);
const c=new RealMode8086();
c.installInterruptVector(8,0x500,0x100);
c.load(Uint8Array.of(0xcf),0x500,0x100);
c.load(Uint8Array.of(0x90,0x90,0x90,0x90,0x90,0x90,
  0xb8,0,0x4c,0xcd,0x21),0x300,0x100);
c.set16('CS',0x200);c.set16('IP',0x100);
c.set16('SS',0x200);c.set16('SP',0xfffe);
installDosInt21(c);
const parent=captureDosCpuFrame(c);
const frame={AX:0,BX:0,CX:0,DX:0,SP:0xfffe,BP:0,SI:0,DI:0,
  CS:0x300,DS:0x300,ES:0x300,SS:0x300,IP:0x100,FLAGS:0x202};
const child=createStagedDosChildContinuation(c,{
 initialFrame:frame,maxTotalSteps:20,externalIrqEvidenceTape:tape
});
const first=child.runSlice(100);
assert.equal(first.irq.delivered,true);
assert.equal(first.sliceSteps,4);
assert.equal(first.steps,4);
assert.equal(first.irqEvidence.nextStep,4);
assert.equal(first.irqEvidence.admitted,1);
const second=child.runSlice(100);
assert.equal(second.irq.delivered,true);
assert.equal(second.state,'COMPLETED');
assert.equal(second.reason,'TERMINATED');
assert.equal(second.irqEvidence.admitted,2);
assert.equal(second.irqEvidence.nextStep,null);
assert.equal(second.irqEdges.delivered,2);
assert.equal(second.steps,10); // 8 body instructions + 2 real ISR IRETs
assert.equal(second.result.returnCode,0);
assert.deepEqual(captureDosCpuFrame(c),parent);
assert.equal(child.snapshot().irqEdges.pending,0);
const invalid=Uint8Array.of(4,0,0,0,8, 3,0,0,0,8);
await assert.rejects(()=>createPinnedExternalGuestIrqTrace(invalid,{
 expectedSha256:createHash('sha256').update(invalid).digest('hex'),
 source:'invalid-order'
}),/strictly increase/);
const shorter=Uint8Array.of(0,0,0,0);
await assert.rejects(()=>createPinnedExternalGuestIrqTrace(shorter,{
 expectedSha256:createHash('sha256').update(shorter).digest('hex'),source:'bad'
}),/complete 5-byte/);
const untouched=new RealMode8086();
assert.throws(()=>createStagedDosChildContinuation(untouched,{
 initialFrame:frame,externalIrqEvidenceTape:{nextDueStep:()=>0}
}),/SHA-pinned/);
assert.equal(untouched.get16('CS'),0);
console.log('UW2 SHA-pinned external IRQ instruction boundary tape: PASS (synthetic, no clock)');
