// Korean DOS Uncharted Waters II reverse-engineering evidence registry.
// Only facts with a closed path from shipped artifacts are allowed here.
// Raw offsets are file offsets in the exact binaries identified below.

export const UW2_EVIDENCE_FILES = Object.freeze({
  openExe: Object.freeze({
    name: "OPEN.EXE",
    size: 42167,
    sha256: "f7ddc1adf699ddfcfe3679496b7bbf08ef53b6a7eb063b17433745914b567e65",
  }),
  mainExe: Object.freeze({
    name: "MAIN.EXE",
    size: 288823,
    sha256: "1718bbbbcdd938dfe44403d9bd5254dfc02d431217dea39ae5fb3fcde1597747",
  }),
  fmdrv: Object.freeze({
    name: "FMDRV.COM",
    size: 5162,
    sha256: "0e85962755e2b96ed72a133ba9c84340d754abb18c9af20b76ddd5a96b79677b",
  }),
  koei: Object.freeze({
    name: "KOEI.COM",
    size: 776,
    sha256: "81968de0d3ced479d77d3b9d60c571bde74f850948f6fc6d02cebea2557a1d36",
  }),
  d2: Object.freeze({
    name: "D2.MML",
    size: 27866,
    sha256: "dbf29098e4b5c0e3130a8ce367465b20e8d370247b565e4c0752148078403dae",
  }),
});

export const PROVEN_FMDRV_API = Object.freeze({
  registerD2: Object.freeze({
    ah: 0x00,
    evidence: "FMDRV.COM raw 0x023c handler stores D2 far pointer used by song loader",
  }),
  playSong: Object.freeze({
    ah: 0x01,
    songNumbering: "1-based",
    evidence: "FMDRV.COM raw 0x026e dispatches to raw 0x01b0; raw 0x01b2 subtracts 1 before indexing 10-byte song entries",
  }),
  waitOrFade: Object.freeze({
    ah: 0x02,
    evidence: "FMDRV.COM raw 0x0284 path; not a song-number command",
  }),
  status: Object.freeze({
    ah: 0x03,
    evidence: "FMDRV.COM raw 0x0297 path",
  }),
  timerWord0: Object.freeze({
    ah: 0xf0,
    evidence: "FMDRV.COM raw 0x0056..0x0073 get/set internal word 0x0124",
  }),
  timerWord1: Object.freeze({
    ah: 0xf1,
    evidence: "FMDRV.COM raw 0x0075..0x0092 get/set internal word 0x0126",
  }),
});

export const PROVEN_OPENING_MUSIC = Object.freeze({
  inputIndex: 0,
  fmdrvSong: 1,
  renderedTrackIndex: 0,
  evidence: Object.freeze([
    "OPEN.EXE raw 0x53f1 clears AL to 0",
    "OPEN.EXE raw 0x53f5 calls play-song wrapper raw 0x4994",
    "OPEN.EXE raw 0x49cb builds INT 66h AH=1 request",
    "OPEN.EXE raw 0x49d2 increments AL before dispatch",
    "OPEN.EXE raw 0x49e2 executes INT 66h through raw 0x3166",
  ]),
});

// MAIN.EXE music logical index (0..23) -> FMDRV 1-based D2 song.
// 0 means FMDRV AH=1 receives AL=0, which its handler rejects before table indexing.
export const PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG = Object.freeze([
  21, 19, 22, 18, 2, 3, 4, 7,
   6,  5, 11,  9, 8,10, 1,13,
  14, 15, 16, 20,17,12, 0, 0,
]);

export const PROVEN_MAIN_MUSIC_TABLE = Object.freeze({
  rawFileOffset: 0x43fb8,
  dgroupOffset: 0x9608,
  mzHeaderBytes: 0x5400,
  relativeDgroupSegment: 0x355b,
  values: PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG,
  evidence: Object.freeze([
    "MAIN.EXE raw 0xe90c loads logical index into BL",
    "MAIN.EXE raw 0xe911 loads AL from DS:[BX+9608h]",
    "MAIN.EXE raw 0xe908 builds INT 66h AH=1 request",
    "MAIN.EXE raw 0xe923 executes the request through raw 0x8974",
    "0x5400 + (0x355b << 4) + 0x9608 = 0x43fb8",
  ]),
});

export function fmdrvSongToRenderedTrackIndex(song) {
  const n = Number(song) | 0;
  return n >= 1 ? n - 1 : null;
}

export function mainMusicLogicalToFmdrvSong(logicalIndex) {
  const i = Number(logicalIndex);
  if (!Number.isInteger(i) || i < 0 || i >= PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG.length) return null;
  const song = PROVEN_MAIN_MUSIC_INDEX_TO_FMDRV_SONG[i] | 0;
  return song >= 1 ? song : null;
}

export function mainMusicLogicalToRenderedTrackIndex(logicalIndex) {
  return fmdrvSongToRenderedTrackIndex(mainMusicLogicalToFmdrvSong(logicalIndex));
}

export const PROVEN_MAIN_MUSIC_DISPATCH_CALLS = Object.freeze({
  dispatcherFar: "0000:94CA",
  dispatcherRawFileOffset: 0x0e8ca,
  directFarCalls: Object.freeze([
    Object.freeze({ rawFileOffset: 0x157fd, logicalIndex: 0x15, source: "immediate AL=15h" }),
    Object.freeze({ rawFileOffset: 0x15861, logicalIndex: 0x11, source: "immediate AL=11h" }),
    Object.freeze({ rawFileOffset: 0x15a1c, logicalIndex: 0x14, source: "immediate AL=14h" }),
    Object.freeze({ rawFileOffset: 0x1be98, logicalIndex: 0x03, source: "immediate AL=03h" }),
    Object.freeze({ rawFileOffset: 0x1c574, logicalIndex: 0x14, source: "immediate AL=14h" }),
    Object.freeze({ rawFileOffset: 0x2019c, logicalIndex: null, source: "dynamic: local selector + 0Ah, else 0Fh" }),
    Object.freeze({ rawFileOffset: 0x20526, logicalIndex: null, source: "branch: AL=13h when DI=1, AL=12h when DI=5" }),
    Object.freeze({ rawFileOffset: 0x26197, logicalIndex: null, source: "replay DS:9606 current logical index" }),
    Object.freeze({ rawFileOffset: 0x36940, logicalIndex: null, source: "wrapper forwards caller AL" }),
  ]),
  sameSegmentCalls: Object.freeze([
    Object.freeze({
      rawFileOffset: 0x0d872,
      source: "AL=DS:1241h+4",
      provenMeaning: "selected protagonist theme",
    }),
  ]),
  evidence: Object.freeze([
    "MAIN.EXE raw 0xE8CA is image address 0000:94CA because the MZ header is 0x5400 bytes",
    "nine direct far calls encode 9A CA 94 00 00",
    "MAIN.EXE raw 0xD86B loads selected protagonist id from DS:1241h and raw 0xD86E adds 4",
    "semantic names for the nine far-call sites remain intentionally unassigned",
  ]),
});

export const PROVEN_SYSTEM_MENU_DISPATCH = Object.freeze({
  menuIndex: 56,
  tableRawFileOffset: 0x4557a,
  entries: Object.freeze([
    Object.freeze({ index: 0, label: "Load Data", far: "0FB7:6CDE", rawPhysical: 0x1bc4e }),
    Object.freeze({ index: 1, label: "Start New Game", far: "0FB7:6D0C", rawPhysical: 0x1bc7c }),
    Object.freeze({ index: 2, label: "Environment", far: "0FB7:6D68", rawPhysical: 0x1bcd8 }),
    Object.freeze({ index: 3, label: "Quit Game", far: "0FB7:6D7A", rawPhysical: 0x1bcea }),
    Object.freeze({ index: 4, label: "Save Data", far: "0137:431B", rawPhysical: 0x0aa8b }),
  ]),
  evidence: Object.freeze([
    "MAIN.EXE raw 0x1BD57 loads MENU.DAT index 56",
    "MAIN.EXE raw 0x1BD9A indexes 4-byte far pointers by selected menu item",
    "far-pointer table begins at MAIN.EXE raw 0x4557A",
  ]),
});

export const PROVEN_PROTAGONIST_SELECTION = Object.freeze({
  systemMenuIndex: 1,
  handlerRawPhysical: 0x1bc7c,
  selectorRawPhysical: 0x1b21b,
  count: 6,
  selectedIdStorage: "DS:1241h",
  evidence: Object.freeze([
    "MENU #56 item 1 is Start New Game",
    "system dispatch item 1 -> 0FB7:6D0C -> raw 0x1BC7C",
    "MAIN.EXE raw 0x1BC87 calls raw 0x1B21B",
    "MAIN.EXE raw 0x1B2A3 loads selector count 6",
    "MAIN.EXE raw 0x1B2B3 stores returned AL to DS:1241h",
  ]),
});

export const PROVEN_PROTAGONIST_MUSIC = Object.freeze({
  logicalIndexBase: 4,
  protagonistCount: 6,
  fmdrvSongsByProtagonistId: Object.freeze([2, 3, 4, 7, 6, 5]),
  renderedTrackIndicesByProtagonistId: Object.freeze([1, 2, 3, 6, 5, 4]),
  evidence: Object.freeze([
    "MAIN.EXE raw 0xD86B loads AL from DS:1241h",
    "MAIN.EXE raw 0xD86E adds 4 to form logical music index",
    "MAIN.EXE raw 0xD872 calls raw 0xE8CA music dispatcher",
    "MAIN music map indices 4..9 -> FMDRV songs 2,3,4,7,6,5",
  ]),
});

export function protagonistFmdrvSong(protagonistId) {
  const id = Number(protagonistId) | 0;
  if (id < 0 || id >= PROVEN_PROTAGONIST_MUSIC.protagonistCount) return null;
  return PROVEN_PROTAGONIST_MUSIC.fmdrvSongsByProtagonistId[id];
}