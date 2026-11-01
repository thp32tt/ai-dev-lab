import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {executeKoeiReturnGuard,nextKoeiExecutable}
 from '../web/koei-exit-flow.js';
// OFFLINE ONLY. Browser code uses pure JS guard semantics and cannot import
// this original 8086 interpreter. Verify every possible DOS status byte
// against the exact KOEI.com OR/JNZ/JZ four-byte instruction sequence.
const guards=[
 {name:'openAH',at:0x265,reg:'AH',modrm:0xe4,jcc:0x75,delta:0x16,target:0x27f},
 {name:'mainAH',at:0x26f,reg:'AH',modrm:0xe4,jcc:0x75,delta:0x0c,target:0x27f},
 {name:'mainAL',at:0x273,reg:'AL',modrm:0xc0,jcc:0x74,delta:0x0b,target:0x282}
];
for(const guard of guards){
 for(let value=0;value<256;value++){
  const cpu=new RealMode8086();
  cpu.set8(guard.reg,value);
  cpu.set16('IP',guard.at);
  cpu.load(Uint8Array.of(0x0a,guard.modrm,guard.jcc,guard.delta),0,guard.at);
  cpu.runSteps(2);
  assert.equal(executeKoeiReturnGuard(guard.name,value),
   cpu.get16('IP')===guard.target,
   'native port diverged from original 8086 at '+guard.name+' value '+value);
 }
}
assert.equal(nextKoeiExecutable('OPEN.EXE',{terminationType:0,returnCode:1}),'MAIN.EXE');
assert.equal(nextKoeiExecutable('MAIN.EXE',{terminationType:0,returnCode:1}),'END.EXE');
assert.equal(nextKoeiExecutable('MAIN.EXE',{terminationType:0,returnCode:0}),null);
console.log('UW2 768 native JavaScript KOEI return guard states == original 8086 instruction oracle: PASS');
