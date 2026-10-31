import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
import {decodeOpeningVerifiedArchive,decodeOpeningArchive} from '../web/opening.js';
const sha=x=>createHash('sha256').update(x).digest('hex');
const w32=(a,o,v)=>{a[o]=v>>>24;a[o+1]=v>>>16&255;a[o+2]=v>>>8&255;a[o+3]=v&255;};
// Synthetic stored LS11 entry with one 4x1 fully zero GRAPH picture.
// No actual copyrighted OPGRAPH bytes in this GitHub regression fixture.
const rec=new Uint8Array(21);
rec[0]=4;rec[2]=1;rec[20]=0;
const part=new Uint8Array(4+rec.length);
w32(part,0,4);part.set(rec,4);
const blob=new Uint8Array(296+part.length);
blob.set([0x4c,0x53,0x31,0x31]);
w32(blob,272,part.length);w32(blob,276,part.length);w32(blob,280,296);
blob.set(part,296);
const verified=await prepareOriginalOpgraphArchive(blob,{
 expectedSha256:sha(blob),expectedPartCount:1,
 expectedDecodedSha256:[sha(part)],maxFileBytes:2048,
 maxPartBytes:128,maxTotalDecodedBytes:128
});
const decoded=decodeOpeningVerifiedArchive(verified);
assert.equal(decoded.recordCount,1);
assert.equal(decoded.parts.length,1);
assert.equal(decoded.parts[0].records[0].width,4);
assert.equal(decoded.parts[0].records[0].height,1);
assert.deepEqual(decoded.parts[0].records[0].indices,Uint8Array.of(0,0,0,0));
const legacy=decodeOpeningArchive(blob.buffer);
assert.deepEqual(decoded.parts[0].records[0].indices,legacy.parts[0].records[0].indices);
assert.match(decoded.resourceFidelity,/NATIVE_OPEN_DECOMPRESS_PARITY_UNTESTED/);
const unpinned=await prepareOriginalOpgraphArchive(blob,{
 expectedSha256:sha(blob),expectedPartCount:1,
 maxFileBytes:2048,maxPartBytes:128,maxTotalDecodedBytes:128
});
assert.throws(()=>decodeOpeningVerifiedArchive(unpinned),/verified Korean OPGRAPH/);
assert.throws(()=>decodeOpeningVerifiedArchive(null),/verified Korean OPGRAPH/);
await assert.rejects(prepareOriginalOpgraphArchive(blob,{
 expectedSha256:sha(blob),expectedPartCount:1,
 expectedDecodedSha256:['0'.repeat(64)]
}),/decoded part SHA-256 mismatch/);
console.log('UW2 browser opening verified Korean OPGRAPH-to-GRAPH pixel bridge and unpinned refusal: PASS (synthetic)');
