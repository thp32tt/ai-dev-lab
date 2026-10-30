import assert from "node:assert/strict";
import { nextKoeiExecutable } from "../web/koei-exit-flow.js";
import { Uw2BootGate } from "../web/boot-sequence.js";

// KOEI.COM raw 0x265/0x267: OR AH,AH; JNZ skips MAIN.
assert.equal(nextKoeiExecutable("OPEN.EXE", {terminationType:0,returnCode:255}), "MAIN.EXE");
for (const ah of [1,2,3,255])
  assert.equal(nextKoeiExecutable("OPEN.EXE", {terminationType:ah,returnCode:0}), null);

// KOEI.COM raw 0x26F/0x271 and 0x273/0x275: both status guards matter.
assert.equal(nextKoeiExecutable("MAIN.EXE", {terminationType:0,returnCode:1}), "END.EXE");
assert.equal(nextKoeiExecutable("MAIN.EXE", {terminationType:0,returnCode:255}), "END.EXE");
assert.equal(nextKoeiExecutable("MAIN.EXE", {terminationType:0,returnCode:0}), null);
for (const ah of [1,2,255])
  assert.equal(nextKoeiExecutable("MAIN.EXE", {terminationType:ah,returnCode:1}), null);
assert.throws(()=>nextKoeiExecutable("OPEN.EXE", {terminationType:-1,returnCode:0}),RangeError);
assert.throws(()=>nextKoeiExecutable("MAIN.EXE", {terminationType:0,returnCode:256}),RangeError);
assert.throws(()=>nextKoeiExecutable("END.EXE",{terminationType:0,returnCode:0}),RangeError);
assert.throws(()=>nextKoeiExecutable("OPEN.EXE"),RangeError);

// The browser boot's ordinary animation-complete path is retained as a
// *browser* event, not asserted to be a measured DOS AH=0 exit.
const normal = new Uw2BootGate();
normal.settleGameResources();
assert.equal(normal.startOpening(),true);
assert.equal(normal.finishOpening(),true);
assert.equal(normal.canShowSystemMenu(),true);

// A supplied original abnormal OPEN termination type must not reach MAIN.
const aborted = new Uw2BootGate();
aborted.settleGameResources();
assert.equal(aborted.startOpening(),true);
assert.equal(aborted.finishOpening({dosTerminationType:1}),false);
assert.equal(aborted.opening,"failed");
assert.equal(aborted.canShowSystemMenu(),false);
assert.equal(aborted.startOpening(),false);
assert.equal(aborted.settleGameResources(),false);

// An explicit verified normal DOS termination allows the existing gate.
const verifiedNormal = new Uw2BootGate();
verifiedNormal.settleGameResources();
verifiedNormal.startOpening();
assert.equal(verifiedNormal.finishOpening({dosTerminationType:0}),true);
console.log("UW2 KOEI.COM return-guard web model (synthetic DOS statuses): PASS");
