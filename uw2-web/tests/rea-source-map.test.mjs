import assert from 'node:assert/strict';
import {parseMzHeader} from '../tools/original-inventory.mjs';
import {rawToRea,reaToRaw,inspectReaSourceMap,GHIDRA_DOS_LOAD_BASE} from '../tools/rea-source-map.mjs';
function mzFixture(){
  const b=Buffer.alloc(128);b.writeUInt16LE(0x5a4d,0);b.writeUInt16LE(128,2);
  b.writeUInt16LE(1,4);b.writeUInt16LE(0,6);b.writeUInt16LE(4,8);
  b.writeUInt16LE(0x1c,24);b.writeUInt16LE(3,20);return b;
}
const raw=mzFixture(),mz=parseMzHeader(raw);
assert.equal(GHIDRA_DOS_LOAD_BASE,65536);
assert.equal(rawToRea(64,mz),65536);
assert.equal(rawToRea(67,mz),65539);
assert.equal(rawToRea(63,mz),null);
assert.equal(rawToRea(128,mz),null);
assert.equal(reaToRaw(65536,mz),64);
assert.equal(reaToRaw(65599,mz),127);
assert.equal(reaToRaw(65600,mz),null);
const overview={data:{normalized_result:{
  segments:[{name:'CODE_0',start:'0x10000',end:'0x10020',length:32},
  {name:'CODE_1',start:'0x10020',end:'0x10040',length:32},
  {name:'DATA',start:'0x10040',end:'0x10080',length:64}],procedure_count:42
}}};
const checked=inspectReaSourceMap(raw,overview,{name:'fixture.EXE'});
assert.equal(checked.gate,'PASS');
assert.equal(checked.rea.entryPoint,65539);
assert.equal(checked.rea.candidateProcedures,42);
assert.equal(checked.rea.initializedSourceEnd,65600);
const shifted=structuredClone(overview);
shifted.data.normalized_result.segments[1].start='0x10021';
assert.equal(inspectReaSourceMap(raw,shifted).gate,'FAIL');
const misleading=structuredClone(overview);
misleading.data.normalized_result.segments[2].start='0x1003f';
assert.equal(inspectReaSourceMap(raw,misleading).gate,'FAIL');
console.log('UW2 P1 real-mode source/REA code vs uninitialized BSS mapping: PASS');
