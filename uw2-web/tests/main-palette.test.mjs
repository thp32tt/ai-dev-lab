import assert from "node:assert/strict";
import fs from "node:fs";
import {
  UW2_MAIN_PALETTE_BRG4,
  UW2_MAIN_VGA_PALETTE,
  uw2Dac6ToRgb8,
  graphIndicesToRgba,
} from "../web/graph-format.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const main=fs.readFileSync(gd+"/MAIN.EXE");

const EXPECTED_BRG4 = [
  [0,0,0], [13,0,4], [0,13,4], [10,13,6],
  [6,0,10], [15,0,10], [6,15,10], [13,15,14],
  [9,7,7], [12,0,4], [0,10,6], [5,14,11],
  [15,0,8], [6,0,7], [6,0,11], [12,6,2],
];

assert.deepEqual(UW2_MAIN_PALETTE_BRG4, EXPECTED_BRG4);
assert.equal(
  main.subarray(0x43FCE,0x43FCE+48).toString("hex"),
  Buffer.from(EXPECTED_BRG4.flat()).toString("hex")
);

// 0:696B source conversion: B,R,G nibble triplet -> R,G,B DAC bytes,
// each component shifted left by two.
assert.equal(
  main.subarray(0x6993,0x69A8).toString("hex"),
  "ad86c4d0e0d0e0aaacd0e0d0e0aa86c4d0e0d0e0aa"
);
// VGA DAC index 03C8h, then three RGB writes through 03C9h.
assert.equal(
  main.subarray(0x69BE,0x69CE).toString("hex"),
  "93bac803ee426eeb006eeb006e40e2f1"
);
assert.equal(uw2Dac6ToRgb8(52),211);
assert.equal(uw2Dac6ToRgb8(60),243);

const EXPECTED = [
  [0,0,0], [0,65,211], [211,65,0], [211,97,162],
  [0,162,97], [0,162,243], [243,162,97], [243,227,211],
  [113,113,146], [0,65,195], [162,97,0], [227,178,81],
  [0,130,243], [0,113,97], [0,178,97], [97,32,195],
];

assert.deepEqual(UW2_MAIN_VGA_PALETTE, EXPECTED);
assert.equal(UW2_MAIN_VGA_PALETTE.length, 16);

const rgba = [...graphIndicesToRgba(Uint8Array.from([0,3,9,15]))];
assert.deepEqual(rgba, [
  0,0,0,255,
  211,97,162,255,
  0,65,195,255,
  97,32,195,255,
]);

const source = fs.readFileSync(new URL("../web/graph-format.js", import.meta.url), "utf8");
assert.ok(!source.includes("UW2_APPROX_PALETTE"));

console.log(JSON.stringify({palette: UW2_MAIN_VGA_PALETTE}, null, 2));
console.log("UW2 MAIN executable-derived VGA palette: PASS");