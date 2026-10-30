import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exportP1FarTransferGraph} from '../tools/p1-callgraph-export.mjs';

const root=path.join(path.dirname(fileURLToPath(import.meta.url)),'..');
const baseline=JSON.parse(fs.readFileSync(path.join(root,'docs/original-baseline-20261031.json'),'utf8'));
const committed=JSON.parse(fs.readFileSync(path.join(root,'docs/p1-far-transfer-candidates-20261031.json'),'utf8'));
const dir=process.env.UW2_GAME_DIR||'/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
assert.equal(committed.schemaVersion,1);
assert.equal(committed.fidelity.includes('NOT verified disassembled code'),true);
assert.deepEqual(Object.keys(committed.modules).sort(),['KOEI.COM','OPEN.EXE','MAIN.EXE','END.EXE','GRPDRV.EXE','FMDRV.COM'].sort());
const live=exportP1FarTransferGraph(dir,baseline);
assert.deepEqual(live,committed,'GitHub committed candidate graph must match exact original SHA-pinned regenerated addresses');
const main=committed.modules['MAIN.EXE'],grp=committed.modules['GRPDRV.EXE'];
assert.equal(main.mz.relocations,5245);
assert.equal(main.targetIndexedCandidateEdges.length,349);
assert.equal(main.targetIndexedCandidateEdges.reduce((n,a)=>n+a.length-2,0),5036);
const musicEdge=main.targetIndexedCandidateEdges.find(a=>a[0]==='C'&&a[1]===0x94ca);
assert.ok(musicEdge);
assert.equal(main.pinnedKnownDispatcherCalls.length,9);
for(const e of main.pinnedKnownDispatcherCalls){
  assert.ok(musicEdge.slice(2).includes(e.sourceRaw));
  assert.equal(e.targetRaw,0xe8ca);
}
assert.equal(grp.targetIndexedCandidateEdges.length,2);
assert.equal(grp.targetIndexedCandidateEdges.reduce((n,a)=>n+a.length-2,0),2);
assert.equal(committed.modules['OPEN.EXE'].targetIndexedCandidateEdges.length,0);
assert.equal(committed.modules['END.EXE'].targetIndexedCandidateEdges.length,0);
console.log('UW2 P1 pinned raw-source graph regenerated: PASS 5038 candidate edges, 351 target groups, 9 music-dispatch sites');
