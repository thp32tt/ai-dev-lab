import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedMz} from '../web/mz-loader.js';
import {runIsolatedRelocatedFarCalls,runIsolatedOriginalNearCalls,probeOriginalMainFarCallCpu}
 from '../tools/original-main-far-cpu-probe.mjs';

// Synthetic, independently constructed 16-bit MZ image with TWO distinct
// source-address FAR CALL 9Ah instructions. The second reaches the same
// physical target via a nonzero relocated segment addend (1:0010).
const b=new Uint8Array(64+128);
const set16=(at,v)=>{b[at]=v&255;b[at+1]=v>>>8;};
set16(0,0x5a4d);set16(2,b.length);set16(4,1);
set16(6,2);set16(8,4);set16(10,1);set16(12,0xffff);
set16(14,0);set16(16,0x80);set16(24,0x1c);
set16(0x1c,3);set16(0x1e,0); // FAR immediate segment at image +3
set16(0x20,0x13);set16(0x22,0); // second FAR segment at image +0x13
b[64]=0x9a;set16(65,0x20);set16(67,0);
b[80]=0x9a;set16(81,0x10);set16(83,1);
b[96]=0xcb; // synthetic RETF: NOT run in original call probe
const cpu=new RealMode8086();
const sha=createHash('sha256').update(b).digest('hex');
await loadVerifiedMz(cpu,b,{
 loadSegment:0x200,pspSegment:0x100,
 allocationParagraphs:16,expectedSha256:sha
});
const item=(raw,segmentAddend,targetOffset)=>({
 status:'MZ_RELOCATED_DIRECT_FAR__GHIDRA_TARGET_BOUNDARY',
 sourceRaw:raw,sourceRea:0x10000+raw-64,sourceLength:5,
 targetRaw:96,targetRea:0x10020,targetBoundaryPresent:true,
 segmentAddend,targetOffset
});
const edges=[item(64,0,0x20),item(80,1,0x10)];
const report=runIsolatedRelocatedFarCalls(cpu,{
 loadSegment:0x200,headerBytes:64,edges
});
assert.equal(report.executedOriginalInstructions,2);
assert.deepEqual(report.calls.map(x=>[x.destinationCS,x.destinationIP]),
 [[0x200,0x20],[0x201,0x10]]);
assert.deepEqual(report.calls.map(x=>[x.returnCS,x.returnIP]),
 [[0x200,5],[0x201,5]]);
assert.ok(report.calls.every(x=>x.stackWordsPushed===2));
assert.equal(cpu.get16('CS'),0x201);
assert.equal(cpu.get16('IP'),0x10);
assert.equal(cpu.get16('FLAGS'),0x202);
assert.equal(cpu.get16('SP'),0xfffa);
assert.equal(cpu.read16(0x8000,0xfffa),5);
assert.equal(cpu.read16(0x8000,0xfffc),0x201);
assert.ok(Object.isFrozen(report));
assert.ok(Object.isFrozen(report.calls));
// Never execute a callee and never modify its code.
assert.equal(cpu.read8(0x200,0x20),0xcb);
const before={cs:cpu.get16('CS'),ip:cpu.get16('IP'),
 sp:cpu.get16('SP')};
assert.throws(()=>runIsolatedRelocatedFarCalls(cpu,{
 loadSegment:0x200,headerBytes:64,
 edges:[{...edges[0],targetBoundaryPresent:false}]
}),/source-authenticated target/);
assert.throws(()=>runIsolatedRelocatedFarCalls(cpu,{
 loadSegment:0x200,headerBytes:64,
 edges:[{...edges[0],targetOffset:0x21}]
}),/source bytes changed/);
assert.throws(()=>runIsolatedRelocatedFarCalls(cpu,{
 loadSegment:0x200,headerBytes:64,
 edges:[{...edges[0],status:'UNRESOLVED_INDIRECT_OR_UNRELOCATED_FAR_TRANSFER'}]
}),/source-authenticated target/);
assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],
 [before.cs,before.ip,before.sp]);
// Execute real E8 CPU instructions at two independently located synthetic
// callsites, each verified against a separately provided target boundary.
// A near call retains CS and pushes exactly one return IP word.
const nearSource=Uint8Array.of(0xe8,4,0,0x90,0x90,0x90,0x90,0xc3);
cpu.load(nearSource,0x203,0); // raw 112 (image +48), target raw 119
cpu.load(Uint8Array.of(0xe8,9,0),0x204,0); // raw 128, target raw 140
cpu.write8(0x204,12,0xc3);
const nearEdge=(callRaw,targetRaw)=>({
 role:'SOURCE_AUTHENTICATED_INITIALIZER',
 callRaw,callRea:0x10000+callRaw-0x5400,
 targetRaw,targetRea:0x10000+targetRaw-0x5400,
 status:'GHIDRA_SOURCE_BOUND_WINDOW__CALLEE_SEMANTICS_UNCLASSIFIED',
 observedInstructionCount:3
});
const nearCalls=[nearEdge(112,119),nearEdge(128,140)];
const nearResult=runIsolatedOriginalNearCalls(cpu,{
 loadSegment:0x200,headerBytes:64,calls:nearCalls
});
assert.equal(nearResult.executedOriginalInstructions,2);
assert.deepEqual(nearResult.calls.map(x=>[x.destinationCS,x.destinationIP]),
 [[0x200,55],[0x200,76]]);
assert.ok(nearResult.calls.every(x=>x.stackWordsPushed===1));
assert.equal(cpu.get16('CS'),0x200);
assert.equal(cpu.get16('IP'),76);
assert.equal(cpu.get16('SP'),0xfffc);
assert.equal(cpu.read16(0x8000,0xfffc),67);
assert.ok(Object.isFrozen(nearResult.calls));
const beforeNear=[cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')];
for(const altered of [
 [{...nearCalls[0],targetRaw:120},nearCalls[1]],
 [nearCalls[0],{...nearCalls[1],callRea:0}],
 [nearCalls[0],{...nearCalls[1],status:'UNKNOWN'}]
]){
 assert.throws(()=>runIsolatedOriginalNearCalls(cpu,{
  loadSegment:0x200,headerBytes:64,calls:altered
 }),/target|provenance|source/i);
 assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],
  beforeNear,'full preflight must not execute partial evidence');
}
await assert.rejects(probeOriginalMainFarCallCpu(b,[]),/original MAIN SHA-256 mismatch|Korean original MAIN SHA-256 mismatch/);
console.log('UW2 8086 original E8 and relocated 9A source instructions isolated CPU/stacks and fail-closed provenance: PASS (synthetic)');
