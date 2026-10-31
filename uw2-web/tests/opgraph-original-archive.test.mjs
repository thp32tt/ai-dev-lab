import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const u32=(array,offset,value)=>{
  array[offset]=(value>>>24)&255;array[offset+1]=(value>>>16)&255;
  array[offset+2]=(value>>>8)&255;array[offset+3]=value&255;
};
// Synthetic LS11 1 part, a stored (not compressed) GRAPH payload of two
// four-byte records. This is a *format unit test*, not original OPGRAPH bytes.
const data=Uint8Array.of(0,0,0,8,0,0,0,12,1,2,3,4,5,6,7,8);
const file=new Uint8Array(296+data.length);
file.set([0x4c,0x53,0x31,0x31]);
u32(file,272,data.length);u32(file,276,data.length);
u32(file,280,296);
file.set(data,296);
const pin=sha(file);
const archive=await prepareOriginalOpgraphArchive(file,{
  expectedSha256:pin,expectedPartCount:1,maxFileBytes:1024,
  maxPartBytes:64,maxTotalDecodedBytes:64
});
assert.equal(archive.sourceSha256,pin);
assert.equal(archive.magic,'LS11');
assert.equal(archive.partCount,1);
assert.equal(archive.totalDecodedBytes,16);
assert.equal(archive.totalRecords,2);
assert.deepEqual(archive.parts[0],{
 index:0,compSize:16,uncompSize:16,offset:296,recordCount:2
});
assert.ok(Object.isFrozen(archive.parts[0]));
assert.match(archive.fidelity,/NATIVE_OPEN_DECOMPRESS_PARITY_UNTESTED/);
file.fill(0); // input must not change verified archive
const p=archive.getDecodedPart(0);
assert.deepEqual(p.bytes,data);
assert.deepEqual(p.offsets,[8,12,16]);
p.bytes[9]=255;
assert.equal(archive.getDecodedPart(0).bytes[9],2);
const record=archive.getGraphRecord(0,1);
assert.deepEqual(record,Uint8Array.of(5,6,7,8));
record[0]=0;
assert.equal(archive.getGraphRecord(0,1)[0],5);
const raw=Uint8Array.from('C:OPGRAPH.LZW',c=>c.charCodeAt(0));
const resolved=archive.resolveDosFile({filename:'C:OPGRAPH.LZW',raw});
assert.deepEqual(resolved.bytes.subarray(296),data);
resolved.bytes[296]=255;
assert.equal(archive.resolveDosFile({filename:'C:OPGRAPH.LZW',raw}).bytes[296],0);
assert.equal(archive.resolveDosFile({filename:'OPGRAPH.LZW',
 raw:raw.subarray(2)}),null);
assert.throws(()=>archive.getGraphRecord(1,0),/bounded integer/);
assert.throws(()=>archive.getGraphRecord(0,2),/bounded integer/);
const authenticCopy=new Uint8Array(296+data.length);
authenticCopy.set([0x4c,0x53,0x31,0x31]);
u32(authenticCopy,272,data.length);
u32(authenticCopy,276,data.length);
u32(authenticCopy,280,296);
authenticCopy.set(data,296);
await assert.rejects(prepareOriginalOpgraphArchive(authenticCopy,{
 expectedSha256:'0'.repeat(64)}),/SHA-256 mismatch/);
await assert.rejects(prepareOriginalOpgraphArchive(authenticCopy,{
 expectedSha256:pin,expectedPartCount:14}),/part count mismatched/);
await assert.rejects(prepareOriginalOpgraphArchive(authenticCopy,{
 expectedSha256:pin,maxTotalDecodedBytes:15}),/total decoded byte budget/);
await assert.rejects(prepareOriginalOpgraphArchive(authenticCopy,{
 expectedSha256:pin,maxPartBytes:15}),/unpacked part size/);
await assert.rejects(prepareOriginalOpgraphArchive(authenticCopy,{
 expectedSha256:pin,maxFileBytes:300}),/archive exceeds configured byte budget/);
console.log('UW2 SHA-pinned OPGRAPH original DOS resource + bounded LS11 GRAPH part/record decoded-byte isolation: PASS (synthetic file)');
