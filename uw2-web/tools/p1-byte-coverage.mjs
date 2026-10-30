#!/usr/bin/env node
// P1 coverage ledger for Korean UW2 MZ disassembly analysis.
// This is a fail-closed RANGE AUDITOR, not a REA/Ghidra exporter, decoder,
// verified function count, copyrighted binary dump, or runtime proof.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const CLASSES=Object.freeze({
  CODE_CANDIDATE:1,
  DATA_CANDIDATE:2,
  UNRESOLVED:4,
  FAILED:8
});
const CLASS_BY_MASK=Object.freeze({
  0:'UNOBSERVED',
  1:'CODE_CANDIDATE',
  2:'DATA_CANDIDATE',
  4:'UNRESOLVED',
  8:'FAILED'
});
const integer=(n,label)=>{
  if(!Number.isSafeInteger(n)||n<0)throw new RangeError(label+' must be a nonnegative safe integer');
  return n;
};
export function auditP1ByteCoverage(input){
  if(!input||typeof input!=='object')throw new TypeError('P1 ledger object required');
  const {moduleName,sha256,headerBytes,declaredBytes,spans}=input;
  if(typeof moduleName!=='string'||!moduleName.endsWith('.EXE'))
    throw new Error('MZ module name required; COM uses a different mapping');
  if(typeof sha256!=='string'||!/^[a-f0-9]{64}$/.test(sha256))
    throw new Error('exact original SHA-256 required');
  integer(headerBytes,'headerBytes');integer(declaredBytes,'declaredBytes');
  if(headerBytes<0x1c||headerBytes>=declaredBytes)
    throw new Error('invalid declared MZ image bounds');
  const size=declaredBytes-headerBytes;
  if(size>16*1024*1024)throw new RangeError('coverage image exceeds audited bound');
  if(!Array.isArray(spans))throw new TypeError('explicit spans array required');
  const marks=new Uint8Array(size);
  for(const [i,s] of spans.entries()){
    if(!s||typeof s!=='object'||!Object.hasOwn(CLASSES,s.kind))
      throw new Error('unknown P1 span kind at index '+i);
    if(typeof s.source!=='string'||s.source.trim().length===0)
      throw new Error('P1 span requires explicit analysis provenance at index '+i);
    integer(s.start,'span start');integer(s.end,'span end');
    if(s.start>=s.end||s.end>size)
      throw new RangeError('P1 span outside initialized MZ image at index '+i);
    // A range called CODE_* by REA is only a container: record actual
    // decoded-instruction ranges separately; never promote candidates here.
    for(let offset=s.start;offset<s.end;offset++)marks[offset]|=CLASSES[s.kind];
  }
  const counts={UNOBSERVED:0,CODE_CANDIDATE:0,DATA_CANDIDATE:0,
    UNRESOLVED:0,FAILED:0,CONFLICT:0};
  const classification=mask=>CLASS_BY_MASK[mask]??'CONFLICT';
  const ranges=[];
  let from=0,previous=classification(marks[0]);
  for(let pos=0;pos<=size;pos++){
    const current=pos===size?null:classification(marks[pos]);
    if(current!==previous){
      ranges.push({kind:previous,imageStart:from,imageEnd:pos,
        rawStart:headerBytes+from,rawEnd:headerBytes+pos});
      counts[previous]+=pos-from;
      from=pos;previous=current;
    }
  }
  const coverageBytes=size-counts.UNOBSERVED;
  const unresolvedBytes=counts.UNOBSERVED+counts.UNRESOLVED+
    counts.FAILED+counts.CONFLICT;
  const gate=counts.CONFLICT?'HOLD_CONFLICT':
    unresolvedBytes?'HOLD_INCOMPLETE':'HOLD_STATIC_ONLY';
  return {
    schemaVersion:1,moduleName,sha256,initializedImageBytes:size,
    headerBytes,declaredBytes,spanRecords:spans.length,
    counts,coverageBytes,unresolvedBytes,verifiedFunctionCount:0,
    verifiedCodeBytes:0,gate,ranges,
    caveat:'Static candidate/data ranges do not establish verified instructions, original DOS behavior or browser fidelity. A complete range ledger is not a full decompilation.'
  };
}

// Assemble independently extracted REA/Ghidra chunks into a deterministic
// resume inventory WITHOUT pretending a container range proves disassembly.
// The manifest references export digests, never copyrighted original bytes.
export function auditP1CheckpointManifest(manifest){
  if(!manifest||typeof manifest!=='object'||!Array.isArray(manifest.batches))
    throw new TypeError('P1 checkpoint batches required');
  const {moduleName,sha256,headerBytes,declaredBytes,batches}=manifest;
  const ids=new Set(),sourceSpans=[],checkpoints=[];
  const imageSize=declaredBytes-headerBytes;
  // Basic bounds and original SHA are independently enforced again by
  // auditP1ByteCoverage even when a batch does not cover any instructions.
  const ordered=[...batches].sort((a,b)=>String(a?.batchId).localeCompare(String(b?.batchId),'en'));
  for(const batch of ordered){
    const id=batch?.batchId;
    if(typeof id!=='string'||!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/.test(id)||ids.has(id))
      throw new Error('P1 checkpoint batch ID missing or duplicate');
    ids.add(id);
    if(typeof batch.tool!=='string'||!['REA','GHIDRA','STATIC'].includes(batch.tool))
      throw new Error('P1 checkpoint tool must be explicit REA/GHIDRA/STATIC');
    if(typeof batch.exportSha256!=='string'||!/^[a-f0-9]{64}$/.test(batch.exportSha256))
      throw new Error('P1 checkpoint requires exact export SHA-256');
    integer(batch.start,'batch start');integer(batch.end,'batch end');
    if(batch.start>=batch.end||batch.end>imageSize)
      throw new RangeError('P1 checkpoint outside initialized MZ image');
    if(batch.status!=='EXPORTED'&&batch.status!=='FAILED')
      throw new Error('P1 checkpoint status must be EXPORTED or FAILED');
    if(!Array.isArray(batch.spans)||batch.status==='FAILED'&&batch.spans.length)
      throw new Error('P1 FAILED checkpoint cannot claim decoded spans');
    const source=batch.tool+':'+id+'@'+batch.exportSha256;
    if(batch.status==='FAILED'){
      sourceSpans.push({kind:'FAILED',start:batch.start,end:batch.end,source});
    }else{
      for(const span of batch.spans){
        if(!span||!Object.hasOwn(CLASSES,span.kind))
          throw new Error('unknown P1 checkpoint span kind');
        integer(span.start,'checkpoint span start');
        integer(span.end,'checkpoint span end');
        if(span.start<batch.start||span.end>batch.end||span.start>=span.end)
          throw new RangeError('checkpoint span outside its batch');
        sourceSpans.push({kind:span.kind,start:span.start,end:span.end,source});
      }
    }
    checkpoints.push({batchId:id,tool:batch.tool,exportSha256:batch.exportSha256,
      status:batch.status,start:batch.start,end:batch.end,spanRecords:batch.spans.length});
  }
  const audited=auditP1ByteCoverage({moduleName,sha256,headerBytes,declaredBytes,spans:sourceSpans});
  const pendingRanges=audited.ranges.filter(r=>
    r.kind==='UNOBSERVED'||r.kind==='UNRESOLVED'||
    r.kind==='FAILED'||r.kind==='CONFLICT');
  return {
    ...audited,schemaVersion:2,batchCount:checkpoints.length,checkpoints,
    pendingRanges,nextUnobserved:pendingRanges.find(r=>r.kind==='UNOBSERVED')??null,
    checkpointGate:audited.gate,
    caveat:'Checkpoint merge accounts for unobserved/failed/conflicting bytes. EXPORTED is not verified code, REA/Ghidra success, original DOS execution, or web fidelity.'
  };
}

const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const file=process.argv[2];
  if(!file){process.stderr.write('Usage: node tools/p1-byte-coverage.mjs <analysis-ledger.json>\n');process.exitCode=2;}
  else try{
    const ledger=JSON.parse(fs.readFileSync(file,'utf8'));
    const output=auditP1ByteCoverage(ledger);
    process.stdout.write(JSON.stringify(output,null,2)+'\n');
    // A ledger is always on hold until original DOS differential evidence.
    if(output.gate!=='HOLD_STATIC_ONLY')process.exitCode=1;
  }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
