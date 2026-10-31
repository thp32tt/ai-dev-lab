import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
// SYNTHETIC DOS JFT/SFT semantics: no original DOS PSP snapshot.
const cpu=new RealMode8086();cpu.set16('CS',0x100);cpu.set16('DS',0x300);
cpu.load(Uint8Array.of(0xcd,0x21),0x100,0);
for(const [ptr,path] of [[0x40,'A.DAT'],[0x60,'B.DAT']])
 cpu.memory.set(Uint8Array.from(path+'\0',x=>x.charCodeAt(0)),cpu.physical(0x300,ptr));
const bytes={'A.DAT':Uint8Array.of(11,12,13,14,15),'B.DAT':Uint8Array.of(81,82,83)};
let psp=0x200;
const bridge=installDosInt21(cpu,{getFileProcessPsp:()=>psp,
  readOriginalFile:({filename})=>bytes[filename]?{bytes:bytes[filename]}:null});
const call=(ah,{al=0,bx=0,cx=0,dx=0x40}={})=>{
 cpu.set16('AX',(ah<<8)|al);cpu.set16('BX',bx);cpu.set16('CX',cx);
 cpu.set16('DX',dx);cpu.set16('IP',0);cpu.step();
 return {ax:cpu.get16('AX'),cf:cpu.flag('CF')};
};
assert.deepEqual(call(0x3d),{ax:5,cf:false});
call(0x3f,{bx:5,cx:2,dx:0x100});
assert.deepEqual([...cpu.memory.slice(0x3100,0x3102)],[11,12]);
psp=0x220;
assert.deepEqual(call(0x3d,{dx:0x60}),{ax:5,cf:false});
call(0x3f,{bx:5,cx:1,dx:0x102});
assert.equal(cpu.read8(0x300,0x102),81); // no parent handle collision
psp=0x200;
call(0x3f,{bx:5,cx:2,dx:0x100});
assert.deepEqual([...cpu.memory.slice(0x3100,0x3102)],[13,14]);
assert.equal(bridge.inheritReadOnlyFileHandles(0x200,0x240),1);
assert.throws(()=>bridge.inheritReadOnlyFileHandles(0x200,0x240),/new child PSP/);
assert.throws(()=>bridge.inheritReadOnlyFileHandles(0x210,0x250),/existing parent/);
psp=0x240;
call(0x3f,{bx:5,cx:1,dx:0x103});
assert.equal(cpu.read8(0x300,0x103),15); // inherited file cursor
call(0x3e,{bx:5});
assert.deepEqual(call(0x3f,{bx:5,cx:1,dx:0x104}),{ax:6,cf:true});
psp=0x200;
assert.deepEqual(call(0x3f,{bx:5,cx:1,dx:0x104}),{ax:0,cf:false});
psp=0x240;
assert.deepEqual(call(0x3d,{dx:0x60}),{ax:5,cf:false}); // released slot
assert.equal(bridge.releaseReadOnlyFileHandles(0x240),1);
assert.throws(()=>bridge.releaseReadOnlyFileHandles(0x240),/unknown DOS file PSP/);
psp=0x200;
assert.deepEqual(call(0x42,{bx:5,cx:0,dx:0}),{ax:0,cf:false});
call(0x3f,{bx:5,cx:1,dx:0x105});
assert.equal(cpu.read8(0x300,0x105),11);
psp=0x220;
assert.equal(bridge.releaseReadOnlyFileHandles(0x220),1);
psp=0x200;
assert.equal(bridge.releaseReadOnlyFileHandles(0x200),1);
assert.deepEqual(call(0x3f,{bx:5,cx:1,dx:0x106}),{ax:6,cf:true});
psp=65536;
assert.throws(()=>call(0x3d),/current DOS file PSP.*uint16/);
assert.throws(()=>installDosInt21(new RealMode8086(),{
 readOriginalFile:()=>null,getFileProcessPsp:3}),/resolver must be synchronous/);
const asyncCpu=new RealMode8086();
asyncCpu.set16('AX',0x3d00);asyncCpu.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(asyncCpu,{readOriginalFile:()=>null,
 getFileProcessPsp:()=>Promise.resolve(0x200)});
assert.throws(()=>asyncCpu.step(),/async DOS file PSP resolver/);
console.log('UW2 original DOS per-PSP file handles and inherited shared cursor synthetic regression: PASS');
