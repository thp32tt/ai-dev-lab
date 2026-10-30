import assert from "node:assert/strict";
import fs from "node:fs";
import { UW2_MAIN_VGA_PALETTE, graphIndicesToRgba } from "../web/graph-format.js";

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