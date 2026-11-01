import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GOLD_LIMIT,ITEM_EMPTY,sellItem} from '../web/item-shop.js';
import {sellGoods} from '../web/market.js';

// Synthetic source-compatible native trade fixture: no copyrighted game
// files, no invented DOS price algorithm or server state.
const salePrice=100;
const marketAssets={markets:[{
 id:0,listed:[],salePrices:Array(46).fill(salePrice)
}]};
const goodsSlot={slot:0,id:0,quantity:5};
const ship={index:0,name:'ship',load:5,goods:[goodsSlot]};
const portMeta={
 marketId:0,economy:1000,rates:Array(10).fill(50),
 specialtyGoodsId:255,specialtyEconomyThreshold:100,
 specialtyBasePrice:0
};
const slot={money:GOLD_LIMIT-150,portMeta,fleet:{ships:[ship]}};
const first=sellGoods(slot,marketAssets,0,0,5);
assert.equal(first.quantity,1); // only one full-price unit fits
assert.equal(first.revenue,salePrice);
assert.equal(slot.money,GOLD_LIMIT-50);
assert.equal(goodsSlot.quantity,4);
assert.equal(ship.load,4);
const refused=sellGoods(slot,marketAssets,0,0,4);
assert.equal(refused.quantity,0);
assert.equal(refused.reason,'cash-limit');
assert.equal(goodsSlot.quantity,4);
assert.equal(slot.money,GOLD_LIMIT-50);
slot.money=GOLD_LIMIT;
assert.equal(sellGoods(slot,marketAssets,0,0,1).quantity,0);
assert.equal(goodsSlot.quantity,4);
assert.equal(ship.load,4);
// At the exact permitted sale boundary, no coin is discarded.
slot.money=GOLD_LIMIT-salePrice;
const exact=sellGoods(slot,marketAssets,0,0,1);
assert.equal(exact.quantity,1);
assert.equal(slot.money,GOLD_LIMIT);
assert.equal(goodsSlot.quantity,3);
assert.equal(ship.load,3);

// Item sale remains atomic at the same cash cap even for an accepted
// player counter-offer, and leaves inventory untouched on refusal.
const itemId=2;
const itemSlot={
 money:GOLD_LIMIT-50,
 inventory:Array(20).fill(ITEM_EMPTY),
 itemDefinitions:{[itemId]:{
   id:itemId,type:8,equipped:false,priceUnit:2,rating:1
 }}
};
itemSlot.inventory[7]=itemId;
const partial=sellItem(itemSlot,7,100);
assert.equal(partial.allowed,false);
assert.equal(partial.quantity,0);
assert.equal(partial.reason,'cash-limit');
assert.equal(itemSlot.money,GOLD_LIMIT-50);
assert.equal(itemSlot.inventory[7],itemId);
const invalid=sellItem(itemSlot,7,Infinity);
assert.equal(invalid.quantity,0);
assert.equal(invalid.reason,'sale-value-unverified');
assert.equal(itemSlot.inventory[7],itemId);
itemSlot.money=GOLD_LIMIT-100;
const done=sellItem(itemSlot,7,100);
assert.equal(done.allowed,true);
assert.equal(done.quantity,1);
assert.equal(done.revenue,100);
assert.equal(itemSlot.money,GOLD_LIMIT);
assert.equal(itemSlot.inventory[7],ITEM_EMPTY);

// Both paths are used by the actual browser game entrypoint.
const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/sellGoods\(selected,marketAssets/);
assert.match(app,/sellItem\(selected,/);
console.log('UW2 native market and item sales preserve gold cap, inventory and cargo on refused transactions: PASS');
