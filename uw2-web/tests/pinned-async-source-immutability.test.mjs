import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedMz,loadVerifiedCom} from '../web/mz-loader.js';
import {loadPinnedDosPsp} from '../web/dos-psp-snapshot.js';
import {installPinnedDosIvtSnapshot} from '../web/dos-ivt-snapshot.js';
import {supplyPinnedGuestDosIvtVector} from '../web/guest-dos-ivt-await.js';
import {preparePinnedOriginalDosFiles} from '../web/dos-original-files.js';
// Synthetic files only; source buffers are intentionally mutated IMMEDIATELY
// after each async loader is called, before its Promise resolves.
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const mutate=bytes=>bytes.fill(0xff);
const write16=(bytes,at,n)=>{bytes[at]=n&255;bytes[at+1]=n>>>8;};
const mzBytes=new Uint8Array(64+16);
mzBytes[0]=0x4d;mzBytes[1]=0x5a;
write16(mzBytes,2,mzBytes.length);write16(mzBytes,4,1);
write16(mzBytes,6,1);write16(mzBytes,8,4);
write16(mzBytes,10,1);write16(mzBytes,12,0xffff);
write16(mzBytes,14,0);write16(mzBytes,16,0x10);
write16(mzBytes,20,0);write16(mzBytes,22,0);
write16(mzBytes,24,0x1c);
write16(mzBytes,0x1c,4);write16(mzBytes,0x1e,0);
mzBytes[64]=0x90;write16(mzBytes,68,0x0033);
const mzSha=sha(mzBytes),cpu=new RealMode8086();
const mzPending=loadVerifiedMz(cpu,mzBytes,{
 loadSegment:0x280,pspSegment:0x270,
 allocationParagraphs:2,expectedSha256:mzSha
});
mutate(mzBytes);
await mzPending;
assert.equal(cpu.read8(0x280,0),0x90);
assert.equal(cpu.read16(0x280,4),0x2b3);
assert.equal(cpu.get16('CS'),0x280);
const com=Uint8Array.of(0x90,0x90,0xc3);
const comPending=loadVerifiedCom(cpu,com,{
 pspSegment:0x400,allocationParagraphs:0x1000,
 initialSP:0xfffe,expectedSha256:sha(com)
});
mutate(com);
await comPending;
assert.deepEqual([...cpu.memory.subarray(cpu.physical(0x400,0x100),
 cpu.physical(0x400,0x100)+3)],[0x90,0x90,0xc3]);
const psp= new Uint8Array(256);
psp[0]=0xcd;psp[1]=0x20;psp[0x2c]=0x45;psp[0x2d]=0x03;
const pspPending=loadPinnedDosPsp(cpu,psp,{
 pspSegment:0x500,expectedSha256:sha(psp)
});
mutate(psp);
const pspResult=await pspPending;
assert.equal(pspResult.environmentSegment,0x345);
assert.equal(cpu.read16(0x500,0),0x20cd);
assert.equal(cpu.read16(0x500,0x2c),0x345);
const ivt=new Uint8Array(1024);
write16(ivt,0x65*4,0x1234);
write16(ivt,0x65*4+2,0x5678);
const ivtPending=installPinnedDosIvtSnapshot(cpu,ivt,{
 expectedSha256:sha(ivt),knownVectors:[0x65]
});
mutate(ivt);
await ivtPending;
assert.deepEqual(cpu.getGuestInterruptVector(0x65),
 {offset:0x1234,segment:0x5678});
assert.equal(cpu.read8(0,0x65*4),0x34);
const single=Uint8Array.of(0x89,0x67,0x45,0x23);
const singlePending=supplyPinnedGuestDosIvtVector(cpu,{
 number:0x66,bytes:single,expectedSha256:sha(single)
});
mutate(single);
await singlePending;
assert.deepEqual(cpu.getGuestInterruptVector(0x66),
 {offset:0x6789,segment:0x2345});
const original=Uint8Array.of(1,2,3,4);
const claimedHash=sha(original);
const input={name:'OPEN.EXE',bytes:original,expectedSize:4,
 expectedSha256:claimedHash};
const assetPending=preparePinnedOriginalDosFiles([input]);
mutate(original);
input.expectedSha256='0'.repeat(64);input.expectedSize=5;
const asset=await assetPending;
assert.deepEqual([...asset.readOriginalFile({
 raw:Uint8Array.from(Buffer.from('OPEN.EXE','ascii'))
}).bytes],[1,2,3,4]);
assert.equal(asset.verified[0].sha256,claimedHash);
assert.equal(asset.verified[0].size,4);
// Concurrent IVT ownership changes during digest cannot overwrite a live
// interrupt adapter or unexpectedly copy a full IVT into live memory.
const concurrentCpu=new RealMode8086();
concurrentCpu.memory.fill(0x7d,0,1024);
const liveTable=new Uint8Array(1024);
const concurrent=installPinnedDosIvtSnapshot(concurrentCpu,liveTable,{
 expectedSha256:sha(liveTable),knownVectors:[0x65]
});
concurrentCpu.installInterruptAdapter(0x65,()=>{});
await assert.rejects(concurrent,/ownership changed during digest/);
assert.equal(concurrentCpu.memory[0],0x7d);
assert.equal(concurrentCpu.interruptVectors.has(0x65),false);
console.log('UW2 SHA-pinned immutable async MZ/COM/PSP/IVT/single-vector/file staging: PASS (synthetic)');
