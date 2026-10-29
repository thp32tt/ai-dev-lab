import assert from "node:assert/strict";
import fs from "node:fs";
import {parseSaveSlots} from "../web/binary.js";
import {
  pubSpecialty,initialPubEnthusiasm,pubTreatMaximum,pubTreat,
  fleetFreeBunks,pubRecruitOffer,hireCrew,dismissCrew
} from "../web/pub.js";
const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const b=fs.readFileSync(gd+"/KOUKAI2.DAT"),ab=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const slots=parseSaveSlots(ab);
for(const s of slots.filter(x=>!x.empty).slice(0,2)){
 console.log(JSON.stringify({slot:s.index+1,hero:s.heroName,charm:s.charm,rank:s.rank,dayFlags:s.dayFlags,economy:s.portMeta?.economy,pubDrink:s.portMeta?.pubDrinkId,specialty:pubSpecialty(s),enthusiasm:initialPubEnthusiasm(s),offer:pubRecruitOffer(s,initialPubEnthusiasm(s)),freeBunks:fleetFreeBunks(s)},null,2));
}
const joao=structuredClone(slots[1]);
const e0=initialPubEnthusiasm(joao);
const max=pubTreatMaximum(joao);
const money0=joao.money;
const treat=pubTreat(joao,e0,Math.min(10,max));
assert.equal(joao.money,money0-treat.cost);
assert.ok(treat.enthusiasm>=e0);
const offer=pubRecruitOffer(joao,treat.enthusiasm);
const ship=joao.fleet.ships[0], crew0=ship.currentCrew;
if(offer.maximum>0 && ((joao.dayFlags??0)&1)===0){
 const h=hireCrew(joao,0,1,treat.enthusiasm);
 assert.equal(h.quantity,1);
 assert.equal(ship.currentCrew,crew0+1);
 assert.equal(joao.dayFlags&1,1);
 const d=dismissCrew(joao,0,1);
 assert.equal(d.quantity,1);
 assert.equal(ship.currentCrew,crew0);
}
console.log("pub tests: PASS");