import assert from 'node:assert/strict';
import fs from 'node:fs';
import {buyGoods} from '../web/market.js';
import {ITEM_EMPTY,GOLD_LIMIT,itemBuyStatus,buyItem} from '../web/item-shop.js';

// Original-free fixtures follow the browser's already parsed market shapes.
// These tests enforce transaction integrity only; DOS trade parity is untested.
const marketAssets={markets:[{
  id:0,listed:[{slot:0,good:0,name:'good',basePrice:100,minimumEconomy:0}],
  salePrices:Array(46).fill(100)
}]};
const meta=()=>({
  marketId:0,economy:1000,rates:Array(10).fill(50),
  specialtyGoodsId:255,specialtyEconomyThreshold:100,specialtyBasePrice:0
});
const ship=()=>({
  index:0,name:'ship',cargo:20,load:0,water:0,food:0,lumber:0,shot:0,
  goods:[{slot:0,id:255,quantity:0},{slot:1,id:255,quantity:0}]
});
const player=(money=500)=>({money,portMeta:meta(),fleet:{ships:[ship()]}});
const s=player();
const bought=buyGoods(s,marketAssets,0,0,10);
assert.equal(bought.unitPrice,120); // 100 source price and current 20% tax
assert.equal(bought.quantity,4); // 500G can buy only four
assert.equal(bought.cost,480);
assert.equal(s.money,20);
assert.equal(s.fleet.ships[0].goods[0].id,0);
assert.equal(s.fleet.ships[0].goods[0].quantity,4);
assert.equal(s.fleet.ships[0].load,4);
const after=structuredClone(s);
assert.equal(buyGoods(s,marketAssets,0,0,2).quantity,0);
assert.deepEqual(s,after);

const capacity=player(1000);
capacity.fleet.ships[0].cargo=1;
assert.equal(buyGoods(capacity,marketAssets,0,0,20).quantity,1);
assert.equal(capacity.money,880);
assert.equal(capacity.fleet.ships[0].goods[0].quantity,1);
assert.equal(capacity.fleet.ships[0].load,1);
const oneSlot=player(1000);
oneSlot.fleet.ships[0].goods=[{slot:0,id:1,quantity:5}];
assert.equal(buyGoods(oneSlot,marketAssets,0,0,1).reason,'no-goods-slot');
assert.equal(oneSlot.money,1000);

for(const money of [-1,GOLD_LIMIT+1,NaN,Infinity,'1000',1.5,undefined]){
  const invalid=player(500);
  invalid.money=money; // Explicit undefined, not the fixture's default argument.
  const before=structuredClone(invalid);
  const tx=buyGoods(invalid,marketAssets,0,0,2);
  assert.equal(tx.quantity,0);
  assert.equal(tx.reason,'invalid-trade-state');
  assert.deepEqual(invalid,before);
}
for(const mutate of [
  x=>{x.fleet.ships[0].cargo=NaN;},
  x=>{x.fleet.ships[0].cargo=-1;},
  x=>{x.fleet.ships[0].load=-1;},
  x=>{x.fleet.ships[0].load=Number.MAX_SAFE_INTEGER;},
  x=>{x.fleet.ships[0].goods[0].id=ITEM_EMPTY;x.fleet.ships[0].goods[0].quantity=1;},
  x=>{x.fleet.ships[0].goods[0].quantity=Infinity;},
  x=>{x.fleet.ships[0].goods[0].id=-5;},
]){
  const invalid=player(500);
  mutate(invalid);
  const before=structuredClone(invalid);
  assert.equal(buyGoods(invalid,marketAssets,0,0,2).quantity,0);
  assert.deepEqual(invalid,before);
}
for(const requested of [-1,0,NaN,Infinity,1.5,'2']){
  const s=player(600);
  const before=structuredClone(s);
  assert.equal(buyGoods(s,marketAssets,0,0,requested).quantity,0);
  assert.deepEqual(s,before);
}
// An unverified zero source price cannot mint cargo without payment.
const noPrice=structuredClone(marketAssets);
noPrice.markets[0].listed[0].basePrice=0;
const free=player(1000);
const beforeFree=structuredClone(free);
assert.equal(buyGoods(free,noPrice,0,0,5).reason,'purchase-price-unverified');
assert.deepEqual(free,beforeFree);

const itemId=4;
const item=(price,type=8)=>({id:itemId,type,price,rating:1,priceUnit:10,equipped:false});
const owner=(money,price,inv=Array(20).fill(ITEM_EMPTY))=>({
  money,inventory:inv,itemDefinitions:{[itemId]:item(price)}
});
const exact=owner(1200,1200);
assert.equal(buyItem(exact,itemId).quantity,1);
assert.equal(exact.money,0);
assert.equal(exact.inventory[0],itemId);
const empty=owner(1200,1200);
assert.equal(buyItem(empty,itemId).quantity,1);
const full=owner(3000,100,Array(20).fill(1));
assert.equal(buyItem(full,itemId).reason,'inventory-full');
assert.equal(full.money,3000);
const duplicate=owner(3000,100);
duplicate.itemDefinitions[itemId].type=3;
duplicate.inventory[0]=itemId;
assert.equal(buyItem(duplicate,itemId).reason,'restricted-duplicate');
assert.equal(duplicate.money,3000);

for(const bad of [0,-100,NaN,Infinity,'100',1.5,GOLD_LIMIT+1]){
  const target=owner(1000,bad);
  const before=structuredClone(target);
  const tx=buyItem(target,itemId);
  assert.equal(tx.quantity,0);
  assert.equal(tx.reason,'purchase-price-unverified');
  assert.deepEqual(target,before);
}
for(const money of [NaN,Infinity,-1,GOLD_LIMIT+1,'500',0.5]){
  const target=owner(money,100);
  const before=structuredClone(target);
  assert.equal(itemBuyStatus(target,itemId).reason,'invalid-purchase-state');
  assert.equal(buyItem(target,itemId).quantity,0);
  assert.deepEqual(target,before);
}
const malformedInv=owner(200,100,Array(19).fill(ITEM_EMPTY));
assert.equal(buyItem(malformedInv,itemId).reason,'invalid-purchase-state');
assert.equal(malformedInv.money,200);

const app=fs.readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/buyGoods\(selected,marketAssets/);
assert.match(app,/confirmNativeItemPurchase\(selected,p\)/);
console.log('UW2 native commodity/item purchases preserve wallet and cargo/inventory atomically: PASS');
