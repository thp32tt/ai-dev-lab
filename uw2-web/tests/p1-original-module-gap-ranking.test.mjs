import assert from 'node:assert/strict';
import {rankOriginalUw2ModuleGaps} from '../tools/p1-original-module-gap-ranking.mjs';
const names=['KOEI.COM','FMDRV.COM','OPEN.EXE','MAIN.EXE','END.EXE','GRPDRV.EXE'];
const sizes=[776,5162,41655,267319,51729,21551];
const known=[321,754,27254,204519,24266,970];
const missing=sizes.map((n,i)=>n-known[i]);
const flow=[20,9,81,4798,90,15];
const manifest={coreExecutables:names.map((name,i)=>({
 name,sha256:String.fromCharCode(97+i).repeat(64),
 ...(name.endsWith('.COM')?{com:{fileBytes:sizes[i]}}:{mz:{imageBytes:sizes[i]}})
}))};
const reports=names.map((name,i)=>({
 moduleName:name,sha256:manifest.coreExecutables[i].sha256,
 providerVersion:'12.1.4',
 codeCandidateBytes:known[i],
 ...(name.endsWith('.COM')?{
  unobservedBytes:missing[i],originalBytes:sizes[i],loadBase:0x10100
 }:{
  unobservedImageBytes:missing[i],uniqueChunks:Math.ceil(sizes[i]/65536)
 }),
 instructionCandidates:Math.min(known[i],10),
 functionEntryCandidates:Math.min(known[i],2),
 unresolvedStaticFlows:flow[i],verifiedCodeBytes:0,verifiedFunctionCount:0,
 gate:'HOLD_UNRESOLVED_FLOW'
}));
const baseline=rankOriginalUw2ModuleGaps(reports,manifest);
assert.deepEqual(baseline.modules.map(x=>x.moduleName),
 ['MAIN.EXE','END.EXE','GRPDRV.EXE','OPEN.EXE','FMDRV.COM','KOEI.COM']);
assert.equal(baseline.totals.unobserved,missing.reduce((a,b)=>a+b,0));
assert.equal(baseline.totals.codeCandidates,known.reduce((a,b)=>a+b,0));
assert.equal(baseline.totals.bytes,sizes.reduce((a,b)=>a+b,0));
assert.equal(baseline.totals.unresolvedFlows,flow.reduce((a,b)=>a+b,0));
assert.equal(baseline.verifiedCodeBytes,0);
assert.match(baseline.gate,/HOLD_/);
const reverse=rankOriginalUw2ModuleGaps([...reports].reverse(),manifest);
assert.deepEqual(reverse,baseline);
const mutate=(fn,pattern)=>{
 const cloned=structuredClone(reports);
 fn(cloned);
 assert.throws(()=>rankOriginalUw2ModuleGaps(cloned,manifest),pattern);
};
mutate(x=>x[0].sha256='f'.repeat(64),/SHA/);
mutate(x=>x[0].verifiedCodeBytes=1,/unverified/);
mutate(x=>x[0].gate='COMPLETE',/unverified/);
mutate(x=>x[0].codeCandidateBytes=777,/conservation/);
mutate(x=>x[0].unobservedBytes=777,/conservation/);
mutate(x=>x[0].loadBase=0x10000,/COM PSP/);
mutate(x=>x[3].uniqueChunks=1,/full-image chunk/);
mutate(x=>x[3].unresolvedStaticFlows=-1,/invalid static count/);
mutate(x=>x[3].instructionCandidates=sizes[3],/conservation/);
mutate(x=>x[2].moduleName='GRPDRV.EXE',/duplicate/);
assert.throws(()=>rankOriginalUw2ModuleGaps(reports.slice(0,5),manifest),/one independently audited/);
assert.throws(()=>rankOriginalUw2ModuleGaps(reports,{}),/six original Korean/);
console.log('UW2 six SHA-bound original module full-file gap ranking without game-completion promotion: PASS (synthetic)');
