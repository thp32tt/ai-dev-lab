import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {probeOriginalFmdrv} from '../tools/p3-fmdrv-exec-probe.mjs';
import {RealMode8086} from '../web/realmode-8086.js';

const dir=process.env.UW2_GAME_DIR||'/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const orig=fs.readFileSync(path.join(dir,'FMDRV.COM'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const defaultProbe=await probeOriginalFmdrv(orig);
assert.equal(defaultProbe.sha256,'0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b');
assert.equal(defaultProbe.steps,11);
assert.equal(defaultProbe.stopped.message,'unknown initial DOS interrupt vector: fail closed');
assert.deepEqual(defaultProbe.serviceCalls.map(x=>[x.ah,x.al]),[[0x35,0x66]]);

// Explicitly SYNTHETIC guest memory. The old INT66 handler is a CPU IRET
// fixture, NOT original BIOS/driver bytes nor evidence of installed FMDRV.
const cpu=new RealMode8086(new Uint8Array(0x100000),{enable80186Shifts:true});
cpu.load(Uint8Array.of(0xcf),0x900,0); // synthetic IRET old handler
cpu.load(Uint8Array.of(0xcf),0x910,0); // synthetic old INT65 handler
cpu.load(Uint8Array.of(0xcf),0x920,0); // synthetic old INT08 timer handler
const ivt=new Uint8Array(1024),psp=new Uint8Array(256);
ivt[0x66*4]=0;ivt[0x66*4+1]=0;ivt[0x66*4+2]=0;ivt[0x66*4+3]=9;
ivt[0x65*4]=0;ivt[0x65*4+1]=0;ivt[0x65*4+2]=0x10;ivt[0x65*4+3]=9;
ivt[0x08*4]=0;ivt[0x08*4+1]=0;ivt[0x08*4+2]=0x20;ivt[0x08*4+3]=9;
psp.set([0xcd,0x20],0);
const pitWrites=[],residencyRequests=[];
const synthetic=await probeOriginalFmdrv(orig,{
 dosOptions:{pspSegment:0x300,stayResident:request=>{
   residencyRequests.push({...request});
   return {resident:true}; // explicit synthetic resident-allocator fixture ONLY
 }},
 maxSteps:80000,
 ioPorts:[
   {number:0x43,handlers:{out8:(port,value)=>pitWrites.push({port,value})}},
   {number:0x40,handlers:{out8:(port,value)=>pitWrites.push({port,value})}},
   {number:0x61,handlers:{in8:()=>0x00,out8:(port,value)=>pitWrites.push({port,value})}},
   {number:0x388,handlers:{out8:(port,value)=>pitWrites.push({port,value}),
     in8:()=>0x00}}, // explicit synthetic OPL status, NOT authentic device
   {number:0x389,handlers:{out8:(port,value)=>pitWrites.push({port,value})}} // observed OPL writes only, no synthesized register/timer response
 ],
 cpu,
 initialIvt:{bytes:ivt,expectedSha256:sha(ivt),knownVectors:[0x66,0x65,0x08]},
 initialPsp:{bytes:psp,expectedSha256:sha(psp)},
 traceLimit:48
});
assert.ok(synthetic.steps>defaultProbe.steps);
assert.equal(synthetic.initialIvt.knownVectorCount,3);
assert.deepEqual(residencyRequests,[{pspSegment:0x300,paragraphs:0x26,returnCode:1}]);
assert.deepEqual(synthetic.terminated,{terminationType:3,returnCode:1,
  residentParagraphs:0x26,pspSegment:0x300});
assert.deepEqual(cpu.getGuestInterruptVector(0x66),{segment:0x300,offset:0x108});
assert.equal(cpu.getGuestInterruptVector(0x08).segment,0x300);
assert.deepEqual(pitWrites.slice(0,3),[
 {port:0x43,value:0x36},{port:0x40,value:0},{port:0x40,value:0x10}
]);
console.log(JSON.stringify({steps:synthetic.steps,stopped:synthetic.stopped,
  services:synthetic.serviceCalls,last:synthetic.recentSteps.slice(-18)}));

// A SYNTHETIC parent scheduler now releases the terminated CPU so that the
// native original RESIDENT FMDRV INT66 handler can be called from a second
// guest segment. This does NOT establish DOS MCB/parent PSP correctness.
assert.equal(cpu.terminated.terminationType,3);
cpu.terminated=null; // test-only parent scheduler, never a DOS implementation
cpu.set16('CS',0x500);cpu.set16('DS',0x500);cpu.set16('ES',0x500);
cpu.set16('SS',0x500);cpu.set16('SP',0xfffe);cpu.set16('IP',0x100);
cpu.set16('FLAGS',0x202);
cpu.set16('AX',0xff03); // exact KOEI.COM final INT66 service selector
cpu.load(Uint8Array.of(0xcd,0x66,0x90),0x500,0x100);
let invoked=0,handlerStop=null,returnToCaller=false;
for(;invoked<2000;invoked++){
  if(cpu.get16('CS')===0x500&&cpu.get16('IP')===0x102){
    returnToCaller=true;break;
  }
  const cs=cpu.get16('CS'),ip=cpu.get16('IP');
  try{cpu.step();}catch(error){
    handlerStop={cs,ip,message:error.message};break;
  }
}
assert.ok(invoked>1);
console.log(JSON.stringify({originalFmdrvInt66FF03Steps:invoked,
  returnToCaller,handlerStop,
  originalInt66Installed:cpu.getGuestInterruptVector(0x66)}));

console.log('UW2 FMDRV.COM original-byte DOS old-INT66 synthetic-vectored probe: PASS (NOT real driver)');
