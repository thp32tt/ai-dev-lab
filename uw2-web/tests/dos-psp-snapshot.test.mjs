import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';

const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=new Uint8Array(256);
bytes.set([0xcd,0x20],0);
bytes[0x2c]=0x50;bytes[0x2d]=0x02;
bytes[0x80]=0;
const expectedSha256=sha(bytes),cpu=new RealMode8086();
const meta=await loadPinnedDosPsp(cpu,bytes,{pspSegment:0x200,expectedSha256});
assert.equal(meta.environmentSegment,0x250);
assert.equal(meta.pspSegment,0x200);
assert.equal(meta.sha256,expectedSha256);
assert.equal(cpu.read16(0x200,0x2c),0x250);
assert.deepEqual(cpu.memory.subarray(0x2000,0x2100),bytes);
assert.match(meta.fidelity,/UNTESTED/);
const bad=new RealMode8086();
bad.memory.fill(0x5a,0x2000,0x2100);
const originalMemory=bad.memory.slice(0x2000,0x2100);
await assert.rejects(loadPinnedDosPsp(bad,bytes,{pspSegment:0x200,
 expectedSha256:'0'.repeat(64)}),/SHA-256 mismatch/);
await assert.rejects(loadPinnedDosPsp(bad,bytes.slice(1),{
 pspSegment:0x200,expectedSha256}),/256 bytes/);
const fake=bytes.slice();fake[0]=0; 
await assert.rejects(loadPinnedDosPsp(bad,fake,{
 pspSegment:0x200,expectedSha256:sha(fake)}),/INT 20h entry/);
await assert.rejects(loadPinnedDosPsp(bad,bytes,{
 pspSegment:0xffff,expectedSha256}),/exceeds physical memory/);
assert.deepEqual(bad.memory.slice(0x2000,0x2100),originalMemory);
console.log('UW2 pinned DOS PSP env paragraph import SHA/atomic guard synthetic regression: PASS');
