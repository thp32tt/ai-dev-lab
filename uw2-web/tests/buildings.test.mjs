import assert from "node:assert/strict";
import fs from "node:fs";
import { parseSaveSlots, parseMenuTable } from "../web/binary.js";
import {
  harborSupplyPrices, maxSupplyLoad, loadSupply, unloadSupply,
  harborDepartureStatus, consumeDepartureDay, lodgeCheckIn,
  buildingVisitTicks
} from "../web/buildings.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=n=>fs.readFileSync(gd+"/"+n);
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);

const menus=parseMenuTable(ab(read("MENU.DAT")));
assert.deepEqual(menus[9].options,["출  항","보  급","도  크"]);
assert.deepEqual(menus[4].options,["항해자와대화","항구의지지율","숙  박"]);

const slots=parseSaveSlots(ab(read("KOUKAI2.DAT")));
const cat=structuredClone(slots[0]);
const joao=structuredClone(slots[1]);

assert.deepEqual(harborSupplyPrices(cat),{water:0,food:10,lumber:46,shot:60,unresolved:false});
assert.deepEqual(harborSupplyPrices(joao),{water:0,food:20,lumber:89,shot:123,unresolved:false});

let dep=harborDepartureStatus(cat);
assert.equal(dep.allowed,false);
assert.equal(dep.messageId,59);

dep=harborDepartureStatus(joao);
assert.equal(dep.allowed,true);
assert.equal(dep.messageId,61);
assert.equal(dep.days,13);

const ship=joao.fleet.ships[0];
assert.equal(ship.capacity,120);
assert.equal(ship.load,113);
assert.equal(maxSupplyLoad(joao,ship,"food"),12);
const money=joao.money;
let tx=loadSupply(joao,0,"food",3);
assert.deepEqual(tx,{quantity:3,cost:60,unitPrice:20});
assert.equal(ship.food,424);
assert.equal(ship.load,116);
assert.equal(joao.money,money-60);
tx=unloadSupply(joao,0,"food",2);
assert.equal(tx.quantity,2);
assert.equal(ship.food,404);
assert.equal(ship.load,114);

const before=joao.fleet.ships.map(s=>({water:s.water,food:s.food,load:s.load}));
consumeDepartureDay(joao);
for(let i=0;i<joao.fleet.ships.length;i++){
  assert.equal(joao.fleet.ships[i].water,Math.max(0,before[i].water-joao.fleet.ships[i].currentCrew));
  assert.equal(joao.fleet.ships[i].food,Math.max(0,before[i].food-joao.fleet.ships[i].currentCrew));
}
const d={...slots[1].dateTime};
lodgeCheckIn(d);
assert.deepEqual(d,{year:1522,month:7,day:7,timeTick:24,hour:8,minute:0});
assert.equal(buildingVisitTicks(()=>0),2);
assert.equal(buildingVisitTicks(()=>0.999),4);

console.log(JSON.stringify({
  harborMenu:menus[9].options,
  lodgeMenu:menus[4].options,
  catalinaDeparture:harborDepartureStatus(cat),
  joaoDeparture:dep,
  joaoPrices:harborSupplyPrices(slots[1]),
  lodgeAfter:d
},null,2));
console.log("building rules tests: PASS");