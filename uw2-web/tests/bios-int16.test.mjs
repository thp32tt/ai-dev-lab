import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installBiosInt16} from '../web/bios-int16.js';
const make=(checkKey,ah=1)=>{
 const cpu=new RealMode8086();
 cpu.load(Uint8Array.of(0xcd,0x16),0,0);
 cpu.set16('AX',(ah<<8)|0x40);cpu.set16('FLAGS',0x203);
 installBiosInt16(cpu,checkKey?{checkKey}:{});
 return cpu;
};
const noKey=make(()=>({available:false}));
noKey.step();
assert.equal(noKey.flag('ZF'),true);
assert.equal(noKey.get16('AX'),0x0140);
const key=make(()=>({available:true,ascii:0x61,scanCode:0x1e}));
key.step();assert.equal(key.flag('ZF'),false);assert.equal(key.get16('AX'),0x1e61);
assert.throws(()=>make().step(),/external keyboard queue/);
assert.throws(()=>make(()=>({available:true})).step(),/uint8/);
assert.throws(()=>make(()=>({available:false,ascii:1})).step(),/cannot carry a key/);
assert.throws(()=>make(()=>Promise.resolve({available:false})).step(),/async BIOS keyboard/);
assert.throws(()=>make(()=>({available:false}),0).step(),/unsupported BIOS INT16 AH=0/);
assert.throws(()=>installBiosInt16(new RealMode8086(),{checkKey:1}),/must be synchronous/);

// Explicit AH00 consumes a real supplied queue item. AH01 only peeks;
// no synthesized key, blocking scheduler or synthetic ZF side effect.
const queue=[{ascii:0x0d,scanCode:0x1c},{ascii:0,scanCode:0x48}];
const events=[];
const keyDevice=new RealMode8086();
keyDevice.load(Uint8Array.of(0xcd,0x16,0xcd,0x16,0xcd,0x16),0,0);
const installed=installBiosInt16(keyDevice,{
  checkKey:({service})=>{events.push(['peek',service]);return queue.length?
    {available:true,...queue[0]}:{available:false};},
  readKey:({service})=>{events.push(['dequeue',service]);return queue.shift();}
});
assert.deepEqual(installed.supportedServices,['INT16-AH01','INT16-AH00']);
keyDevice.set16('AX',0x0100);keyDevice.set16('FLAGS',0x207);
keyDevice.step(); // AH01 peeks the first key; queue remains intact
assert.equal(keyDevice.get16('AX'),0x1c0d);
assert.equal(queue.length,2);assert.equal(keyDevice.flag('ZF'),false);
keyDevice.set16('AX',0x0000);keyDevice.set16('FLAGS',0x2c7);
keyDevice.step(); // AH00 dequeues the same key and preserves ALL FLAGS
assert.equal(keyDevice.get16('AX'),0x1c0d);
assert.equal(keyDevice.get16('FLAGS'),0x2c7);
assert.equal(queue.length,1);
keyDevice.set16('AX',0x0000);
keyDevice.step(); // second AH00 retrieves a 00h ASCII extended scan code
assert.equal(keyDevice.get16('AX'),0x4800);assert.equal(queue.length,0);
assert.deepEqual(events,[['peek',1],['dequeue',0],['dequeue',0]]);
const read=(readKey)=>{
  const guest=new RealMode8086();
  guest.load(Uint8Array.of(0xcd,0x16),0,0);
  guest.set16('AX',0);guest.set16('FLAGS',0x2c3);
  installBiosInt16(guest,readKey?{readKey}:{});
  return guest;
};
assert.throws(()=>read().step(),/external keyboard dequeue/);
for(const bad of [()=>null,()=>({available:false}),
  ()=>({ascii:256,scanCode:1}),()=>({ascii:1,scanCode:-1}),
  ()=>Promise.resolve({ascii:1,scanCode:2})]){
  const guest=read(bad);
  assert.throws(()=>guest.step(),/available key|must be uint8|async BIOS keyboard/);
  assert.equal(guest.get16('AX'),0);
  assert.equal(guest.get16('FLAGS'),0x2c3);
}
assert.throws(()=>installBiosInt16(new RealMode8086(),{readKey:1}),/must be synchronous/);

console.log('UW2 original OPEN BIOS INT16 AH01 externally supplied keyboard queue with ZF/AX invariants: PASS');
