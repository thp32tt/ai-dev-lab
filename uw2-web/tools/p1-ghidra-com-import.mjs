#!/usr/bin/env node
// SHA-pinned Korean DOS .COM static candidate audit. Original bytes never
// leave the caller's private machine; this does NOT emulate PSP/DOS/OPL.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';

const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const FLOWS=new Set(['FALLTHROUGH','CALL_NEAR','JUMP_NEAR','JCC_NEAR',
 'CALL_FAR','JUMP_FAR','INDIRECT_CALL','INDIRECT_JUMP','INTERRUPT','RETURN','UNKNOWN']);
const DIRECT=new Set(['CALL_NEAR','JUMP_NEAR','JCC_NEAR']);
const OPAQUE=new Set(['CALL_FAR','JUMP_FAR','INDIRECT_CALL','INDIRECT_JUMP','INTERRUPT','UNKNOWN']);
const int=(x,n)=>{
 if(!Number.isSafeInteger(x)||x<0)throw new RangeError(n+' must be nonnegative safe integer');
 return x;
};

export function auditGhidraOriginalCom(exported,original,{moduleName,expectedSha256}={}){
 if(!Buffer.isBuffer(original)||original.length<1||original.length>0xff00)
   throw new Error('bounded original DOS COM Buffer required');
 if(!['KOEI.COM','FMDRV.COM'].includes(moduleName))
   throw new Error('unsupported Korean original COM executable');
 if(typeof expectedSha256!=='string'||!(/^[a-f0-9]{64}$/).test(expectedSha256)||
    sha(original)!==expectedSha256)
   throw new Error('pinned original Korean COM SHA-256 mismatch');
 const e=exported;
 if(!e||typeof e!=='object'||Array.isArray(e)||e.schemaVersion!==1||
    e.provider!=='GHIDRA'||e.providerVersion!=='12.1.4'||
    e.moduleName!==moduleName||e.sha256!==expectedSha256||
    e.loadBase!==0x10100||e.imageBytes!==original.length||
    e.windowStart!==0||e.windowEnd!==original.length)
   throw new Error('Ghidra DOS COM PSP+0100h load identity mismatch');
 if(!Array.isArray(e.instructions)||!Array.isArray(e.functionEntries)||
    e.instructionCandidateCount!==e.instructions.length||
    e.functionEntryCandidateCount!==e.functionEntries.length||
    e.verifiedCodeBytes!==0||
    e.fidelity!=='GHIDRA_STATIC_CANDIDATES_ONLY__ORIGINAL_DOS_UNTESTED')
   throw new Error('Ghidra COM candidate arrays or static-only proof mismatch');
 if(e.instructions.length>original.length||e.functionEntries.length>original.length)
   throw new RangeError('Ghidra COM impossible candidate counts');
 const seen=new Uint8Array(original.length),entries=new Set(),observed=new Set();
 const normalized=[];
 for(const entry of e.functionEntries){
   int(entry,'function entry');
   if(entry<0x10100||entry>=0x10100+original.length||entries.has(entry))
     throw new Error('COM function entry invalid or duplicate');
   entries.add(entry);
 }
 for(const row of e.instructions){
   if(!row||typeof row!=='object'||Array.isArray(row))
     throw new TypeError('COM decoded instruction required');
   const address=int(row.reaAddress,'COM linear address'),
       length=int(row.length,'COM instruction length'),offset=address-0x10100;
   if(length<1||length>15||offset<0||offset+length>original.length)
     throw new Error('COM instruction outside original PSP+0100h image');
   if(!FLOWS.has(row.flow))throw new Error('unknown 8086 COM instruction flow');
   if(DIRECT.has(row.flow)!==Object.hasOwn(row,'targetRea'))
     throw new Error('COM direct control transfer target absent or unexpected');
   if(DIRECT.has(row.flow))int(row.targetRea,'COM control transfer target');
   for(let p=offset;p<offset+length;p++){
     if(seen[p])throw new Error('overlapping COM decoded instruction bytes');
     seen[p]=1;
   }
   observed.add(address);
   normalized.push({linearAddress:address,length,flow:row.flow,
     targetRea:row.targetRea??null,
     // Computed from private verified original; not included in public report.
     originalBytesSha256:sha(original.subarray(offset,offset+length))});
 }
 const total=seen.reduce((a,b)=>a+b,0);
 let unresolved=0;
 for(const row of normalized)
   if(OPAQUE.has(row.flow)||
      (DIRECT.has(row.flow)&&!observed.has(row.targetRea)))unresolved++;
 const gaps=[],count=original.length;
 for(let i=0;i<count;){
   if(seen[i]){i++;continue;}
   let end=i+1;
   while(end<count&&!seen[end])end++;
   gaps.push({fileStart:i,fileEnd:end});
   i=end;
 }
 return {
   moduleName,sha256:expectedSha256,providerVersion:e.providerVersion,
   originalBytes:original.length,loadBase:0x10100,
   functionEntryCandidates:entries.size,instructionCandidates:normalized.length,
   codeCandidateBytes:total,unobservedBytes:original.length-total,
   unresolvedStaticFlows:unresolved,firstUnobserved:gaps[0]??null,
   verifiedCodeBytes:0,verifiedFunctionCount:0,
   gate:unresolved?'HOLD_UNRESOLVED_FLOW':'HOLD_UNVERIFIED_COM',
   caveat:'Only automatically decoded static COM bytes from verified original file; DOS launch/PSP, FMDRV sound, actual execution and browser gameplay UNTESTED.'
 };
}

const main=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(main){
 const [exe,exportPath]=process.argv.slice(2);
 if(!exe||!exportPath){
   process.stderr.write('Usage: node tools/p1-ghidra-com-import.mjs <original.com> <private-export.json>\n');
   process.exitCode=2;
 }else try{
   const original=fs.readFileSync(exe),moduleName=path.basename(exe).toUpperCase();
   const baseline=JSON.parse(fs.readFileSync(new URL('../docs/original-baseline-20261031.json',import.meta.url),'utf8'));
   const pinned=baseline.coreExecutables.find(x=>x.name===moduleName);
   if(!pinned)throw new Error('original DOS COM not pinned');
   const result=auditGhidraOriginalCom(JSON.parse(fs.readFileSync(exportPath,'utf8')),original,{
     moduleName,expectedSha256:pinned.sha256
   });
   process.stdout.write(JSON.stringify(result,null,2)+'\n');
 }catch(e){process.stderr.write(e.message+'\n');process.exitCode=1;}
}
