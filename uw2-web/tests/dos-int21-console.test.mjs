import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
const cpu=new RealMode8086(),events=[];
cpu.load(Uint8Array.of(0xcd,0x21),0,0);
let input=null;
installDosInt21(cpu,{directConsoleIO:event=>{
 events.push(event);
 return event.operation==='input'?input:undefined;
}});
const invoke=(dl,flags=0x203)=>{
 cpu.set16('IP',0);
 cpu.set16('AX',0x0600);
 cpu.set8('DL',dl);
 cpu.set16('FLAGS',flags);
 cpu.step();
};
invoke(0x41);
assert.deepEqual(events[0],{operation:'output',character:0x41});
assert.equal(cpu.get8('AL'),0x41);
assert.equal(cpu.get16('FLAGS'),0x203);
input={available:false};
invoke(0xff);
assert.equal(cpu.get8('AL'),0);
assert.equal(cpu.flag('ZF'),true);
input={available:true,character:0x0d};
invoke(0xff,0x243);
assert.equal(cpu.get8('AL'),0x0d);
assert.equal(cpu.flag('ZF'),false);
assert.deepEqual(events.slice(1),[{operation:'input'},{operation:'input'}]);

function check(handler,dl,expression){
 const c=new RealMode8086();
 c.load(Uint8Array.of(0xcd,0x21),0,0);
 c.set16('AX',0x0600);c.set8('DL',dl);
 installDosInt21(c,handler?{directConsoleIO:handler}:{});
 assert.throws(()=>c.step(),expression);
}
check(null,0x41,/external console device/);
check(()=>Promise.resolve(),0x41,/async DOS direct console/);
check(()=>0,0x41,/must not fabricate/);
check(()=>({available:'yes'}),0xff,/explicit availability/);
check(()=>({available:true,character:256}),0xff,/uint8/);
check(()=>({available:false,character:65}),0xff,/cannot carry character/);
assert.throws(()=>installDosInt21(new RealMode8086(),{directConsoleIO:true}),/synchronous DOS console boundary/);
console.log('UW2 DOS direct console AH06 character output and nonblocking input external-device regression: PASS');
