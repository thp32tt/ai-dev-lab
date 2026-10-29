import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots } from "../web/binary.js";
import { decodePortAssets } from "../web/port-map.js";
import { parsePortDoors, canStandAt, PortWalkingRuntime, townPersonMessageId } from "../web/town.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=(n)=>fs.readFileSync(gd+"/"+n);
const ab=(b)=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);

const saves=read("KOUKAI2.DAT");
const slots=parseSaveSlots(ab(saves));
assert.deepEqual(slots[0].portState,{viewX:1,viewY:72,playerX:15,playerY:17,mapX:16,mapY:89});
assert.deepEqual(slots[1].portState,{viewX:10,viewY:38,playerX:12,playerY:14,mapX:22,mapY:52});
assert.deepEqual(slots[0].townActors,[
  {slot:0,x:55,y:93,type:1,active:true,walker:true},
  {slot:1,x:20,y:89,type:3,active:true,walker:true},
  {slot:2,x:11,y:74,type:3,active:true,walker:true},
  {slot:3,x:15,y:93,type:1,active:true,walker:true},
  {slot:4,x:38,y:90,type:0,active:true,walker:false},
  {slot:5,x:18,y:89,type:1,active:true,walker:false},
  {slot:6,x:255,y:255,type:2,active:false,walker:false},
  {slot:7,x:9,y:74,type:3,active:true,walker:false},
]);

const assets=decodePortAssets(ab(read("PORTCHIP.LZW")),ab(read("PORTMAP.LZW")),ab(read("CHIP_NO.DAT")));
assert.deepEqual(assets.walkBounds,[
  [0,29,34,40],[0,21,26,31],[0,20,25,30],[0,22,26,31],
  [0,37,42,48],[0,32,37,46],[0,21,22,27],
]);

const doors=parsePortDoors(ab(read("ZA_DAT.DAT")));
assert.equal(doors.length,101);
assert.deepEqual(doors[5][1],{id:1,name:"주점",x:16,y:88,present:true});
assert.deepEqual(doors[39][3],{id:3,name:"항",x:22,y:51,present:true});

assert.equal(canStandAt(assets,5,16,89),true);
assert.equal(canStandAt(assets,5,16,88),true);
assert.equal(canStandAt(assets,39,22,52),true);
assert.equal(canStandAt(assets,39,22,51),true);

assert.equal(townPersonMessageId(slots[0],slots[0].townActors[0]),647);
assert.equal(townPersonMessageId(slots[0],slots[0].townActors[5]),621);
assert.equal(townPersonMessageId(slots[0],slots[0].townActors[6]),622);

const talkRuntime=new PortWalkingRuntime(slots[0],assets,doors);
talkRuntime.actors[5]={slot:5,x:17,y:89,type:1,active:true,walker:false};
const facingBefore=talkRuntime.facing;
let talkEv=talkRuntime.move("right");
assert.equal(talkEv.moved,false);
assert.equal(talkEv.talk.messageId,621);
assert.equal(talkRuntime.mapX,16);
assert.equal(talkRuntime.mapY,89);
assert.equal(talkRuntime.facing,facingBefore);
assert.equal(talkRuntime.talkCounter,0);
assert.equal(talkRuntime.dismissTalk(),true);

const tunis=new PortWalkingRuntime(slots[0],assets,doors);
assert.equal(tunis.mapX,16); assert.equal(tunis.mapY,89);
let ev=tunis.move("up");
assert.equal(ev.moved,true);
assert.equal(ev.building?.id,1);
assert.equal(tunis.mapX,16); assert.equal(tunis.mapY,88);
assert.equal(tunis.snapshot().building.name,"주점");
assert.equal(tunis.leaveBuilding(),true);
assert.equal(tunis.mapY,89);

const danzig=new PortWalkingRuntime(slots[1],assets,doors);
ev=danzig.move("up");
assert.equal(ev.moved,true);
assert.equal(ev.building?.id,3);
assert.equal(danzig.mapX,22); assert.equal(danzig.mapY,51);
assert.equal(danzig.snapshot().building.name,"항");

console.log(JSON.stringify({
  slot1:slots[0].portState,
  slot1Door:"주점 @ 16,88",
  slot2:slots[1].portState,
  slot2Door:"항 @ 22,51",
  actorCount:slots[0].townActors.length,
  dogTalkMessage:621,
  walkBounds:assets.walkBounds,
},null,2));
console.log("town runtime tests: PASS");