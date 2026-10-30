import assert from "node:assert/strict";
import fs from "node:fs";
import crypto from "node:crypto";
import {
  KAO_LZW_SHA256,
  KAO_RECORD_LAYOUT,
  decodeKaoArchive,
  protagonistPortrait,
} from "../web/kao.js";

const gameDir=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gameDir+"/KAO.LZW");
assert.equal(crypto.createHash("sha256").update(b).digest("hex"),KAO_LZW_SHA256);
const ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const kao=decodeKaoArchive(ab);

assert.equal(kao.magic,"LS11");
assert.equal(kao.records.length,256);
assert.equal(kao.largeCount,128);
assert.equal(kao.smallCount,128);
assert.deepEqual(KAO_RECORD_LAYOUT.large,{width:64,height:80,rowBytes:8,planes:3,bytes:1920});
assert.deepEqual(KAO_RECORD_LAYOUT.small,{width:48,height:48,rowBytes:6,planes:3,bytes:864});

const expected=[
"d47c9e1fff6f138668446d286e7b353758b9a76b5dc54536f79888027d9b959d",
"9c0d3c9f6d48846c21cbe87cce8a53c20856e555740553c22ddff103d633ed54",
"ad07b4ead55141a0bff521017f90d250c6075507102b000563c0d7c3da81f42d",
"ebd6e2eeae9899d893ecbf80fcaad7775dcef621f4bdff1be150da31a297795c",
"7cc83826ba46b134ad91f8c10c74675d53da52ad67248a504d1388ed131620bf",
"d3259ac7f040e6a0bae499b8add5f5c39eba6ac21b69c1be2b110f1857c24f09",
];
for(let i=0;i<6;i++){
  const r=protagonistPortrait(kao,i);
  assert.equal(r.width,64);
  assert.equal(r.height,80);
  assert.equal(crypto.createHash("sha256").update(r.indices).digest("hex"),expected[i]);
}

const main=fs.readFileSync(gameDir+"/MAIN.EXE");
assert.equal(main.subarray(0x3b328,0x3b331).toString("ascii"),"C:KAO.LZW");
assert.equal(main.subarray(0x1add1,0x1addc).toString("hex"),"8d1e78090ee813ffa31604");
assert.equal(main.subarray(0x1b1eb,0x1b218).toString("hex"),
  "be05008bded1e3d1e38b876eab99" +
  "33c22bc2b90300d3f833c22bc28bcb8bde8bf98b9570ab9a7d7b00004e79d6");
assert.equal(main.subarray(0xcf15,0xcf33).toString("hex"),
  "2bc050ff362e04b8500050b8080050ff7608ff76fe900ee82f8a8be55dca");

console.log("UW2 KAO.LZW executable-derived portrait decoder: PASS");