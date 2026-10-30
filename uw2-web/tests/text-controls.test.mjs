import assert from "node:assert/strict";
import fs from "node:fs";
import { parseOffsetTextTable, stripUw2MessageControls } from "../web/binary.js";
import { parseUw2Fonts } from "../web/font.js";

const gd="/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
function ab(buf){ return buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength); }
const messages=parseOffsetTextTable(ab(fs.readFileSync(gd+"/MESSAGE.DAT")));
const fonts=parseUw2Fonts(fs.readFileSync(gd+"/ALL_FONT.16P"),fs.readFileSync(gd+"/HANKAKU.FNT"));

assert.equal(stripUw2MessageControls(messages[885].text),"선장:%s\n");
assert.equal(stripUw2MessageControls(messages[1052].text),"메모리가 부족합니다.(Err=%d)");

let visible=0;
for(const row of messages){
  const text=stripUw2MessageControls(row.text);
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(text),"control leaked at MESSAGE #"+row.index);
  for(const ch of text){
    if(ch==="\n"||ch==="\r"||ch==="\t") continue;
    visible++;
    assert.ok(fonts.glyphs.has(ch),"missing glyph "+JSON.stringify(ch)+" at MESSAGE #"+row.index);
  }
}
console.log(JSON.stringify({messages:messages.length,visibleGlyphUses:visible,fontGlyphs:fonts.glyphs.size},null,2));
console.log("UW2 MESSAGE control/font coverage: PASS");