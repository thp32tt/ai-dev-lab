import assert from "node:assert/strict";
import { Uw2BootGate } from "../web/boot-sequence.js";

// Slow OPEN.EXE, fast MAIN resources: no early menu.
const earlyMain = new Uw2BootGate();
assert.equal(earlyMain.settleGameResources(), false);
assert.equal(earlyMain.canShowSystemMenu(), false);
assert.equal(earlyMain.startOpening(), true);
assert.equal(earlyMain.canShowSystemMenu(), false);
assert.equal(earlyMain.finishOpening(), true);

// Fast OPEN.EXE, slow MAIN resources: wait at title, not an incomplete menu.
const slowMain = new Uw2BootGate();
assert.equal(slowMain.startOpening(), true);
assert.equal(slowMain.finishOpening(), false);
assert.equal(slowMain.canShowSystemMenu(), false);
assert.equal(slowMain.settleGameResources(), true);

// A failed or blocked intro must never advance to MAIN.
const failure = new Uw2BootGate();
assert.equal(failure.settleGameResources(), false);
failure.failOpening();
assert.equal(failure.startOpening(), false);
assert.equal(failure.finishOpening(), false);
assert.equal(failure.canShowSystemMenu(), false);

// Restarting the intro revokes previous permission until its new completion.
assert.equal(earlyMain.startOpening(), true);
assert.equal(earlyMain.canShowSystemMenu(), false);
assert.equal(earlyMain.finishOpening(), true);

// One rejected MAIN resource must not be mistaken for a settled resource set.
const failedBeforeOpen = new Uw2BootGate();
assert.equal(failedBeforeOpen.failGameResources(), false);
assert.equal(failedBeforeOpen.settleGameResources(), false);
assert.equal(failedBeforeOpen.gameResourcesSettled, false);
assert.equal(failedBeforeOpen.gameResourcesFailed, true);
assert.equal(failedBeforeOpen.startOpening(), true);
assert.equal(failedBeforeOpen.finishOpening(), false);
assert.equal(failedBeforeOpen.canShowSystemMenu(), false);

// A late asset failure revokes readiness, including after the OPEN title hold.
const failedAfterOpen = new Uw2BootGate();
assert.equal(failedAfterOpen.startOpening(), true);
assert.equal(failedAfterOpen.finishOpening(), false);
assert.equal(failedAfterOpen.failGameResources(), false);
assert.equal(failedAfterOpen.settleGameResources(), false);
assert.equal(failedAfterOpen.canShowSystemMenu(), false);

// Replaying OPEN cannot bypass missing original resources.
assert.equal(failedBeforeOpen.startOpening(), true);
assert.equal(failedBeforeOpen.finishOpening(), false);
console.log("UW2 OPEN.EXE first / MAIN resource load must succeed, fail-closed: PASS");
