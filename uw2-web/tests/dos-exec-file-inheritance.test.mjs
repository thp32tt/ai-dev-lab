import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {runStagedDosComChild,captureDosCpuFrame} from '../web/dos-com-child-runner.js';
// Explicit SYNTHETIC DOS PSP and read-only file bytes. This is not a
// measured original Korean DOS loader, filesystem or process table.
const c=new RealMode8086(),events=[];
const parent=0x200,child=0x300;
let psp=parent,childResult=null,bridge;
const program=Uint8Array.of(
  0xb8,0x00,0x3d,0xba,0x40,0x00,0xcd,0x21, // open parent file
  0xbb,0x05,0x00,0xb9,0x02,0x00,0xba,0x00,0x01,
  0xb4,0x3f,0xcd,0x21, // read first two bytes
  0xb8,0x00,0x4b,0xba,0x60,0x00,0xcd,0x21, // EXEC child
  0xbb,0x05,0x00,0xb9,0x01,0x00,0xba,0x10,0x01,
  0xb4,0x3f,0xcd,0x21, // resume read on parent shared cursor
  0xb8,0x00,0x4c,0xcd,0x21
);
const childCode=Uint8Array.of(
  0xbb,0x05,0x00,0xb9,0x01,0x00,0xba,0x00,0x02,
  0xb4,0x3f,0xcd,0x21, // inherited read one byte
  0xbb,0x05,0x00,0xb4,0x3e,0xcd,0x21, // child closes own handle
  0xb8,0x00,0x4c,0xcd,0x21
);
c.load(program,0x500,0x100);c.load(childCode,0x400,0x100);
for(const [off,name] of [[0x40,'C:OPGRAPH.LZW'],[0x60,'CHILD.EXE']])
 c.memory.set(Uint8Array.from(name+'\0',x=>x.charCodeAt(0)),c.physical(0x200,off));
for(const [reg,v] of Object.entries({CS:0x500,IP:0x100,DS:0x200,ES:0x200,SS:0x500,SP:0xfffe}))
 c.set16(reg,v);
const data=Uint8Array.of(11,12,13,14,15);
bridge=installDosInt21(c,{
 getFileProcessPsp:()=>psp,
 readOriginalFile:({filename})=>filename==='C:OPGRAPH.LZW'?{bytes:data}:null,
 onFileEvent:e=>{
   assert.ok(Object.isFrozen(e));
   assert.equal(e.psp,psp);
   events.push({...e});
 },
 executeChild:req=>{
   assert.equal(req.filename,'CHILD.EXE');
   assert.equal(bridge.inheritReadOnlyFileHandles(parent,child),1);
   const saved=captureDosCpuFrame(c);
   psp=child;
   try{
     childResult=runStagedDosComChild(c,{maxSteps:32,initialFrame:{
       AX:0,CX:0,DX:0,BX:0,SP:0xfffe,BP:0,SI:0,DI:0,
       CS:0x400,DS:0x300,ES:0x300,SS:0x400,IP:0x100,FLAGS:0x202
     }});
   }finally{
     assert.equal(bridge.releaseReadOnlyFileHandles(child),0);
     psp=parent;
   }
   assert.deepEqual(captureDosCpuFrame(c),saved);
   return childResult;
 }
});
let steps=0;while(!c.terminated&&steps++<96)c.step();
assert.ok(steps<96);assert.equal(c.terminated.terminationType,0);
assert.equal(childResult.terminationType,0);
assert.deepEqual([c.read8(0x200,0x100),c.read8(0x200,0x101),c.read8(0x300,0x200),c.read8(0x200,0x110)],[11,12,13,14]);
assert.deepEqual(events.map(e=>[e.operation,e.psp,e.handle]),[
 ['open',parent,5],['read',parent,5],['read',child,5],
 ['close',child,5],['read',parent,5]
]);
assert.deepEqual(events.filter(e=>e.operation==='read').map(e=>[e.psp,e.fileOffset,e.readBytes]),[
 [parent,0,2],[child,2,1],[parent,3,1]
]);
assert.equal(bridge.releaseReadOnlyFileHandles(parent),1);
assert.throws(()=>bridge.releaseReadOnlyFileHandles(child),/unknown DOS file PSP/);
console.log('UW2 8086 DOS EXEC parent-child PSP/JFT source ownership and inherited SFT seek cursor: PASS');
