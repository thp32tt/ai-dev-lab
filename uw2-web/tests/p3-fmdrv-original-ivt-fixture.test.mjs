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
const pitWrites=[];
const synthetic=await probeOriginalFmdrv(orig,{
 ioPorts:[
   {number:0x43,handlers:{out8:(port,value)=>pitWrites.push({port,value})}},
   {number:0x40,handlers:{out8:(port,value)=>pitWrites.push({port,value})}},
   {number:0x61,handlers:{in8:()=>0x00,out8:(port,value)=>pitWrites.push({port,value})}} // synthetic port-B latch, not hardware trace
 ],
 cpu,
 initialIvt:{bytes:ivt,expectedSha256:sha(ivt),knownVectors:[0x66,0x65,0x08]},
 initialPsp:{bytes:psp,expectedSha256:sha(psp)},
 traceLimit:48
});
assert.ok(synthetic.steps>defaultProbe.steps);
assert.equal(synthetic.initialIvt.knownVectorCount,3);
assert.deepEqual(pitWrites.slice(0,3),[
 {port:0x43,value:0x36},{port:0x40,value:0},{port:0x40,value:0x10}
]);
console.log(JSON.stringify({steps:synthetic.steps,stopped:synthetic.stopped,
  services:synthetic.serviceCalls,last:synthetic.recentSteps.slice(-18)}));
console.log('UW2 FMDRV.COM original-byte DOS old-INT66 synthetic-vectored probe: PASS (NOT real driver)');
