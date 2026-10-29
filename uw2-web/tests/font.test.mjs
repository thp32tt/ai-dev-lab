import assert from "node:assert/strict";
import fs from "node:fs";
import { parseUw2Fonts, measureUw2Text } from "../web/font.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const all=fs.readFileSync(gd+"/ALL_FONT.16P");
const half=fs.readFileSync(gd+"/HANKAKU.FNT");
const font=parseUw2Fonts(all,half);

assert.equal(font.allFontRecords,3478);
assert.equal(font.halfWidthRecords,96);
for(const ch of "가항구출보급도크예아니오일") assert.ok(font.glyphs.has(ch),ch);
const ga=font.glyphs.get("가");
assert.deepEqual(ga.eucKrCode,[0xb0,0xa1]);
assert.deepEqual(ga.storedCode,[0xa1,0xb0]);
assert.equal(ga.width,16);
assert.equal(font.glyphs.get("A").width,8);
assert.equal(measureUw2Text(font,"출항"),32);
assert.equal(measureUw2Text(font,"A1"),16);
assert.equal(measureUw2Text(font,"출항 A1"),56);

console.log(JSON.stringify({
  allFontRecords:font.allFontRecords,
  halfWidthRecords:font.halfWidthRecords,
  gaStored:ga.storedCode.map(x=>"0x"+x.toString(16)),
  gaEucKr:ga.eucKrCode.map(x=>"0x"+x.toString(16)),
  sample:"가항구출보급도크예아니오일",
},null,2));
console.log("UW2 original bitmap font tests: PASS");