import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import { ORIGINAL_SYSTEM_MENU_INDEX, SYSTEM_UI_LAYOUT, originalSaveSlotLine } from "../web/system-ui.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const raw=fs.readFileSync(gd+"/KOUKAI2.DAT");
const ab=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const slots=parseSaveSlots(ab);

assert.equal(ORIGINAL_SYSTEM_MENU_INDEX,56);
assert.deepEqual(SYSTEM_UI_LAYOUT.menu,{x:192,y:48,w:256,h:144,textX:200,textY:48,rowH:16,count:5});
assert.deepEqual(SYSTEM_UI_LAYOUT.slots,{x1:208,x2:432,y:96,rowH:16,count:10,promptX:224,promptY:272});
assert.deepEqual(SYSTEM_UI_LAYOUT.loadConfirm,{x:192,y:256,w:256,h:48,textX:208,textY:272});
assert.deepEqual(SYSTEM_UI_LAYOUT.emptySlot,{x:176,y:256,w:288,h:48,textX:192,textY:272});

assert.equal(slots[0].slotHeaderFlag,0);
assert.equal(originalSaveSlotLine(slots[2],2),"        KOEI Game 03");
assert.ok(originalSaveSlotLine(slots[0],0).startsWith("28/May/1522"));
assert.ok(originalSaveSlotLine(slots[0],0).endsWith("튀니스"));
assert.ok(originalSaveSlotLine(slots[1],1).endsWith("단치히"));

const main=fs.readFileSync(gd+"/MAIN.EXE");
assert.equal(main.subarray(0x1B699,0x1B6A8).toString("hex"),
  "562bdbb1038bf3d3e6c78478c1d000");
assert.equal(main.subarray(0x1B6A8,0x1B6C4).toString("hex"),
  "c7847ac1b001b1048d4706d3e089847cc105100089847ec14383fb0a");
assert.equal(main.subarray(0x1B765,0x1B776).toString("hex"),
  "b1048d4406d3e08bd0b81a009a53460000");
assert.equal(main.subarray(0x1B80A,0x1B81F).toString("hex"),
  "b81c00ba10019a53460000b8b703509a30559b2d5b");
assert.equal(main.subarray(0x1B87A,0x1B8A4).toString("hex"),
  "b8300050b00150b81800ba0001bb20009a9c730000b81a00ba10019a53460000b8b803509a30559b2d5b");
assert.equal(main.subarray(0x1B8B4,0x1B8DE).toString("hex"),
  "b8300050b00150b81600ba0001bb24009a9c730000b81800ba10019a53460000b8b903509a30559b2d5b");
assert.equal(main.subarray(0x1BA37,0x1BA61).toString("hex"),
  "b8300050b00150b81800ba0001bb20009a9c730000b81a00ba10019a53460000b8ba03509a30559b2d5b");
assert.equal(main.subarray(0x1BD57,0x1BD92).toString("hex"),
  "b838008d9ef4fe8d56f49aec559b2db89000502ac050b81800ba3000bb20009a9c730000b020508d46f4502bc951b81900ba3000b304900ee856d4");

console.log(JSON.stringify({menu:SYSTEM_UI_LAYOUT.menu,slots:SYSTEM_UI_LAYOUT.slots,loadConfirm:SYSTEM_UI_LAYOUT.loadConfirm},null,2));
console.log("UW2 original system/load UI evidence: PASS");