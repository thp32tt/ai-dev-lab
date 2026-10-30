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

console.log("UW2 OPEN.EXE first / MAIN menu after completion gate: PASS");
