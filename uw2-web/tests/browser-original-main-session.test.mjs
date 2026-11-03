import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createBrowserOriginalMainSession,KOREAN_ORIGINAL_MAIN_SHA256}
 from '../web/browser-original-main-session.js';
const target={addEventListener(){throw Error('must never attach on invalid source');},
 removeEventListener(){}};
const original=Uint8Array.of(0x4d,0x5a,0,0);
const initialPsp={bytes:new Uint8Array(256),expectedSha256:'0'.repeat(64)};
const initialIvt={bytes:new Uint8Array(1024),expectedSha256:'0'.repeat(64),
 knownVectors:[0]};
const args={cpu:new RealMode8086(),original,target,
 allocationParagraphs:7000,initialPsp,initialIvt};
assert.equal(KOREAN_ORIGINAL_MAIN_SHA256.length,64);
await assert.rejects(createBrowserOriginalMainSession(args),
 /original Korean MAIN.EXE fingerprint mismatch/);
assert.equal(args.cpu.interruptAdapters.size,0);
assert.deepEqual(args.cpu.memory.slice(0,1024),new Uint8Array(1024));
await assert.rejects(createBrowserOriginalMainSession({
 ...args,initialPsp:undefined
}),/source-pinned external DOS PSP/);
await assert.rejects(createBrowserOriginalMainSession({
 ...args,initialIvt:undefined
}),/source-pinned external DOS IVT/);
await assert.rejects(createBrowserOriginalMainSession({
 ...args,allocationParagraphs:0
}),/bounded original MZ allocation/);
await assert.rejects(createBrowserOriginalMainSession({
 ...args,initialIvt:{...initialIvt,knownVectors:[0x67]},
 ems:{frameSegment:0xc000,totalPages:6,frameReserved:true}
}),/INT67 EMS owner conflict/);
await assert.rejects(createBrowserOriginalMainSession({
 ...args,initialIvt:{...initialIvt,knownVectors:[0x16]}
}),/INT16 owner conflict/);
assert.equal(args.cpu.interruptAdapters.size,0);
console.log('SHA-pinned Korean MAIN browser guest with external DOS/EMS inputs fail-closed (no copyrighted CI assets): PASS');
