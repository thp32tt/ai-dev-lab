import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {verifyOriginalMainInitPrefix,executeMainInitSourcePrefix,
 probeOriginalMainInitPrefix,ORIGINAL_INIT_RAW_START,
 ORIGINAL_INIT_FAR_CALL} from '../tools/original-main-map-init-cpu-probe.mjs';
assert.equal(ORIGINAL_INIT_RAW_START,0x1b49b);
assert.equal(ORIGINAL_INIT_FAR_CALL,0x1b4f1);
assert.throws(()=>verifyOriginalMainInitPrefix(new Uint8Array(200),{}),
 /SHA-256 mismatch/);
await assert.rejects(probeOriginalMainInitPrefix(new Uint8Array(200),{}),
 /SHA-256 mismatch/);
// Independently constructed synthetic 8086 prefix: PUSH DI, PUSH SI,
// JMP directly to unresolved FAR call. The real proprietary code is never
// placed in CI. Synthetic CPU execution must HALT before the 9Ah opcode.
const bytes=new Uint8Array(ORIGINAL_INIT_FAR_CALL+1),length=
 ORIGINAL_INIT_FAR_CALL-ORIGINAL_INIT_RAW_START;
assert.equal(length,86);
bytes[ORIGINAL_INIT_RAW_START]=0x57; // PUSH DI
bytes[ORIGINAL_INIT_RAW_START+1]=0x56; // PUSH SI
bytes[ORIGINAL_INIT_RAW_START+2]=0xe9; // JMP rel16 to stop
bytes[ORIGINAL_INIT_RAW_START+3]=(length-5)&255;
bytes[ORIGINAL_INIT_RAW_START+4]=(length-5)>>8;
bytes[ORIGINAL_INIT_FAR_CALL]=0x9a;
const cpu=new RealMode8086();
const startCS=0x300,startIP=0x609b;
const at=cpu.physical(startCS,startIP);
cpu.load(bytes.subarray(ORIGINAL_INIT_RAW_START),startCS,startIP);
const proof={sourcePhysical:at,stopPhysical:at+length,
 startCS,startIP,starts:new Set([at,at+1,at+2])};
const result=executeMainInitSourcePrefix(cpu,bytes,proof);
assert.equal(result.steps,3);
assert.equal(result.stoppedAtRaw,ORIGINAL_INIT_FAR_CALL);
assert.equal(result.unresolvedOriginalFarCall,true);
assert.equal(result.completeNewGame,false);
assert.equal(result.sourceCounter,0);
assert.equal(result.output.length,540);
assert.ok(result.output.every(n=>n===0));
assert.equal(cpu.get16('IP'),0x60f1);
assert.equal(cpu.get16('SP'),0x7ffc);
assert.equal(cpu.read8(startCS,0x60f1),0x9a);
const negative=new RealMode8086();
negative.load(bytes.subarray(ORIGINAL_INIT_RAW_START),startCS,startIP);
assert.throws(()=>executeMainInitSourcePrefix(negative,bytes,{
 ...proof,starts:new Set([at,at+1])
}),/crossed unresolved original branch/);
const tampered=new Uint8Array(bytes);tampered[ORIGINAL_INIT_RAW_START]=0x90;
assert.throws(()=>executeMainInitSourcePrefix(negative,tampered,proof),
 /guest code mutated/);
negative.write8(startCS,0x60f1,0x90);
assert.throws(()=>executeMainInitSourcePrefix(negative,bytes,proof),
 /far call altered/);
console.log('UW2 original MAIN initializer verified source region, guest 8086 prefix, unresolved far-call halt and fail-closed evidence PASS (synthetic)');
