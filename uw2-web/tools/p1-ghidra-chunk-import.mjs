#!/usr/bin/env node
// Validates Ghidra's 8086 disassembly candidates against user-owned original MZ
// bytes, merges adjacent restartable chunks and prints ONLY aggregate metadata.
// No original bytes, disassembly, pseudocode, paths or decompiler payload emitted.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseMzHeader} from './original-inventory.mjs';
import {auditP1InstructionLedger} from './p1-instruction-ledger.mjs';

const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const SHA=/^[a-f0-9]{64}$/;
const int=(x,n)=>{
  if(!Number.isSafeInteger(x)||x<0)throw new RangeError(n+' requires nonnegative safe integer');
  return x;
};
const flows=new Set(['FALLTHROUGH','CALL_NEAR','JUMP_NEAR','JCC_NEAR',
  'CALL_FAR','JUMP_FAR','INDIRECT_CALL','INDIRECT_JUMP','INTERRUPT','RETURN','UNKNOWN']);
const direct=new Set(['CALL_NEAR','JUMP_NEAR','JCC_NEAR']);
export function auditGhidraOriginalChunks(exports,original,{moduleName,expectedSha256}={}){
  if(!Buffer.isBuffer(original))throw new TypeError('original MZ Buffer required');
  if(!SHA.test(expectedSha256??'')||digest(original)!==expectedSha256)
    throw new Error('pinned Korean original MZ SHA-256 mismatch');
  if(typeof moduleName!=='string'||!(/^[A-Z0-9_-]{1,8}\.EXE$/).test(moduleName))
    throw new Error('exact original MZ basename required');
  const mz=parseMzHeader(original,moduleName);
  if(!Array.isArray(exports)||exports.length<1||exports.length>512)
    throw new RangeError('1..512 Ghidra chunks required');
  const sources=new Map();
  for(const input of exports){
    if(!input||typeof input!=='object'||Array.isArray(input))
      throw new TypeError('Ghidra chunk object required');
    const json=JSON.stringify(input);
    if(json.length>32*1024*1024)throw new RangeError('Ghidra chunk exceeds bounded metadata size');
    const checksum=digest(json);
    sources.set(checksum,input);
  }
  const ordered=[...sources].sort((a,b)=>a[0].localeCompare(b[0]));
  let lastEnd=0;
  const ranges=[],ins=[],entryCandidates=new Set();
  const recorded=[],windows=[];
  for(const [exportSha256,x] of ordered.sort((a,b)=>
    a[1].windowStart-b[1].windowStart||a[0].localeCompare(b[0]))){
    if(x.schemaVersion!==1||x.provider!=='GHIDRA'||
       typeof x.providerVersion!=='string'||!(/^12\.1\.[0-9]+$/).test(x.providerVersion))
      throw new Error('unsupported Ghidra 12.1.x export provenance');
    if(x.moduleName!==moduleName||x.sha256!==expectedSha256||
       x.loadBase!==0x10000||x.imageBytes!==mz.imageBytes)
      throw new Error('Ghidra chunk mismatches pinned original MZ layout');
    const start=int(x.windowStart,'windowStart'),end=int(x.windowEnd,'windowEnd');
    if(start>=end||end>mz.imageBytes||end-start>0x10000)
      throw new Error('Ghidra chunk outside initialized image or >64KiB');
    if(start<lastEnd)throw new Error('Ghidra chunk windows overlap or conflict');
    lastEnd=end;
    if(!Array.isArray(x.instructions)||!Array.isArray(x.functionEntries))
      throw new Error('Ghidra instruction/function evidence arrays required');
    if(x.instructions.length>end-start||x.functionEntries.length>mz.imageBytes)
      throw new RangeError('Ghidra chunk contains impossible number of candidates');
    if(x.instructionCandidateCount!==x.instructions.length||
       x.functionEntryCandidateCount!==x.functionEntries.length||
       x.verifiedCodeBytes!==0||
       x.fidelity!=='GHIDRA_STATIC_CANDIDATES_ONLY__ORIGINAL_DOS_UNTESTED')
      throw new Error('Ghidra export completeness/fidelity stamp mismatch');
    for(const entry of x.functionEntries){
      int(entry,'function entry');
      if(entry < 0x10000+start||entry>=0x10000+end)
        throw new Error('Ghidra function entry outside chunk');
      if(entryCandidates.has(entry))throw new Error('duplicate function entry evidence');
      entryCandidates.add(entry);
    }
    const first=ins.length;
    for(const row of x.instructions){
      if(!row||typeof row!=='object'||Array.isArray(row))
        throw new TypeError('Ghidra instruction candidate object required');
      const addr=int(row.reaAddress,'linear address'),length=int(row.length,'length');
      const offset=addr-0x10000;
      if(length<1||length>15||offset<start||offset+length>end)
        throw new Error('Ghidra instruction crosses verified MZ chunk boundaries');
      if(!flows.has(row.flow))throw new Error('unknown Ghidra 8086 flow class');
      if(direct.has(row.flow)!==Object.hasOwn(row,'targetRea'))
        throw new Error('Ghidra direct control flow must have unique target');
      if(Object.hasOwn(row,'targetRea'))int(row.targetRea,'targetRea');
      // Bytes come exclusively from the SHA-pinned original file, not
      // Ghidra relocated process memory. Never emit these original bytes.
      const raw=mz.headerBytes+offset;
      ins.push({reaAddress:addr,length,flow:row.flow,
        ...(direct.has(row.flow)?{targetRea:row.targetRea}:{}),
        bytesSha256:digest(original.subarray(raw,raw+length))});
    }
    windows.push({imageStart:start,imageEnd:end,exportSha256,
      instructionCandidateCount:ins.length-first,functionEntryCandidateCount:x.functionEntries.length});
    recorded.push({exportSha256,provider:x.provider,version:x.providerVersion});
  }
  const versions=[...new Set(recorded.map(x=>x.version))];
  if(versions.length!==1)
    throw new Error('Ghidra chunk provider version mismatch: do not silently mix decoders');
  const ledger={
    moduleName,sha256:expectedSha256,headerBytes:mz.headerBytes,declaredBytes:mz.declaredBytes,
    provider:'GHIDRA',providerVersion:versions[0],
    exportSha256:digest(JSON.stringify(recorded.map(x=>x.exportSha256))),
    loadBase:0x10000,instructions:ins.sort((a,b)=>a.reaAddress-b.reaAddress)
  };
  const audit=auditP1InstructionLedger(ledger);
  // Prioritize future *analysis*, never promote candidates into verified
  // executable bytes. These are non-copyrighted address/count summaries only.
  const gaps=audit.pendingByteRanges.filter(x=>x.kind==='UNOBSERVED');
  const unresolved=audit.flowRecords.filter(x=>x.status==='UNRESOLVED_STATIC');
  const flowCounts={};
  for(const item of unresolved)flowCounts[item.type]=(flowCounts[item.type]||0)+1;
  const largestGaps=[...gaps].sort((a,b)=>
    (b.imageEnd-b.imageStart)-(a.imageEnd-a.imageStart)||
    a.imageStart-b.imageStart).slice(0,12).map(x=>({
      imageStart:x.imageStart,imageEnd:x.imageEnd,
      bytes:x.imageEnd-x.imageStart
    }));
  const unresolvedDirectTargets=unresolved
    .filter(x=>x.targetRea!==null)
    .sort((a,b)=>a.sourceRea-b.sourceRea)
    .slice(0,16).map(x=>({
      sourceRaw:x.sourceRaw,targetRaw:x.targetRaw,type:x.type,
      targetInstructionObserved:x.targetInstructionObserved
    }));
  return {report:{
    moduleName,sha256:expectedSha256,
    providerVersion:versions[0],uniqueChunks:windows.length,
    duplicateReplays:exports.length-windows.length,windows,
    functionEntryCandidates:entryCandidates.size,
    instructionCandidates:audit.decodedCandidateCount,
    codeCandidateBytes:audit.decodedCandidateBytes,
    unobservedImageBytes:audit.counts.UNOBSERVED,
    unobservedRangeCount:gaps.length,largestUnobservedRanges:largestGaps,
    unresolvedStaticFlows:audit.unresolvedStaticFlowCount,
    unresolvedFlowTypes:flowCounts,unresolvedDirectTargets,
    firstUnobserved:audit.pendingByteRanges.find(x=>x.kind==='UNOBSERVED')??null,
    verifiedCodeBytes:0,verifiedFunctionCount:0,
    gate:audit.gate,
    caveat:'Automated Ghidra disassembly candidates only; no original DOS runtime trace, game fidelity or full image verification.'
  },ledger};
}

const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const [exe,...files]=process.argv.slice(2);
  if(!exe||!files.length){
    process.stderr.write('Usage: node tools/p1-ghidra-chunk-import.mjs <original.exe> <private-chunk.json>... \n');
    process.exitCode=2;
  }else try{
    const original=fs.readFileSync(exe),moduleName=path.basename(exe).toUpperCase();
    const baseline=JSON.parse(fs.readFileSync(
      new URL('../docs/original-baseline-20261031.json',import.meta.url),'utf8'));
    const pinned=baseline.coreExecutables.find(x=>x.name===moduleName);
    if(!pinned)throw new Error('original file missing from Korean SHA baseline');
    const exports=files.map(f=>JSON.parse(fs.readFileSync(f,'utf8')));
    const {report}=auditGhidraOriginalChunks(exports,original,{
      moduleName,expectedSha256:pinned.sha256
    });
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    // HOLD remains a successful read-only audit, not a porting completion.
  }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
