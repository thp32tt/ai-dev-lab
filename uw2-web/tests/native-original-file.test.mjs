import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {prepareVerifiedOriginalWebFile}
 from '../web/native-original-file.js';
const hash=x=>createHash('sha256').update(x).digest('hex');
const original=Uint8Array.of(0x4c,0x53,0x31,0x31,0,0x42,0x80);
const expected=Uint8Array.from(original),sha=hash(original);
const p=prepareVerifiedOriginalWebFile(original,{expectedSha256:sha,maxBytes:64});
original.fill(0);
const asset=await p;
assert.equal(asset.sourceSha256,sha);
assert.equal(asset.byteLength,7);
assert.deepEqual(asset.copyBytes(),expected);
const leak=asset.copyBytes();leak[0]=0;
assert.deepEqual(asset.copyBytes(),expected);
assert.match(asset.fidelity,/NO_DOS_EMULATOR/);
await assert.rejects(prepareVerifiedOriginalWebFile(original,{
 expectedSha256:sha,maxBytes:64
}),/SHA-256 mismatch/);
await assert.rejects(prepareVerifiedOriginalWebFile(expected,{
 expectedSha256:sha,maxBytes:6
}),/exceeds declared size cap/);
await assert.rejects(prepareVerifiedOriginalWebFile(expected,{
 expectedSha256:'x'
}),/exact SHA256/);
console.log('UW2 native browser-only immutable SHA source file loader: PASS');
