import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {extractReaSnapshotCandidates} from '../tools/p1-rea-snapshot-bridge.mjs';
import {auditP1InstructionLedger} from '../tools/p1-instruction-ledger.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
function fixture(){
  const bytes=Buffer.alloc(0x80);
  bytes.writeUInt16LE(0x5a4d,0); // MZ
  bytes.writeUInt16LE(0x80,2); // declared last page
  bytes.writeUInt16LE(1,4);
  bytes.writeUInt16LE(0,6);
  bytes.writeUInt16LE(4,8); // 64-byte header
  bytes.writeUInt16LE(0x1c,24);
  bytes.set([0xe8,0x03,0x00,0xff,0x27,0xcb,0x90,0x90],0x40);
  const digest=hash(bytes);
  const rec={
    operation:'analyze_function',
    subject:{digest:{sha256:digest}},
    normalized_result:{
      assembly:[
        '0x10000: CALL 0x10006',
        '0x10003: JMP word ptr [BX]',
        '0x10005: RETF',
        '0x10006: NOP',
        '0x10007: NOP'
      ],
      basic_blocks:[{start:'0x10000',end:'0x10008',successors:[]}]
    }
  };
  const snap={
    binding:{provider:{id:'ghidra',version:'12.1.4'}},
    evidence_bundle:{artifacts:[{digest:{sha256:digest}}],records:[rec]}
  };
  return {bytes,snap,digest};
}
const {bytes,snap,digest}=fixture();
const v=extractReaSnapshotCandidates(snap,bytes,{
  moduleName:'MAIN.EXE',expectedSha256:digest
});
assert.equal(v.report.functionsObserved,1);
assert.equal(v.report.assemblyRowsObserved,5);
assert.equal(v.report.instructionsExtracted,5);
assert.equal(v.report.discardedRows,0);
assert.equal(v.report.candidateBytes,8);
assert.equal(v.report.unobservedBytes,56);
assert.equal(v.report.unresolvedStaticFlowCount,1);
assert.equal(v.report.gate,'HOLD_UNRESOLVED_FLOW');
assert.deepEqual(v.ledger.instructions.map(x=>x.length),[3,2,1,1,1]);
assert.deepEqual(v.ledger.instructions.map(x=>x.flow),
  ['CALL_NEAR','INDIRECT_JUMP','RETURN','FALLTHROUGH','FALLTHROUGH']);
assert.equal(v.ledger.instructions[0].targetRea,0x10006);
assert.equal(v.ledger.instructions[1].bytesSha256,hash(bytes.subarray(0x43,0x45)));
const audited=auditP1InstructionLedger(v.ledger);
assert.equal(audited.flowRecords[0].targetInstructionObserved,true);
assert.equal(audited.verifiedCodeBytes,0);

function invalid(change,regex){
  const f=fixture();change(f);
  assert.throws(()=>extractReaSnapshotCandidates(f.snap,f.bytes,{
    moduleName:'MAIN.EXE',expectedSha256:f.digest
  }),regex);
}
invalid(x=>{x.bytes[0x42]^=1;},/original executable SHA/);
invalid(x=>{x.snap.evidence_bundle.artifacts=[];},/artifact SHA/);
invalid(x=>{x.snap.binding.provider.version='';},/provider identity/);
invalid(x=>{x.snap.evidence_bundle.records[0].subject.digest.sha256='f'.repeat(64);},/subject SHA/);
invalid(x=>{x.snap.evidence_bundle.records[0].normalized_result.assembly[1]='???';},
  /UNPARSEABLE_ASSEMBLY/); // Reported gap, not a fabricated candidate.
console.log('UW2 P1 REA snapshot to original MZ SHA instruction bridge synthetic regression: PASS');
