import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {
  createOriginalOpenProbeSession,probeOriginalOpen
} from '../tools/p3-open-exec-probe.mjs';

// PRIVATE ORIGINAL ASSET TEST (not GitHub CI executed).
// Read the authorized Korean local OPEN.EXE, never commit original bytes.
// DOS 6.22/PSP/IOCTL/resize values are explicitly SYNTHETIC, not a DOS
// reference measurement. Preserve this exact SHA-pinned reproducibility test.
const sourceDir=process.env.UW2_GAME_DIR||
  '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(sourceDir,'OPEN.EXE'));
const sha256=createHash('sha256').update(original).digest('hex');
assert.equal(sha256,
  'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
const options={
  allocationParagraphs:7000,maxSteps:1000,traceLimit:8,
  dosOptions:{
    getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
    resizeMemory:({segment,paragraphs})=>{
      assert.deepEqual({segment,paragraphs},{segment:0x600,paragraphs:6566});
      return {resized:true};
    },
    getDeviceInfo:()=>({deviceInfo:0x80d3})
  }
};
const oneShot=await probeOriginalOpen(original,options);
const session=await createOriginalOpenProbeSession(original,options);
const first=session.runSlice(1);
assert.equal(first.steps,1);
assert.equal(first.image.relocations,23);
let sliced=first;
for(let n=0;n<1000&&sliced.stopped?.reason==='SLICE_STEP_BUDGET_EXHAUSTED';n++)
  sliced=session.runSlice(37);
assert.equal(first.steps,1); // returned snapshot cannot change retroactively
assert.equal(sliced.steps,oneShot.steps);
assert.equal(sliced.totalDosServiceCalls,oneShot.totalDosServiceCalls);
assert.deepEqual(sliced.stopped,oneShot.stopped);
assert.equal(sliced.steps,470);
assert.equal(sliced.totalDosServiceCalls,4);
assert.equal(sliced.stopped?.cs,0x610);
assert.equal(sliced.stopped?.ip,0x2de1);
assert.equal(sliced.stopped?.missingInterruptVector,0);
assert.equal(sliced.stopped?.requirement,
  'EXTERNAL_ORIGINAL_DOS_IVT_VECTOR_REQUIRED');
assert.match(sliced.stopped?.message,/unknown initial DOS interrupt vector 00h/);
assert.equal(sliced.services.at(-1).ah,0x35);
assert.equal(sliced.services.at(-1).al,0);
assert.throws(()=>session.runSlice(1),/faulted original OPEN session cannot resume/);
console.log(JSON.stringify({
  originalOpenSha256:sha256,relocations:first.image.relocations,
  oneShotSteps:oneShot.steps,slicedSteps:sliced.steps,
  dosServiceCalls:sliced.totalDosServiceCalls,
  stopped:sliced.stopped,fidelity:sliced.fidelity,
  validation:'PRIVATE_ORIGINAL_OPEN_BYTES__SYNTHETIC_DOS__NOT_REFERENCE_BOOT'
}));
