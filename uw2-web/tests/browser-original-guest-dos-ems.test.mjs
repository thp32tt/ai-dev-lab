import assert from 'node:assert/strict';
import {RealMode8086} from '../web/realmode-8086.js';
import {createBrowserOriginalGuestBridge} from '../web/browser-original-guest-bridge.js';

const target=()=>({handlers:new Map(),
 addEventListener(name,fn){this.handlers.set(name,fn);},
 removeEventListener(name,fn){if(this.handlers.get(name)===fn)this.handlers.delete(name);}
});
const cpu=new RealMode8086(),node=target();
const source=Uint8Array.of(
 0xb4,0x30,0xcd,0x21,       // actual MAIN entry DOS AH30
 0x3c,0x02,0x73,0x02,       // original-shaped DOS v2+ guard
 0xeb,0x0d,                // forbidden old DOS alternative
 0xb8,0x00,0x49,           // move AX before memory resize
 0xbb,0x11,0x11,           // restore BX explicitly after AH30 serial fields
 0xb4,0x4a,0xcd,0x21,      // original MAIN AH4A resize callback
 0xb8,0x00,0x4c,0xcd,0x21 // DOS exit releases ownership
);
cpu.load(source,0x200,0x100);
cpu.set16('CS',0x200);cpu.set16('IP',0x100);
cpu.set16('ES',0x4100);cpu.set16('BX',0x1111);
const events=[];
const dos={
 getDosVersion:({requestAL})=>{
  events.push(['version',requestAL]);
  return {major:6,minor:22,oem:0,serialHigh:0,serialLow:0};
 },
 resizeMemory:(req)=>{
  events.push(['resize',req.segment,req.paragraphs]);
  return {resized:true};
 }
};
const session=createBrowserOriginalGuestBridge({cpu,target:node,dos,
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}});
assert.equal(session.snapshot().dosInt21ExplicitlyProvisioned,true);
assert.equal(session.snapshot().emsExplicitlyProvisioned,true);
assert.equal(session.runSlice(2).steps,2);
assert.deepEqual(events,[['version',0]]);
assert.equal(cpu.get16('AX'),0x1606);
const result=session.runSlice(32);
assert.equal(result.reason,'TERMINATED');
assert.deepEqual(events,[['version',0],['resize',0x4100,0x1111]]);
assert.equal(cpu.terminated.returnCode,0);
assert.equal(session.snapshot().detached,true);
assert.equal(node.handlers.size,0);
for(const vector of [0x16,0x21,0x67])
 assert.equal(cpu.interruptAdapters.has(vector),false);
session.detach();

const bad=new RealMode8086(),badTarget=target();
bad.set16('CS',0x200);bad.set16('IP',0);
bad.load(Uint8Array.of(0xec),0x200,0);
const fault=createBrowserOriginalGuestBridge({cpu:bad,target:badTarget,
 dos:{getDosVersion:dos.getDosVersion},
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}});
assert.throws(()=>fault.runSlice(1),/no device adapter/);
assert.equal(fault.snapshot().detached,true);
for(const vector of [0x16,0x21,0x67])
 assert.equal(bad.interruptAdapters.has(vector),false);
assert.equal(badTarget.handlers.size,0);
const pre=new RealMode8086(),preTarget=target();
pre.installInterruptAdapter(0x21,()=>{});
assert.throws(()=>createBrowserOriginalGuestBridge({cpu:pre,target:preTarget,
 dos:{getDosVersion:dos.getDosVersion},
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}}),
 /INT21 DOS owner collision/);
assert.equal(pre.interruptAdapters.has(0x21),true);
assert.equal(pre.interruptAdapters.has(0x67),false);
assert.equal(preTarget.handlers.size,0);
const invalid=new RealMode8086(),invalidTarget=target();
assert.throws(()=>createBrowserOriginalGuestBridge({
 cpu:invalid,target:invalidTarget,dos:{getDosVersion:'not-a-function'},
 ems:{frameSegment:0xc000,totalPages:4,frameReserved:true}
}),/synchronous external DOS version provider/);
assert.equal(invalid.interruptAdapters.has(0x21),false);
assert.equal(invalid.interruptAdapters.has(0x67),false);
assert.equal(invalidTarget.handlers.size,0);
const untouched=new RealMode8086(),untarget=target();
untouched.load(Uint8Array.of(0x90),0x500,0);
untouched.set16('CS',0x500);
const noDos=createBrowserOriginalGuestBridge({cpu:untouched,target:untarget});
assert.equal(noDos.snapshot().dosInt21ExplicitlyProvisioned,false);
assert.equal(noDos.runSlice(1).steps,1);
noDos.detach();
console.log('browser guest explicitly provided DOS AH30/4A + EMS and keyboard 3-vector ownership cleanup success/fault/collision PASS');
