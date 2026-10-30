#!/usr/bin/env node
// Deterministic, original-EXE hash-pinned compact far-transfer candidate graph.
// No copyrighted bytes or purportedly complete function boundaries are exported.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectMzRelocations,groupFarCandidates,findPinnedFarTransfer} from './mz-relocation-callgraph.mjs';
import {PROVEN_MAIN_MUSIC_DISPATCH_CALLS} from '../web/reverse-evidence.js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
export const SOURCE_MODULES=Object.freeze(['KOEI.COM','OPEN.EXE','MAIN.EXE','END.EXE','GRPDRV.EXE','FMDRV.COM']);

export function exportP1FarTransferGraph(dir,baseline) {
  const out={
    schemaVersion:1,
    source:'User-held Korean original DOS installation; SHA-pinned exact MZ relocation table',
    fidelity:'candidate structural edges, NOT verified disassembled code or proven runtime control flow',
    coordinateSystem:'module-local unrelocated MZ image offsets; source file raw offset in bytes',
    caveat:'The segment word is relocation-backed. 9A/EA at raw-3 is an opcode-looking byte pattern that may be data. Indirect calls and runtime-computed branches are not covered.',
    modules:{}
  };
  for(const name of SOURCE_MODULES){
    const row=baseline.coreExecutables.find(x=>x.name===name);
    if(!row)throw Error(`Missing pinned original ${name}`);
    if(name.endsWith('.COM')){
      out.modules[name]={sha256:row.sha256,size:row.size,format:'COM',
        coverage:'Not a DOS MZ file; REA/disassembly required for any actual calls'};
      continue;
    }
    const original=fs.readFileSync(path.join(dir,name));
    const audit=inspectMzRelocations(original,{name,expectedSha256:row.sha256});
    out.modules[name]={
      sha256:row.sha256,size:row.size,format:'MZ',
      mz:{headerBytes:audit.summary.headerBytes,imageBytes:audit.summary.imageBytes,
        relocations:audit.summary.declaredRelocations,segmentWordRegions:audit.summary.segmentWordRegions},
      bytePatternClasses:audit.summary.bytePatternClasses,
      // [type: 'C' far CALL 9A / 'J' far JMP EA, target image relative, ...source raw offsets]
      targetIndexedCandidateEdges:groupFarCandidates(audit).map(g=>[
        g.type==='far-call-9a'?'C':'J',g.targetImageRelative,...g.sourcesRaw
      ])
    };
    if(name==='MAIN.EXE'){
      const known=PROVEN_MAIN_MUSIC_DISPATCH_CALLS.directFarCalls;
      out.modules[name].pinnedKnownDispatcherCalls=known.map(e=>{
        const match=findPinnedFarTransfer(audit,e.rawFileOffset,0x94ca);
        return {sourceRaw:match.sourceRaw,targetRaw:match.targetRaw,
          targetRea:match.targetRea,relocationIndex:match.relocationIndex};
      });
    }
  }
  return out;
}

const isMain=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(isMain){
  const dir=process.argv[2]||process.env.UW2_GAME_DIR;
  if(!dir){process.stderr.write('Usage: node tools/p1-callgraph-export.mjs <original-game-dir>\n');process.exitCode=2;}
  else try{
    const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/original-baseline-20261031.json'),'utf8'));
    process.stdout.write(JSON.stringify(exportP1FarTransferGraph(dir,baseline),null,2)+'\n');
  }catch(error){process.stderr.write(error.message+'\n');process.exitCode=1;}
}
