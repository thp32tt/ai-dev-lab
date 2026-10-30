import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {inspectMzRelocations,findPinnedFarTransfer,groupFarCandidates}
 from '../tools/mz-relocation-callgraph.mjs';
import {PROVEN_MAIN_MUSIC_DISPATCH_CALLS} from '../web/reverse-evidence.js';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/original-baseline-20261031.json'),'utf8'));
const dir=process.env.UW2_GAME_DIR||'/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const expectations=new Map([
  ['MAIN.EXE',{relocations:5245,calls:5036,jumps:0,other:209}],
  ['OPEN.EXE',{relocations:23,calls:0,jumps:0,other:23}],
  ['END.EXE',{relocations:22,calls:0,jumps:0,other:22}],
  ['GRPDRV.EXE',{relocations:6,calls:1,jumps:1,other:4}]
]);
let total=0;
for(const [name,exp] of expectations){
  const pinned=baseline.coreExecutables.find(x=>x.name===name);
  assert.ok(pinned);
  const original=fs.readFileSync(path.join(dir,name));
  const audit=inspectMzRelocations(original,{name,expectedSha256:pinned.sha256});
  assert.equal(audit.summary.inspectedRelocations,exp.relocations);
  assert.equal(audit.summary.bytePatternClasses['far-call-9a'],exp.calls);
  assert.equal(audit.summary.bytePatternClasses['far-jump-ea'],exp.jumps);
  assert.equal(audit.summary.bytePatternClasses['other-relocation'],exp.other);
  assert.equal(audit.summary.opcodeWithRelocationCandidates,exp.calls+exp.jumps);
  const groups=groupFarCandidates(audit);
  assert.equal(groups.reduce((sum,g)=>sum+g.sourcesRaw.length,0),exp.calls+exp.jumps);
  if(name==='MAIN.EXE'){
    const targets=PROVEN_MAIN_MUSIC_DISPATCH_CALLS.directFarCalls;
    assert.equal(targets.length,9);
    for(const src of targets){
      const x=findPinnedFarTransfer(audit,src.rawFileOffset,0x94ca);
      assert.equal(x.targetRaw,0xe8ca);
      assert.equal(x.targetSegment,0);
      assert.equal(x.targetOffset,0x94ca);
      assert.equal(original.subarray(src.rawFileOffset,src.rawFileOffset+5).toString('hex'),'9aca940000');
    }
    assert.ok(groups.find(x=>x.targetRaw===0xe8ca)?.sourcesRaw.length>=9);
  }
  if(name==='GRPDRV.EXE'){
    assert.equal(audit.summary.segmentWordRegions['beyond-initialized-image'],1);
    assert.equal(audit.controlTransferCandidates.find(x=>x.type==='far-jump-ea')?.sourceRaw,536);
  }
  total+=exp.relocations;
}
assert.equal(total,5296);
console.log('UW2 P1 four-original-EXE relocations: PASS 5296; 9 MAIN FMDRV dispatcher callsite proofs PASS');
