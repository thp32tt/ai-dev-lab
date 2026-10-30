import assert from "node:assert/strict";
import {
  UW2_EVIDENCE_FILES,
  PROVEN_FMDRV_API,
  PROVEN_OPENING_MUSIC,
  PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG,
  PROVEN_MAIN_MUSIC_TABLE,
  fmdrvSongToRenderedTrackIndex,
} from "../web/reverse-evidence.js";

assert.equal(UW2_EVIDENCE_FILES.openExe.sha256,
  "f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65");
assert.equal(UW2_EVIDENCE_FILES.mainExe.sha256,
  "1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747");
assert.equal(PROVEN_FMDRV_API.playSong.ah, 0x01);
assert.equal(PROVEN_FMDRV_API.playSong.songNumbering, "1-based");
assert.equal(PROVEN_FMDRV_API.timerWord0.ah, 0xf0);
assert.equal(PROVEN_FMDRV_API.timerWord1.ah, 0xf1);

assert.deepEqual(PROVEN_OPENING_MUSIC, {
  inputIndex: 0,
  fmdrvSong: 1,
  renderedTrackIndex: 0,
  evidence: PROVEN_OPENING_MUSIC.evidence,
});

assert.equal(PROVEN_MAIN_MUSIC_TABLE.rawFileOffset, 0x43fb8);
assert.equal(PROVEN_MAIN_MUSIC_TABLE.dgroupOffset, 0x9608);
assert.equal(
  PROVEN_MAIN_MUSIC_TABLE.mzHeaderBytes +
    (PROVEN_MAIN_MUSIC_TABLE.relativeDgroupSegment << 4) +
    PROVEN_MAIN_MUSIC_TABLE.dgroupOffset,
  PROVEN_MAIN_MUSIC_TABLE.rawFileOffset
);
assert.deepEqual(PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG, [
  21,19,22,18,2,3,4,7,6,5,11,9,8,10,1,13,14,15,16,20,17,12,0,0,
]);
assert.equal(fmdrvSongToRenderedTrackIndex(1),0);
assert.equal(fmdrvSongToRenderedTrackIndex(22),21);
assert.equal(fmdrvSongToRenderedTrackIndex(0),null);

console.log("UW2 reverse-engineering evidence registry: PASS");