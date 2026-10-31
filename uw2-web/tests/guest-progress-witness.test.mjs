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

// Actual guest machine-code port transactions across OPL, VGA, PIT and a
// generic port, without capturing original output bytes or device state.
const io=new RealMode8086();
const program=Uint8Array.of(
  0xba,0x88,0x03,0xb0,0x20,0xee, // OPL address OUT 388h
  0xba,0x89,0x03,0xee,           // OPL data OUT 389h
  0xba,0xc0,0x03,0xee,           // VGA attribute OUT 3c0h
  0xba,0x43,0x00,0xee,           // PIT command OUT 43h
  0xba,0x99,0x00,0xee,0xec       // other OUT 99h, IN 99h
);
io.load(program,0x310,0);
io.set16('CS',0x310);
for(const port of [0x388,0x389,0x3c0,0x43,0x99])
  io.registerIOPort(port,{out8:()=>undefined,...(port===0x99?{in8:()=>0x5a}:{})});
const ioWitness=createGuestProgressWitness({stepsPerWindow:100,maxIOPortsPerWindow:4});
io.installIOPortObserver(ioWitness.observePortIO);
let ioSteps=0;
while(io.get16('IP')<program.length){
  ioWitness.observeInstruction({steps:ioSteps++,
    cs:io.get16('CS'),ip:io.get16('IP')},io);
  io.step();
}
const ioReport=ioWitness.summarize();
assert.equal(ioReport.ioWriteEvents,5);
assert.equal(ioReport.ioReadEvents,1);
assert.equal(ioReport.oplPortWrites,2);
assert.equal(ioReport.vgaPortWrites,1);
assert.equal(ioReport.pitPortWrites,1);
assert.equal(ioReport.otherPortWrites,1);
assert.equal(ioReport.windows[0].uniqueIOPorts,4);
assert.equal(ioReport.uniqueIOPortOverflows,2);
assert.equal(ioReport.windows[0].ioWriteEvents,5);
assert.equal(io.get8('AL'),0x5a);
assert.ok(!JSON.stringify(ioReport).includes('"value"'));
assert.ok(Object.isFrozen(ioReport.windows[0]));
const ioInvalid=createGuestProgressWitness({maxIOPortsPerWindow:1});
assert.throws(()=>ioInvalid.observePortIO({direction:'in',port:0,width:8,value:0,cs:0,ip:0},io),
  /active guest instruction/);
ioInvalid.observeInstruction({steps:0,cs:io.get16('CS'),ip:io.get16('IP')},io);
assert.throws(()=>ioInvalid.observePortIO({direction:'out',port:0x388,width:8,
  value:256,cs:io.get16('CS'),ip:io.get16('IP')},io),/bounded integer/);
assert.throws(()=>ioInvalid.observePortIO({direction:'out',port:0x388,width:9,
  value:10,cs:io.get16('CS'),ip:io.get16('IP')},io),/width/);
assert.throws(()=>ioInvalid.observePortIO({direction:'out',port:0x388,width:8,
  value:10,cs:io.get16('CS'),ip:0},io),/provenance mismatch/);
assert.equal(ioInvalid.summarize().ioWriteEvents,0);
assert.throws(()=>createGuestProgressWitness({maxIOPortsPerWindow:0}),/I\/O port capacity/);
