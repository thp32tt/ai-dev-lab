import assert from 'node:assert/strict';
import {verifyKoreanMainEmsWrappers,runKoreanMainEmsLifecycle,
 KOREAN_MAIN_EMS_WRAPPERS} from '../tools/original-main-ems-lifecycle-cpu-probe.mjs';
assert.equal(Object.keys(KOREAN_MAIN_EMS_WRAPPERS).length,8);
assert.deepEqual(KOREAN_MAIN_EMS_WRAPPERS.map, [0x3a975,0x3a98b]);
assert.deepEqual(KOREAN_MAIN_EMS_WRAPPERS.free, [0x3a98b,0x3a99b]);
assert.throws(()=>verifyKoreanMainEmsWrappers(new Uint8Array(200),{}),
 /Korean MAIN original SHA-256 mismatch/);
await assert.rejects(runKoreanMainEmsLifecycle(new Uint8Array(200),{}),
 /Korean MAIN original SHA-256 mismatch/);
await assert.rejects(runKoreanMainEmsLifecycle(new Uint8Array(200),{},{
 totalPages:0
}),/explicit and bounded/);
console.log('original MAIN EMS eight authentic source ranges, original asset SHA admission and bounded execution prerequisite PASS');
