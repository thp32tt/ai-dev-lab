import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installVgaIndexedWriteRecorder} from '../web/vga-indexed-ports.js';
const cpu=new RealMode8086();
const events=[];
const recorded=installVgaIndexedWriteRecorder(cpu,{
 maxWrites:8,maxReads:3,allowKnownReadback:true,onWrite:e=>{events.push(e);}
});
assert.throws(()=>cpu.readIOPort(0x3cf,8),/previously written/);
cpu.writeIOPort(0x3ce,8,6);
assert.throws(()=>cpu.readIOPort(0x3cf,8),/previously written/);
cpu.writeIOPort(0x3cf,8,5);
assert.equal(cpu.readIOPort(0x3cf,8),5);
cpu.writeIOPort(0x3ce,16,0x0205);
cpu.set16('DX',0x3cf);
cpu.load(Uint8Array.of(0xec),0x100,0); // original 8086 IN AL, DX
cpu.set16('CS',0x100);
cpu.step();
assert.equal(cpu.get8('AL'),2);
assert.equal(recorded.knownReadCount(),2);
cpu.writeIOPort(0x3ce,8,6);
assert.equal(cpu.readIOPort(0x3cf,8),5);
assert.throws(()=>cpu.readIOPort(0x3cf,8),/readback budget/);
assert.equal(recorded.writtenCount(),2);
assert.equal(events.length,2);
assert.throws(()=>cpu.readIOPort(0x3c5,8),/previously written/);
assert.throws(()=>cpu.readIOPort(0x3d5,8),/no device adapter/);
const seq=new RealMode8086();
const trace=installVgaIndexedWriteRecorder(seq,{allowKnownReadback:true,onWrite:()=>{},maxReads:2,maxWrites:3});
seq.writeIOPort(0x3c4,16,0x0f02);
assert.equal(seq.readIOPort(0x3c5,8),15);
seq.writeIOPort(0x3c4,8,4);
assert.throws(()=>seq.readIOPort(0x3c5,8),/previously written/);
seq.writeIOPort(0x3c5,8,6);
assert.equal(seq.readIOPort(0x3c5,8),6);
assert.equal(trace.knownReadCount(),2);
const rejects=new RealMode8086();
assert.throws(()=>installVgaIndexedWriteRecorder(rejects,{
 onWrite:()=>{},allowKnownReadback:1}),/boolean/);
assert.throws(()=>installVgaIndexedWriteRecorder(rejects,{
 onWrite:()=>{},allowKnownReadback:true,maxReads:0}),/bounded/);
const errorCpu=new RealMode8086();
installVgaIndexedWriteRecorder(errorCpu,{
 allowKnownReadback:true,onWrite:()=>{throw Error('device refused output');}
});
assert.throws(()=>errorCpu.writeIOPort(0x3ce,16,0x0506),/device refused/);
assert.throws(()=>errorCpu.readIOPort(0x3cf,8),/previously written/);
const absent=new RealMode8086();
installVgaIndexedWriteRecorder(absent,{allowKnownReadback:true,onWrite:()=>{}});
absent.writeIOPort(0x3ce,16,0x3333);
assert.throws(()=>absent.readIOPort(0x3cf,8),/previously written/);
console.log('UW2 original VGA GC/SEQ indexed register known-write IN readback: PASS (synthetic)');
