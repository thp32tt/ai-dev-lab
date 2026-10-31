#!/usr/bin/env node
// Resumable, provenance-checked P1 REA/Ghidra snapshot merge.
// Accepts only user-owned SHA-pinned MZ bytes. Emits metadata, not code/ROM.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {extractReaSnapshotCandidates} from './p1-rea-snapshot-bridge.mjs';
import {auditP1InstructionLedger} from './p1-instruction-ledger.mjs';

const digest=value=>crypto.createHash('sha256').update(value).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const sameInstruction=(a,b)=>a.length===b.length&&
  a.bytesSha256===b.bytesSha256&&a.flow===b.flow&&
  (a.targetRea??null)===(b.targetRea??null);

// Each snapshot is an independently saved REA evidence bundle. A duplicate
// replay is idempotent. Conflicting instruction boundaries fail the entire
// batch instead of silently selecting the latest analyzer's guess.
export function mergeReaSnapshotBatches(snapshots,original,{
  moduleName,expectedSha256,loadBase=0x10000
}={}){
  if(!Buffer.isBuffer(original))throw new TypeError('original MZ Buffer required');
  if(typeof expectedSha256!=='string'||!SHA.test(expectedSha256)||
     digest(original)!==expectedSha256)
    throw new Error('pinned original executable SHA-256 mismatch');
  if(!Array.isArray(snapshots)||!snapshots.length||snapshots.length>256)
    throw new RangeError('1..256 REA snapshot batches required');
  const dedup=new Map();
  for(const snap of snapshots){
    if(!snap||typeof snap!=='object'||Array.isArray(snap))
      throw new TypeError('REA snapshot object required');
    const serialized=JSON.stringify(snap);
    if(serialized.length>32*1024*1024)
      throw new RangeError('REA snapshot exceeds bounded analysis size');
    dedup.set(digest(serialized),snap);
  }
  const ordered=[...dedup].sort((a,b)=>a[0].localeCompare(b[0]));
  const instructions=new Map(),sources=[],gaps=[];
  let functionRecordsInspected=0,assemblyRowsInspected=0;
  let headerBytes=null,declaredBytes=null;
  const versions=new Set();
  for(const [snapshotSha,snap] of ordered){
    const extracted=extractReaSnapshotCandidates(snap,original,{
      moduleName,expectedSha256,loadBase
    });
    const {ledger,report}=extracted;
    if(headerBytes!==null&&
      (headerBytes!==ledger.headerBytes||declaredBytes!==ledger.declaredBytes))
      throw new Error('REA batches have incompatible original MZ bounds');
    headerBytes=ledger.headerBytes;declaredBytes=ledger.declaredBytes;
    versions.add(ledger.providerVersion);
    functionRecordsInspected+=report.functionsObserved;
    assemblyRowsInspected+=report.assemblyRowsObserved;
    for(const gap of report.gaps)
      gaps.push({snapshotSha,record:gap.record,reason:gap.reason,
        ...(gap.reaAddress===undefined?{}:{reaAddress:gap.reaAddress})});
    for(const row of ledger.instructions){
      const old=instructions.get(row.reaAddress);
      if(old&&!sameInstruction(old,row))
        throw new Error('conflicting cross-batch REA instruction at linear '+row.reaAddress);
      if(!old)instructions.set(row.reaAddress,row);
    }
    sources.push({snapshotSha,providerVersion:ledger.providerVersion,
      functionRecords:report.functionsObserved,assemblyRows:report.assemblyRowsObserved,
      instructionRows:ledger.instructions.length,discardedRows:report.discardedRows});
  }
  const combined={
    moduleName,sha256:expectedSha256,headerBytes,declaredBytes,
    provider:'GHIDRA',
    // Provider version is not silently promoted if different snapshots
    // were produced with different analyzer versions.
    providerVersion:versions.size===1?[...versions][0]:'1.0.0-mixed',
    exportSha256:digest(JSON.stringify(sources.map(s=>s.snapshotSha))),
    loadBase,
    instructions:[...instructions.values()].sort((a,b)=>a.reaAddress-b.reaAddress)
  };
  const audit=auditP1InstructionLedger(combined);
  return {
    report:{
      schemaVersion:1,moduleName,sha256:expectedSha256,
      snapshotCount:sources.length,
      replayCount:snapshots.length-sources.length,
      sources,providerVersions:[...versions].sort(),
      functionRecordsInspected,assemblyRowsInspected,
      uniqueInstructionCandidates:audit.decodedCandidateCount,
      candidateBytes:audit.decodedCandidateBytes,
      unobservedBytes:audit.counts.UNOBSERVED,
      unresolvedStaticFlowCount:audit.unresolvedStaticFlowCount,
      discardedRows:gaps.length,gaps,
      nextUnobserved:audit.pendingByteRanges.find(x=>x.kind==='UNOBSERVED')??null,
      gate:audit.gate,verifiedCodeBytes:0,verifiedFunctionCount:0,
      caveat:'REA/Ghidra candidates merged only; not full disassembly, DOS runtime trace, original gameplay, visuals, audio or save equivalence.'
    },
    ledger:combined
  };
}

const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const [executable,...files]=process.argv.slice(2);
  if(!executable||!files.length){
    process.stderr.write('Usage: node tools/p1-rea-batch-merge.mjs <original.exe> <rea-snapshot-1.json> [more snapshots...]\\n');
    process.exitCode=2;
  }else try{
    const original=fs.readFileSync(executable);
    const moduleName=path.basename(executable).toUpperCase();
    const baseline=JSON.parse(fs.readFileSync(
      new URL('../docs/original-baseline-20261031.json',import.meta.url),'utf8'));
    const pinned=baseline.coreExecutables.find(x=>x.name===moduleName);
    if(!pinned)throw new Error('original MZ module absent from Korean SHA baseline');
    const snapshots=files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
    const {report}=mergeReaSnapshotBatches(snapshots,original,{
      moduleName,expectedSha256:pinned.sha256
    });
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    // A non-complete static inventory is an explicit HOLD, never success.
    if(report.gate!=='HOLD_STATIC_ONLY')process.exitCode=1;
  }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
