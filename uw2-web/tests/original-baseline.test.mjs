import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const baseline=JSON.parse(fs.readFileSync(path.join(here,'../docs/original-baseline-20261031.json'),'utf8'));
const source=process.env.UW2_GAME_DIR||'/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
assert.equal(baseline.schemaVersion,1);
assert.equal(baseline.verification.gate,'PASS');
assert.equal(baseline.sourceCounts.includedCore,6);
assert.equal(baseline.coreExecutables.length,6);
const rows=[...baseline.coreExecutables,...baseline.resources];
assert.equal(rows.length,baseline.sourceCounts.includedCore+baseline.sourceCounts.includedGameData);
assert.equal(new Set(rows.map(x=>x.name.toUpperCase())).size,rows.length,'duplicate baseline file');
let checked=0;
for(const row of rows){
  assert.match(row.sha256,/^[0-9a-f]{64}$/);
  const full=path.join(source,row.name);
  assert.ok(fs.existsSync(full),`original file missing: ${row.name}`);
  const b=fs.readFileSync(full);
  assert.equal(b.length,row.size,`original file size changed: ${row.name}`);
  assert.equal(crypto.createHash('sha256').update(b).digest('hex'),row.sha256,`original content changed: ${row.name}`);
  checked++;
}
console.log(`UW2 P0 immutable baseline exact SHA-256: PASS ${checked} files (6 core + ${baseline.resources.length} resources)`);
