import assert from 'node:assert/strict';
import fs from 'node:fs';
import {carriedGoodsRows,sellGoods,buyGoods} from '../web/market.js';

// Original-shape synthetic cargo. Source ship.index need not be the JS
// fleet array-position: the game must sell from the selected real ship.
const marketAssets={markets:[{
 id:0,listed:[{slot:0,good:0,name:'good',basePrice:100,minimumEconomy:0}],
 salePrices:Array(46).fill(100)
}]};
const ship=(index,id,quantity)=>({
 index,name:'source ship '+index,cargo:100,load:quantity,
 water:0,food:0,lumber:0,shot:0,
 goods:[{slot:0,id,quantity},{slot:1,id:255,quantity:0}]
});
const player=()=>({
 money:1000,
 portMeta:{marketId:0,economy:1000,rates:Array(10).fill(50),
  specialtyGoodsId:255,specialtyEconomyThreshold:100,specialtyBasePrice:0},
 fleet:{ships:[ship(8,0,4),ship(2,1,3)]}
});
const s=player();
const all=carriedGoodsRows(s,marketAssets);
assert.deepEqual(all.map(r=>[r.shipIndex,r.sourceShipIndex,r.goodsSlot,r.good,r.quantity]),
 [[0,8,0,0,4],[1,2,0,1,3]]);
const first=carriedGoodsRows(s,marketAssets,{shipIndex:0});
const second=carriedGoodsRows(s,marketAssets,{shipIndex:1});
assert.equal(first.length,1);assert.equal(second.length,1);
assert.equal(first[0].shipIndex,0);assert.equal(second[0].shipIndex,1);
assert.equal(second[0].name,'계피');
assert.equal(second[0].shipName,'source ship 2');
const beforeFirst=structuredClone(s.fleet.ships[0]);
const trade=sellGoods(s,marketAssets,second[0].shipIndex,second[0].goodsSlot,2);
assert.equal(trade.quantity,2);
assert.equal(trade.revenue,200);
assert.equal(s.money,1200);
assert.equal(s.fleet.ships[1].goods[0].quantity,1);
assert.equal(s.fleet.ships[1].load,1);
assert.deepEqual(s.fleet.ships[0],beforeFirst);
const buy=buyGoods(s,marketAssets,0,0,1);
assert.equal(buy.quantity,1);assert.equal(buy.cost,120);
assert.equal(s.money,1080);
assert.equal(s.fleet.ships[0].goods[0].quantity,5);
assert.equal(s.fleet.ships[1].goods[0].quantity,1);
// Changed ship has no cargo: do not accidentally fall back to another one.
const empty=player();
empty.fleet.ships[1].goods[0]={slot:0,id:255,quantity:0};
empty.fleet.ships[1].load=0;
assert.deepEqual(carriedGoodsRows(empty,marketAssets,{shipIndex:1}),[]);
assert.equal(carriedGoodsRows(empty,marketAssets,{shipIndex:0}).length,1);
for(const i of [-1,2,NaN,Infinity,'1',1.5]){
 assert.deepEqual(carriedGoodsRows(empty,marketAssets,{shipIndex:i}),[]);
}
// Malformed cargo/source ids must never appear in an actionable row.
const bad=player();bad.fleet.ships[0].goods[0].quantity=-1;
assert.equal(carriedGoodsRows(bad,marketAssets,{shipIndex:0}).length,0);
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
// One additional read-only source row probe powers Canvas selection; the
// original render and Enter-to-trade paths remain distinct.
assert.equal((app.match(/carriedGoodsRows\(selected,marketAssets,\{shipIndex:ui.ship\}\)/g)||[]).length,3);
assert.match(app,/const shipName=ships\[ui.ship\]\?\.name/);
assert.doesNotMatch(app,/if \(!selling && \(key === "arrowleft"/);
assert.doesNotMatch(app,/if \(!selling && \(key === "arrowright"/);
assert.ok(app.includes('ui.item=0; ui.last=""'));
assert.match(app,/sellGoods\(selected,marketAssets,row.shipIndex,row.goodsSlot,q\)/);
console.log('UW2 native town market buy/sell ship selector, original per-ship goods and array-index identity PASS');
