import assert from "node:assert/strict";
import fs from "node:fs";
import {
  OPENING_FIDELITY_POLICY,
  KoreanOpeningPlayer,
  KOREAN_OPENING_SCENE_PLAN,
} from "../web/opening.js";
import { selectWebMusicRoute } from "../web/music-routing.js";

const app=fs.readFileSync(new URL("../web/app.js",import.meta.url),"utf8");
const opening=fs.readFileSync(new URL("../web/opening.js",import.meta.url),"utf8");

// Proven Korean OPEN.EXE scene order is the default. Individual frame
// transitions are not falsely presented as instruction-exact emulation.
assert.equal(OPENING_FIDELITY_POLICY.defaultMode,"korean-open-exe-record-sequence");
assert.equal(OPENING_FIDELITY_POLICY.exactReplayReady,false);
assert.equal(OPENING_FIDELITY_POLICY.approximatePlaybackOptOut,"openingApprox=0");
assert.equal(KOREAN_OPENING_SCENE_PLAN.length,12);
assert.equal(typeof KoreanOpeningPlayer,"function");
assert.ok(opening.includes("allowApproximate = true"));
assert.ok(opening.includes("if (!this.allowApproximate)"));
assert.ok(!opening.includes('this.onFinish?.({ fidelity: "blocked-unverified" })'));

assert.ok(app.includes('fidelityParams.get("openingApprox") !== "0"'));
assert.ok(app.includes('fidelityParams.get("musicApprox") === "1"'));
assert.ok(app.includes('allowApproximate: allowApproximateOpening'));
assert.ok(app.includes('bootGate.settleGameResources()'));
assert.ok(app.includes('bootGate.finishOpening()'));
assert.ok(!app.includes('if (systemMenuPending || viewMode === "opening-title") enterSystemMenu(0)'));

// Original OPEN.EXE music track proven; MAIN town/sea mapping remains gated.
assert.equal(selectWebMusicRoute("opening").track,0);
assert.equal(selectWebMusicRoute("town").track,null);
assert.equal(selectWebMusicRoute("sea").track,null);
assert.equal(selectWebMusicRoute("town",true).fidelity,"approximate-opt-in");
assert.ok(!app.includes("APPROX_MUSIC_TRACK_BY_MODE"));

console.log("UW2 boot scene-sequence and evidence music fidelity policy: PASS");
