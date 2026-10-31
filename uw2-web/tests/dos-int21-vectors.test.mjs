import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';

// SYNTHETIC DOS status probe; original Korean KOEI.COM uses AX=2524h
// to set INT24h, then AX=3565h to read INT65h from the DOS IVT.
// No missing initial DOS/BIOS vector is ever manufactured.
const cpu=new RealMode8086();
cpu.set16('CS',0x200);cpu.set16('DS',0x220);cpu.set16('DX',0x04ab);
cpu.load(Uint8Array.of(0xcd,0x21),0x200,0);
installDosInt21(cpu);
const invoke=(ax)=>{
 cpu.set16('IP',0);
 cpu.set16('AX',ax);
 cpu.step();
};
cpu.set16('FLAGS',0x203);
invoke(0x2524);
assert.equal(cpu.get16('FLAGS'),0x203);
assert.equal(cpu.get16('AX'),0x2524);
assert.equal(cpu.read16(0,0x24*4),0x04ab);
assert.equal(cpu.read16(0,0x24*4+2),0x220);
assert.deepEqual(cpu.getGuestInterruptVector(0x24),{segment:0x220,offset:0x04ab});
invoke(0x3524);
assert.equal(cpu.get16('ES'),0x220);
assert.equal(cpu.get16('BX'),0x04ab);
assert.equal(cpu.get16('FLAGS'),0x203);
assert.equal(cpu.get16('AX'),0x3524);
// Original KOEI probes INT 65h: unknown DOS snapshot must be blocked.
assert.throws(()=>invoke(0x3565),/unknown initial DOS interrupt vector/);
assert.equal(cpu.get16('ES'),0x220);assert.equal(cpu.get16('BX'),0x04ab);
cpu.set16('DS',0x240);cpu.set16('DX',0x4321);
invoke(0x2524); // DOS can replace the installed guest pointer.
invoke(0x3524);
assert.equal(cpu.get16('ES'),0x240);
assert.equal(cpu.get16('BX'),0x4321);
cpu.setGuestInterruptVector(0x65,0x1111,0x0222); // explicitly supplied external snapshot only
invoke(0x3565);
assert.equal(cpu.get16('ES'),0x1111);
assert.equal(cpu.get16('BX'),0x0222);

const protectedCpu=new RealMode8086();
protectedCpu.installInterruptAdapter(0x24,()=>{});
protectedCpu.set16('AX',0x2524);
protectedCpu.set16('DS',0x200);
protectedCpu.set16('DX',0x100);
protectedCpu.load(Uint8Array.of(0xcd,0x21),0,0);
installDosInt21(protectedCpu);
assert.throws(()=>protectedCpu.step(),/cannot overwrite a host adapter/);
assert.throws(()=>cpu.setGuestInterruptVector(256,0,0),/uint8/);
assert.throws(()=>cpu.getGuestInterruptVector(256),/uint8/);
assert.throws(()=>cpu.setGuestInterruptVector(0x20,0x10000,0),/uint16/);
console.log('UW2 original KOEI DOS AH25/AH35 guest IVT synthetic regression: PASS');
