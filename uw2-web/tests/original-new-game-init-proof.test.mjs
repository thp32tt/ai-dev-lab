import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inspectOriginalNewGameInit,verifyOriginalNewGameInit,
 MAIN_NEW_GAME_SOURCE_SIZE,MAIN_NEW_GAME_SOURCE_SHA256}
 from '../tools/original-new-game-init-proof.mjs';

// Independently shape a synthetic instruction witness, WITHOUT any
// copyrighted Korean DOS executable bytes in Git or CI.
const mock=Buffer.alloc(MAIN_NEW_GAME_SOURCE_SIZE);
const segments=[
 [0x1b632,'8b1edac6804f2901'],
 [0x1b642,'8b1e7ac6884723'],
 [0x1b649,'8b1edac68a4726a23a0c'],
 [0x1b658,'8bd8804f1350'],
 [0x1b679,'c746fc00002bf68e46fe'],
 [0x1b683,'8b5efc26c607ffff46fc4681fe00037cef']
];
for(const [offset,hex] of segments)
 Buffer.from(hex,'hex').copy(mock,offset);
const calls=[
 [0x1b62f,0x1af96],
 [0x1b65f,0x1b533],
 [0x1b663,0x1b5c9],
 [0x1b667,0x1b4f9],
 [0x1b66b,0x1b49b]
];
for(const [at,to] of calls){
 mock[at]=0xe8;mock.writeInt16LE(to-(at+3),at+1);
}
const proof=inspectOriginalNewGameInit(mock);
assert.equal(proof.entryRaw,0x1b627);
assert.deepEqual(proof.calls.map(c=>c.to),calls.map(c=>c[1]));
assert.equal(proof.initializationFill.length,768);
assert.equal(proof.initializationFill.value,255);
assert.equal(proof.originalPortSource.dsOffset,0x0c3a);
assert.equal(proof.freshHeroStateReady,false);
assert.ok(proof.unresolved.includes('starting-fleet'));
assert.equal(proof.status,'ORIGINAL_MAIN_NEW_GAME_CALLS_PROVEN__FRESH_GAME_UNTESTED');
assert.equal(MAIN_NEW_GAME_SOURCE_SHA256.length,64);
// A synthetic instruction stream must never be mistaken for the
// owner's SHA-pinned source even if its exact instructions match.
assert.throws(()=>verifyOriginalNewGameInit(mock),/SHA-256 mismatch/);
const changed=Buffer.from(mock);
changed[0x1b64d]^=1;
assert.throws(()=>inspectOriginalNewGameInit(changed),/state witness mismatch/);
changed.set(mock.subarray(0x1b649,0x1b653),0x1b649);
changed[0x1b664]^=1;
assert.throws(()=>inspectOriginalNewGameInit(changed),/target mismatch/);
assert.throws(()=>inspectOriginalNewGameInit(mock.subarray(0,-1)),/size mismatch/);
assert.throws(()=>inspectOriginalNewGameInit(null),/size mismatch/);
// The source proof must not be confused with a fabricated initial 6-hero
// save slot, and the production MAIN route must keep the unproven gate.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
const heroes=fs.readFileSync(new URL('../web/native-new-game-hero.js',import.meta.url),'utf8');
assert.match(app,/실제 Start New Game 초기화는 미구현/);
assert.match(heroes,/originalNewGameReady:false/);
assert.doesNotMatch(app,/original-new-game-init-proof/);
console.log('UW2 SHA-pinned owner MAIN new-game initializer five callsites, runtime port source, 768-byte fill and mandatory HOLD: synthetic safety PASS');
