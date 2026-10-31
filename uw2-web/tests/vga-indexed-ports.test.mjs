import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installVgaIndexedWriteRecorder} from '../web/vga-indexed-ports.js';
const cpu=new RealMode8086(),writes=[];
const adapter=installVgaIndexedWriteRecorder(cpu,{maxWrites:4,onWrite:event=>{
 assert.ok(Object.isFrozen(event));writes.push(event);
}});
cpu.writeIOPort(0x3ce,16,0x0506);
cpu.writeIOPort(0x3c4,8,4);
cpu.writeIOPort(0x3c5,8,7);
cpu.writeIOPort(0x3d4,16,0x0e0f);
assert.deepEqual(writes,[
 {device:'graphics-controller',port:0x3ce,index:6,value:5,width:16},
 {device:'sequencer',port:0x3c4,index:4,value:7,width:8},
 {device:'color-crtc',port:0x3d4,index:15,value:14,width:16}
]);
assert.equal(adapter.writtenCount(),3);
assert.match(adapter.fidelity,/UNTESTED/);
assert.throws(()=>cpu.readIOPort(0x3ce,8),/no device adapter/);
assert.throws(()=>cpu.writeIOPort(0x3b5,8,4),/without known register selector/);
cpu.writeIOPort(0x3b4,16,0x1234);
assert.equal(adapter.writtenCount(),4);
assert.throws(()=>cpu.writeIOPort(0x3ce,16,0),/write budget exhausted/);
const collision=new RealMode8086();
collision.registerIOPort(0x3ce,{out16:()=>{}});
assert.throws(()=>installVgaIndexedWriteRecorder(collision,{onWrite:()=>{}}),/already owned/);
const malformed=new RealMode8086();
assert.throws(()=>installVgaIndexedWriteRecorder(malformed,{}),/external device recorder/);
const asyncCpu=new RealMode8086();
installVgaIndexedWriteRecorder(asyncCpu,{onWrite:()=>Promise.resolve()});
assert.throws(()=>asyncCpu.writeIOPort(0x3ce,16,0x100),/async VGA indexed/);
const fakeCpu=new RealMode8086();
installVgaIndexedWriteRecorder(fakeCpu,{onWrite:()=>1});
assert.throws(()=>fakeCpu.writeIOPort(0x3ce,16,0x100),/must not fabricate/);
console.log('UW2 original OPEN 16-bit VGA indexed register write-only transport contract: PASS');
