import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';

// Entirely SYNTHETIC I/O instruction contract. No FMDRV/OPL, game or browser.
function cpuFor(bytes,setup=()=>{}){
  const cpu=new RealMode8086();
  cpu.set16('CS',0x100);
  cpu.set16('FLAGS',0xad7);
  setup(cpu);cpu.load(Uint8Array.from(bytes),0x100,0);
  return cpu;
}
const events=[];
const device={
  in8:(port,cpu)=>{events.push(['in8',port,cpu.get16('DX')]);return 0x7f;},
  in16:(port,cpu)=>{events.push(['in16',port,cpu.get16('DX')]);return 0xbeef;},
  out8:(port,val)=>{events.push(['out8',port,val]);},
  out16:(port,val)=>{events.push(['out16',port,val]);}
};
const cases=[
  {bytes:[0xe4,0xff],width:8,read:true,port:0xff,name:'in8',expect:0x7f},
  {bytes:[0xe5,0xff],width:16,read:true,port:0xff,name:'in16',expect:0xbeef},
  {bytes:[0xe6,0xff],width:8,read:false,port:0xff,name:'out8',expect:0x34},
  {bytes:[0xe7,0xff],width:16,read:false,port:0xff,name:'out16',expect:0x1234},
  {bytes:[0xec],width:8,read:true,port:0x388,name:'in8',expect:0x7f},
  {bytes:[0xed],width:16,read:true,port:0x388,name:'in16',expect:0xbeef},
  {bytes:[0xee],width:8,read:false,port:0x388,name:'out8',expect:0x34},
  {bytes:[0xef],width:16,read:false,port:0x388,name:'out16',expect:0x1234}
];
for(const x of cases){
  events.length=0;
  const c=cpuFor(x.bytes,c=>{
    c.set16('DX',0x388);c.set16('AX',0x1234);
    c.registerIOPort(x.port,device);
  });
  c.step();
  const record=events.at(-1);
  assert.equal(record[0],x.name);
  assert.equal(record[1],x.port); // imm8 zero-extends, DX uses full port.
  assert.equal(record[2],x.read?0x388:x.expect);
  assert.equal(c.get16('FLAGS'),0xad7);
  assert.equal(c.get16('IP'),x.bytes.length);
  if(x.read)assert.equal(x.width===8?c.get8('AL'):c.get16('AX'),x.expect);
  else assert.equal(c.get16('AX'),0x1234);
}
// Absent device, missing width or invalid input MUST NOT invent data.
const noDevice=cpuFor([0xec],c=>{c.set16('DX',0x388);c.set16('AX',0x1122);});
assert.throws(()=>noDevice.step(),/IN port 388 width 8 has no device adapter: fail closed/);
assert.equal(noDevice.get16('AX'),0x1122);
assert.equal(noDevice.get16('FLAGS'),0xad7);
const wrongWidth=cpuFor([0xed],c=>{
  c.set16('DX',0x388);c.set16('AX',0x1122);
  c.registerIOPort(0x388,{in8:()=>0});
});
assert.throws(()=>wrongWidth.step(),/width 16 has no device adapter/);
assert.equal(wrongWidth.get16('AX'),0x1122);
const noWriter=cpuFor([0xee],c=>{
  c.set16('DX',0x388);c.set16('AX',0x1122);
  c.registerIOPort(0x388,{in8:()=>0});
});
assert.throws(()=>noWriter.step(),/OUT port 388 width 8 has no device adapter/);
const invalid=cpuFor([0xec],c=>{
  c.set16('DX',0x388);c.set16('AX',0x1122);
  c.registerIOPort(0x388,{in8:()=>256});
});
assert.throws(()=>invalid.step(),/invalid unsigned value/);
assert.equal(invalid.get16('AX'),0x1122);
assert.throws(()=>invalid.registerIOPort(-1,{in8:()=>0}),/uint16/);
assert.throws(()=>invalid.registerIOPort(0,{out8:'faked'}),/explicit operation callbacks/);
// Device ownership is exclusive: a second adapter cannot intercept a live
// FMDRV/VGA/PIT register or silently substitute its next IN response.
const owner=cpuFor([0xec],c=>c.set16('DX',0x388));
const first={in8:()=>0x42,out8:()=>undefined};
owner.registerIOPort(0x388,first);
assert.throws(()=>owner.registerIOPort(0x388,{in8:()=>0xff}),/already registered: fail closed/);
assert.equal(owner.readIOPort(0x388,8),0x42);
assert.doesNotThrow(()=>owner.registerIOPort(0x389,{out8:()=>undefined}));
assert.throws(()=>owner.registerIOPort(0x389,{out8:()=>undefined}),/already registered/);
// An OUT transaction returning a Promise is not allowed to continue as if
// device state were already settled. The old path silently accepted it.
for(const opcode of [0xe6,0xe7,0xee,0xef]){
  const width=opcode===0xe6||opcode===0xee?8:16;
  const c=cpuFor(opcode<0xec?[opcode,0x88]:[opcode],c=>{
    c.set16('DX',0x388);c.set16('AX',0x1234);
    c.registerIOPort(opcode<0xec?0x88:0x388,{
      [width===8?'out8':'out16']:()=>Promise.resolve(undefined)
    });
  });
  assert.throws(()=>c.step(),/async 8086 OUT device adapter: fail closed/);
  assert.equal(c.get16('AX'),0x1234);
  assert.equal(c.get16('FLAGS'),0xad7);
}
// Both 8-bit and 16-bit normal synchronous OUT remain supported.
for(const width of [8,16]){
  const c=cpuFor(width===8?[0xee]:[0xef],c=>{
    c.set16('DX',0x388);c.set16('AX',0x5678);
    c.registerIOPort(0x388,{[width===8?'out8':'out16']:()=>undefined});
  });
  assert.doesNotThrow(()=>c.step());
}
console.log('UW2 P3 8086 immediate/DX IN OUT bus-adapter synthetic regression: PASS');

// Passive, source-backed I/O bus observation: executed IN/OUT only; no
// unregistered, invalid, async or rejected device transaction is counted.
const portObserved=[];
const observed=cpuFor([0xb0,0x21,0xe6,0x88,0xe4,0x88,0xe7,0x43],c=>{
  c.set16('AX',0x1200);
  c.registerIOPort(0x88,{out8:()=>undefined,in8:()=>0x7a});
  c.registerIOPort(0x43,{out16:()=>undefined});
});
observed.installIOPortObserver((event,guest)=>{
  assert.equal(guest,observed);
  assert.ok(Object.isFrozen(event));
  portObserved.push(event);
});
assert.throws(()=>observed.installIOPortObserver(()=>{}),/one synchronous passive/);
for(let n=0;n<4;n++)observed.step();
assert.deepEqual(portObserved.map(({direction,port,width,value})=>[direction,port,width,value]),[
  ['out',0x88,8,0x21],['in',0x88,8,0x7a],['out',0x43,16,0x127a]
]);
assert.equal(portObserved[0].cs,0x100);
assert.equal(portObserved[0].ip,4); // real post-fetch CPU boundary
observed.removeIOPortObserver();
assert.doesNotThrow(()=>observed.installIOPortObserver(()=>undefined));
observed.removeIOPortObserver();
const refusedPort=cpuFor([0xee],c=>{
  c.set16('DX',0x398);
  c.registerIOPort(0x398,{out8:()=>{throw Error('device refused OUT');}});
});
let refusedCount=0;
refusedPort.installIOPortObserver(()=>{refusedCount++;});
assert.throws(()=>refusedPort.step(),/device refused OUT/);
assert.equal(refusedCount,0);
const asyncPort=cpuFor([0xee],c=>{
  c.set16('DX',0x398);
  c.registerIOPort(0x398,{out8:()=>Promise.resolve()});
});
asyncPort.installIOPortObserver(()=>{refusedCount++;});
assert.throws(()=>asyncPort.step(),/async 8086 OUT device adapter/);
assert.equal(refusedCount,0);
const observerGuard=cpuFor([0xee],c=>{
  c.set16('DX',0x398);c.registerIOPort(0x398,{out8:()=>undefined});
});
observerGuard.installIOPortObserver(()=>123);
assert.throws(()=>observerGuard.step(),/cannot synthesize device values/);
observerGuard.removeIOPortObserver();
observerGuard.installIOPortObserver(()=>Promise.resolve());
observerGuard.set16('IP',0);
assert.throws(()=>observerGuard.step(),/async 8086 I\/O port observer/);
