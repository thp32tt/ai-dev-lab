import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {inspectMzRelocations,findPinnedFarTransfer,classifyImagePointer}
  from '../tools/mz-relocation-callgraph.mjs';

function fixture(){
  const header=64, image=256,bytes=Buffer.alloc(header+image);
  bytes.writeUInt16LE(0x5a4d,0);
  bytes.writeUInt16LE((header+image)%512,2);bytes.writeUInt16LE(1,4);
  bytes.writeUInt16LE(3,6);bytes.writeUInt16LE(4,8);bytes.writeUInt16LE(0x1c,24);
  [[0x13,0],[0x23,0],[0x30,0]].forEach(([offset,segment],i)=>{
    bytes.writeUInt16LE(offset,0x1c+i*4);bytes.writeUInt16LE(segment,0x1e+i*4);
  });
  bytes[header+0x10]=0x9a;bytes.writeUInt16LE(0x40,header+0x11);
  bytes.writeUInt16LE(0,header+0x13);
  bytes[header+0x20]=0xea;bytes.writeUInt16LE(0x80,header+0x21);
  bytes.writeUInt16LE(0,header+0x23);
  bytes.writeUInt16LE(0x20,header+0x30); // relocatable DS segment; beyond initialized image
  return bytes;
}
const bytes=fixture(),sha256=crypto.createHash('sha256').update(bytes).digest('hex');
const res=inspectMzRelocations(bytes,{name:'SYNTHETIC.EXE',expectedSha256:sha256,includeEntries:true});
assert.equal(res.summary.inspectedRelocations,3);
assert.equal(res.summary.bytePatternClasses['far-call-9a'],1);
assert.equal(res.summary.bytePatternClasses['far-jump-ea'],1);
assert.equal(res.summary.bytePatternClasses['other-relocation'],1);
assert.equal(res.summary.segmentWordRegions['initialized-image'],2);
assert.equal(res.summary.segmentWordRegions['beyond-initialized-image'],1);
assert.equal(res.summary.opcodeWithRelocationCandidates,2);
const call=findPinnedFarTransfer(res,64+0x10,0x40);
assert.equal(call.targetRaw,64+0x40);
assert.equal(call.targetRea,0x10040);
assert.equal(call.sourceRea,0x10010);
assert.equal(call.targetSegment,0);
assert.equal(findPinnedFarTransfer(res,64+0x20,0x80,{type:'far-jump-ea'}).targetRaw,64+0x80);
assert.equal(classifyImagePointer(0x100,{imageBytes:0x100}),'beyond-initialized-image');
assert.throws(()=>findPinnedFarTransfer(res,64+0x11,0x40),/missing or ambiguous/);
assert.throws(()=>inspectMzRelocations(bytes,{expectedSha256:'f'.repeat(64)}),/SHA-256 mismatch/);
const invalid=Buffer.from(bytes);invalid.writeUInt16LE(0x13,0x20);
assert.throws(()=>inspectMzRelocations(invalid),/duplicate relocation/);

// An opcode-looking 9A without a relocation is not admitted as proven FAR CALL.
const unlinked=Buffer.from(bytes);unlinked[64+0x70]=0x9a;
const unlinkedRes=inspectMzRelocations(unlinked);
assert.equal(unlinkedRes.summary.opcodeWithRelocationCandidates,2);
console.log('UW2 P1 MZ segment relocations + raw far control-transfer candidates: PASS');
