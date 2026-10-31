import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {probeOriginalKoeiWithSyntheticDos} from '../tools/p3-koei-exec-probe.mjs';

// ORIGINAL Korean KOEI.COM instruction bytes, but SYNTHETIC DOS statuses,
// PSP/IVT/BIOS/allocator. Never confuse branch coverage with DOS parity.
const dir=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(dir,'KOEI.COM'));
const sha=b=>createHash('sha256').update(b).digest('hex');
const ivt=new Uint8Array(1024),psp=new Uint8Array(256);
ivt.set([0x34,0x12,0x78,0x56],0x65*4);
psp.set([0xcd,0x20],0);psp.set([0x50,0x02],0x2c);

const probe=childStatuses=>probeOriginalKoeiWithSyntheticDos(original,{
  initialIvt:{bytes:ivt,expectedSha256:sha(ivt),knownVectors:[0x65]},
  initialPsp:{bytes:psp,expectedSha256:sha(psp)},
  biosVideo:{readMode:()=>({mode:3,columns:80,page:0}),
    setMode:()=>{}},
  dosMemory:{
    freeMemory:({segment})=>{
      if(segment!==0x250)throw new Error('unexpected synthetic env segment');
      return {freed:true};
    },
    resizeMemory:({segment,paragraphs})=>{
      if(segment!==0x200||paragraphs!==0x7a)
        throw new Error('unexpected synthetic allocation');
      return {resized:true};
    }
  },dosConsole:{io:({operation})=>
      operation==='input'?{available:false}:undefined},childStatuses
});
const good={terminationType:0,returnCode:0},bad={terminationType:1,returnCode:1};
const scenario=[
 {name:'OPEN normal and MAIN nonzero -> END',result:{
    'FMDRV.COM':good,'OPEN.EXE':good,'MAIN.EXE':{terminationType:0,returnCode:1},'END.EXE':good},
    files:['FMDRV.COM','OPEN.EXE','MAIN.EXE','END.EXE']},
 {name:'OPEN abnormal -> MAIN and END skipped',result:{
    'FMDRV.COM':good,'OPEN.EXE':bad},
    files:['FMDRV.COM','OPEN.EXE']},
 {name:'MAIN zero -> END skipped',result:{
    'FMDRV.COM':good,'OPEN.EXE':good,'MAIN.EXE':good},
    files:['FMDRV.COM','OPEN.EXE','MAIN.EXE']},
 {name:'MAIN abnormal -> END skipped',result:{
    'FMDRV.COM':good,'OPEN.EXE':good,'MAIN.EXE':bad},
    files:['FMDRV.COM','OPEN.EXE','MAIN.EXE']}
];
for(const s of scenario){
 const r=await probe(s.result);
 const visited=r.observedChildCalls.map(x=>x.file);
 assert.deepEqual(visited,s.files,s.name);
 console.log(JSON.stringify({scenario:s.name,steps:r.steps,stop:r.stopped?.message,visited}));
 assert.match(r.stopped?.message??'',/8086 INT 66 has no installed vector/);
 assert.equal(r.terminated,null);
 assert.match(r.fidelity,/NOT_DOS_REFERENCE/);
 assert.ok(r.steps>30);
}
console.log('UW2 ORIGINAL KOEI branch execution 4 DOS child-status scenarios: PASS (synthetic environment, no FMDRV)');
