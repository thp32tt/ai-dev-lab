import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {createOriginalOpenProbeSession} from '../tools/p3-open-exec-probe.mjs';

// ORIGINAL OPEN bytes, but all DOS version/IOCTL/memory/IVT values below are
// synthetic for a diagnostic trace; no full reference DOS/FMDRV evidence.
const source=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const exe=readFileSync(join(source,'OPEN.EXE'));
const digest=b=>createHash('sha256').update(b).digest('hex');
assert.equal(digest(exe),
 'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
const ses=await createOriginalOpenProbeSession(exe,{
 allocationParagraphs:7000,maxSteps:1800,traceLimit:8,
 pauseOnMissingDosIvt:true,pauseOnMissingGuestInterrupt:true,
 dosOptions:{
  getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
  resizeMemory:({segment,paragraphs})=>{
    assert.deepEqual({segment,paragraphs},{segment:0x600,paragraphs:6566});
    return {resized:true};
  },
  getDeviceInfo:()=>({deviceInfo:0x80d3})
 }
});
const first=ses.runSlice(1000);
assert.equal(first.steps,470);
assert.equal(first.stopped.reason,'WAIT_EXTERNAL_DOS_IVT_VECTOR');
assert.equal(first.stopped.missingInterruptVector,0);
assert.equal(first.totalDosServiceCalls,3);
for(let i=0;i<3;i++){
 assert.equal(ses.runSlice(100).steps,470);
 assert.equal(ses.snapshot().totalDosServiceCalls,3);
}
const bytes=Uint8Array.of(0,0,0,9);
await assert.rejects(()=>ses.supplyPinnedDosIvtVector({
 number:0,bytes,expectedSha256:'0'.repeat(64)
}),/SHA-256 mismatch/);
assert.equal(ses.snapshot().steps,470);
await ses.supplyPinnedDosIvtVector({number:0,bytes,expectedSha256:digest(bytes)});
const second=ses.runSlice(1000);
assert.equal(second.steps,583);
assert.equal(second.stopped.reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
assert.equal(second.stopped.missingInterruptVector,0x66);
assert.equal(second.stopped.cs,0x610);
assert.equal(second.stopped.ip,0x1831);
assert.equal(second.totalDosServiceCalls,12);
assert.equal(ses.runSlice(100).steps,583);
assert.equal(ses.snapshot().totalDosServiceCalls,12);
assert.equal(first.steps,470);
assert.equal(second.steps,583);
console.log(JSON.stringify({
 result:'PRIVATE_ORIGINAL_OPEN_BYTES_SYNTHETIC_DOS_VECTOR_NOT_REFERENCE',
 sha256:digest(exe),
 firstSteps:first.steps,firstStop:first.stopped,
 secondSteps:second.steps,secondStop:second.stopped,
 attemptedDosServices:second.totalDosServiceCalls
}));
