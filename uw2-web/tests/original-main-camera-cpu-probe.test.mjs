import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {executeBoundedGuestSubroutine,originalCameraInstructionBoundaries,
 probeOriginalMainSeaCamera,ORIGINAL_CAMERA_RAW_START,ORIGINAL_CAMERA_RAW_END}
 from '../tools/original-main-camera-cpu-probe.mjs';

// A synthetic code segment demonstrates multi-op CPU execution all the way
// through RETF. No commercial executable, made-up Ghidra dump or DOS state
// is embedded in this CI regression.
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(0xb8,0x34,0x12,0xa3,0x00,0x10,0xcb),0x200,0x100);
cpu.set16('DS',0x300);
const at=cpu.physical(0x200,0x100);
const result=executeBoundedGuestSubroutine(cpu,{
 startCS:0x200,startIP:0x100,sourcePhysical:at,
 endPhysical:at+7,starts:new Set([at,at+3,at+6]),
 stackSegment:0x800,stackPointer:0x200
});
assert.equal(result.steps,3);assert.equal(result.returned,true);
assert.equal(cpu.read16(0x300,0x1000),0x1234);
assert.equal(cpu.get16('AX'),0x1234);
assert.equal(cpu.get16('CS'),0x1234);
assert.equal(cpu.get16('IP'),0x5678);
assert.equal(cpu.get16('SP'),0x204);
assert.ok(Object.isFrozen(result));
// Omitted source starts, malformed stacks and non-returning code fail closed.
const invalid=new RealMode8086();
invalid.load(Uint8Array.of(0xeb,0xfe),0x200,0x100);
const loopAt=invalid.physical(0x200,0x100);
assert.throws(()=>executeBoundedGuestSubroutine(invalid,{
 startCS:0x200,startIP:0x100,sourcePhysical:loopAt,
 endPhysical:loopAt+2,starts:new Set([loopAt]),
 maxSteps:8
}),/did not reach verified far return/);
assert.throws(()=>executeBoundedGuestSubroutine(invalid,{
 startCS:0x200,startIP:0x100,sourcePhysical:loopAt,
 endPhysical:loopAt+2,starts:new Set([loopAt-1])
}),/unverified Ghidra function boundary|entry absent/);
assert.throws(()=>executeBoundedGuestSubroutine(invalid,{
 startCS:0x200,startIP:0x100,sourcePhysical:loopAt,
 endPhysical:loopAt+2,starts:new Set([loopAt,loopAt+1]),
 stackSegment:0x200,stackPointer:0x100
}),/overlaps source/);
assert.equal(ORIGINAL_CAMERA_RAW_START,0x1b5c9);
assert.equal(ORIGINAL_CAMERA_RAW_END,0x1b627);
// Source admission must refuse arbitrary or invented original game binaries.
assert.throws(()=>originalCameraInstructionBoundaries(new Uint8Array(100),{}),
 /SHA-256 mismatch/);
await assert.rejects(probeOriginalMainSeaCamera(new Uint8Array(100),{}),
 /SHA-256 mismatch/);
console.log('UW2 original 8086 bounded full subroutine/RETF and provenance guards synthetic CI PASS');
