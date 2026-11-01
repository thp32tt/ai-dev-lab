import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preparePinnedDosReadOnlyResources}
 from '../web/pinned-dos-resources.js';
// Same direct browser OPGRAPH adapter as in app.js, with synthetic
// caller-owned bytes mutated across the asynchronous digest boundary.
const bytes=Uint8Array.of(0x4c,0x53,0x31,0x31,1,2,3);
const pinned=Uint8Array.from(bytes);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const p=preparePinnedDosReadOnlyResources([{dosPath:'C:OPGRAPH.LZW',
 bytes,expectedSha256:sha(bytes)}],{maxTotalBytes:1024});
bytes.fill(0xff);
const resolved=await p;
const name='C:OPGRAPH.LZW',raw=Uint8Array.from(name,c=>c.charCodeAt(0));
assert.deepEqual(resolved.resolve({filename:name,raw}).bytes,pinned);
const separate=resolved.resolve({filename:name,raw}).bytes;
separate.fill(0);
assert.deepEqual(resolved.resolve({filename:name,raw}).bytes,pinned);
assert.equal(resolved.verifiedFileCount,1);
assert.match(resolved.fidelity,/NO_DOS_DIRECTORY_REFERENCE/);
console.log('UW2 browser native OPGRAPH resource bytes stay pinned across SHA await: PASS');
