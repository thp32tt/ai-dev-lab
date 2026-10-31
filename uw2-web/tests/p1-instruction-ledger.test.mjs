import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {auditP1InstructionLedger} from '../tools/p1-instruction-ledger.mjs';

const digest=bytes=>createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const baseline=()=>({
  moduleName:'MAIN.EXE',sha256:'a'.repeat(64),
  headerBytes:0x40,declaredBytes:0x50,
  provider:'GHIDRA',providerVersion:'12.1.4',
  exportSha256:'b'.repeat(64),loadBase:0x10000,
  // Synthetic-only provider records: no Korean original instructions.
  instructions:[
    {reaAddress:0x10000,length:3,bytesSha256:digest([0xe8,2,0]),
      flow:'CALL_NEAR',targetRea:0x10005},
    {reaAddress:0x10003,length:2,bytesSha256:digest([0xff,0xd0]),
      flow:'INDIRECT_CALL'},
    {reaAddress:0x10005,length:1,bytesSha256:digest([0xc3]),
      flow:'RETURN'}
  ]
});
const good=baseline();
const report=auditP1InstructionLedger(good);
assert.equal(report.initializedImageBytes,16);
assert.equal(report.decodedCandidateCount,3);
assert.equal(report.decodedCandidateBytes,6);
assert.equal(report.verifiedCodeBytes,0);
assert.equal(report.verifiedFunctionCount,0);
assert.equal(report.unresolvedStaticFlowCount,1);
assert.equal(report.gate,'HOLD_UNRESOLVED_FLOW');
assert.equal(report.coverageBytes,6);
assert.equal(report.unresolvedBytes,10);
assert.equal(report.flowRecords[0].targetRaw,0x45);
assert.equal(report.flowRecords[0].targetInstructionObserved,true);
assert.equal(report.flowRecords[0].status,'CANDIDATE_DIRECT');
assert.equal(report.flowRecords[1].status,'UNRESOLVED_STATIC');
assert.equal(report.flowRecords[2].status,'RUNTIME_RETURN');
assert.deepEqual(report.instructionCandidates.map(r=>r.rawStart),[0x40,0x43,0x45]);
assert.deepEqual(report.pendingByteRanges,[{
  kind:'UNOBSERVED',imageStart:6,imageEnd:16,rawStart:0x46,rawEnd:0x50
}]);

const reversed=baseline();reversed.instructions.reverse();
assert.deepEqual(auditP1InstructionLedger(reversed).instructionCandidates,report.instructionCandidates);
assert.deepEqual(auditP1InstructionLedger(reversed).flowRecords,report.flowRecords);

// Direct call without an observed target remains explicitly unresolved;
// a Ghidra procedure count never upgrades static candidates to verified.
const absent=baseline();
absent.instructions.pop();
const missing=auditP1InstructionLedger(absent);
assert.equal(missing.unresolvedStaticFlowCount,2);
assert.equal(missing.flowRecords[0].targetInstructionObserved,false);
assert.equal(missing.gate,'HOLD_UNRESOLVED_FLOW');

const outside=baseline();
outside.instructions[0].targetRea=0x10012;
const out=auditP1InstructionLedger(outside);
assert.equal(out.flowRecords[0].targetRaw,null);
assert.equal(out.flowRecords[0].status,'UNRESOLVED_STATIC');

const complete=baseline();
complete.instructions=[{
  reaAddress:0x10000,length:1,bytesSha256:digest([0xc3]),flow:'RETURN'
}];
complete.declaredBytes=0x41;
const synthetic=auditP1InstructionLedger(complete);
assert.equal(synthetic.gate,'HOLD_STATIC_ONLY'); // Still NOT original fidelity.

function invalid(change,regex){
  const x=baseline();change(x);
  assert.throws(()=>auditP1InstructionLedger(x),regex);
}
invalid(x=>{x.provider='UNKNOWN';},/provenance/);
invalid(x=>{x.providerVersion='';},/version/);
invalid(x=>{x.exportSha256='fake';},/SHA-256/);
invalid(x=>{x.sha256='fake';},/SHA-256/);
invalid(x=>{x.instructions[0].bytesSha256='fake';},/SHA-256/);
invalid(x=>{x.instructions[0].length=16;},/length/);
invalid(x=>{x.instructions[0].reaAddress=0x1000f;},/crosses/);
invalid(x=>{x.instructions[0].reaAddress=0xffff;},/crosses/);
invalid(x=>{x.instructions[2].reaAddress=0x10004;},/overlapping/);
invalid(x=>{x.instructions[0].flow='MADE_UP';},/flow type/);
invalid(x=>{delete x.instructions[0].targetRea;},/direct flow/);
invalid(x=>{x.instructions[1].targetRea=0x10005;},/direct flow/);
invalid(x=>{x.instructions[2].targetRea=0x10003;},/return target/);
invalid(x=>{x.instructions.push(null);},/decoded instruction/);
invalid(x=>{x.moduleName='KOEI.COM';},/MZ module/);
console.log('UW2 P1 decoded instruction candidate and indirect-flow gaps synthetic regression: PASS');
