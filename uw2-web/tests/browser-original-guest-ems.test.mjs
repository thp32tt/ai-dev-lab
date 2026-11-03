import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createBrowserOriginalGuestBridge} from '../web/browser-original-guest-bridge.js';

// No real DOS/game startup trace is asserted. This synthetic 8086 program
// executes INT 67h AH=40/41/43/44 in a browser-owned guest CPU, then exits
// through installed DOS AH4C, which must release the EMS/keyboard owners.
function targetFixture(){
 const listeners=new Map();
 return {listeners,
  target:{
   addEventListener(name,fn){listeners.set(name,fn);},
   removeEventListener(name,fn){
    if(listeners.get(name)===fn)listeners.delete(name);
   }
  }};
}
const {target,listeners}=targetFixture();
const cpu=new RealMode8086();
const program=Uint8Array.of(
 0xb4,0x40,0xcd,0x67,              // EMS installed? AH40
 0xb4,0x41,0xcd,0x67,              // get frame, BX=C000
 0xbb,0x01,0x00,0xb4,0x43,0xcd,0x67,  // alloc one page, DX=handle
 0xbb,0x00,0x00,0xb8,0x00,0x44,0xcd,0x67, // map page0 slot0
 0xb8,0x00,0xc0,0x8e,0xc0,          // ES=C000
 0x26,0xc6,0x06,0x20,0x00,0x7b,   // original-shaped guest memory store
 0xb8,0x00,0x4c,0xcd,0x21         // DOS exit 4C00
);
cpu.load(program,0x200,0x100);
cpu.set16('CS',0x200);cpu.set16('IP',0x100);
cpu.set16('SS',0x800);cpu.set16('SP',0x1000);
installDosInt21(cpu);
const session=createBrowserOriginalGuestBridge({
 cpu,target,maxTotalSteps:100,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
});
assert.equal(session.snapshot().emsExplicitlyProvisioned,true);
assert.equal(session.snapshot().ems.freePages,4);
assert.equal(listeners.has('keydown'),true);
const first=session.runSlice(13);
assert.equal(first.steps,13);
assert.equal(first.reason,'SLICE_STEP_BUDGET_EXHAUSTED');
assert.equal(session.snapshot().ems.freePages,3);
assert.equal(session.snapshot().ems.activeHandles,1);
assert.deepEqual(session.snapshot().ems.physicalToLogical[0],
 {handle:1,logical:0});
assert.equal(cpu.read8(0xc000,0x20),0x7b);
const done=session.runSlice(20);
assert.equal(done.reason,'TERMINATED');
assert.equal(session.snapshot().detached,true);
assert.equal(session.snapshot().ems,null);
assert.equal(cpu.interruptAdapters.has(0x67),false);
assert.equal(cpu.interruptAdapters.has(0x16),false);
assert.equal(listeners.size,0);
assert.equal(cpu.memory.subarray(0xc0000,0xd0000).some(Boolean),false);
session.detach();

const failed=new RealMode8086();
const {target:t2,listeners:l2}=targetFixture();
failed.set16('CS',0x280);
failed.set16('DX',0x388);
failed.load(Uint8Array.of(0xec),0x280,0);
const failure=createBrowserOriginalGuestBridge({
 cpu:failed,target:t2,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
});
assert.throws(()=>failure.runSlice(1),/no device adapter/);
assert.equal(failure.snapshot().detached,true);
assert.equal(failed.interruptAdapters.has(0x67),false);
assert.equal(failed.interruptAdapters.has(0x16),false);
assert.equal(l2.size,0);

const collided=new RealMode8086();
const {target:t3,listeners:l3}=targetFixture();
collided.installInterruptAdapter(0x16,()=>undefined);
assert.throws(()=>createBrowserOriginalGuestBridge({
 cpu:collided,target:t3,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
}),/already registered/);
assert.equal(collided.interruptAdapters.has(0x67),false);
assert.equal(l3.size,0);
const {target:t4,listeners:l4}=targetFixture();
const absent=new RealMode8086();
absent.write8(0xc000,0,0x88);
assert.throws(()=>createBrowserOriginalGuestBridge({
 cpu:absent,target:t4,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
}),/not empty/);
assert.equal(l4.size,0);
assert.equal(absent.interruptAdapters.has(0x67),false);

const {target:t5}=targetFixture();
const manual=new RealMode8086();
manual.load(Uint8Array.of(0x90),0x500,0);
manual.set16('CS',0x500);
const owned=createBrowserOriginalGuestBridge({
 cpu:manual,target:t5,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
});
assert.equal(owned.runSlice(1).reason,'SLICE_STEP_BUDGET_EXHAUSTED');
owned.detach();
assert.equal(owned.snapshot().detached,true);
assert.equal(manual.interruptAdapters.has(0x67),false);
console.log('explicit browser guest INT67 EMS lifecycle + INT16 ownership, original-shaped 8086 bank store, exit/fault/manual teardown PASS');
