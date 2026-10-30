import fs from "node:fs";
import assert from "node:assert/strict";
import {
  UW2_EVIDENCE_FILES,
  PROVEN_FMDRV_API,
  PROVEN_OPENING_MUSIC,
  PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG,
  PROVEN_MAIN_MUSIC_TABLE,
  fmdrvSongToRenderedTrackIndex,
  PROVEN_SYSTEM_MENU_DISPATCH,
  PROVEN_PROTAGONIST_SELECTION,
  PROVEN_PROTAGONIST_MUSIC,
  protagonistFmdrvSong,
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

assert.equal(PROVEN_SYSTEM_MENU_DISPATCH.tableRawFileOffset, 0x4557a);
assert.deepEqual(
  PROVEN_SYSTEM_MENU_DISPATCH.entries.map(x => [x.index,x.label,x.far,x.rawPhysical]),
  [
    [0,"Load Data","0FB7:6CDE",0x1bc4e],
    [1,"Start New Game","0FB7:6D0C",0x1bc7c],
    [2,"Environment","0FB7:6D68",0x1bcd8],
    [3,"Quit Game","0FB7:6D7A",0x1bcea],
    [4,"Save Data","0137:431B",0x0aa8b],
  ]
);
assert.equal(PROVEN_PROTAGONIST_SELECTION.count,6);
assert.equal(PROVEN_PROTAGONIST_SELECTION.selectedIdStorage,"DS:1241h");
assert.deepEqual(PROVEN_PROTAGONIST_MUSIC.fmdrvSongsByProtagonistId,[2,3,4,7,6,5]);
assert.deepEqual(PROVEN_PROTAGONIST_MUSIC.renderedTrackIndicesByProtagonistId,[1,2,3,6,5,4]);
for (let i=0;i<6;i++) assert.equal(protagonistFmdrvSong(i),[2,3,4,7,6,5][i]);
assert.equal(protagonistFmdrvSong(-1),null);
assert.equal(protagonistFmdrvSong(6),null);

console.log("UW2 protagonist/system-menu executable evidence: PASS");

const gameDir=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const main=fs.readFileSync(gameDir+"/MAIN.EXE");
assert.equal(main.subarray(0x4557a,0x4558e).toString("hex"),
  "de6cb70f0c6db70f686db70f7a6db70f1b433701");
assert.equal(main.subarray(0x1bc84,0x1bc8d).toString("hex"),
  "2bc00ee891f5407504");
assert.equal(main.subarray(0x1b2a3,0x1b2b6).toString("hex"),
  "b0068ad0900ee8a7df8846ff3cff7447a24112");
assert.equal(main.subarray(0xd86b,0xd875).toString("hex"),
  "a041120404900ee85510");
assert.equal(main.subarray(0x43fb8,0x43fd0).toString("hex"),
  "151316120203040706050b09080a010d0e0f1014110c0000");
console.log("UW2 protagonist/system-menu raw executable pins: PASS");