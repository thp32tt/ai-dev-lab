import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { decodeLS11, inspectLS11 } from "../web/ls11.js";
import { decodePlanarIndexed, HORIZON_KAO_PALETTE } from "../web/koei-image.js";

const gameDir = process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const kaoPath = path.join(gameDir, "KAO.LZW");

assert.equal(HORIZON_KAO_PALETTE.length, 8);

if (fs.existsSync(kaoPath)) {
  const b = fs.readFileSync(kaoPath);
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  const info = inspectLS11(ab);
  assert.equal(info.magic, "LS11");
  assert.ok(info.entries.length > 0);

  const result = decodeLS11(ab, 4);
  assert.equal(result.decoded.length, Math.min(4, info.entries.length));

  for (const e of result.decoded) {
    assert.equal(e.data.length, e.uncompSize);
    if (e.uncompSize === 64 * 80 * 3 / 8) {
      const pixels = decodePlanarIndexed(e.data, 64, 80, 3, 1, true);
      assert.equal(pixels.length, 64 * 80);
      assert.ok(pixels.every(v => v >= 0 && v < 8));
    }
  }

  console.log(JSON.stringify({
    magic: info.magic,
    entries: info.entries.length,
    firstEntries: info.entries.slice(0, 8),
    firstDecodedSizes: result.decoded.map(x => x.data.length),
  }, null, 2));
}

console.log("kao decoder tests: PASS");