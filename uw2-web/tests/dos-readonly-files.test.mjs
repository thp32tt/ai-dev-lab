import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';

// SYNTHETIC INT 21h fixture only: original DOS file layout/runtime UNTESTED.
const c=new RealMode8086();
c.set16('CS',0x100);c.set16('DS',0x300);
const path=Uint8Array.from(Buffer.from('OPEN.EXE\0','latin1'));
c.memory.set(path,c.physical(0x300,0x40));
const requested=[];
const raw=Uint8Array.of(1,2,3,4,5,6);
installDosInt21(c,{readOriginalFile:({raw:bytes,filename})=>{
  requested.push({bytes:Uint8Array.from(bytes),filename});
  return filename==='OPEN.EXE'?{bytes:raw}:null;
}});
c.load(Uint8Array.of(0xcd,0x21),0x100,0);
const invoke=(ah,al=0)=>{
  c.set16('AX',(ah<<8)|al);c.set16('IP',0);c.step();
};
c.set16('DX',0x40);invoke(0x3d);
assert.equal(c.flag('CF'),false);
const handle=c.get16('AX');assert.equal(handle,5);
assert.equal(requested[0].filename,'OPEN.EXE');
assert.deepEqual([...requested[0].bytes],[...path.subarray(0,-1)]);
raw.fill(0xff); // Supply snapshot, not a live mutable pointer.
c.set16('BX',handle);c.set16('CX',4);c.set16('DX',0xfffc);
invoke(0x3f);
assert.equal(c.get16('AX'),4);
assert.equal(c.read8(0x300,0xfffc),1);
assert.equal(c.read8(0x300,0xffff),4);
c.set16('BX',handle);c.set16('CX',2);c.set16('DX',0x60);
invoke(0x3f);
assert.equal(c.get16('AX'),2);
assert.equal(c.read8(0x300,0x60),5);
assert.equal(c.read8(0x300,0x61),6);
c.set16('BX',handle);c.set16('CX',2);c.set16('DX',0x60);
invoke(0x3f);
assert.equal(c.get16('AX'),0); // EOF
c.set16('BX',handle);c.set16('CX',0xffff);c.set16('DX',0xfffe);
invoke(0x42,2); // seek end-2, absolute 4
assert.equal(c.flag('CF'),false);assert.equal(c.get16('DX'),0);
assert.equal(c.get16('AX'),4);
c.set16('BX',handle);c.set16('CX',0);c.set16('DX',0);
invoke(0x42,0);assert.equal(c.get16('AX'),0);
c.set16('BX',handle);c.set16('CX',0xffff);c.set16('DX',0xffff);
invoke(0x42,0);assert.equal(c.flag('CF'),true);
assert.equal(c.get16('AX'),1); // cannot seek before beginning
c.set16('BX',handle);c.set16('CX',1);c.set16('DX',0x62);
invoke(0x3f);assert.equal(c.read8(0x300,0x62),1); // failed seek left cursor at zero
c.set16('BX',handle);invoke(0x3e);
assert.equal(c.flag('CF'),false);
c.set16('BX',handle);c.set16('CX',1);c.set16('DX',0x62);
invoke(0x3f);assert.equal(c.flag('CF'),true);assert.equal(c.get16('AX'),6);
c.set16('DX',0x40);invoke(0x3d);
assert.equal(c.get16('AX'),5); // release/reuse DOS handle
c.set16('BX',5);c.set16('CX',2);c.set16('DX',0xffff);
assert.throws(()=>invoke(0x3f),/crosses 16-bit segment boundary/);
assert.equal(c.get16('DX'),0xffff);
c.set16('BX',5);c.set16('CX',0);c.set16('DX',0x20);
invoke(0x3f);assert.equal(c.get16('AX'),0); // zero-size read
c.set16('DX',0x40);
assert.throws(()=>invoke(0x3d,1),/other than read-only/);
assert.throws(()=>invoke(0x30),/unsupported DOS INT 21h AH=30/);
c.set16('DX',0x80);c.write8(0x300,0x80,0x58);c.write8(0x300,0x81,0);
invoke(0x3d);assert.equal(c.flag('CF'),true);assert.equal(c.get16('AX'),2);
const unsupported=new RealMode8086();
unsupported.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(unsupported);
unsupported.set16('AX',0x3d00);
assert.throws(()=>unsupported.step(),/unsupported DOS INT 21h/);
const asyncFile=new RealMode8086();
asyncFile.set16('DS',0x200);asyncFile.set16('DX',0x20);
asyncFile.write8(0x200,0x20,65);asyncFile.write8(0x200,0x21,0);
asyncFile.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(asyncFile,{readOriginalFile:()=>Promise.resolve({bytes:new Uint8Array()})});
asyncFile.set16('AX',0x3d00);
assert.throws(()=>asyncFile.step(),/async DOS original file resolver/);
console.log('UW2 P3 read-only original-byte DOS 3D/3F/42/3E synthetic regression: PASS');
