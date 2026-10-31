import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createOriginalOpl2WriteBus} from '../web/opl2-raw-write-bus.js';
import {createOriginalPitChannel0WriteBus} from '../web/pit8253-counter0-witness.js';

const cpu=new RealMode8086();
cpu.set16('CS',0x400);cpu.set16('IP',0x238);
const writes=[],loads=[];
const opl=createOriginalOpl2WriteBus({onRegisterWrite:e=>{writes.push(e);}});
cpu.registerIOPort(0x388,opl.port388);
cpu.registerIOPort(0x389,opl.port389);
assert.throws(()=>cpu.writeIOPort(0x389,8,1),/before register selection/);
assert.throws(()=>cpu.readIOPort(0x388,8),/external original hardware provider/);
cpu.writeIOPort(0x388,8,0xa0);
cpu.writeIOPort(0x389,8,0x41);
cpu.writeIOPort(0x388,8,0xb0);
cpu.writeIOPort(0x389,8,0x31);
assert.deepEqual(writes,[
 {register:0xa0,value:0x41,port:0x389,cs:0x400,ip:0x238,ordinal:0},
 {register:0xb0,value:0x31,port:0x389,cs:0x400,ip:0x238,ordinal:1}
]);
assert.equal(opl.getRegister(0xa0),0x41);
assert.equal(opl.getRegister(0xb0),0x31);
assert.equal(opl.getRegister(0x3f),null);
assert.equal(opl.getState().registerDataWrites,2);
assert.match(opl.getState().fidelity,/SOUND_TIMING_AND_STATUS_UNTESTED/);
const irqStatus=createOriginalOpl2WriteBus({readStatus:()=>0x60});
assert.equal(irqStatus.port388.in8(0x388,cpu),0x60);
assert.throws(()=>createOriginalOpl2WriteBus({readStatus:()=>Promise.resolve(0)}).port388.in8(0x388,cpu),/async/);
assert.throws(()=>createOriginalOpl2WriteBus({readStatus:()=>256}).port388.in8(0x388,cpu),/uint8/);
const refuse=createOriginalOpl2WriteBus({onRegisterWrite:()=>1});
refuse.port388.out8(0x388,0xa0,cpu);
assert.throws(()=>refuse.port389.out8(0x389,1,cpu),/cannot synthesize/);
assert.equal(refuse.getState().registerDataWrites,0);
const cap=createOriginalOpl2WriteBus({maxRegisterWrites:1});
cap.port388.out8(0x388,0x20,cpu);
cap.port389.out8(0x389,5,cpu);
assert.throws(()=>cap.port389.out8(0x389,6,cpu),/budget exhausted/);

const pit=createOriginalPitChannel0WriteBus({onReload:e=>{loads.push(e);}});
cpu.registerIOPort(0x43,pit.port43);
cpu.registerIOPort(0x40,pit.port40);
assert.throws(()=>cpu.writeIOPort(0x40,8,1),/needs captured 36h/);
assert.throws(()=>cpu.writeIOPort(0x43,8,0x34),/unsupported original PIT/);
cpu.writeIOPort(0x43,8,0x36);
cpu.writeIOPort(0x40,8,0x00);
assert.equal(pit.getState().pendingLowByte,0);
assert.equal(pit.getState().reloads,0);
cpu.writeIOPort(0x40,8,0x10);
assert.deepEqual(loads,[{
 channel:0,mode:3,access:'low-then-high',rawDivisor:4096,
 effectiveDivisor:4096,cs:0x400,ip:0x238,ordinal:0
}]);
assert.equal(pit.getState().reloads,1);
assert.equal(pit.getState().pendingLowByte,null);
assert.match(pit.getState().fidelity,/NO_SYNTHETIC_IRQ_CLOCK/);
cpu.writeIOPort(0x40,8,0);cpu.writeIOPort(0x40,8,0);
assert.equal(pit.getState().lastReload.effectiveDivisor,65536);
const asyncPit=createOriginalPitChannel0WriteBus({onReload:()=>Promise.resolve()});
asyncPit.port43.out8(0x43,0x36,cpu);
asyncPit.port40.out8(0x40,0,cpu);
assert.throws(()=>asyncPit.port40.out8(0x40,0x10,cpu),/async PIT reload/);
assert.equal(asyncPit.getState().reloads,0);
console.log('UW2 original guest YM3812 index/data write provenance and PIT channel0 mode3 4096-count raw programming: PASS');
