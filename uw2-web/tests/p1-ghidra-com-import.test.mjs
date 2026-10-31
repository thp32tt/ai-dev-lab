import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditGhidraOriginalCom} from '../tools/p1-ghidra-com-import.mjs';

const original=Buffer.from([0xb8,0,0x4b,0xcd,0x21,0x90,0x90,0x90,0x90,0x90]);
const sha=createHash('sha256').update(original).digest('hex');
const fixture=()=>({
 schemaVersion:1,provider:'GHIDRA',providerVersion:'12.1.4',
 moduleName:'KOEI.COM',sha256:sha,loadBase:0x10100,
 imageBytes:original.length,windowStart:0,windowEnd:original.length,
 instructions:[
  {reaAddress:0x10100,length:3,flow:'FALLTHROUGH'},
  {reaAddress:0x10103,length:2,flow:'INTERRUPT'},
  {reaAddress:0x10105,length:1,flow:'FALLTHROUGH'}],
 functionEntries:[0x10100],instructionCandidateCount:3,functionEntryCandidateCount:1,
 verifiedCodeBytes:0,fidelity:'GHIDRA_STATIC_CANDIDATES_ONLY__ORIGINAL_DOS_UNTESTED'
});
const verify=x=>auditGhidraOriginalCom(x,original,{moduleName:'KOEI.COM',expectedSha256:sha});
const report=verify(fixture());
assert.equal(report.loadBase,0x10100);
assert.equal(report.originalBytes,10);
assert.equal(report.instructionCandidates,3);
assert.equal(report.functionEntryCandidates,1);
assert.equal(report.codeCandidateBytes,6);
assert.equal(report.unobservedBytes,4);
assert.equal(report.unresolvedStaticFlows,1);
assert.deepEqual(report.firstUnobserved,{fileStart:6,fileEnd:10});
assert.equal(report.gate,'HOLD_UNRESOLVED_FLOW');
assert.equal(report.verifiedCodeBytes,0);
function invalid(modify,regex){
 const f=fixture();modify(f);assert.throws(()=>verify(f),regex);
}
invalid(x=>{x.sha256='f'.repeat(64)},/load identity mismatch/);
invalid(x=>{x.loadBase=0x10000},/load identity mismatch/);
invalid(x=>{x.windowStart=1},/load identity mismatch/);
invalid(x=>{x.instructionCandidateCount=0},/candidate arrays/);
invalid(x=>{x.verifiedCodeBytes=6},/static-only/);
invalid(x=>{x.functionEntries=[0x1010a]},/function entry/);
invalid(x=>{x.instructions[0].length=20},/instruction outside/);
invalid(x=>{x.instructions[1].reaAddress=0x10102},/overlapping/);
invalid(x=>{x.instructions[2].flow='VERIFIED'},/unknown 8086/);
invalid(x=>{x.instructions[2].flow='CALL_NEAR'},/target absent/);
invalid(x=>{x.instructions[2].targetRea=0x10100},/target absent/);
assert.throws(()=>auditGhidraOriginalCom(fixture(),original,{
 moduleName:'KOEI.COM',expectedSha256:'f'.repeat(64)}),/SHA-256 mismatch/);
console.log('UW2 PSP+0100h SHA-pinned Korean COM candidate audit synthetic regression: PASS');
