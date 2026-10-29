import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots, parseKoreanPortTable } from "../web/binary.js";
import { decodeWorldAssets, findNearestSea, findPortCallTarget, SeaRuntime } from "../web/world-map.js";
import { parseWindCur } from "../web/windcur.js";
import { parsePortDoors } from "../web/town.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=n=>fs.readFileSync(gd+"/"+n);
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);

const save=read("KOUKAI2.DAT");
const slots=parseSaveSlots(ab(save));
const ports=parseKoreanPortTable(ab(save));
const doors=parsePortDoors(ab(read("ZA_DAT.DAT")));
const assets=decodeWorldAssets(ab(read("WORLDMAP.LZW")),ab(read("DATA1.LZW")));
const wind=parseWindCur(ab(read("WINDCUR.DAT")));

assert.equal(ports.length,130);
assert.deepEqual(ports[39],{id:39,nation:5,x:288,y:240,name:"단치히",supply:false,mapId:39});

const joao=slots[1];
const start=findNearestSea(assets,ports[39].x,ports[39].y,40);
assert.deepEqual(start,{x:286,y:238});
const rt=new SeaRuntime(assets,start,wind,joao.dateTime.month,joao.fleet,joao.dateTime);
const target=findPortCallTarget(rt.snapshot(),ports);
assert.equal(target.id,39);
assert.equal(target.dx,2);
assert.equal(target.dy,2);

const harbor=doors[39][3];
assert.deepEqual({x:harbor.x,y:harbor.y},{x:22,y:51});
const viewX=Math.max(0,Math.min(72,harbor.x-12));
const viewY=Math.max(0,Math.min(72,harbor.y-13));
const mapX=harbor.x,mapY=harbor.y+1;
assert.deepEqual({
 viewX,viewY,
 playerX:mapX-viewX,playerY:mapY-viewY,
 mapX,mapY,
}, joao.portState);

console.log(JSON.stringify({danzig:ports[39],departure:start,target,harbor,arrival:joao.portState},null,2));
console.log("port-call roundtrip geometry tests: PASS");