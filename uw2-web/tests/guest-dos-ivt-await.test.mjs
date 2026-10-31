import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createGuestOriginalExecutionSession} from '../web/guest-original-execution-session.js';
import {pendingGuestDosIvtVector,supplyPinnedGuestDosIvtVector}
 from '../web/guest-dos-ivt-await.js';

// This is only a synthetic DOS-reference prerequisite. It executes the same
// 8086 INT21 AH35 binary opcode after an explicit SHA-pinned vector arrives.
const cpu=new RealMode8086();
cpu.load(Uint8Array.from([
  0xb8,0x00,0x35,  // MOV AX,3500h
  0xcd,0x21,       // INT21 AH35: original DOS IVT 00h query
  0xb8,0x00,0x4c,  // MOV AX,4C00h
  0xcd,0x21        // INT21 AH4C terminate
]),0x300,0);
cpu.set16('CS',0x300);
installDosInt21(cpu);
const ses=createGuestOriginalExecutionSession(cpu,{maxTotalSteps:10});
assert.equal(ses.runSlice(1).totalExecutedSteps,1);
const before=ses.snapshot();
const pending=pendingGuestDosIvtVector(cpu);
assert.ok(Object.isFrozen(pending));
assert.deepEqual(pending,{reason:'WAIT_EXTERNAL_DOS_IVT_VECTOR',
  cs:0x300,ip:3,missingInterruptVector:0,
  requirement:'PINNED_EXTERNAL_DOS_IVT_VECTOR_REQUIRED'});
for(let i=0;i<3;i++){
 assert.equal(pendingGuestDosIvtVector(cpu)?.ip,3);
 assert.deepEqual(ses.snapshot(),before);
}
const bytes=Uint8Array.of(0x45,0x23,0x67,0x01);
const hash=createHash('sha256').update(bytes).digest('hex');
await assert.rejects(()=>supplyPinnedGuestDosIvtVector(cpu,{
  number:0,bytes,expectedSha256:'0'.repeat(64)
}),/SHA-256 mismatch/);
assert.deepEqual(pendingGuestDosIvtVector(cpu),pending);
assert.equal(cpu.get16('IP'),3);
const v=await supplyPinnedGuestDosIvtVector(cpu,{
  number:0,bytes,expectedSha256:hash
});
assert.equal(v.offset,0x2345);
assert.equal(v.segment,0x167);
assert.equal(cpu.getGuestInterruptVector(0).offset,0x2345);
assert.equal(pendingGuestDosIvtVector(cpu),null);
assert.equal(ses.runSlice(5).reason,'TERMINATED');
assert.equal(ses.snapshot().totalExecutedSteps,4);
assert.equal(cpu.terminated.returnCode,0);
assert.equal(cpu.get16('ES'),0x167);
assert.equal(cpu.get16('BX'),0x2345);
await assert.rejects(()=>supplyPinnedGuestDosIvtVector(cpu,{
  number:0,bytes,expectedSha256:hash
}),/already owned/);
const absent=new RealMode8086();
absent.load(Uint8Array.of(0xcd,0x21),0x200,0);absent.set16('CS',0x200);
absent.set16('AX',0x3500);
assert.equal(pendingGuestDosIvtVector(absent),null); // no DOS 21h adapter
console.log('UW2 original DOS AH35 exact instruction prewait and pinned IVT resume: PASS (synthetic)');
