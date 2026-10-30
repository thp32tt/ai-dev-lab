import assert from 'node:assert/strict';
import {auditP1ByteCoverage} from '../tools/p1-byte-coverage.mjs';

// Entirely synthetic interval audit. NO original EXE bytes or REA/Ghidra
// executable export was run in this CI job.
const baseline=()=>({
  moduleName:'MAIN.EXE',sha256:'a'.repeat(64),
  headerBytes:0x40,declaredBytes:0x50,
  spans:[
    {kind:'CODE_CANDIDATE',start:0,end:4,source:'synthetic-code'},
    {kind:'DATA_CANDIDATE',start:4,end:8,source:'synthetic-data'},
    {kind:'UNRESOLVED',start:10,end:12,source:'synthetic-gap'},
    {kind:'FAILED',start:14,end:16,source:'synthetic-error'}
  ]
});
const v=auditP1ByteCoverage(baseline());
assert.equal(v.initializedImageBytes,16);
assert.equal(v.coverageBytes,12);
assert.equal(v.unresolvedBytes,8); // unobserved(4), unresolved(2), failed(2)
assert.deepEqual(v.counts,{UNOBSERVED:4,CODE_CANDIDATE:4,
  DATA_CANDIDATE:4,UNRESOLVED:2,FAILED:2,CONFLICT:0});
assert.equal(v.gate,'HOLD_INCOMPLETE');
assert.deepEqual(v.ranges[0],{
  kind:'CODE_CANDIDATE',imageStart:0,imageEnd:4,
  rawStart:0x40,rawEnd:0x44
});
assert.equal(v.verifiedCodeBytes,0);
assert.equal(v.verifiedFunctionCount,0);

const overlapped=baseline();
overlapped.spans.push({kind:'DATA_CANDIDATE',start:2,end:6,source:'synthetic-conflict'});
const c=auditP1ByteCoverage(overlapped);
assert.equal(c.counts.CONFLICT,2);
assert.equal(c.gate,'HOLD_CONFLICT');
assert.deepEqual(c.ranges[1],{
  kind:'CONFLICT',imageStart:2,imageEnd:4,
  rawStart:0x42,rawEnd:0x44
});
const reverse=structuredClone(overlapped);reverse.spans.reverse();
assert.deepEqual(auditP1ByteCoverage(reverse).ranges,c.ranges);

const complete=baseline();
complete.spans=[
  {kind:'CODE_CANDIDATE',start:0,end:8,source:'REA synthetic'},
  {kind:'DATA_CANDIDATE',start:8,end:16,source:'Ghidra synthetic'}
];
const covered=auditP1ByteCoverage(complete);
assert.equal(covered.coverageBytes,16);
assert.equal(covered.unresolvedBytes,0);
assert.equal(covered.gate,'HOLD_STATIC_ONLY');
assert.equal(covered.verifiedCodeBytes,0);

function invalid(mutator,re){
  const bad=baseline();mutator(bad);
  assert.throws(()=>auditP1ByteCoverage(bad),re);
}
invalid(x=>{x.sha256='unverified';},/SHA-256/);
invalid(x=>{x.headerBytes=x.declaredBytes;},/MZ image bounds/);
invalid(x=>{x.spans[0].start=-1;},/nonnegative/);
invalid(x=>{x.spans[0].end=17;},/outside initialized/);
invalid(x=>{x.spans[0].start=4;},/outside initialized/);
invalid(x=>{x.spans[0].kind='VERIFIED_CODE';},/unknown P1 span kind/);
invalid(x=>{x.spans[0].source='  ';},/provenance/);
invalid(x=>{x.moduleName='KOEI.COM';},/MZ module name/);
invalid(x=>{x.declaredBytes=0x2000040;},/audited bound/);
console.log('UW2 P1 SHA-pinned byte coverage gaps/conflicts synthetic regression: PASS');
