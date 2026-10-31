import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createOriginalMasterPicCommandWitness}
 from '../web/guest-pic8259-command-witness.js';
const cpu=new RealMode8086();
cpu.set16('CS',0x400);cpu.set16('IP',0x234);
const seen=[];
const pic=createOriginalMasterPicCommandWitness({maxCommands:1,
 onCommand:event=>{seen.push(event);}
});
cpu.registerIOPort(0x20,pic.port20);
cpu.writeIOPort(0x20,8,0x20);
assert.equal(pic.snapshot().commands,1);
assert.deepEqual(seen,[{port:0x20,value:0x20,cs:0x400,ip:0x234,ordinal:0}]);
assert.ok(Object.isFrozen(seen[0]));
assert.throws(()=>cpu.writeIOPort(0x20,8,0x20),/budget exhausted/);
assert.equal(pic.snapshot().commands,1);
const x=createOriginalMasterPicCommandWitness();
assert.throws(()=>x.port20.out8(0x21,0x20,cpu),/port 20h/);
assert.throws(()=>x.port20.out8(0x20,0x21,cpu),/unverified master PIC/);
assert.equal(x.snapshot().commands,0);
const spoof=createOriginalMasterPicCommandWitness({onCommand:()=>1});
assert.throws(()=>spoof.port20.out8(0x20,0x20,cpu),/cannot fabricate/);
assert.equal(spoof.snapshot().commands,0);
const asyncPic=createOriginalMasterPicCommandWitness({
 onCommand:()=>Promise.resolve()
});
assert.throws(()=>asyncPic.port20.out8(0x20,0x20,cpu),/async master PIC/);
assert.throws(()=>createOriginalMasterPicCommandWitness({maxCommands:0}),/bounded/);
console.log('UW2 original FMDRV source OUT 20h command witness: PASS (no PIC timing or EOI simulation)');
