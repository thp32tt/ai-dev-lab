import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {auditGhidraOriginalChunks} from '../tools/p1-ghidra-chunk-import.mjs';
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const bytes=Buffer.alloc(0x80);
bytes.writeUInt16LE(0x5a4d,0);bytes.writeUInt16LE(0x80,2);
bytes.writeUInt16LE(1,4);bytes.writeUInt16LE(4,8);
bytes.writeUInt16LE(0x1c,24);
bytes.set([0xe8,3,0,0xff,0x27,0xcb,0x90,0x90,0x90,0x90,0x90],0x40);
const sha=digest(bytes),base={moduleName:'MAIN.EXE',expectedSha256:sha};
const chunk=(from,to,rows,entries=[])=>({
 schemaVersion:1,provider:'GHIDRA',providerVersion:'12.1.4',
 moduleName:'MAIN.EXE',sha256:sha,loadBase:0x10000,imageBytes:0x40,
 windowStart:from,windowEnd:to,instructions:rows,functionEntries:entries,
 instructionCandidateCount:rows.length,functionEntryCandidateCount:entries.length,
 verifiedCodeBytes:0,fidelity:'GHIDRA_STATIC_CANDIDATES_ONLY__ORIGINAL_DOS_UNTESTED'
});
const a=chunk(0,8,[{reaAddress:0x10000,length:3,flow:'CALL_NEAR',targetRea:0x10006},
 {reaAddress:0x10003,length:2,flow:'INDIRECT_JUMP'},
 {reaAddress:0x10005,length:1,flow:'RETURN'},
 {reaAddress:0x10006,length:1,flow:'FALLTHROUGH'},
 {reaAddress:0x10007,length:1,flow:'FALLTHROUGH'}],[0x10000]);
const b=chunk(8,16,[{reaAddress:0x10008,length:1,flow:'FALLTHROUGH'}],[0x10008]);
const scan=x=>auditGhidraOriginalChunks(x,bytes,base);
const r=scan([b,a]);
assert.deepEqual(r,scan([a,b]));
assert.equal(r.report.uniqueChunks,2);
assert.equal(r.report.instructionCandidates,6);
assert.equal(r.report.functionEntryCandidates,2);
assert.equal(r.report.codeCandidateBytes,9);
assert.equal(r.report.unobservedImageBytes,55);
assert.equal(r.report.unresolvedStaticFlows,1);
assert.equal(r.report.verifiedCodeBytes,0);
assert.equal(r.report.verifiedFunctionCount,0);
assert.equal(r.report.gate,'HOLD_UNRESOLVED_FLOW');
assert.equal(r.report.firstUnobserved.imageStart,9);
assert.equal(r.ledger.instructions[0].bytesSha256,digest(bytes.subarray(0x40,0x43)));
assert.equal(scan([a,b,a]).report.duplicateReplays,1);
assert.equal(scan([a,b,a]).report.uniqueChunks,2);
function invalid(x,regex){assert.throws(()=>scan(x),regex);}
invalid([{...a,sha256:'f'.repeat(64)}],/pinned original/);
invalid([{...a,windowEnd:65}],/outside initialized/);
invalid([{...a,windowEnd:7}],/crosses verified MZ/);
invalid([{...a,providerVersion:'0.0'}],/unsupported Ghidra/);
invalid([{...a,instructionCandidateCount:999}],/completeness/);
invalid([{...a,verifiedCodeBytes:1}],/fidelity/);
invalid([{...a,functionEntries:[0x10009]}],/outside chunk/);
invalid([{...a,instructions:[{reaAddress:0x10000,length:3,
 flow:'CALL_NEAR'}],instructionCandidateCount:1}],/unique target/);
invalid([{...a,instructions:[{reaAddress:0x10000,length:1,
 flow:'VERIFIED'}],instructionCandidateCount:1}],/unknown Ghidra/);
invalid([a,{...a,windowStart:4}],/overlap/);
invalid([a,{...b,providerVersion:'12.1.5'}],/version mismatch/);
const overlap=chunk(0,8,[{reaAddress:0x10000,length:5,flow:'FALLTHROUGH'},
 {reaAddress:0x10004,length:1,flow:'FALLTHROUGH'}]);
invalid([overlap],/overlapping decoded instructions/);
assert.throws(()=>auditGhidraOriginalChunks([a],Buffer.from(bytes),{
 moduleName:'MAIN.EXE',expectedSha256:'f'.repeat(64)
}),/SHA-256 mismatch/);
console.log('UW2 original SHA-verified Ghidra 8086 chunk import/merge synthetic regression: PASS');
