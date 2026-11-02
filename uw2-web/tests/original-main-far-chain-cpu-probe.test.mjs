import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {verifyOriginalMainFarChain,probeOriginalMainFarChain,
 ORIGINAL_MAP_FAR_CHAIN} from '../tools/original-main-far-chain-cpu-probe.mjs';
assert.deepEqual(ORIGINAL_MAP_FAR_CHAIN,{
 firstCall:0x1b4f1,firstTarget:0x27e32,
 secondCall:0x27e3d,secondTarget:0x3a879,
 nearCall:0x3a87b,nearTarget:0x3a566,nearReturn:0x3a87e
});
assert.ok(Object.isFrozen(ORIGINAL_MAP_FAR_CHAIN));
for(const altered of [new Uint8Array(200),new Uint8Array(300000)]){
 assert.throws(()=>verifyOriginalMainFarChain(altered,[]),
  /SHA-256 mismatch/);
 await assert.rejects(probeOriginalMainFarChain(altered,[]),
  /SHA-256 mismatch/);
}
// Independently constructed DOS-free 8086 architecture regression:
// two nested 9A relocated-format far calls followed by original-shaped
// PUSH CS / E8 -> 16-bit callee -> RETF (a genuine returned near call).
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0x9a,0,2,0,3),0x200,0x100);
cpu.load(Uint8Array.of(0x9a,0,3,0,4),0x300,0x200);
cpu.load(Uint8Array.of(0x0e,0xe8,8,0),0x400,0x300);
cpu.load(Uint8Array.of(0xb8,0x34,0x12,0xcb),0x400,0x30c);
cpu.set16('CS',0x200);cpu.set16('IP',0x100);
cpu.set16('SS',0x800);cpu.set16('SP',0x1000);
cpu.step();assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],[0x300,0x200,0xffc]);
assert.deepEqual([cpu.read16(0x800,0xffc),cpu.read16(0x800,0xffe)],[0x105,0x200]);
cpu.step();assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],[0x400,0x300,0xff8]);
assert.deepEqual([cpu.read16(0x800,0xff8),cpu.read16(0x800,0xffa)],[0x205,0x300]);
cpu.step(); // original-shaped PUSH CS
assert.equal(cpu.read16(0x800,0xff6),0x400);
cpu.step(); // original-shaped near E8
assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],[0x400,0x30c,0xff4]);
assert.equal(cpu.read16(0x800,0xff4),0x304);
cpu.step(); // MOV AX,1234
cpu.step(); // authentic RETF, pops near return IP then caller-pushed CS
assert.deepEqual([cpu.get16('CS'),cpu.get16('IP'),cpu.get16('SP')],[0x400,0x304,0xff8]);
assert.equal(cpu.get16('AX'),0x1234);
console.log('UW2 real 8086 two chained FAR CALLs, nested E8/PUSH CS/RETF stack, original hash admission fail-closed PASS');
