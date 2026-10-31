#!/usr/bin/env node
// Read-only bridge from existing Ghidra/REA function-dossier snapshots to P1
// SHA-pinned instruction candidates. No original bytes/pseudocode are emitted.
import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseMzHeader} from './original-inventory.mjs';
import {auditP1InstructionLedger} from './p1-instruction-ledger.mjs';

const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const hex=value=>typeof value==='string'&&/^0x[0-9a-f]+$/i.test(value)?
  Number.parseInt(value.slice(2),16):null;

function classify(text){
  const match=/^([A-Z][A-Z0-9]*)\b(?:\s+(.*))?$/i.exec(text);
  if(!match)return {flow:'UNKNOWN'};
  const op=match[1].toUpperCase(),operand=(match[2]||'').trim();
  if(['RET','RETF','IRET'].includes(op))return {flow:'RETURN'};
  if(op==='INT'||op==='INT3'||op==='INTO')return {flow:'INTERRUPT'};
  if(op==='CALLF')return {flow:'CALL_FAR'};
  if(op==='JMPF')return {flow:'JUMP_FAR'};
  const target=/^0x[0-9a-f]+$/i.test(operand)?hex(operand):null;
  if(op==='CALL')return target===null?
    {flow:'INDIRECT_CALL'}:{flow:'CALL_NEAR',targetRea:target};
  if(op==='JMP')return target===null?
    {flow:'INDIRECT_JUMP'}:{flow:'JUMP_NEAR',targetRea:target};
  if(/^J[A-Z]+$/.test(op)||/^LOOP[A-Z]*$/.test(op))
    return target===null?{flow:'UNKNOWN'}:{flow:'JCC_NEAR',targetRea:target};
  return {flow:'FALLTHROUGH'};
}

export function extractReaSnapshotCandidates(snapshot,bytes,{
  moduleName,expectedSha256,loadBase=0x10000
}={}){
  if(!snapshot||typeof snapshot!=='object'||!Buffer.isBuffer(bytes))
    throw new TypeError('REA snapshot and original MZ Buffer are required');
  if(typeof expectedSha256!=='string'||!(/^[0-9a-f]{64}$/).test(expectedSha256))
    throw new Error('exact original SHA-256 required');
  if(hash(bytes)!==expectedSha256)throw new Error('original executable SHA-256 mismatch');
  const mz=parseMzHeader(bytes,moduleName);
  const artifact=snapshot.evidence_bundle?.artifacts;
  if(!Array.isArray(artifact)||!artifact.some(a=>a.digest?.sha256===expectedSha256))
    throw new Error('REA artifact SHA-256 does not match original executable');
  const binding=snapshot.binding?.provider;
  if(binding?.id!=='ghidra'||typeof binding.version!=='string'||!binding.version.trim())
    throw new Error('Ghidra provider identity/version missing from REA snapshot');
  const records=snapshot.evidence_bundle?.records;
  if(!Array.isArray(records))throw new Error('REA evidence records missing');
  const byAddress=new Map(),gaps=[];
  let functionsObserved=0,assemblyRowsObserved=0;
  for(const [ridx,r] of records.entries()){
    if(r.operation!=='analyze_function')continue;
    if(r.subject?.digest?.sha256!==expectedSha256)
      throw new Error('REA function-dossier subject SHA-256 mismatch');
    const v=r.normalized_result;
    if(!v||!Array.isArray(v.assembly)||!Array.isArray(v.basic_blocks)){
      gaps.push({record:ridx,reason:'MISSING_ASSEMBLY_OR_BLOCKS'});continue;
    }
    functionsObserved++;
    const blocks=v.basic_blocks.map(b=>({start:hex(b.start),end:hex(b.end)}));
    const rows=[];
    for(const line of v.assembly){
      assemblyRowsObserved++;
      if(typeof line!=='string'){gaps.push({record:ridx,reason:'NON_TEXT_ASSEMBLY'});continue;}
      const m=/^(0x[0-9a-f]+):\s+(.+)$/i.exec(line.trim());
      if(!m){gaps.push({record:ridx,reason:'UNPARSEABLE_ASSEMBLY'});continue;}
      const addr=hex(m[1]);
      const owners=blocks.filter(b=>b.start!==null&&b.end!==null&&b.start<=addr&&addr<b.end);
      if(owners.length!==1){
        gaps.push({record:ridx,reaAddress:addr,reason:'AMBIGUOUS_OR_MISSING_BASIC_BLOCK'});continue;
      }
      rows.push({addr,text:m[2],block:owners[0]});
    }
    rows.sort((a,b)=>a.addr-b.addr);
    for(const [i,row] of rows.entries()){
      const next=rows[i+1];
      const end=next&&next.addr<row.block.end?next.addr:row.block.end;
      const length=end-row.addr;
      if(length<1||length>15||row.addr<loadBase||
         row.addr-loadBase+length>mz.imageBytes){
        gaps.push({record:ridx,reaAddress:row.addr,reason:'UNSAFE_INSTRUCTION_BOUNDARY'});
        continue;
      }
      const raw=mz.headerBytes+row.addr-loadBase;
      const ins={reaAddress:row.addr,length,
        bytesSha256:hash(bytes.subarray(raw,raw+length)),...classify(row.text)};
      const old=byAddress.get(row.addr);
      if(old){
        if(JSON.stringify(old)!==JSON.stringify(ins))
          throw new Error('conflicting REA instruction overlap at linear address '+row.addr);
      }else byAddress.set(row.addr,ins);
    }
  }
  const instructions=[...byAddress.values()].sort((a,b)=>a.reaAddress-b.reaAddress);
  const source={moduleName,sha256:expectedSha256,
    headerBytes:mz.headerBytes,declaredBytes:mz.declaredBytes,
    provider:'GHIDRA',providerVersion:binding.version,
    exportSha256:hash(Buffer.from(JSON.stringify(snapshot))),
    loadBase,instructions};
  const audited=auditP1InstructionLedger(source);
  return {report:{
    moduleName,sha256:expectedSha256,providerVersion:binding.version,
    functionsObserved,assemblyRowsObserved,
    instructionsExtracted:instructions.length,
    discardedRows:gaps.length,gaps,
    candidateBytes:audited.decodedCandidateBytes,
    unobservedBytes:audited.counts.UNOBSERVED,
    unresolvedStaticFlowCount:audited.unresolvedStaticFlowCount,
    gate:audited.gate,
    caveat:'Only recorded REA function dossiers were inspected; missing functions, undecoded bytes, unresolved indirect transfers, actual DOS run and browser equivalence remain UNTESTED.'
  },ledger:source};
}
const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const [exe,snapshotFile]=process.argv.slice(2);
  if(!exe||!snapshotFile){
    process.stderr.write('Usage: node tools/p1-rea-snapshot-bridge.mjs <user-original.exe> <rea-snapshot.json>\n');
    process.exitCode=2;
  }else try{
    const original=fs.readFileSync(exe),snapBytes=fs.readFileSync(snapshotFile);
    const baseline=JSON.parse(fs.readFileSync(
      new URL('../docs/original-baseline-20261031.json',import.meta.url),'utf8'));
    const moduleName=path.basename(exe).toUpperCase();
    const pinned=baseline.coreExecutables.find(r=>r.name===moduleName);
    if(!pinned)throw new Error('original EXE missing from pinned baseline');
    const snapshot=JSON.parse(snapBytes.toString('utf8'));
    const {report}=extractReaSnapshotCandidates(snapshot,original,{
      moduleName,expectedSha256:pinned.sha256
    });
    // No reconstructed copyrighted code, instruction bytes, or user paths.
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
  }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
