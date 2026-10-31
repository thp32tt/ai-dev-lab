import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {probeOriginalKoeiWithSyntheticDos} from '../tools/p3-koei-exec-probe.mjs';

// LOCAL ORIGINAL-BYTES TEST ONLY: explicitly requires the user-owned
// Korean KOEI.COM; never upload original bytes or synthetic PSP as an oracle.
// Synthetic DOS device sinks are marked in the probe's fidelity label.
const dir=process.env.UW2_GAME_DIR||
  '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=fs.readFileSync(path.join(dir,'KOEI.COM'));
const report=await probeOriginalKoeiWithSyntheticDos(original);
assert.equal(report.moduleName,'KOEI.COM');
assert.equal(report.sha256,'81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36');
assert.equal(report.steps,26);
assert.equal(report.stopped.reason,'UNSUPPORTED_OR_MISSING_DOS_STATE');
assert.equal(report.stopped.cs,0x200);
assert.equal(report.stopped.ip,0x3d0);
assert.equal(report.stopped.ax,0x3565);
assert.match(report.stopped.message,/unknown initial DOS interrupt vector/);
assert.deepEqual(report.observedBiosVideoRequests,[{character:7,page:0,color:7}]);
assert.deepEqual(report.observedChildCalls,[]);
assert.equal(report.terminated,null);
assert.match(report.fidelity,/NOT_DOS_REFERENCE/);
const bad=Buffer.from(original);bad[0x2ac]^=1;
await assert.rejects(probeOriginalKoeiWithSyntheticDos(bad),/SHA-256 mismatch/);
await assert.rejects(probeOriginalKoeiWithSyntheticDos(original,{maxSteps:100001}),/budget/);
console.log('UW2 original-byte KOEI 26-step BIOS+80186+DOS25 to unknown IVT65 compatibility probe: PASS (NOT DOS reference)');
