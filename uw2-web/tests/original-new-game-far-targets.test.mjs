import assert from 'node:assert/strict';
import {inspectMainNewGameFarTargets,verifyMainNewGameFarTargets}
 from '../tools/original-new-game-far-targets.mjs';
import {MAIN_NEW_GAME_SOURCE_SHA256,MAIN_NEW_GAME_SOURCE_SIZE}
 from '../tools/original-new-game-init-proof.mjs';
import {rawToMainRea} from '../tools/original-new-game-call-ledger.mjs';

// Strictly synthetic MZ fixture: no original game binary bytes shipped.
// Only the six previously published MAIN source structural probe sequences
// are included to satisfy the independent raw-near-call witness.
const HEADER=0x5400;
const bytes=Buffer.alloc(MAIN_NEW_GAME_SOURCE_SIZE);
const w=(at,value)=>bytes.writeUInt16LE(value,at);
w(0,0x5a4d);w(2,MAIN_NEW_GAME_SOURCE_SIZE%512);
w(4,Math.ceil(MAIN_NEW_GAME_SOURCE_SIZE/512));
w(6,5245);w(8,HEADER/16);w(24,28);
const bound=[
 [0x1b632,'8b1edac6804f2901'],
 [0x1b642,'8b1e7ac6884723'],
 [0x1b649,'8b1edac68a4726a23a0c'],
 [0x1b658,'8bd8804f1350'],
 [0x1b679,'c746fc00002bf68e46fe'],
 [0x1b683,'8b5efc26c607ffff46fc4681fe00037cef']
];
for(const [at,hex]of bound)bytes.set(Buffer.from(hex,'hex'),at);
const calls=[
 [0x1b62f,0x1af96],[0x1b65f,0x1b533],[0x1b663,0x1b5c9],
 [0x1b667,0x1b4f9],[0x1b66b,0x1b49b]
];
const byWindow=new Map([0,0x10000,0x30000].map(start=>[start,{
 moduleName:'MAIN.EXE',sha256:MAIN_NEW_GAME_SOURCE_SHA256,
 loadBase:0x10000,windowStart:start,windowEnd:start+0x10000,
 instructions:[]
}]));
function add(raw,length,flow,targetRea){
 const rea=rawToMainRea(raw);
 const imageOffset=rea-0x10000;
 const base=[...byWindow.keys()].find(start=>
  imageOffset>=start&&imageOffset<start+0x10000);
 assert.notEqual(base,undefined);
 byWindow.get(base).instructions.push({reaAddress:rea,length,flow,
  ...(targetRea===undefined?{}:{targetRea})});
}
for(const [at,to]of calls){
 const disp=(to-at-3)&65535;
 bytes.set([0xe8,disp&255,disp>>>8],at);
 add(at,3,'CALL_NEAR',rawToMainRea(to));
 add(to,2,'FALLTHROUGH');
}
const edges=[
 [0x1af99,0xaeee,0],[0x1afa6,0xaf1e,0],
 [0x1afba,0xe5c2,0],[0x1b53d,0xafc4,0],
 [0x1b55f,0xa184,0],[0x1b564,0xafc4,0],
 [0x1b580,0xafd4,0],[0x1b511,0x4780,0x2d9b],
 [0x1b525,0xa3e2,0]
];
for(let i=0;i<5245;i++){
 const relative=i<edges.length?edges[i][0]+3-HEADER:0x100+i*2;
 const segment=Math.floor(relative/16),offset=relative%16;
 w(28+4*i,offset);w(30+4*i,segment);
}
for(const [at,off,segment]of edges){
 bytes[at]=0x9a;w(at+1,off);w(at+3,segment);
 add(at,5,'CALL_FAR');
 const target=HEADER+segment*16+off;
 if(![...byWindow.values()].some(part=>part.instructions.some(i=>i.reaAddress===rawToMainRea(target))))
  add(target,1,'FALLTHROUGH');
}
const parts=[...byWindow.values()];
const report=inspectMainNewGameFarTargets(bytes,parts);
assert.equal(report.initializerCalls,5);
assert.equal(report.mzRelocations,5245);
assert.equal(report.observedFarCalls,9);
assert.equal(report.directAuthenticated,9);
assert.equal(report.calleeBoundaryMatched,9);
assert.equal(report.unresolved,0);
assert.equal(new Set(report.edges.map(x=>x.targetRaw)).size,8);
assert.equal(report.freshGameReady,false);
assert.ok(Object.isFrozen(report.edges));
for(let i=0;i<edges.length;i++){
 const e=report.edges.find(x=>x.sourceRaw===edges[i][0]);
 assert.equal(e.targetRaw,HEADER+edges[i][2]*16+edges[i][1]);
 assert.equal(e.targetRea,rawToMainRea(e.targetRaw));
 assert.equal(e.status,'MZ_RELOCATED_DIRECT_FAR__GHIDRA_TARGET_BOUNDARY');
}
// An image with fake but structurally consistent bytes can never
// masquerade as the private Korean original via the verified entry.
assert.throws(()=>verifyMainNewGameFarTargets(bytes,parts),/SHA-256 mismatch/);
const change=(i,mutate)=>{
 const fixture=Buffer.from(bytes);
 mutate(fixture);
 return inspectMainNewGameFarTargets(fixture,parts);
};
// 9A-looking 5-byte FAR instruction without original MZ relocation
// is not an authenticated direct control transfer.
const noReloc=change(0,b=>{
 const replacement=0x800;
 const off=28;
 w.call(null,off,replacement); // no mutation: table is edited directly below
 b.writeUInt16LE(replacement,off);
 b.writeUInt16LE(0,off+2);
});
assert.equal(noReloc.directAuthenticated,8);
assert.equal(noReloc.unresolved,1);
assert.equal(noReloc.edges[0].status,'UNRESOLVED_INDIRECT_OR_UNRELOCATED_FAR_TRANSFER');
// A far call with a valid relocation but missing target Ghidra boundary
// cannot claim target entrypoint validation.
const erased=parts.map(part=>({
 ...part,instructions:part.instructions.filter(x=>
  x.reaAddress!==rawToMainRea(HEADER+edges[0][2]*16+edges[0][1]))
}));
const unknownTarget=inspectMainNewGameFarTargets(bytes,erased);
assert.equal(unknownTarget.directAuthenticated,9);
assert.equal(unknownTarget.calleeBoundaryMatched,8);
// Forged Ghidra source boundaries and wrong relocation/image layout fail.
const bad=parts.map(part=>({...part,instructions:[...part.instructions]}));
bad[1].instructions=bad[1].instructions.map(x=>
 x.reaAddress===rawToMainRea(edges[0][0])?{...x,length:2}:x);
assert.equal(inspectMainNewGameFarTargets(bytes,bad).directAuthenticated,8);
const bogus=Buffer.from(bytes);bogus.writeUInt16LE(5244,6);
assert.throws(()=>inspectMainNewGameFarTargets(bogus,parts),/5245 relocations required/);
assert.throws(()=>inspectMainNewGameFarTargets(bytes,[parts[0]]),/initializer window unavailable/);
console.log('UW2 original MAIN near-call->relocated far 9A->Ghidra entry witness (synthetic; original SHA separate): PASS');
