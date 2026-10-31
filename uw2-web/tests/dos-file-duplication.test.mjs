import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';

// Synthetic DOS 2+ JFT/SFT DUP and FORCEDUP contract, not a reference
// execution of the Korean DOS release or a captured system handle table.
const cpu=new RealMode8086();
cpu.set16('CS',0x100);cpu.set16('DS',0x300);
cpu.load(Uint8Array.of(0xcd,0x21),0x100,0);
for(const [offset,name] of [[0x40,'A.DAT'],[0x60,'B.DAT']])
  cpu.memory.set(Uint8Array.from(name+'\0',ch=>ch.charCodeAt(0)),
    cpu.physical(0x300,offset));
const files={'A.DAT':Uint8Array.of(10,20,30,40,50,60),
  'B.DAT':Uint8Array.of(81,82,83)};
let psp=0x200;
const events=[];
const boundary=installDosInt21(cpu,{
  getFileProcessPsp:()=>psp,
  readOriginalFile:({filename})=>files[filename]?{bytes:files[filename]}:null,
  onFileEvent:event=>{events.push(event);}
});
const call=(ah,{al=0,bx=0,cx=0,dx=0x40}={})=>{
  cpu.set16('AX',(ah<<8)|al);cpu.set16('BX',bx);
  cpu.set16('CX',cx);cpu.set16('DX',dx);cpu.set16('IP',0);
  cpu.step();
  return {ax:cpu.get16('AX'),cf:cpu.flag('CF')};
};
const read=(handle,offset)=>call(0x3f,{bx:handle,cx:1,dx:offset});
assert.deepEqual(call(0x3d),{ax:5,cf:false});
assert.deepEqual(call(0x45,{bx:5}),{ax:6,cf:false});
assert.equal(read(6,0x100).ax,1);
assert.equal(cpu.read8(0x300,0x100),10);
assert.equal(read(5,0x101).ax,1);
assert.equal(cpu.read8(0x300,0x101),20); // shared SFT seek cursor
assert.deepEqual(call(0x3d,{dx:0x60}),{ax:7,cf:false});
const originalAx=0x4600;
assert.deepEqual(call(0x46,{bx:5,cx:7}),{ax:originalAx,cf:false});
assert.equal(read(7,0x102).ax,1);
assert.equal(cpu.read8(0x300,0x102),30); // previous B.DAT replaced by A
assert.deepEqual(call(0x3e,{bx:5}),{ax:0x3e00,cf:false});
assert.equal(read(6,0x103).ax,1);
assert.equal(cpu.read8(0x300,0x103),40);
assert.equal(boundary.inheritReadOnlyFileHandles(0x200,0x240),2);
psp=0x240;
assert.equal(read(7,0x104).ax,1);
assert.equal(cpu.read8(0x300,0x104),50);
assert.deepEqual(call(0x3d,{dx:0x60}),{ax:5,cf:false}); // child-only slot
assert.deepEqual(call(0x46,{bx:6,cx:5}),{ax:originalAx,cf:false});
assert.deepEqual(call(0x45,{bx:5}),{ax:8,cf:false});
assert.throws(()=>call(0x46,{bx:8,cx:8}),/source equals destination/);
psp=0x200;
assert.equal(read(7,0x105).ax,1);
assert.equal(cpu.read8(0x300,0x105),60); // child advanced parent SFT
assert.deepEqual(read(6,0x106),{ax:0,cf:false});
assert.deepEqual(call(0x45,{bx:5}),{ax:6,cf:true}); // closed in parent
psp=0x240;
assert.deepEqual(call(0x45,{bx:0xfffe}),{ax:6,cf:true});
assert.deepEqual(call(0x46,{bx:0xfffe,cx:9}),{ax:6,cf:true});
assert.deepEqual(call(0x46,{bx:6,cx:37}),{ax:6,cf:true});
assert.throws(()=>call(0x46,{bx:6,cx:1}),/external standard device/);
assert.throws(()=>call(0x46,{bx:6,cx:6}),/source equals destination/);
assert.deepEqual(call(0x42,{bx:5,al:0,dx:0}),{ax:0,cf:false});
psp=0x200;
assert.equal(read(7,0x107).ax,1);
assert.equal(cpu.read8(0x300,0x107),10);
assert.equal(boundary.releaseReadOnlyFileHandles(0x240),4);
assert.equal(read(7,0x108).ax,1);
assert.equal(cpu.read8(0x300,0x108),20);
assert.deepEqual(events.filter(e=>e.operation==='duplicate').map(e=>e.handle),[6,8]);
// DUP/FORCEDUP are DOS JFT events owned by the same PSP as open/read/close.
// The origin of a duplicated SFT cursor must not erase the calling process.
assert.deepEqual(events.filter(e=>e.operation==='duplicate').map(e=>e.psp),[0x200,0x240]);
assert.deepEqual(events.filter(e=>e.operation==='force-duplicate')
  .map(e=>[e.sourceHandle,e.handle,e.replacedFilename]),
  [[5,7,'B.DAT'],[6,5,'B.DAT']]);
assert.deepEqual(events.filter(e=>e.operation==='force-duplicate').map(e=>e.psp),
  [0x200,0x240]);
assert.ok(events.every(e=>e.psp===0x200||e.psp===0x240));
const noFiles=new RealMode8086();
noFiles.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(noFiles);noFiles.set16('AX',0x4500);
assert.throws(()=>noFiles.step(),/unsupported DOS INT 21h/);
console.log('UW2 DOS per-PSP DUP/FORCEDUP shared original file cursor synthetic regression: PASS');
