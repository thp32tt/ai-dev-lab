import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installVgaDacWriteRecorder} from '../web/vga-dac-ports.js';
const cpu=new RealMode8086(),colors=[];
const adapter=installVgaDacWriteRecorder(cpu,{
 onColor:e=>{colors.push(e);},allowKnownReadback:true,maxColors:4,maxReads:7
});
assert.throws(()=>cpu.readIOPort(0x3c9,8),/completed, observed/);
cpu.writeIOPort(0x3c7,8,3);
assert.throws(()=>cpu.readIOPort(0x3c9,8),/completed, observed/);
cpu.writeIOPort(0x3c8,8,3);
for(const byte of [12,13,14,20,21,22])cpu.writeIOPort(0x3c9,8,byte);
assert.equal(colors.length,2);
cpu.writeIOPort(0x3c7,8,3);
assert.deepEqual([cpu.readIOPort(0x3c9,8),cpu.readIOPort(0x3c9,8),
  cpu.readIOPort(0x3c9,8),cpu.readIOPort(0x3c9,8)],[12,13,14,20]);
cpu.set16('DX',0x3c9);
cpu.load(Uint8Array.of(0xec),0x100,0);cpu.set16('CS',0x100);
cpu.step();assert.equal(cpu.get8('AL'),21);
assert.equal(cpu.readIOPort(0x3c9,8),22);
assert.equal(adapter.knownReadCount(),6);
assert.throws(()=>cpu.readIOPort(0x3c9,8),/completed, observed/);
cpu.writeIOPort(0x3c7,8,3);
assert.equal(cpu.readIOPort(0x3c9,8),12);
assert.throws(()=>cpu.readIOPort(0x3c9,8),/readback budget/);
cpu.writeIOPort(0x3c8,8,3);
cpu.writeIOPort(0x3c9,8,1); // previously known color now incomplete
cpu.writeIOPort(0x3c7,8,3);
assert.throws(()=>cpu.readIOPort(0x3c9,8),/completed, observed/);
const wrap=new RealMode8086();
installVgaDacWriteRecorder(wrap,{allowKnownReadback:true,onColor:()=>{}});
wrap.writeIOPort(0x3c8,8,255);
for(const byte of [1,2,3,4,5,6])wrap.writeIOPort(0x3c9,8,byte);
wrap.writeIOPort(0x3c7,8,255);
assert.deepEqual(Array.from({length:6},()=>wrap.readIOPort(0x3c9,8)),
 [1,2,3,4,5,6]);
const high=new RealMode8086();
installVgaDacWriteRecorder(high,{allowKnownReadback:true,onColor:()=>{}});
high.writeIOPort(0x3c8,8,1);
for(const byte of [64,1,2])high.writeIOPort(0x3c9,8,byte);
high.writeIOPort(0x3c7,8,1);
assert.throws(()=>high.readIOPort(0x3c9,8),/high-bit/);
const unknown=new RealMode8086();
installVgaDacWriteRecorder(unknown,{allowKnownReadback:true,onColor:()=>{}});
unknown.writeIOPort(0x3c7,8,17);
assert.throws(()=>unknown.readIOPort(0x3c9,8),/completed, observed/);
assert.throws(()=>unknown.readIOPort(0x3c7,8),/no device adapter/);
const collision=new RealMode8086();
collision.registerIOPort(0x3c7,{out8:()=>{}});
assert.throws(()=>installVgaDacWriteRecorder(collision,{
 allowKnownReadback:true,onColor:()=>{}}),/already owned/);
assert.throws(()=>installVgaDacWriteRecorder(new RealMode8086(),{
 allowKnownReadback:1,onColor:()=>{}}),/boolean/);
assert.throws(()=>installVgaDacWriteRecorder(new RealMode8086(),{
 allowKnownReadback:true,maxReads:0,onColor:()=>{}}),/bounded/);
console.log('UW2 observed VGA DAC 3C7/3C9 6-bit palette IN stream: PASS (synthetic)');
