import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installBiosInt10} from '../web/bios-int10.js';

// Explicit synthetic BIOS video device fixture. NOT a captured original DOS
// VGA/BDA state and NOT a screen renderer. RBIL AH0F: AL mode, AH cols, BH page.
const cpu=new RealMode8086(),requests=[];
cpu.set16('CS',0x100);
cpu.load(Uint8Array.of(0xcd,0x10,0xcd,0x10),0x100,0);
cpu.set16('FLAGS',0x203);
cpu.set16('BX',0x0777); // BL must remain unchanged on AH0F.
installBiosInt10(cpu,{
  readMode:()=>({mode:3,columns:80,page:2}),
  setMode:({mode})=>{requests.push({mode});}
});
cpu.set16('AX',0x0f00);
cpu.step();
assert.equal(cpu.get16('AX'),0x5003);
assert.equal(cpu.get8('BH'),2);
assert.equal(cpu.get8('BL'),0x77);
assert.equal(cpu.get16('FLAGS'),0x203);
cpu.set16('AX',0x0012);
cpu.step();
assert.deepEqual(requests,[{mode:0x12}]);
assert.equal(cpu.get16('FLAGS'),0x203);

const absent=new RealMode8086();
absent.load(Uint8Array.of(0xcd,0x10),0,0);
installBiosInt10(absent,{});
absent.set16('AX',0x0f00);
assert.throws(()=>absent.step(),/current-mode provider absent/);

const invalid=new RealMode8086();
invalid.load(Uint8Array.of(0xcd,0x10),0,0);
invalid.set16('AX',0x0f00);invalid.set16('BX',0x1234);
installBiosInt10(invalid,{readMode:()=>({mode:3,columns:0,page:0})});
assert.throws(()=>invalid.step(),/text columns cannot be zero/);
assert.equal(invalid.get16('AX'),0x0f00);
assert.equal(invalid.get16('BX'),0x1234);

const delayed=new RealMode8086();
delayed.load(Uint8Array.of(0xcd,0x10),0,0);
delayed.set16('AX',0x0f00);
installBiosInt10(delayed,{readMode:()=>Promise.resolve({mode:3,columns:80,page:0})});
assert.throws(()=>delayed.step(),/async BIOS current-mode/);

const missingMode=new RealMode8086();
missingMode.load(Uint8Array.of(0xcd,0x10),0,0);
missingMode.set16('AX',0x0012);
installBiosInt10(missingMode,{readMode:()=>({mode:3,columns:80,page:0})});
assert.throws(()=>missingMode.step(),/video set-mode device absent/);

const badReturn=new RealMode8086();
badReturn.load(Uint8Array.of(0xcd,0x10),0,0);
badReturn.set16('AX',0x0012);
installBiosInt10(badReturn,{setMode:()=>0});
assert.throws(()=>badReturn.step(),/cannot supply unproven return value/);

console.log('UW2 original KOEI BIOS INT10 AH0F/AH00 strict external video state regression: PASS');
