import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseOffsetTextTable, parseSaveSlots, SAVE, stripMenuControls } from "../web/binary.js";
import { ReaGameRuntime } from "../web/runtime.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const gameDir = process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";

{
  const b = new Uint8Array([0,4, 0,6, 65,0, 66,0]);
  const t = parseOffsetTextTable(b.buffer);
  assert.equal(t.length, 2);
  assert.equal(t[0].text, "A");
  assert.equal(t[1].text, "B");
}

assert.equal(stripMenuControls("\x06\x04예  금"), "예 금");

if (fs.existsSync(path.join(gameDir, "MENU.DAT"))) {
  const b = fs.readFileSync(path.join(gameDir, "MENU.DAT"));
  const t = parseOffsetTextTable(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  assert.equal(t.length, 61);
  assert.match(t[0].text, /예\s*금/);
}

if (fs.existsSync(path.join(gameDir, "MESSAGE.DAT"))) {
  const b = fs.readFileSync(path.join(gameDir, "MESSAGE.DAT"));
  const t = parseOffsetTextTable(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  assert.equal(t.length, 1179);
  assert.equal(t[0].text, "어서 오세요！");
}

if (fs.existsSync(path.join(gameDir, "KOUKAI2.DAT"))) {
  const b = fs.readFileSync(path.join(gameDir, "KOUKAI2.DAT"));
  const slots = parseSaveSlots(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
  assert.equal(slots.length, 10);
  assert.equal(SAVE.PAGE_SIZE, 33340);
  assert.ok(slots.some(x => !x.empty));
  const s = slots.find(x => !x.empty);
  assert.ok(s.heroName.length > 0);
  assert.ok(Number.isInteger(s.money));

  const rt = new ReaGameRuntime(s, [], []);
  rt.start();
  for (let i = 0; i < 20; i++) rt.tick();
  const snap = rt.snapshot();
  assert.equal(snap.frame, 20);
  assert.equal(snap.reaMain, "FUN_1fb7_5f6b");
}

console.log("uw2-web tests: PASS");