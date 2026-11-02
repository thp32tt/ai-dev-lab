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

// Independent synthetic parent-to-parent-return instruction sequence.
// Parent PUSH CS/E8 creates real return words, then a nested FAR/FAR/E8
// visits two callees and returns through three genuine RETF instructions.
// No original commercial bytes or inferred DOS state are copied into CI.
const full=new RealMode8086();
full.load(Uint8Array.of(0x0e,0xe8,0x0c,0x00),0x200,0x100);
full.load(Uint8Array.of(
 0x57,0x56,0x9a,0x20,0x02,0x00,0x03,0x5e,0x5f,0xcb
),0x200,0x110);
full.load(Uint8Array.of(
 0x55,0x8b,0xec,0x9a,0x30,0x03,0x00,0x04,
 0x8b,0xe5,0x5d,0xcb
),0x300,0x220);
full.load(Uint8Array.of(0x56,0x0e,0xe8,0x0b,0x00,0x5e,0xcb),0x400,0x330);
full.load(Uint8Array.of(0xb8,0x34,0x12,0xcb),0x400,0x340);
full.set16('CS',0x200);full.set16('IP',0x100);
full.set16('SS',0x800);full.set16('SP',0x1000);
let completed=false;
for(let steps=0;steps<40;steps++){
 if(full.get16('CS')===0x200&&full.get16('IP')===0x104){
  assert.equal(steps,21);
  completed=true;break;
 }
 full.step();
}
assert.equal(completed,true,'synthetic nested original-shaped caller return must finish');
assert.equal(full.get16('SP'),0x1000);
assert.equal(full.get16('AX'),0x1234);
assert.equal(full.read16(0x800,0xffc),0x104);
assert.equal(full.read16(0x800,0xffe),0x200);

// Self-contained synthetic 8086 memory ownership regression. The guest
// performs MOV ES,AX; MOV ES:[BX],FF; INC BX; CMP BX,0300; JL loop.
// The owner main-game 768-byte effect must never alter adjacent memory.
const fillCpu=new RealMode8086();
fillCpu.load(Uint8Array.of(
 0xb8,0x00,0x90, // MOV AX,9000
 0x8e,0xc0,      // MOV ES,AX
 0x31,0xdb,      // XOR BX,BX
 0x26,0xc6,0x07,0xff, // MOV byte ptr ES:[BX],0xFF
 0x43,           // INC BX
 0x81,0xfb,0x00,0x03, // CMP BX,0x0300
 0x7c,0xf5      // JL signed loop back to ES:[BX]
),0x300,0x100);
fillCpu.set16('CS',0x300);fillCpu.set16('IP',0x100);
fillCpu.write8(0x9000,0xffff,0x39);
fillCpu.write8(0x9000,0x300,0x73);
for(let i=0;i<768;i++)fillCpu.write8(0x9000,i,0x5a);
let fillSteps=0;
while(fillCpu.get16('IP')!==0x112&&fillSteps<4000){
 fillCpu.step();fillSteps++;
}
assert.equal(fillCpu.get16('IP'),0x112);
assert.equal(fillCpu.get16('ES'),0x9000);
assert.equal(fillCpu.get16('BX'),768);
assert.equal(fillSteps,2+768*4);
assert.equal(fillCpu.read8(0x9000,0xffff),0x39);
assert.equal(fillCpu.read8(0x9000,768),0x73);
for(let i=0;i<768;i++)assert.equal(fillCpu.read8(0x9000,i),0xff);

console.log('UW2 real 8086 two chained FAR CALLs, nested E8/PUSH CS/RETF stack, original hash admission fail-closed source-owned ES 768-byte fill PASS');
