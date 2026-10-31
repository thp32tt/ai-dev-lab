import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {
  createBrowserOriginalOpenSession,KOREAN_ORIGINAL_OPEN_SHA256
} from '../web/browser-original-open-session.js';

// Synthetic negative test only; copyrighted original OPEN bytes are never CI
// assets. Real verified staging is checked by a separate private-N100 test.
const target={addEventListener(){throw Error('must not attach invalid input');},
 removeEventListener(){}};
const cpu=new RealMode8086();
const fakeOriginal=Uint8Array.of(0x4d,0x5a,0,0);
const initialPsp={bytes:new Uint8Array(256),expectedSha256:'0'.repeat(64)};
const initialIvt={bytes:new Uint8Array(1024),expectedSha256:'0'.repeat(64),
 knownVectors:[0]};
assert.equal(KOREAN_ORIGINAL_OPEN_SHA256.length,64);
await assert.rejects(()=>createBrowserOriginalOpenSession({
 cpu,original:fakeOriginal,target,allocationParagraphs:7000,
 initialPsp,initialIvt
}),/fingerprint mismatch/);
assert.deepEqual(cpu.memory.slice(0,1024),new Uint8Array(1024));
assert.equal(cpu.interruptAdapters.size,0);
assert.equal(cpu.get16('CS'),0);
await assert.rejects(()=>createBrowserOriginalOpenSession({
 cpu,original:fakeOriginal,target,allocationParagraphs:7000
}),/pinned external DOS PSP/);
await assert.rejects(()=>createBrowserOriginalOpenSession({
 cpu,original:fakeOriginal,target,allocationParagraphs:7000,
 initialPsp
}),/pinned external DOS IVT/);
await assert.rejects(()=>createBrowserOriginalOpenSession({
 cpu,original:fakeOriginal,target,allocationParagraphs:0,
 initialPsp,initialIvt
}),/bounded allocation/);
await assert.rejects(()=>createBrowserOriginalOpenSession({
 cpu:{},original:fakeOriginal,target,allocationParagraphs:7000,
 initialPsp,initialIvt
}),/shared RealMode8086/);
console.log('UW2 browser original OPEN pinned EXE/PSP/IVT fail-closed staging: PASS (synthetic)');
