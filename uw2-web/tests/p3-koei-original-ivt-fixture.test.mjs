import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {probeOriginalKoeiWithSyntheticDos} from '../tools/p3-koei-exec-probe.mjs';

const root=process.env.UW2_GAME_DIR||
 '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(root,'KOEI.COM'));
// Deliberately SYNTHETIC IVT: only checks that the EXTERNAL snapshot path
// can advance the original instructions through the DOS AH35/AH25 pair.
// These bytes are not real DOS device/PSP/BIOS observations.
const bytes=new Uint8Array(1024);
bytes.set([0x34,0x12,0x78,0x56],0x65*4);
const expectedSha256=createHash('sha256').update(bytes).digest('hex');
const r=await probeOriginalKoeiWithSyntheticDos(original,{
  initialIvt:{bytes,expectedSha256,knownVectors:[0x65]}
});
assert.match(r.fidelity,/NOT_DOS_REFERENCE/);
assert.equal(r.initialIvt.sha256,expectedSha256);
assert.equal(r.initialIvt.knownVectorCount,1);
assert.equal(r.initialIvt.provenance,'CALLER_SUPPLIED_NOT_ORIGINAL_DOS_VERIFIED');
assert.ok(r.steps>26);
assert.deepEqual(r.observedBiosVideoRequests,[{character:7,page:0,color:7}]);
assert.deepEqual(r.observedChildCalls,[]);
assert.equal(r.terminated,null);
console.log(JSON.stringify({steps:r.steps,stopped:r.stopped,
  provenance:r.initialIvt.provenance}));
const syntheticVideoWrites=[];
const withExternalVideo=await probeOriginalKoeiWithSyntheticDos(original,{
  initialIvt:{bytes,expectedSha256,knownVectors:[0x65]},
  biosVideo:{
    readMode:()=>({mode:3,columns:80,page:0}),
    setMode:({mode})=>syntheticVideoWrites.push(mode)
  }
});
assert.deepEqual(syntheticVideoWrites,[0x12]);
assert.ok(withExternalVideo.steps>r.steps);
assert.equal(withExternalVideo.externalVideoState,'CALLER_SUPPLIED_NOT_DOS_VERIFIED');
assert.equal(withExternalVideo.terminated,null);
console.log(JSON.stringify({withSyntheticVideoSteps:withExternalVideo.steps,
  nextMissingContract:withExternalVideo.stopped}));

console.log('UW2 original-byte KOEI injected UNVERIFIED DOS IVT probe: PASS (NOT DOS reference)');
