import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {captureDosCpuFrame,runStagedDosComChild} from '../web/dos-com-child-runner.js';
import {installDosInt21} from '../web/dos-int21.js';
const cpu=new RealMode8086();
const parentNames=['AX','CX','DX','BX','SP','BP','SI','DI','CS','DS','ES','SS','IP','FLAGS'];
const child={
 AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
 CS:0x400,DS:0x400,ES:0x400,SS:0x400,IP:0x100,FLAGS:0x202
};
cpu.load(Uint8Array.of(0xb8,0x31,0x31,0xba,0x26,0x00,0xcd,0x21),0x400,0x100);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);cpu.set16('ES',0x200);
cpu.set16('SS',0x200);cpu.set16('SP',0xfffe);
cpu.set16('IP',0x456);
cpu.set16('AX',0x4b00);cpu.set16('FLAGS',0x203);
let owner=0,activePsp=0x400,seen=null;
installDosInt21(cpu,{
 pspSegment:()=>activePsp,
 stayResident:({pspSegment,paragraphs,returnCode})=>{
  owner++;seen={pspSegment,paragraphs,returnCode};return {resident:true};
 }
});
const before=captureDosCpuFrame(cpu),beforeRam=cpu.memory.slice(0x4100,0x4108);
const result=runStagedDosComChild(cpu,{initialFrame:child,maxSteps:30});
assert.deepEqual(result,{terminationType:3,returnCode:0x31,steps:3,residentParagraphs:0x26});
assert.deepEqual(seen,{pspSegment:0x400,paragraphs:0x26,returnCode:0x31});
assert.equal(owner,1);
assert.deepEqual(captureDosCpuFrame(cpu),before);
assert.deepEqual(cpu.memory.slice(0x4100,0x4108),beforeRam);
assert.equal(cpu.terminated,null);
const invalid={...child};delete invalid.FLAGS;
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:invalid}),/exactly 14/);
assert.deepEqual(captureDosCpuFrame(cpu),before);
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:{...child,AX:65536}}),/uint16/);
assert.deepEqual(captureDosCpuFrame(cpu),before);
const budgetFrame={...child,IP:0x100};
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:budgetFrame,maxSteps:2}),/budget exhausted/);
assert.deepEqual(captureDosCpuFrame(cpu),before);
assert.equal(cpu.terminated,null);
activePsp=0x10000;
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:child,maxSteps:10}),/current process PSP/);
assert.deepEqual(captureDosCpuFrame(cpu),before);
cpu.terminated={terminationType:0,returnCode:0};
assert.throws(()=>runStagedDosComChild(cpu,{initialFrame:child}),/terminated parent/);
console.log('UW2 DOS shared-memory nested COM CPU frame + TSR residency boundaries: PASS');
