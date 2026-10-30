import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {inspectMzForLoad,loadVerifiedMz} from '../web/mz-loader.js';

const u16=(b,i,v)=>{b[i]=v&255;b[i+1]=v>>>8;};
function fixture(){
  const b=new Uint8Array(64+48);
  b[0]=0x4d;b[1]=0x5a;
  u16(b,2,b.length);u16(b,4,1);u16(b,6,2);u16(b,8,4);
  u16(b,10,1);u16(b,12,0xffff);u16(b,14,2);u16(b,16,0x10);
  u16(b,20,0);u16(b,22,0);u16(b,24,0x1c);
  u16(b,0x1c,4);u16(b,0x1e,0); // initialized image relocation
  u16(b,0x20,4);u16(b,0x22,3); // BSS outside initialized image
  b[64]=0x90;u16(b,68,0x25); // code NOP, word reloc addend
  return b;
}
const original=fixture(),sha=createHash('sha256').update(original).digest('hex');
const meta=inspectMzForLoad(original);
assert.equal(meta.imageBytes,48);
assert.equal(meta.entries.length,2);
assert.equal(meta.entries[1].relative,52);
const cpu=new RealMode8086();
cpu.set16('FLAGS',0x203);
cpu.write16(0x180,52,0x13); // caller-supplied uninitialized memory snapshot
const loaded=await loadVerifiedMz(cpu,original,{
  loadSegment:0x180,pspSegment:0x170,allocationParagraphs:4,expectedSha256:sha
});
assert.equal(cpu.get16('CS'),0x180);assert.equal(cpu.get16('IP'),0);
assert.equal(cpu.get16('SS'),0x182);assert.equal(cpu.get16('SP'),0x10);
assert.equal(cpu.get16('DS'),0x170);assert.equal(cpu.get16('ES'),0x170);
assert.equal(cpu.get16('FLAGS'),0x203);
assert.equal(cpu.read16(0x180,4),0x1a5);
assert.equal(cpu.read16(0x180,52),0x193); // BSS relocation uses given snapshot, not zero
assert.equal(loaded.bssRelocations,1);
assert.match(loaded.fidelity,/UNTESTED/);
cpu.step();assert.equal(cpu.get16('IP'),1); // loaded original-image NOP
// A failed load is atomic and cannot mutate registers or memory.
const state=Array.from(cpu.regs),copy=new Uint8Array(cpu.memory);
await assert.rejects(loadVerifiedMz(cpu,original,{
  loadSegment:0x180,pspSegment:0x170,allocationParagraphs:4,
  expectedSha256:'0'.repeat(64)}),/SHA-256 mismatch/);
assert.deepEqual(Array.from(cpu.regs),state);
assert.deepEqual(cpu.memory,copy);
await assert.rejects(loadVerifiedMz(cpu,original,{
  loadSegment:0x180,pspSegment:0x170,allocationParagraphs:3,
  expectedSha256:sha}),/allocation outside/);
assert.deepEqual(cpu.memory,copy);
await assert.rejects(loadVerifiedMz(cpu,original,{
  loadSegment:0xffff,pspSegment:0x170,allocationParagraphs:4,
  expectedSha256:sha}),/exceeds physical memory/);
const duplicate=fixture();u16(duplicate,0x20,4);u16(duplicate,0x22,0);
assert.throws(()=>inspectMzForLoad(duplicate),/duplicate MZ relocation/);
const malformed=fixture();u16(malformed,24,63);
assert.throws(()=>inspectMzForLoad(malformed),/outside declared header/);
const truncated=fixture();u16(truncated,2,250);
assert.throws(()=>inspectMzForLoad(truncated),/outside declared header|MZ length/);
// Declared EXE length, not arbitrary trailing overlay bytes, determines image.
const overlay=new Uint8Array(original.length+5);overlay.set(original);overlay.fill(0xff,original.length);
assert.equal(inspectMzForLoad(overlay).imageBytes,48);
assert.throws(()=>inspectMzForLoad(new Uint8Array([0,1,2])),/invalid MZ/);
console.log('UW2 P3 MZ SHA-verified DOS image/relocations structural synthetic regression: PASS');
