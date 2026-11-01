import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readVerifiedKoreanSaveSource,KOREAN_REFERENCE_SAVE}
 from '../web/native-korean-save-source.js';
const bytes=new Uint8Array(333551);
bytes.set([83,97,118,101,32,79,110,101],1);
bytes[13]=0;
bytes[0x97+0x06]=21;
const sha=b=>createHash('sha256').update(b).digest('hex');
const expected=Uint8Array.from(bytes);
const pending=readVerifiedKoreanSaveSource(bytes,{
 expectedSha256:sha(bytes),expectedByteLength:bytes.length
});
bytes.fill(255);
const result=await pending;
assert.equal(result.sourceSha256,sha(expected));
assert.equal(result.slots.length,10);
assert.equal(result.portCatalog.length,130);
assert.equal(result.slots[0].memo,'Save One');
assert.equal(result.slots[1].empty,true);
assert.equal(result.slots[0].dateTime.year,1522);
assert.equal(result.byteLength,333551);
assert.match(result.fidelity,/DOS_WRITE_UNTESTED/);
assert.ok(Object.isFrozen(result.slots[0].portState));
assert.ok(Object.isFrozen(result.portCatalog[0]));
assert.throws(()=>{result.slots[0].money=123;},TypeError);
assert.throws(()=>{result.portCatalog[0].x=100;},TypeError);
assert.deepEqual(result.copyBytes(),expected);
const leaked=result.copyBytes();leaked[1]=0;
assert.deepEqual(result.copyBytes(),expected);
await assert.rejects(readVerifiedKoreanSaveSource(bytes,{
 expectedSha256:sha(expected)
}),/SHA-256 mismatch/);
await assert.rejects(readVerifiedKoreanSaveSource(new Uint8Array(100),{
 expectedSha256:'0'.repeat(64)
}),/byte count mismatch/);
assert.equal(KOREAN_REFERENCE_SAVE.byteLength,333551);
console.log('UW2 immutable original KOUKAI2 source hash+size -> frozen native save slots and 130 ports: PASS');
