import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mergeReaSnapshotBatches} from '../tools/p1-rea-batch-merge.mjs';
import {auditP1InstructionLedger} from '../tools/p1-instruction-ledger.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const fixture=()=>{
  const bytes=Buffer.alloc(0x80);
  bytes.writeUInt16LE(0x5a4d,0);
  bytes.writeUInt16LE(0x80,2);
  bytes.writeUInt16LE(1,4);
  bytes.writeUInt16LE(4,8);
  bytes.writeUInt16LE(0x1c,24);
  bytes.set([0xe8,0x03,0x00,0xff,0x27,0xcb,0x90,0x90],0x40);
  const sha=hash(bytes);
  const dossier=(assembly,start,end)=>({
    operation:'analyze_function',subject:{digest:{sha256:sha}},
    normalized_result:{assembly,
      basic_blocks:[{start:'0x'+start.toString(16),end:'0x'+end.toString(16)}]}
  });
  const snapshot=record=>({
    binding:{provider:{id:'ghidra',version:'12.1.4'}},
    evidence_bundle:{artifacts:[{digest:{sha256:sha}}],records:[record]}
  });
  const a=snapshot(dossier([
    '0x10000: CALL 0x10006','0x10003: JMP word ptr [BX]','0x10005: RETF'
  ],0x10000,0x10006));
  const b=snapshot(dossier(['0x10006: NOP','0x10007: NOP'],0x10006,0x10008));
  return {bytes,sha,a,b};
};
const f=fixture();
const options={moduleName:'MAIN.EXE',expectedSha256:f.sha};
const left=mergeReaSnapshotBatches([f.a,f.b],f.bytes,options);
const right=mergeReaSnapshotBatches([f.b,f.a],f.bytes,options);
assert.deepEqual(left,right);
assert.equal(left.report.snapshotCount,2);
assert.equal(left.report.replayCount,0);
assert.equal(left.report.functionRecordsInspected,2);
assert.equal(left.report.assemblyRowsInspected,5);
assert.equal(left.report.uniqueInstructionCandidates,5);
assert.equal(left.report.candidateBytes,8);
assert.equal(left.report.unobservedBytes,56);
assert.equal(left.report.unresolvedStaticFlowCount,1);
assert.equal(left.report.verifiedCodeBytes,0);
assert.equal(left.report.verifiedFunctionCount,0);
assert.equal(left.report.gate,'HOLD_UNRESOLVED_FLOW');
assert.equal(left.report.nextUnobserved.imageStart,8);
assert.equal(left.report.nextUnobserved.rawStart,0x48);
assert.equal(auditP1InstructionLedger(left.ledger).flowRecords[0].targetInstructionObserved,true);

const repeated=mergeReaSnapshotBatches([f.a,f.b,f.a],f.bytes,options);
assert.equal(repeated.report.snapshotCount,2);
assert.equal(repeated.report.replayCount,1);
assert.deepEqual(repeated.ledger,left.ledger);
const empty=fixture();
const noFunctions={...empty.a,
  evidence_bundle:{...empty.a.evidence_bundle,records:[]}};
const held=mergeReaSnapshotBatches([noFunctions],empty.bytes,{
  moduleName:'MAIN.EXE',expectedSha256:empty.sha
});
assert.equal(held.report.uniqueInstructionCandidates,0);
assert.equal(held.report.unobservedBytes,64);
assert.equal(held.report.gate,'HOLD_INCOMPLETE');
const corrupt=fixture();
corrupt.a.evidence_bundle.records[0].normalized_result.assembly.push('0x10006: NOP','0x10007: NOP');
corrupt.a.evidence_bundle.records[0].normalized_result.basic_blocks[0].end='0x10008';
corrupt.b.evidence_bundle.records[0].normalized_result.assembly[0]='0x10006: RETF';
assert.throws(()=>mergeReaSnapshotBatches([corrupt.a,corrupt.b],corrupt.bytes,{
  moduleName:'MAIN.EXE',expectedSha256:corrupt.sha
}),/conflicting cross-batch/);
const overlapping=fixture();
overlapping.b.evidence_bundle.records[0].normalized_result.assembly=[
  '0x10004: NOP','0x10006: NOP','0x10007: NOP'
];
overlapping.b.evidence_bundle.records[0].normalized_result.basic_blocks=[
  {start:'0x10004',end:'0x10008'}];
assert.throws(()=>mergeReaSnapshotBatches([overlapping.a,overlapping.b],
  overlapping.bytes,{moduleName:'MAIN.EXE',expectedSha256:overlapping.sha}),
  /overlapping decoded instructions/);
assert.throws(()=>mergeReaSnapshotBatches([f.a],Buffer.from(f.bytes),{
  moduleName:'MAIN.EXE',expectedSha256:'f'.repeat(64)
}),/SHA-256 mismatch/);
assert.throws(()=>mergeReaSnapshotBatches([],f.bytes,options),/1..256/);
const damaged=fixture();
damaged.b.evidence_bundle.records[0].normalized_result.assembly[0]='???';
const gaps=mergeReaSnapshotBatches([damaged.a,damaged.b],damaged.bytes,{
  moduleName:'MAIN.EXE',expectedSha256:damaged.sha
});
assert.equal(gaps.report.discardedRows,1);
assert.equal(gaps.report.gaps[0].reason,'UNPARSEABLE_ASSEMBLY');
assert.ok(gaps.report.candidateBytes<8);
console.log('UW2 P1 replay-safe multi-REA batch SHA/gap/conflict synthetic regression: PASS');
