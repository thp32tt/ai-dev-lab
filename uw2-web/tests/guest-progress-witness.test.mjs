import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createGuestProgressWitness} from '../web/guest-progress-witness.js';
// Genuine 8086 MOV AL,imm / MOV [DS:0100],AL; same-byte write must not
// be incorrectly promoted to proof that the guest memory changed.
const cpu=new RealMode8086();
cpu.load(Uint8Array.of(
  0xb0,1,0xa2,0,1,0xb0,1,0xa2,0,1,0xb0,2,0xa2,0,1,
  0xb0,3,0xa2,1,1
),0x200,0);
cpu.set16('CS',0x200);cpu.set16('DS',0x200);
const witness=createGuestProgressWitness({stepsPerWindow:2,maxWindows:3,
  maxAddressesPerWindow:1});
cpu.installMemoryWriteObserver(witness.observeMemoryWrite);
for(let steps=0;steps<8;steps++){
  witness.observeInstruction({steps,cs:cpu.get16('CS'),ip:cpu.get16('IP')},cpu);
  if(steps===3)witness.observeFileEvent({operation:'read',readBytes:17,
    filename:'NOT_RECORDED.DAT'});
  cpu.step();
}
const result=witness.summarize();
assert.equal(result.instructionBoundaries,8);
assert.equal(result.writeEvents,4);
assert.equal(result.changedWrites,3);
assert.equal(result.ramWrites,4);
assert.equal(result.vgaApertureWrites,0);
assert.equal(result.fileEvents,1);
assert.equal(result.fileReadBytes,17);
assert.equal(result.uniqueAddressOverflows,0);
assert.equal(result.discardedWindows,1);
assert.deepEqual(result.windows.map(x=>x.firstStep),[2,4,6]);
assert.deepEqual(result.windows.map(x=>x.writeEvents),[1,1,1]);
assert.ok(!JSON.stringify(result).includes('NOT_RECORDED'));
assert.equal(cpu.read8(0x200,0x100),2);
assert.equal(cpu.read8(0x200,0x101),3);
assert.ok(Object.isFrozen(result.windows[0]));
assert.throws(()=>witness.observeInstruction({steps:7,cs:0x200,ip:19},cpu),
  /monotonically/);
assert.throws(()=>createGuestProgressWitness({stepsPerWindow:0}),/window size/);
assert.throws(()=>createGuestProgressWitness({maxWindows:0}),/window count/);
assert.throws(()=>createGuestProgressWitness({maxAddressesPerWindow:0}),/capacity/);
const guard=createGuestProgressWitness();
const cpu2=new RealMode8086();
assert.throws(()=>guard.observeMemoryWrite({physical:0,value:1,previous:0},cpu2),
  /active witnessed instruction/);
assert.throws(()=>guard.observeFileEvent({operation:'read',readBytes:0}),
  /active witnessed instruction/);
guard.observeInstruction({steps:0,cs:0,ip:0},cpu2);
assert.throws(()=>guard.observeFileEvent({operation:'read',readBytes:70000}),
  /bounded integer/);
assert.throws(()=>guard.observeMemoryWrite({physical:0,value:1,previous:0,
  segment:0x20,offset:0},cpu2),/provenance mismatch/);
guard.observeMemoryWrite({physical:0xa0000,value:1,previous:0,
  segment:0xa000,offset:0},cpu2);
guard.observeMemoryWrite({physical:0xc0000,value:1,previous:0,
  segment:0xc000,offset:0},cpu2);
assert.equal(guard.summarize().vgaApertureWrites,1);
assert.equal(guard.summarize().upperMemoryWrites,1);
const overflow=createGuestProgressWitness({maxAddressesPerWindow:1});
overflow.observeInstruction({steps:0,cs:0,ip:0},cpu2);
for(const p of [0,1,2])overflow.observeMemoryWrite({
  physical:p,segment:0,offset:p,value:1,previous:0
},cpu2);
assert.equal(overflow.summarize().uniqueAddressOverflows,2);
assert.equal(overflow.summarize().windows[0].uniquePhysicalAddresses,1);
console.log('UW2 original guest CPU write and DOS file progress bounded evidence: PASS');
