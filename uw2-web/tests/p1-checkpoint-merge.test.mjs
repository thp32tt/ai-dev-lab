import assert from 'node:assert/strict';
import {auditP1CheckpointManifest} from '../tools/p1-byte-coverage.mjs';

// P1 batch-merging synthetic fixtures; NO REA/Ghidra batch run, DOS original,
// copyrighted bytes, browser, or full disassembly is asserted here.
const sha='c'.repeat(64),exportA='1'.repeat(64),exportB='2'.repeat(64);
const baseline=()=>({
 moduleName:'MAIN.EXE',sha256:sha,headerBytes:0x40,declaredBytes:0x60,
 batches:[
  {batchId:'chunk-02',tool:'GHIDRA',exportSha256:exportB,status:'EXPORTED',
   start:16,end:24,spans:[
    {kind:'DATA_CANDIDATE',start:16,end:20},
    {kind:'UNRESOLVED',start:20,end:24}
   ]},
  {batchId:'chunk-01',tool:'REA',exportSha256:exportA,status:'EXPORTED',
   start:0,end:16,spans:[
    {kind:'CODE_CANDIDATE',start:0,end:8},
    {kind:'DATA_CANDIDATE',start:8,end:12}
   ]},
  {batchId:'chunk-03',tool:'STATIC',exportSha256:sha,status:'FAILED',
   start:24,end:28,spans:[]}
 ]});
const r=auditP1CheckpointManifest(baseline());
assert.equal(r.schemaVersion,2);
assert.equal(r.batchCount,3);
assert.deepEqual(r.checkpoints.map(x=>x.batchId),['chunk-01','chunk-02','chunk-03']);
assert.deepEqual(r.counts,{UNOBSERVED:8,CODE_CANDIDATE:8,
 DATA_CANDIDATE:8,UNRESOLVED:4,FAILED:4,CONFLICT:0});
assert.equal(r.unresolvedBytes,16);
assert.equal(r.gate,'HOLD_INCOMPLETE');
assert.equal(r.nextUnobserved.imageStart,12);
assert.equal(r.nextUnobserved.imageEnd,16);
assert.equal(r.pendingRanges.length,4);
assert.equal(r.verifiedCodeBytes,0);
const reverse=baseline();reverse.batches.reverse();
assert.deepEqual(auditP1CheckpointManifest(reverse),r);
const conflict=baseline();conflict.batches.push({
 batchId:'chunk-04',tool:'REA',exportSha256:sha,status:'EXPORTED',
 start:6,end:10,spans:[{kind:'DATA_CANDIDATE',start:6,end:10}]
});
const c=auditP1CheckpointManifest(conflict);
assert.equal(c.counts.CONFLICT,2);
assert.equal(c.gate,'HOLD_CONFLICT');
assert.deepEqual(c.pendingRanges.find(x=>x.kind==='CONFLICT').imageStart,6);
const complete=baseline();
complete.batches=[{batchId:'all',tool:'GHIDRA',exportSha256:sha,
 status:'EXPORTED',start:0,end:32,
 spans:[{kind:'CODE_CANDIDATE',start:0,end:16},
 {kind:'DATA_CANDIDATE',start:16,end:32}]}];
const full=auditP1CheckpointManifest(complete);
assert.equal(full.pendingRanges.length,0);
assert.equal(full.gate,'HOLD_STATIC_ONLY');
assert.equal(full.verifiedFunctionCount,0);
function invalid(modifier,regex){
 const data=baseline();modifier(data);
 assert.throws(()=>auditP1CheckpointManifest(data),regex);
}
invalid(x=>x.batches.push({...x.batches[0]}),/duplicate/);
invalid(x=>{x.batches[0].exportSha256='bad';},/export SHA-256/);
invalid(x=>{x.batches[0].status='COMPLETE';},/status must/);
invalid(x=>{x.batches[0].start=31;x.batches[0].end=33;},/outside initialized/);
invalid(x=>{x.batches[1].spans[0].end=17;},/outside its batch/);
invalid(x=>{x.batches[2].spans.push({kind:'CODE_CANDIDATE',start:24,end:25});},
 /FAILED checkpoint cannot claim/);
invalid(x=>{x.batches[1].spans[0].kind='VERIFIED';},/unknown P1 checkpoint/);
invalid(x=>{x.sha256='wrong';},/original SHA-256/);
console.log('UW2 P1 deterministic REA/Ghidra checkpoint gap/conflict merge synthetic regression: PASS');
