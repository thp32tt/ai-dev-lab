import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {loadVerifiedCom} from '../web/mz-loader.js';
import {installDosInt21} from '../web/dos-int21.js';

// Synthetic 8086 instructions, NOT original Korean DOS program execution.
const sha=b=>createHash('sha256').update(b).digest('hex');
const instructions=Uint8Array.of(
  0xb8,0x00,0x4b,       // MOV AX,4B00h
  0xba,0x20,0x01,       // MOV DX,0120h, NUL terminated path
  0xcd,0x21,           // INT 21h, explicit child EXEC
  0xb4,0x4d,           // MOV AH,4Dh, get last child status
  0xcd,0x21,           // INT 21h
  0x0a,0xe4,           // OR AH,AH, KOEI exit guard analogue
  0x75,0x09,           // JNZ alternate termination
  0xb8,0x00,0x4c,0xcd,0x21,
  0x90,0x90,0x90,0x90,
  0xb8,0x01,0x4c,0xcd,0x21
);
const image=new Uint8Array(0x20+9);
image.set(instructions);
image.set(Buffer.from('OPEN.EXE\0','latin1'),0x20);
const makeCpu=async (psp=0x200)=>{
  const c=new RealMode8086();
  c.memory.fill(0xa5,psp*16,psp*16+0x100);
  const info=await loadVerifiedCom(c,image,{
    pspSegment:psp,allocationParagraphs:0x60,initialSP:0x5fe,expectedSha256:sha(image)
  });
  assert.match(info.fidelity,/UNTESTED/);
  for(const reg of ['CS','DS','ES','SS'])assert.equal(c.get16(reg),psp);
  assert.equal(c.get16('IP'),0x100);
  assert.equal(c.read8(psp,0x80),0xa5);
  assert.equal(c.read8(psp,0x120),'O'.charCodeAt(0));
  return c;
};
const normal=await makeCpu();
const calls=[];
const bridge=installDosInt21(normal,{executeChild:input=>{
  calls.push(input);return {terminationType:0,returnCode:7};
}});
normal.runSteps(10);
assert.equal(calls.length,1);
assert.equal(calls[0].filename,'OPEN.EXE');
assert.deepEqual([...calls[0].bytes],[...Buffer.from('OPEN.EXE','latin1')]);
assert.equal(calls[0].parameterBlockSegment,0x200);
assert.equal(bridge.pendingChildStatus(),null);
assert.deepEqual(normal.terminated,{terminationType:0,returnCode:0});
assert.equal(normal.get16('SP'),0x5fe);
assert.throws(()=>normal.step(),/terminated/);
const abnormal=await makeCpu(0x220);
installDosInt21(abnormal,{executeChild:()=>({terminationType:1,returnCode:2})});
abnormal.runSteps(10);
assert.deepEqual(abnormal.terminated,{terminationType:0,returnCode:1});

// Unknown services/results are never substituted with successful DOS status.
const noRunner=new RealMode8086();
noRunner.load(Uint8Array.of(0xb8,0x00,0x4b,0xcd,0x21),0,0);
installDosInt21(noRunner);
noRunner.step();
assert.throws(()=>noRunner.step(),/requires a child runner/);
assert.equal(noRunner.terminated,null);
const noChild=new RealMode8086();
noChild.load(Uint8Array.of(0xb4,0x4d,0xcd,0x21),0,0);
installDosInt21(noChild);
noChild.step();
assert.throws(()=>noChild.step(),/missing completed child/);
const unknown=new RealMode8086();
unknown.set8('AH',0x30);
unknown.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(unknown);
assert.throws(()=>unknown.step(),/unsupported DOS/);
// DOS EXEC error path: CF and AX only, without manufacturing a child status.
const failed=new RealMode8086();
failed.set16('DS',0x110);failed.set16('DX',0x80);
failed.write8(0x110,0x80,65);failed.write8(0x110,0x81,0);
failed.set16('AX',0x4b00);
failed.load(Uint8Array.of(0xcd,0x21),0,0);
const failureBridge=installDosInt21(failed,{executeChild:()=>({errorCode:2})});
failed.step();
assert.equal(failed.flag('CF'),true);
assert.equal(failed.get16('AX'),2);
assert.equal(failureBridge.pendingChildStatus(),null);

// Failed COM preflight must not touch CPU memory, registers or PSP.
const bad=new RealMode8086(),before=bad.memory.slice(0x30100,0x30140);
await assert.rejects(loadVerifiedCom(bad,image,{pspSegment:0x300,
  allocationParagraphs:0x60,initialSP:0x5fe,expectedSha256:'0'.repeat(64)}),/SHA-256 mismatch/);
assert.deepEqual(bad.memory.slice(0x30100,0x30140),before);
await assert.rejects(loadVerifiedCom(bad,image,{pspSegment:0x300,
  allocationParagraphs:0x60,initialSP:0x101,expectedSha256:sha(image)}),/outside explicit DOS allocation/);
assert.equal(bad.get16('IP'),0);
const busy=new RealMode8086();
busy.installInterruptVector(0x21,0x200,0);
assert.throws(()=>installDosInt21(busy),/already registered/);
const lateVector=new RealMode8086();
installDosInt21(lateVector);
assert.throws(()=>lateVector.installInterruptVector(0x21,0x200,0),/already registered/);
console.log('UW2 P3 synthetic COM+DOS EXEC/child status/termination integration: PASS');
