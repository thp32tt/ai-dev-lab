import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PORT_MAP_WIDTH,
  PORT_MAP_HEIGHT,
  PORT_TILES_PER_BANK,
} from "../web/port-map.js";
import { decodeLS11 } from "../web/ls11.js";
import { decodePlanarIndexed } from "../web/koei-image.js";

const gd = process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read = (name) => fs.readFileSync(gd + "/" + name);
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);

const chip = decodeLS11(ab(read("PORTCHIP.LZW")));
assert.equal(chip.decoded.length, 14);
for (let bank = 0; bank < 7; bank++) {
  const graphics = chip.decoded[bank * 2];
  const metadata = chip.decoded[bank * 2 + 1];
  assert.equal(graphics.data.length, 30720);
  assert.equal(metadata.data.length, 4);
  const indexed = decodePlanarIndexed(graphics.data, 16, 3840, 4, 32, true);
  assert.equal(indexed.length, 16 * 3840);
  assert.equal(indexed.length / (16 * 16), PORT_TILES_PER_BANK);
}

const maps = decodeLS11(ab(read("PORTMAP.LZW")));
assert.equal(maps.decoded.length, 101);
for (const m of maps.decoded) assert.equal(m.data.length, PORT_MAP_WIDTH * PORT_MAP_HEIGHT);

const chipNo = read("CHIP_NO.DAT");
assert.equal(chipNo.length, 100);
assert.ok([...chipNo].every(x => x >= 0 && x <= 6));

for (let i = 0; i < 100; i++) {
  const max = Math.max(...maps.decoded[i].data);
  assert.ok(max < PORT_TILES_PER_BANK, `port ${i} tile ${max} outside bank`);
}

console.log(JSON.stringify({
  portChipEntries: chip.decoded.length,
  graphicBanks: 7,
  tilesPerBank: PORT_TILES_PER_BANK,
  portMaps: maps.decoded.length,
  mapPixels: [PORT_MAP_WIDTH, PORT_MAP_HEIGHT],
  chipNoBanks: [...new Set(chipNo)].sort(),
}, null, 2));
console.log("port-map tests: PASS");