import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installBiosInt10} from '../web/bios-int10.js';
const cpu=new RealMode8086(),events=[];
cpu.load(Uint8Array.of(0xcd,0x10),0,0);
cpu.set16('AX',0x1000);cpu.set16('BX',0x0f12);cpu.set16('FLAGS',0x203);
installBiosInt10(cpu,{setPaletteRegister:entry=>{
 assert.ok(Object.isFrozen(entry));events.push({...entry});
}});
cpu.step();
assert.deepEqual(events,[{index:0x12,value:0x0f}]);
assert.equal(cpu.get16('BX'),0x0f12);
assert.equal(cpu.get16('AX'),0x1000);
assert.equal(cpu.get16('FLAGS'),0x203);
const make=(opts,ax=0x1000)=>{
 const c=new RealMode8086();
 c.load(Uint8Array.of(0xcd,0x10),0,0);c.set16('AX',ax);
 installBiosInt10(c,opts);return c;
};
assert.throws(()=>make({}).step(),/palette register sink absent/);
assert.throws(()=>make({setPaletteRegister:()=>{}},0x1010).step(),/unsupported BIOS INT10 AH10/);
assert.throws(()=>make({setPaletteRegister:()=>Promise.resolve()}).step(),/async BIOS palette/);
assert.throws(()=>make({setPaletteRegister:()=>1}).step(),/must not fabricate register values/);
assert.throws(()=>installBiosInt10(new RealMode8086(),{setPaletteRegister:3}),/synchronous device sink/);
console.log('UW2 original OPEN BIOS INT10 AX1000 palette sink exact indexed registers regression: PASS');
