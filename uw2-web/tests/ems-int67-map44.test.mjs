import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installExplicitEms44,EMS44_STATUS,
 EMS44_PAGE_BYTES,EMS44_FRAME_SLOTS} from '../web/ems-int67-map44.js';
assert.equal(EMS44_PAGE_BYTES,16384);
assert.equal(EMS44_FRAME_SLOTS,4);
const cpu=new RealMode8086();
const pages=Array.from({length:3},(_,i)=>Uint8Array.from(
 {length:EMS44_PAGE_BYTES},(_,p)=>(i*31+p)%256));
const source=pages.map(p=>p.slice());
assert.throws(()=>installExplicitEms44(cpu,{handle:1,
 frameSegment:0x9000,pages:[new Uint8Array(200)]}),/explicit/);
const device=installExplicitEms44(cpu,{handle:0x1234,
 frameSegment:0x9000,pages});
assert.throws(()=>installExplicitEms44(cpu,{
 handle:0x1234,frameSegment:0x9000,pages}),/already owned/);
const call=(physical,logical,handle=0x1234,ah=0x44)=>{
 cpu.set16('CS',0x200);cpu.set16('IP',0x100);
 cpu.load(Uint8Array.of(0xcd,0x67),0x200,0x100);
 cpu.set16('AX',(ah<<8)|physical);
 cpu.set16('BX',logical);cpu.set16('DX',handle);
 const sp=cpu.get16('SP');
 cpu.step();
 assert.equal(cpu.get16('CS'),0x200);
 assert.equal(cpu.get16('IP'),0x102);
 assert.equal(cpu.get16('SP'),sp);
 return cpu.get8('AH');
};
assert.equal(call(2,0),0);
const phys=0x90000+2*EMS44_PAGE_BYTES;
assert.deepEqual(cpu.memory.slice(phys,phys+128),source[0].slice(0,128));
cpu.memory[phys+23]=0x77;
assert.equal(call(2,1),0);
assert.equal(device.pageCopy(0)[23],0x77);
assert.deepEqual(cpu.memory.slice(phys,phys+128),source[1].slice(0,128));
assert.equal(call(2,0),0);
assert.equal(cpu.memory[phys+23],0x77);
assert.equal(call(0,2),0);
assert.equal(cpu.memory[0x90000+7],source[2][7]);
assert.equal(call(4,1),EMS44_STATUS.INVALID_PHYSICAL_PAGE);
assert.equal(call(2,99),EMS44_STATUS.INVALID_LOGICAL_PAGE);
assert.equal(call(2,1,0x7777),EMS44_STATUS.INVALID_HANDLE);
assert.equal(cpu.memory[phys+23],0x77);
assert.throws(()=>call(1,0),/EMS alias/);
assert.throws(()=>call(0,0,0x1234,0x40),/unimplemented INT 67h EMS function/);
assert.equal(call(2,0xffff),0);
assert.equal(device.snapshot().physicalToLogical[2],null);
assert.ok(cpu.memory.slice(phys,phys+EMS44_PAGE_BYTES).every(v=>v===0));
assert.equal(device.pageCopy(0)[23],0x77);
assert.equal(device.events().filter(x=>x.status!==0).length,3);
device.close();
assert.throws(()=>device.close(),/already closed/);
assert.throws(()=>call(0,0),/no installed vector/);
for(let i=0;i<pages.length;i++)assert.deepEqual(pages[i],source[i]);
console.log('explicit LIM EMS INT 67h AH44 four-slot 16-KiB bank switching, invalid status, backing persistence, no DOS fallback PASS');
