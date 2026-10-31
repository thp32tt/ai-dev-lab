import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
const make=(handler)=>{
 const cpu=new RealMode8086();
 cpu.load(Uint8Array.of(0xcd,0x21),0,0);
 cpu.set16('AX',0x19a5);cpu.set16('BX',0x8888);cpu.set16('FLAGS',0x203);
 installDosInt21(cpu,handler?{getCurrentDrive:handler}:{});
 return cpu;
};
let calls=0;
const c=make(({service})=>{calls++;assert.equal(service,0x19);return {drive:2};});
c.step();
assert.equal(calls,1);assert.equal(c.get16('AX'),0x1902);
assert.equal(c.get16('BX'),0x8888);assert.equal(c.get16('FLAGS'),0x203);
const absent=make();
assert.throws(()=>absent.step(),/external current-drive snapshot/);
assert.equal(absent.get16('AX'),0x19a5);
for(const result of [null,{drive:-1},{drive:26},{drive:2.5},{drive:'C'},3]){
 const bad=make(()=>result);
 assert.throws(()=>bad.step(),/drive must be an explicit/);
 assert.equal(bad.get16('AX'),0x19a5);
}
assert.throws(()=>make(()=>Promise.resolve({drive:2})).step(),/async DOS current-drive/);
assert.throws(()=>installDosInt21(new RealMode8086(),{getCurrentDrive:2}),/synchronous external DOS drive/);
console.log('UW2 original OPEN DOS AH19 current drive device snapshot and fail-closed regression: PASS');
