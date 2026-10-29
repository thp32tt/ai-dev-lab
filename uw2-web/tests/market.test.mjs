import assert from "node:assert/strict";
import fs from "node:fs";
import {parseSaveSlots} from "../web/binary.js";
import {
  GOODS_NAMES, decodeMarketAssets, currentPortMarket,
  buyGoods, sellGoods, carriedGoodsRows
} from "../web/market.js";
import {shipCargoFree,shipCargoUsed} from "../web/buildings.js";

const gd=process.env.UW2_GAME_DIR || "/home/chatgpt-runner/rea-input/uncharted-waters-2/game/C HDD";
const read=n=>fs.readFileSync(gd+"/"+n);
const ab=b=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
const data1=decodeMarketAssets(ab(read("DATA1.LZW")));
assert.equal(data1.tableOffset,0x6bc0);
assert.equal(data1.markets.length,13);
assert.deepEqual(data1.markets[0].listed.map(x=>x.good),[11,12,14,15,21,24,25,41,44]);
assert.deepEqual(data1.markets[0].listed.map(x=>x.basePrice),[30,20,28,36,70,80,50,120,120]);

const slots=parseSaveSlots(ab(read("KOUKAI2.DAT")));
const joao=structuredClone(slots[1]);
const pm=currentPortMarket(joao,data1);
assert.equal(pm.marketId,2);
assert.deepEqual(pm.buy.map(x=>x.good),[12,13,14,15,18,19,25,40,32]);
assert.equal(pm.buy.at(-1).name,"은");
assert.equal(pm.buy.at(-1).specialty,true);

const ship=joao.fleet.ships[0];
assert.deepEqual(ship.goods.map(x=>[x.id,x.quantity]),[[255,0],[255,0],[255,0],[255,0],[255,0]]);
assert.equal(shipCargoUsed(ship),68);
assert.equal(shipCargoFree(ship),12);

const item=pm.buy.find(x=>x.good===13); // 곡류
const beforeMoney=joao.money, beforeLoad=ship.load, beforeRate=joao.portMeta.rates[item.category];
const tx=buyGoods(joao,data1,0,13,3);
assert.equal(tx.quantity,3);
assert.equal(ship.goods[0].id,13);
assert.equal(ship.goods[0].quantity,3);
assert.equal(ship.load,beforeLoad+3);
assert.equal(shipCargoFree(ship),9);
assert.equal(joao.money,beforeMoney-tx.cost);
assert.ok(joao.portMeta.rates[item.category]>=beforeRate);
assert.equal(carriedGoodsRows(joao,data1).length,1);

const beforeSellMoney=joao.money;
const sx=sellGoods(joao,data1,0,0,2);
assert.equal(sx.quantity,2);
assert.equal(ship.goods[0].quantity,1);
assert.equal(ship.load,beforeLoad+1);
assert.equal(joao.money,beforeSellMoney+sx.revenue);

console.log(JSON.stringify({
  tableOffset:"0x"+data1.tableOffset.toString(16),
  market0:data1.markets[0].listed,
  danzigBuy:pm.buy.map(x=>({id:x.good,name:x.name,price:x.price,specialty:x.specialty})),
  cargoBefore:{used:68,free:12},
  purchase:tx,
  sale:sx,
  ratesAfter:joao.portMeta.rates,
},null,2));
console.log("market tests: PASS");