import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';

const cpu=new RealMode8086(),events=[];
cpu.load(Uint8Array.of(0xcd,0x21),0,0);
cpu.set16('DS',0x400);cpu.set16('DX',0xfffd);
cpu.write8(0x400,0xfffd,0xb0);
cpu.write8(0x400,0xfffe,0xc8);
cpu.write8(0x400,0xffff,0x21);
cpu.write8(0x400,0x0000,0x24); // segment-wrapped '$'
cpu.set16('AX',0x0900);
installDosInt21(cpu,{directConsoleIO:e=>events.push({
 operation:e.operation,bytes:Uint8Array.from(e.bytes),segment:e.segment,offset:e.offset
})&&undefined});
cpu.step();
assert.equal(events.length,1);
assert.deepEqual(events[0],{operation:'string-output',
 segment:0x400,offset:0xfffd,bytes:Uint8Array.of(0xb0,0xc8,0x21)});
assert.equal(cpu.get8('AL'),0x24);
assert.equal(cpu.get8('AH'),0x09);
assert.equal(cpu.read8(0x400,0xfffd),0xb0);
const absent=new RealMode8086();
absent.load(Uint8Array.of(0xcd,0x21),0,0);
absent.set16('AX',0x0900);
installDosInt21(absent);
assert.throws(()=>absent.step(),/AH09 requires an external console/);
const noTerm=new RealMode8086();
noTerm.memory.fill(0x41,0x5000,0x15000);
noTerm.load(Uint8Array.of(0xcd,0x21),0,0);
noTerm.set16('AX',0x0900);noTerm.set16('DS',0x500);noTerm.set16('DX',0);
installDosInt21(noTerm,{directConsoleIO:()=>{throw new Error('should not run');}});
assert.throws(()=>noTerm.step(),/missing \$ terminator/);
const extra=new RealMode8086();
extra.load(Uint8Array.of(0xcd,0x21),0,0);
extra.write8(0x300,0x80,0x24);
extra.set16('DS',0x300);extra.set16('DX',0x80);extra.set16('AX',0x0900);
installDosInt21(extra,{directConsoleIO:()=>1});
assert.throws(()=>extra.step(),/must not synthesize status/);
console.log('UW2 DOS AH09 original-byte string output and segment-wrap/terminator guards: PASS');
