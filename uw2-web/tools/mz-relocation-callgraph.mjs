#!/usr/bin/env node
// Korean DOS game's original MZ relocation audit and limited far-call candidate inventory.
// An opcode-like byte pattern is not a proven instruction: do not label a candidate
// as a callable function until control-flow and original execution evidence close.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {parseMzHeader} from './original-inventory.mjs';
import {rawToRea} from './rea-source-map.mjs';

export function classifyImagePointer(imageRelative,mz) {
  if (!Number.isInteger(imageRelative) || imageRelative < 0) return 'invalid';
  if (imageRelative < mz.imageBytes) return 'initialized-image';
  return 'beyond-initialized-image'; // Could be BSS or other memory, not necessarily invalid.
}

export function inspectMzRelocations(bytes,{name='<EXE>',expectedSha256=null,includeEntries=false}={}) {
  if (!Buffer.isBuffer(bytes)) bytes=Buffer.from(bytes);
  const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
  if (expectedSha256 && sha256!==expectedSha256) {
    throw new Error(`${name}: original SHA-256 mismatch; refusing untrusted analysis`);
  }
  const mz=parseMzHeader(bytes,name);
  const regions={'initialized-image':0,'beyond-initialized-image':0};
  const classes={'far-call-9a':0,'far-jump-ea':0,'other-relocation':0};
  const controlTransferCandidates=[];
  const entries=[];
  const visited=new Set();
  for (let i=0;i<mz.relocationTargets.length;i++) {
    const entry=mz.relocationTargets[i];
    const raw=mz.headerBytes+entry.imageOffset;
    if(visited.has(entry.imageOffset)) throw new Error(`${name}: duplicate relocation at image +${entry.imageOffset.toString(16)}`);
    visited.add(entry.imageOffset);
    const segmentAddend=bytes.readUInt16LE(raw);
    // The relocation is applied to a 16-bit *segment word* by the DOS loader.
    // It alone is NOT a far pointer; the offset must be independently established.
    const segmentBase=segmentAddend*16;
    const region=classifyImagePointer(segmentBase,mz);
    if(regions[region]===undefined)regions[region]=0;
    regions[region]++;
    let kind='other-relocation';
    // 9A/EA immediates encode opcode, offset word, segment word; the latter
    // must be listed in the MZ relocation table for a static linker far target.
    if(entry.imageOffset>=3){
      const opcode=bytes[raw-3];
      if(opcode===0x9a || opcode===0xea){
        kind=opcode===0x9a?'far-call-9a':'far-jump-ea';
        const targetOffset=bytes.readUInt16LE(raw-2);
        const targetImageRelative=segmentBase+targetOffset;
        const sourceRaw=raw-3;
        const targetRaw=targetImageRelative<mz.imageBytes ? mz.headerBytes+targetImageRelative : null;
        controlTransferCandidates.push({
          sourceRaw,sourceRea:rawToRea(sourceRaw,mz),
          type:kind,targetSegment:segmentAddend,targetOffset,
          targetImageRelative,targetRaw,
          targetRea:targetRaw===null?null:rawToRea(targetRaw,mz),
          targetRegion:classifyImagePointer(targetImageRelative,mz),
          relocationIndex:i,
          caveat:'opcode+MZ-relocation candidate; code/data boundary and real call flow not yet proved'
        });
      }
    }
    classes[kind]++;
    if(includeEntries)entries.push({index:i,raw,segment:entry.segment,offset:entry.offset,
      segmentAddend,segmentBase,region,kind});
  }
  const summary={
    name,sha256,fileBytes:bytes.length,headerBytes:mz.headerBytes,
    imageBytes:mz.imageBytes,declaredRelocations:mz.relocationCount,
    inspectedRelocations:visited.size,segmentWordRegions:regions,
    bytePatternClasses:classes,opcodeWithRelocationCandidates:controlTransferCandidates.length,
    codeDataUncertainty:'A 9A/EA pattern at raw-3 can be false-positive data; indirect FF /3,/5 and runtime writes are not enumerated',
    analysisStatus:'RELOCATION_STRUCTURE_VERIFIED; CONTROL_FLOW_CANDIDATES_UNVERIFIED'
  };
  return {summary,controlTransferCandidates,...(includeEntries?{entries}:{})};
}

export function findPinnedFarTransfer(audit,sourceRaw,targetImageRelative,{type='far-call-9a'}={}) {
  const hits=audit.controlTransferCandidates.filter(
    x=>x.sourceRaw===sourceRaw&&x.targetImageRelative===targetImageRelative&&x.type===type);
  if(hits.length!==1)throw new Error(`required source/target far transfer missing or ambiguous at raw 0x${sourceRaw.toString(16)}`);
  return hits[0];
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const file=process.argv[2];
  if(!file){process.stderr.write('Usage: node tools/mz-relocation-callgraph.mjs <user-held-original.exe> [--candidates] [--details]\n');process.exitCode=2;}
  else try{
    const bytes=fs.readFileSync(file);
    const baselinePath=path.join(path.dirname(fileURLToPath(import.meta.url)),'../docs/original-baseline-20261031.json');
    const baseline=JSON.parse(fs.readFileSync(baselinePath,'utf8'));
    const row=baseline.coreExecutables.find(x=>x.name.toUpperCase()===path.basename(file).toUpperCase());
    if(!row)throw Error('EXE not in pinned original baseline');
    const audit=inspectMzRelocations(bytes,{name:row.name,expectedSha256:row.sha256,includeEntries:process.argv.includes('--details')});
    process.stdout.write(JSON.stringify({
      summary:audit.summary,
      ...(process.argv.includes('--candidates')?{controlTransferCandidates:audit.controlTransferCandidates}:{}),
      ...(process.argv.includes('--details')?{entries:audit.entries}:{})
    },null,2)+'\n');
  }catch(error){process.stderr.write(`${error.message}\n`);process.exitCode=1;}
}
