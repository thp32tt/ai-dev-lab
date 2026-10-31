import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
function fixture(provider){
 const cpu=new RealMode8086();
 cpu.load(Uint8Array.of(0xcd,0x21),0,0);
 cpu.set16('AX',0x3001);cpu.set16('BX',0x7777);
 cpu.set16('CX',0x9999);cpu.set16('FLAGS',0x203);
 installDosInt21(cpu,provider?{getDosVersion:provider}:{});
 return cpu;
}
let requested=null;
const cpu=fixture(({requestAL})=>{
 requested=requestAL;
 return {major:6,minor:22,oem:0xfd,serialHigh:0x12,serialLow:0xabcd};
});
cpu.step();
assert.equal(requested,1);
assert.equal(cpu.get16('AX'),0x1606);
assert.equal(cpu.get16('BX'),0xfd12);
assert.equal(cpu.get16('CX'),0xabcd);
assert.equal(cpu.get16('FLAGS'),0x203);
const absent=fixture();
assert.throws(()=>absent.step(),/external DOS-version snapshot/);
assert.equal(absent.get16('AX'),0x3001);
const missing=fixture(()=>({major:6,minor:22,oem:0}));
assert.throws(()=>missing.step(),/missing a register/);
assert.equal(missing.get16('AX'),0x3001);
const invalid=fixture(()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:65536}));
assert.throws(()=>invalid.step(),/serial low must be uint16/);
assert.equal(invalid.get16('AX'),0x3001);
const asyncCpu=fixture(()=>Promise.resolve({}));
assert.throws(()=>asyncCpu.step(),/async DOS version provider/);
assert.throws(()=>installDosInt21(new RealMode8086(),{getDosVersion:3}),/synchronous external DOS version/);
console.log('UW2 original OPEN DOS AH30 externally pinned version/OEM/serial regression: PASS');
