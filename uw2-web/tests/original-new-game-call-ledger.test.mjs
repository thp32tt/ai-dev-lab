import assert from 'node:assert/strict';
import {
 inspectMainNewGameCallLedger,verifyMainNewGameCallLedger,
 rawToMainRea,reaToMainRaw,MAIN_GHIDRA_WINDOW_START,
 MAIN_GHIDRA_WINDOW_END
} from '../tools/original-new-game-call-ledger.mjs';
import {MAIN_NEW_GAME_SOURCE_SHA256,MAIN_NEW_GAME_SOURCE_SIZE}
 from '../tools/original-new-game-init-proof.mjs';

// Synthetic bytes that satisfy ONLY the already source-pinned direct-call
// witness. No original copyrighted EXE bytes are embedded in GitHub.
const source=new Uint8Array(MAIN_NEW_GAME_SOURCE_SIZE);
const calls=[
 [0x1b62f,0x1af96,'original-hero-person-pointer'],
 [0x1b65f,0x1b533,'unclassified-initializer-1'],
 [0x1b663,0x1b5c9,'unclassified-initializer-2'],
 [0x1b667,0x1b4f9,'unclassified-initializer-3'],
 [0x1b66b,0x1b49b,'unclassified-initializer-4']
];
const bound=[
 [0x1b632,'8b1edac6804f2901'],
 [0x1b642,'8b1e7ac6884723'],
 [0x1b649,'8b1edac68a4726a23a0c'],
 [0x1b658,'8bd8804f1350'],
 [0x1b679,'c746fc00002bf68e46fe'],
 [0x1b683,'8b5efc26c607ffff46fc4681fe00037cef']
];
for(const [off,hex] of bound)
 source.set(Uint8Array.from(Buffer.from(hex,'hex')),off);
const instructions=[];
for(const [at,to] of calls){
 const d=(to-at-3)&0xffff;
 source.set([0xe8,d&255,d>>>8],at);
 instructions.push({
  reaAddress:rawToMainRea(at),length:3,flow:'CALL_NEAR',
  targetRea:rawToMainRea(to)
 });
 instructions.push({
  reaAddress:rawToMainRea(to),length:2,flow:'FALLTHROUGH'
 });
}
instructions.push({reaAddress:rawToMainRea(0x1af99),length:3,
 flow:'CALL_FAR'});
instructions.push({reaAddress:rawToMainRea(0x1af9c),length:3,
 flow:'JCC_NEAR',targetRea:rawToMainRea(0x1afa3)});
const ledger={
 moduleName:'MAIN.EXE',
 sha256:MAIN_NEW_GAME_SOURCE_SHA256,
 loadBase:0x10000,
 windowStart:MAIN_GHIDRA_WINDOW_START,
 windowEnd:MAIN_GHIDRA_WINDOW_END,
 instructions
};
const evidence=inspectMainNewGameCallLedger(source,ledger);
assert.equal(evidence.callCount,5);
assert.equal(evidence.calls.length,5);
assert.equal(evidence.calls[0].directCalls.length,1);
assert.equal(evidence.calls[0].directCalls[0].flow,'CALL_FAR');
assert.equal(evidence.calls[0].branches.length,1);
for(let i=0;i<calls.length;i++){
 assert.equal(evidence.calls[i].callRaw,calls[i][0]);
 assert.equal(evidence.calls[i].targetRaw,calls[i][1]);
 assert.equal(evidence.calls[i].role,calls[i][2]);
 assert.equal(reaToMainRaw(evidence.calls[i].targetRea),calls[i][1]);
 assert.ok(evidence.calls[i].observedInstructionCount>0);
}
assert.equal(evidence.freshGameReady,false);
assert.ok(evidence.unresolved.includes('starting-fleet'));
assert.ok(evidence.unresolved.includes('starting-game-clock'));
assert.equal(evidence.sourceFill.length,0x300);
assert.equal(evidence.sourceFill.destination,
 'runtime-segment-from-original-call__unresolved');
assert.ok(Object.isFrozen(evidence.calls));
assert.ok(Object.isFrozen(evidence.calls[0].directCalls));
assert.throws(()=>verifyMainNewGameCallLedger(source,ledger),
 /MAIN executable SHA-256 mismatch/);
const alter=(record,changes)=>({...record,...changes});
assert.throws(()=>inspectMainNewGameCallLedger(source,
 alter(ledger,{sha256:'0'.repeat(64)})),/Ghidra instruction source/);
assert.throws(()=>inspectMainNewGameCallLedger(source,
 alter(ledger,{instructions:[...instructions,instructions[0]]})),
 /duplicate original Ghidra instruction boundary/);
assert.throws(()=>inspectMainNewGameCallLedger(source,
 alter(ledger,{instructions:instructions.filter(x=>x.reaAddress!==rawToMainRea(calls[1][1]))})),
 /initializer entry absent/);
const badCalls=instructions.map(x=>x.reaAddress===rawToMainRea(calls[0][0])
 ?{...x,targetRea:0x22222}:x);
assert.throws(()=>inspectMainNewGameCallLedger(source,
 alter(ledger,{instructions:badCalls})),/Ghidra\/raw mismatch/);
const badBytes=Uint8Array.from(source);
badBytes[calls[0][0]]=0x90;
assert.throws(()=>inspectMainNewGameCallLedger(badBytes,ledger),
 /original near-call opcode mismatch/);
assert.ok(rawToMainRea(0x1b62f)>=MAIN_GHIDRA_WINDOW_START);
assert.ok(rawToMainRea(0x1b62f)<MAIN_GHIDRA_WINDOW_END);
console.log('UW2 synthetic Korean MAIN five fresh-game source callsites ↔ 16-bit Ghidra window and unresolved game state: PASS');
