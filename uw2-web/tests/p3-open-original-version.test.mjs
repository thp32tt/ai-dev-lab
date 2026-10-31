import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {probeOriginalOpen} from '../tools/p3-open-exec-probe.mjs';
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(dir,'OPEN.EXE'));
const baseline=await probeOriginalOpen(original,{allocationParagraphs:7000});
assert.equal(baseline.sha256,'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
assert.equal(baseline.image.relocations,23);
assert.equal(baseline.steps,1);
assert.match(baseline.stopped.message,/AH30/);
const supplied=[];
const injected=await probeOriginalOpen(original,{
 allocationParagraphs:7000,maxSteps:10000,
 dosOptions:{getDosVersion:({requestAL})=>{
   supplied.push(requestAL);
   return {major:6,minor:22,oem:0,serialHigh:0,serialLow:0};
 }}
});
assert.ok(injected.steps>baseline.steps);
assert.deepEqual(supplied,[0]);
assert.match(injected.fidelity,/NOT_REFERENCE_BOOT/);
console.log(JSON.stringify({steps:injected.steps,stopped:injected.stopped,
 services:injected.services,last:injected.recent.slice(-12),
 fidelity:injected.fidelity}));
const resizeRequests=[];
const withResize=await probeOriginalOpen(original,{
 allocationParagraphs:7000,maxSteps:10000,
 dosOptions:{
   getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
   resizeMemory:({segment,paragraphs})=>{
      resizeRequests.push({segment,paragraphs});
      assert.equal(segment,0x600);
      assert.equal(paragraphs,6566);
      assert.ok(paragraphs<=7000);
      return {resized:true}; // explicit SYNTHETIC DOS MCB, not measured allocation
   }
 }
});
assert.ok(withResize.steps>injected.steps);
assert.equal(resizeRequests.length,1);
console.log(JSON.stringify({withSyntheticResizeSteps:withResize.steps,
 resizeRequests,stopped:withResize.stopped,
 services:withResize.services,trace:withResize.recent.slice(-10)}));

const ivtBytes=new Uint8Array(1024);
ivtBytes.set([0x00,0x00,0x00,0x09],0x00*4); // explicitly synthetic INT00
const ivtSha=createHash('sha256').update(ivtBytes).digest('hex');
const withIvt=await probeOriginalOpen(original,{
 allocationParagraphs:7000,maxSteps:12000,
 initialIvt:{bytes:ivtBytes,expectedSha256:ivtSha,knownVectors:[0]},
 dosOptions:{
   getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
   resizeMemory:({segment,paragraphs})=>{
      assert.deepEqual({segment,paragraphs},{segment:0x600,paragraphs:6566});
      return {resized:true};
   }
 }
});
assert.equal(withIvt.initialIvt.knownVectorCount,1);
assert.ok(withIvt.steps>withResize.steps);
console.log(JSON.stringify({withSyntheticIvtSteps:withIvt.steps,
 stopped:withIvt.stopped,services:withIvt.services,
 trace:withIvt.recent.slice(-10)}));

console.log('UW2 original OPEN MZ execution past explicit synthetic DOS AH30 version: PASS (not DOS reference)');
