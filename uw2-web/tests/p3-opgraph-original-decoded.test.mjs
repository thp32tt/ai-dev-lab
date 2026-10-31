import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {prepareOriginalOpgraphArchive} from '../web/opgraph-original-archive.js';
import {readGraphRecords} from '../web/graph-format.js';

// This test reads ORIGINAL bytes only from the user's private N100 game dir.
// It does NOT assert parity with the original OPEN.EXE machine-code decoder.
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const bytes=fs.readFileSync(path.join(dir,'OPGRAPH.LZW'));
const expected='f66bbd7417283c39ed425e14c3b09480a23edad55242b485851a0db85dbcbd1d';
const sha=b=>createHash('sha256').update(b).digest('hex');
assert.equal(sha(bytes),expected);
const archive=await prepareOriginalOpgraphArchive(bytes,{
 expectedSha256:expected,expectedPartCount:14,maxFileBytes:1024*1024,
 maxPartBytes:8*1024*1024,maxTotalDecodedBytes:64*1024*1024
});
assert.equal(archive.fileBytes,443529);
assert.equal(archive.magic,'LS11');
assert.equal(archive.partCount,14);
assert.equal(archive.totalRecords,108);
assert.deepEqual(archive.parts.map(p=>p.recordCount),
 [16,2,2,11,8,8,8,8,15,11,5,2,2,10]);
const manifest=[];
for(let i=0;i<archive.partCount;i++){
 const part=archive.getDecodedPart(i);
 assert.equal(part.bytes.length,part.metadata.uncompSize);
 const records=readGraphRecords(part.bytes);
 assert.equal(records.length,part.metadata.recordCount);
 assert.deepEqual(archive.getGraphRecord(i,0),records[0]);
 assert.deepEqual(archive.getGraphRecord(i,records.length-1),
  records[records.length-1]);
 const fingerprint=sha(part.bytes);
 manifest.push({
  partIndex:i,compressedBytes:part.metadata.compSize,
  decodedBytes:part.bytes.length,recordCount:records.length,
  decodedSha256:fingerprint
 });
}
const originalRead=archive.resolveDosFile({
 filename:'C:OPGRAPH.LZW',
 raw:Uint8Array.from('C:OPGRAPH.LZW',c=>c.charCodeAt(0))
});
assert.deepEqual(originalRead.bytes.subarray(16,272),bytes.subarray(16,272));
originalRead.bytes[16]^=255;
assert.deepEqual(archive.resolveDosFile({
 filename:'C:OPGRAPH.LZW',
 raw:Uint8Array.from('C:OPGRAPH.LZW',c=>c.charCodeAt(0))
}).bytes.subarray(16,272),bytes.subarray(16,272));
console.log(JSON.stringify({
 originalArchiveSha256:expected,parts:archive.partCount,records:archive.totalRecords,
 decodedTotalBytes:archive.totalDecodedBytes,manifest,
 fidelity:archive.fidelity
},null,2));
console.log('UW2 private original OPGRAPH LS11 stored/decoded part archive SHA/count/GRAPH bounded records: PASS (NOT native decompressor parity)');
