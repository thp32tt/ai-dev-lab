import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {RealMode8086} from '../web/realmode-8086.js';
import {installDosInt21} from '../web/dos-int21.js';
import {createBrowserOriginalOpenSession} from '../web/browser-original-open-session.js';

// PRIVATE ORIGINAL KOREAN FILE TEST. Requires the user's own local OPEN.EXE.
// Only explicitly SYNTHETIC PSP/IVT/DOS and an artificial event-target stub.
// Not an actual browser KeyboardEvent, DOS reference, or game execution test.
const dir=process.env.UW2_GAME_DIR||
  '/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD';
const original=readFileSync(join(dir,'OPEN.EXE'));
const sha=x=>createHash('sha256').update(x).digest('hex');
assert.equal(sha(original),
  'f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65');
const psp=new Uint8Array(256);psp[0]=0xcd;psp[1]=0x20;
psp[0x2c]=0x50;psp[0x2d]=0x02;
const ivt=new Uint8Array(1024);
ivt[2]=0;ivt[3]=9; // synthetic vector 0, NOT a DOS reference
let attached=0,detached=0;
const target={
  addEventListener(type){assert.equal(type,'keydown');attached++;},
  removeEventListener(type){assert.equal(type,'keydown');detached++;}
};
const cpu=new RealMode8086();
installDosInt21(cpu,{
  getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0})
});
const browser=await createBrowserOriginalOpenSession({
  cpu,original,target,allocationParagraphs:7000,maxTotalSteps:1000,
  initialPsp:{bytes:psp,expectedSha256:sha(psp)},
  initialIvt:{bytes:ivt,expectedSha256:sha(ivt),knownVectors:[0]}
});
assert.equal(browser.image.relocations,23);
assert.equal(browser.initialIvt.knownVectorCount,1);
assert.equal(browser.snapshot().originalExeSha256,sha(original));
assert.equal(attached,1);
const step=browser.runSlice(1);
assert.equal(step.steps,1);
assert.equal(step.totalExecutedSteps,1);
assert.equal(step.faulted,false);
browser.detach();browser.detach();assert.equal(detached,1);
assert.equal(browser.snapshot().detached,true);
assert.equal(browser.snapshot().keyboard.attached,false);
console.log(JSON.stringify({
  originalOpenSha256:sha(original),
  relocations:browser.image.relocations,
  executedSteps:step.totalExecutedSteps,attached,detached,
  fidelity:'PRIVATE_ORIGINAL_BYTES_SYNTHETIC_PSP_IVT_EVENT_TARGET__NOT_BROWSER_OR_DOS_REFERENCE'
}));

// Second original-byte path: the caller does NOT pretend to know IVT 00h.
// Pauses before the authentic original INT21 AH35, then uses ONLY a
// caller-supplied SHA-pinned SYNTHETIC DOS 00h vector for further tracing.
const missingCpu=new RealMode8086();
installDosInt21(missingCpu,{
  getDosVersion:()=>({major:6,minor:22,oem:0,serialHigh:0,serialLow:0}),
  resizeMemory:()=>({resized:true}),
  getDeviceInfo:()=>({deviceInfo:0x80d3})
});
const unprovenIvt=new Uint8Array(1024);
unprovenIvt[0x67*4+2]=0x00;unprovenIvt[0x67*4+3]=0x09;
const staged=await createBrowserOriginalOpenSession({
  cpu:missingCpu,original,target,allocationParagraphs:7000,maxTotalSteps:1600,
  pauseOnMissingDosIvt:true,pauseOnMissingGuestInterrupt:true,
  initialPsp:{bytes:psp,expectedSha256:sha(psp)},
  initialIvt:{bytes:unprovenIvt,expectedSha256:sha(unprovenIvt),knownVectors:[0x67]}
});
const missing=staged.runSlice(1600);
assert.equal(missing.reason,'WAIT_EXTERNAL_DOS_IVT_VECTOR');
// Explicitly staged browser PSP/IVT differs from standalone OPEN probe
// synthetic initial RAM: 472 (not 470) original instructions to same CS:IP.
assert.equal(missing.totalExecutedSteps,472);
assert.equal(missing.waiting.missingInterruptVector,0);
assert.equal(missingCpu.get16('IP'),0x2de1);
const source00=Uint8Array.of(0,0,0,9);
await staged.supplyPinnedDosIvtVector({
 number:0,bytes:source00,expectedSha256:sha(source00)
});
assert.equal(staged.snapshot().execution.waiting,null);
const waitingDriver=staged.runSlice(1600);
assert.equal(waitingDriver.reason,'WAIT_EXTERNAL_GUEST_INTERRUPT_HANDLER');
assert.equal(waitingDriver.waiting.missingInterruptVector,0x66);
// The second bound under this fixture is 589, not standalone probe 583;
 // the same original driver wait CS:IP is observed without inferred timing.
assert.equal(waitingDriver.totalExecutedSteps,589);
assert.equal(missingCpu.get16('IP'),0x1831);
staged.detach();
assert.equal(staged.snapshot().detached,true);
