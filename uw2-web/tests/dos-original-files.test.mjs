import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {preparePinnedOriginalDosFiles} from '../web/dos-original-files.js';

// Only synthetic source bytes. No copyrighted original or DOS runtime executed.
const source=Uint8Array.of(0x11,0x22,0x33);
const hash=b=>createHash('sha256').update(b).digest('hex');
const item={name:'OPEN.EXE',bytes:source,expectedSha256:hash(source),expectedSize:3};
const verified=await preparePinnedOriginalDosFiles([item]);
assert.match(verified.fidelity,/UNTESTED/);
assert.deepEqual(verified.verified,[{name:'OPEN.EXE',size:3,sha256:hash(source)}]);
const raw=name=>Uint8Array.from(Buffer.from(name,'latin1'));
assert.deepEqual([...verified.readOriginalFile({raw:raw('open.exe')}).bytes],[0x11,0x22,0x33]);
assert.equal(verified.readOriginalFile({raw:raw('MISSING.DAT')}),null);
assert.equal(verified.readOriginalFile({raw:raw('../OPEN.EXE')}),null);
assert.equal(verified.readOriginalFile({raw:Uint8Array.of(0xff,0x41)}),null);
source.fill(0); // Snapshot, not caller's mutable input.
assert.deepEqual([...verified.readOriginalFile({raw:raw('OPEN.EXE')}).bytes],[0x11,0x22,0x33]);
const cpu=new RealMode8086();
cpu.set16('CS',0x100);cpu.set16('DS',0x300);
cpu.memory.set(raw('OPEN.EXE\0'),cpu.physical(0x300,0x40));
cpu.load(Uint8Array.of(0xcd,0x21),0x100,0);
installDosInt21(cpu,{readOriginalFile:verified.readOriginalFile});
cpu.set16('AX',0x3d00);cpu.set16('DX',0x40);cpu.step();
assert.equal(cpu.flag('CF'),false);assert.equal(cpu.get16('AX'),5);
cpu.set16('AX',0x3f00);cpu.set16('BX',5);cpu.set16('CX',3);
cpu.set16('DX',0x60);cpu.set16('IP',0);cpu.step();
assert.equal(cpu.get16('AX'),3);
assert.deepEqual([...cpu.memory.subarray(cpu.physical(0x300,0x60),cpu.physical(0x300,0x60)+3)],[0x11,0x22,0x33]);
const rejects=async (entry,expression)=>
  assert.rejects(preparePinnedOriginalDosFiles([entry]),expression);
await rejects({...item,expectedSha256:'0'.repeat(64)},/SHA-256 mismatch/);
await rejects({...item,expectedSize:4},/size mismatch/);
await rejects({...item,name:'../../A'},/8.3 basename/);
await rejects({...item,expectedSha256:'invalid'},/must be pinned/);
await assert.rejects(preparePinnedOriginalDosFiles([item,{...item,name:'open.exe'}]),/duplicate/);
await assert.rejects(preparePinnedOriginalDosFiles([]),/inventory required/);
console.log('UW2 P3 SHA-pinned original DOS resolver -> synchronous INT21 synthetic regression: PASS');
