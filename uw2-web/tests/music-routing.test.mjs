import assert from "node:assert/strict";
import {
  COMPARISON_MUSIC_TRACKS,
  selectWebMusicRoute,
} from "../web/music-routing.js";
import { PROVEN_OPENING_MUSIC } from "../web/reverse-evidence.js";

assert.equal(PROVEN_OPENING_MUSIC.fmdrvSong, 1);
assert.equal(PROVEN_OPENING_MUSIC.renderedTrackIndex, 0);
assert.deepEqual(selectWebMusicRoute("opening"), {
  track: 0,
  fidelity: "open-exe-proven",
});
for (const mode of ["system-menu", "load-select", "town", "sea", "runtime", "preview", "loading"]) {
  assert.deepEqual(selectWebMusicRoute(mode), {
    track: null,
    fidelity: "mapping-unverified",
  });
}
assert.equal(COMPARISON_MUSIC_TRACKS.town, 19);
assert.equal(COMPARISON_MUSIC_TRACKS.sea, 21);
assert.deepEqual(selectWebMusicRoute("town", true), {
  track: 19,
  fidelity: "approximate-opt-in",
});
assert.deepEqual(selectWebMusicRoute("sea", true), {
  track: 21,
  fidelity: "approximate-opt-in",
});
assert.deepEqual(selectWebMusicRoute("opening", true), {
  track: 0,
  fidelity: "open-exe-proven",
});
console.log("UW2 proven opening / unproven silence / comparison opt-in: PASS");
