import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {preparePinnedDosReadOnlyResources} from '../web/pinned-dos-resources.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const content=Uint8Array.of(0x4f,0x50,0x47,0x7f,0x00,0x01);
const config={dosPath:'C:OPGRAPH.LZW',bytes:content,expectedSha256:sha(content)};
const handler=await preparePinnedDosReadOnlyResources([config],{maxTotalBytes:1024});
assert.equal(handler.verifiedFileCount,1);
assert.equal(handler.totalBytes,6);
assert.match(handler.fidelity,/NO_DOS_DIRECTORY_REFERENCE/);
content[0]=0; // must not modify verified snapshot
const raw=Uint8Array.from('C:OPGRAPH.LZW',x=>x.charCodeAt(0));
const got=handler.resolve({filename:'C:OPGRAPH.LZW',raw});
assert.deepEqual(got.bytes,Uint8Array.of(0x4f,0x50,0x47,0x7f,0,1));
got.bytes[0]=99;
assert.equal(handler.resolve({filename:'C:OPGRAPH.LZW',raw}).bytes[0],0x4f);
assert.equal(handler.resolve({filename:'OPGRAPH.LZW',raw:raw.slice(2)}),null);
assert.equal(handler.resolve({filename:'c:OPGRAPH.LZW',
 raw:Uint8Array.from('c:OPGRAPH.LZW',x=>x.charCodeAt(0))}),null);
assert.throws(()=>handler.resolve({filename:'WRONG',raw}),/raw path\/decoded name mismatch/);
await assert.rejects(preparePinnedDosReadOnlyResources([{...config,bytes:Uint8Array.of(1)}]),/SHA-256 mismatch/);
const fresh={...config,bytes:Uint8Array.of(0x4f,0x50,0x47,0x7f,0,1)};
await assert.rejects(preparePinnedDosReadOnlyResources([fresh,fresh]),/duplicate exact/);
await assert.rejects(preparePinnedDosReadOnlyResources([
 {...config,dosPath:'C:../OPGRAPH.LZW'}
]),/safe ASCII path/);
await assert.rejects(preparePinnedDosReadOnlyResources([
 {...config,dosPath:'C:\\OPGRAPH.LZW'}
]),/safe ASCII path/);
await assert.rejects(preparePinnedDosReadOnlyResources([fresh],{maxTotalBytes:3}),/quota exceeded/);
assert.equal(config.expectedSha256,sha(Uint8Array.of(0x4f,0x50,0x47,0x7f,0,1)));
console.log('UW2 exact C:OPGRAPH.LZW SHA-pinned immutable DOS original-byte resolver: PASS');
