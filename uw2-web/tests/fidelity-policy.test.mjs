import assert from "node:assert/strict";
import fs from "node:fs";

const opening=fs.readFileSync(new URL("../web/opening.js",import.meta.url),"utf8");
const app=fs.readFileSync(new URL("../web/app.js",import.meta.url),"utf8");

assert.ok(opening.includes('defaultMode: "reverse-engineered-only"'));
assert.ok(opening.includes("allowApproximate = false"));
assert.ok(opening.includes("if (!this.allowApproximate)"));
assert.ok(opening.includes('fidelity: "blocked-unverified"'));

assert.ok(app.includes('fidelityParams.get("openingApprox") === "1"'));
assert.ok(app.includes('fidelityParams.get("musicApprox") === "1"'));
assert.ok(app.includes('musicFidelity: "mapping-unverified"'));
assert.ok(app.includes("APPROX_MUSIC_TRACK_BY_MODE"));
assert.ok(!app.includes("const MUSIC_TRACK_BY_MODE ="));
assert.ok(app.includes("allowApproximate: allowApproximateOpening"));

const strictMusicBlock=app.slice(
  app.indexOf("function setMusicForMode"),
  app.indexOf("async function loadMusicSupport")
);
assert.ok(strictMusicBlock.includes("if (!allowApproximateMusic)"));
assert.ok(strictMusicBlock.indexOf("if (!allowApproximateMusic)") <
          strictMusicBlock.indexOf("APPROX_MUSIC_TRACK_BY_MODE"));

console.log("UW2 reverse-engineered-only fidelity policy: PASS");