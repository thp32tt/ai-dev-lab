#!/usr/bin/env node
// P1 decoded-instruction ledger. Analysis metadata only; no game binaries,
// pseudocode, instructions or guessed executable behavior are published.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditP1ByteCoverage} from './p1-byte-coverage.mjs';

const SHA=/^[0-9a-f]{64}$/;
const FLOWS=new Set([
  'FALLTHROUGH','CALL_NEAR','JUMP_NEAR','JCC_NEAR',
  'CALL_FAR','JUMP_FAR','INDIRECT_CALL','INDIRECT_JUMP',
  'INTERRUPT','RETURN','UNKNOWN'
]);
const DIRECT=new Set(['CALL_NEAR','JUMP_NEAR','JCC_NEAR']);
const OPAQUE=new Set(['CALL_FAR','JUMP_FAR','INDIRECT_CALL',
  'INDIRECT_JUMP','INTERRUPT','UNKNOWN']);
const uint=(n,label)=>{
  if(!Number.isSafeInteger(n)||n<0)throw new RangeError(label+' must be a nonnegative safe integer');
  return n;
};
const sha=(v,label)=>{
  if(typeof v!=='string'||!SHA.test(v))throw new Error(label+' requires lowercase SHA-256');
  return v;
};

// Imported decoded instruction offsets are REA/Ghidra *linear* addresses,
// never inferred CS:IP aliases. They remain CANDIDATES until original DOS
// traces establish executed instruction boundaries and control transfers.
export function auditP1InstructionLedger(input){
  if(!input||typeof input!=='object'||Array.isArray(input))
    throw new TypeError('instruction ledger object required');
  const {moduleName,sha256,headerBytes,declaredBytes,
    provider,providerVersion,exportSha256,loadBase=0x10000,instructions}=input;
  const base=auditP1ByteCoverage({moduleName,sha256,headerBytes,declaredBytes,spans:[]});
  if(!['REA','GHIDRA'].includes(provider))
    throw new Error('explicit REA/GHIDRA provenance required');
  if(typeof providerVersion!=='string'||!/^[0-9][0-9a-zA-Z.+-]{0,63}$/.test(providerVersion))
    throw new Error('analysis provider version required');
  sha(exportSha256,'analysis export');
  uint(loadBase,'loadBase');
  if(!Array.isArray(instructions))throw new TypeError('instructions array required');
  if(instructions.length>base.initializedImageBytes)
    throw new RangeError('more instructions than initialized bytes');

  const size=base.initializedImageBytes;
  const used=new Uint8Array(size);
  const observed=new Map();
  const normalized=[];
  // The ordering of provider output cannot affect published metadata.
  for(const [i,row] of instructions.entries()){
    if(!row||typeof row!=='object'||Array.isArray(row))
      throw new TypeError('decoded instruction metadata required at '+i);
    const address=uint(row.reaAddress,'reaAddress');
    const length=uint(row.length,'instruction length');
    if(length<1||length>15)throw new RangeError('8086 instruction length must be 1..15');
    if(address<loadBase||address-loadBase>size-length)
      throw new RangeError('decoded instruction crosses original MZ initialized image or BSS');
    sha(row.bytesSha256,'instruction byte digest');
    if(!FLOWS.has(row.flow))throw new Error('unknown decoded flow type');
    if(DIRECT.has(row.flow)!==Object.hasOwn(row,'targetRea'))
      throw new Error('near direct flow requires only one explicit targetRea');
    if(row.flow==='RETURN'&&row.targetRea!==undefined)
      throw new Error('return target must be runtime-resolved');
    const imageStart=address-loadBase, imageEnd=imageStart+length;
    for(let pos=imageStart;pos<imageEnd;pos++){
      if(used[pos])throw new Error('overlapping decoded instructions at image offset '+pos);
      used[pos]=1;
    }
    const targetRea=DIRECT.has(row.flow)?uint(row.targetRea,'targetRea'):null;
    const targetImage=targetRea===null?null:targetRea-loadBase;
    const targetInImage=targetImage!==null&&targetImage>=0&&targetImage<size;
    const instruction={imageStart,imageEnd,rawStart:headerBytes+imageStart,
      rawEnd:headerBytes+imageEnd,reaAddress:address,
      length,bytesSha256:row.bytesSha256,flow:row.flow,
      targetRea,targetImage:targetInImage?targetImage:null,
      targetRegion:targetRea===null?null:(targetInImage?'INITIALIZED_IMAGE':'OUTSIDE_IMAGE')};
    normalized.push(instruction);
    observed.set(imageStart,instruction);
  }
  normalized.sort((a,b)=>a.imageStart-b.imageStart);
  const spans=normalized.map(x=>({
    kind:'CODE_CANDIDATE',start:x.imageStart,end:x.imageEnd,
    source:provider+':'+providerVersion+'@'+exportSha256
  }));
  const coverage=auditP1ByteCoverage({moduleName,sha256,headerBytes,declaredBytes,spans});
  const flows=[];
  for(const ins of normalized){
    const unresolved=OPAQUE.has(ins.flow)||
      (DIRECT.has(ins.flow)&&(!observed.has(ins.targetImage)||
        ins.targetRegion!=='INITIALIZED_IMAGE'));
    if(ins.flow!=='FALLTHROUGH'){
      flows.push({sourceRaw:ins.rawStart,sourceRea:ins.reaAddress,
        type:ins.flow,targetRea:ins.targetRea,
        targetRaw:ins.targetRegion==='INITIALIZED_IMAGE'?headerBytes+ins.targetImage:null,
        targetInstructionObserved:ins.targetImage!==null&&observed.has(ins.targetImage),
        status:ins.flow==='RETURN'?'RUNTIME_RETURN':
          unresolved?'UNRESOLVED_STATIC':'CANDIDATE_DIRECT'});
    }
  }
  const unknownFlowCount=flows.filter(x=>x.status==='UNRESOLVED_STATIC').length;
  return {
    schemaVersion:1,moduleName,sha256,
    source:{provider,providerVersion,exportSha256,loadBase},
    ...coverage,decodedCandidateCount:normalized.length,
    decodedCandidateBytes:coverage.counts.CODE_CANDIDATE,
    unresolvedStaticFlowCount:unknownFlowCount,
    flowRecords:flows,pendingByteRanges:coverage.ranges.filter(r=>r.kind!=='CODE_CANDIDATE'),
    instructionCandidates:normalized,
    gate:unknownFlowCount?'HOLD_UNRESOLVED_FLOW':coverage.gate,
    caveat:'Decoded provider metadata and full byte-range coverage are NOT verified original instructions, a proven function graph, DOS runtime trace, or browser/game fidelity.'
  };
}

const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
  const file=process.argv[2];
  if(!file){process.stderr.write('Usage: node tools/p1-instruction-ledger.mjs <metadata.json>\n');process.exitCode=2;}
  else try{
    const ledger=JSON.parse(fs.readFileSync(file,'utf8'));
    // Reject mismatched original module SHA even if the provider metadata
    // itself claims otherwise. Synthetic fixtures call the function directly.
    const baseline=JSON.parse(fs.readFileSync(
      new URL('../docs/original-baseline-20261031.json',import.meta.url),'utf8'));
    const row=baseline.coreExecutables.find(r=>r.name===ledger.moduleName);
    if(!row||row.sha256!==ledger.sha256)
      throw new Error('metadata does not match exact Korean original module baseline');
    const report=auditP1InstructionLedger(ledger);
    process.stdout.write(JSON.stringify(report,null,2)+'\n');
    process.exitCode=report.gate==='HOLD_STATIC_ONLY'?0:1;
  }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
