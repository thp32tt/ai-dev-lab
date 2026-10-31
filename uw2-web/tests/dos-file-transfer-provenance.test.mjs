import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
const make=(onFileEvent,extra={})=>{
 const cpu=new RealMode8086();
 cpu.set16('CS',0x100);cpu.set16('DS',0x300);
 cpu.load(Uint8Array.of(0xcd,0x21),0x100,0);
 const path=Uint8Array.from('C:OPGRAPH.LZW\0',x=>x.charCodeAt(0));
 cpu.memory.set(path,cpu.physical(0x300,0x40));
 installDosInt21(cpu,{
  readOriginalFile:()=>({bytes:Uint8Array.from([1,2,3,4,5,6,7,8,9])}),
  onFileEvent,...extra
 });
 const call=(ah,{al=0,bx=0,cx=0,dx=0x40}={})=>{
  cpu.set16('AX',(ah<<8)|al);cpu.set16('BX',bx);
  cpu.set16('CX',cx);cpu.set16('DX',dx);cpu.set16('IP',0);
  cpu.step();return cpu;
 };
 return {cpu,call};
};
const events=[];
const {cpu,call}=make((e,guest)=>{
 assert.ok(Object.isFrozen(e));
 if(e.operation==='read')assert.equal(
  guest.read8(e.segment,e.offset),3);
 events.push({...e});
});
call(0x3d);
assert.equal(cpu.get16('AX'),5);
call(0x42,{bx:5,al:0,dx:2});
assert.equal(cpu.get16('AX'),2);
call(0x3f,{bx:5,cx:4,dx:0x100});
assert.equal(cpu.get16('AX'),4);
assert.deepEqual(Array.from(cpu.memory.slice(cpu.physical(0x300,0x100),
 cpu.physical(0x300,0x104))),[3,4,5,6]);
call(0x3e,{bx:5});
assert.deepEqual(events,[
 {operation:'open',filename:'C:OPGRAPH.LZW',handle:5,fileBytes:9},
 {operation:'seek',filename:'C:OPGRAPH.LZW',handle:5,
  previousPosition:0,position:2,origin:0,displacement:2},
 {operation:'read',filename:'C:OPGRAPH.LZW',handle:5,
  fileOffset:2,requested:4,readBytes:4,segment:0x300,offset:0x100,
  physical:0x3100},
 {operation:'close',filename:'C:OPGRAPH.LZW',handle:5,position:6}
]);
const rejected=make(()=>true);
assert.throws(()=>rejected.call(0x3d),/must not fabricate file status/);
const asyncSource=make(()=>Promise.resolve());
assert.throws(()=>asyncSource.call(0x3d),/async DOS file event observer/);
assert.throws(()=>installDosInt21(new RealMode8086(),{
 readOriginalFile:()=>null,onFileEvent:3
}),/file event observer must be synchronous/);
console.log('UW2 DOS original 3D/42/3F/3E multi-read transfer source/guest-memory audit event regression: PASS');
