import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buyGoods,sellGoods} from '../web/market.js';
const PRICE=100, GOLD=600_000_000;
const marketAssets={markets:[{id:0,
 listed:[{slot:0,good:0,name:'good',basePrice:100,minimumEconomy:0}],
 salePrices:Array(46).fill(PRICE)}]};
function session(){
 return {money:1000,portMeta:{marketId:0,economy:1000,
   rates:Array(10).fill(50),specialtyGoodsId:255,
   specialtyEconomyThreshold:100,specialtyBasePrice:0},
  fleet:{ships:[{index:0,name:'ship',cargo:200,load:10,
   water:0,food:0,lumber:0,shot:0,
   goods:[{slot:0,id:0,quantity:5},{slot:1,id:255,quantity:0}]}]}};}
function hold(s,fn,reason){
 const before=structuredClone(s),result=fn(s);
 assert.equal(result.quantity,0,reason||result.reason);
 if(reason)assert.equal(result.reason,reason);
 assert.deepEqual(s,before,'refused trade must not change wallet, rates or cargo');
}
const ordinary=session();
const sale=sellGoods(ordinary,marketAssets,0,0,5);
assert.equal(sale.quantity,5);
assert.equal(sale.revenue,500);
assert.equal(ordinary.money,1500);
assert.equal(ordinary.fleet.ships[0].load,5);
assert.deepEqual(ordinary.fleet.ships[0].goods[0],
  {slot:0,id:255,quantity:0});
const buy=buyGoods(ordinary,marketAssets,0,0,2);
assert.equal(buy.quantity,2);
assert.equal(buy.cost,240);
assert.equal(ordinary.money,1260);
assert.equal(ordinary.fleet.ships[0].load,7);
assert.equal(ordinary.fleet.ships[0].goods[0].quantity,2);
const max=session();
max.money=GOLD-50;
hold(max,s=>sellGoods(s,marketAssets,0,0,1),'cash-limit');
max.money=GOLD-100;
assert.equal(sellGoods(max,marketAssets,0,0,1).quantity,1);
assert.equal(max.money,GOLD);
// Source u16 load, cargo and cargo-slot boundaries cannot overflow.
const over=session();
over.fleet.ships[0].load=65535;
over.fleet.ships[0].goods[0].quantity=0;
over.fleet.ships[0].goods[0].id=255;
hold(over,s=>buyGoods(s,marketAssets,0,0,1),'no-capacity-or-money');
const boundary=session();
boundary.fleet.ships[0].cargo=65535;
boundary.fleet.ships[0].goods[0].quantity=65534;
boundary.fleet.ships[0].load=65534;
boundary.money=1000;
assert.equal(buyGoods(boundary,marketAssets,0,0,100).quantity,1);
assert.equal(boundary.fleet.ships[0].goods[0].quantity,65535);
assert.equal(boundary.fleet.ships[0].load,65535);
// No fractional, coerced, infinite or unsafe quantity can be sold.
for(const requested of [0,-1,NaN,Infinity,1.5,'2',Number.MAX_SAFE_INTEGER+1]){
 hold(session(),s=>sellGoods(s,marketAssets,0,0,requested),'invalid-quantity');
}
for(const damage of [
 s=>{s.fleet.ships[0].cargo=-1;},
 s=>{s.fleet.ships[0].cargo=65536;},
 s=>{s.fleet.ships[0].load=65536;},
 s=>{s.fleet.ships[0].goods[0].quantity=65536;},
 s=>{s.fleet.ships[0].goods[0].id=255;},
 s=>{s.fleet.ships[0].goods[0].slot=1;},
 s=>{s.fleet.ships[0].goods[0].quantity=NaN;},
 s=>{s.fleet.ships[0].water=NaN;},
 s=>{s.portMeta.rates[0]=NaN;},
 s=>{s.portMeta.rates[0]='50';},
 s=>{s.portMeta.rates=[];},
 s=>{s.portMeta.economy=-1;},
 s=>{s.portMeta.marketId=99;},
 s=>{s.money='1000';}
]){
 const s=session();damage(s);
 hold(s,x=>sellGoods(x,marketAssets,0,0,1),'invalid-trade-state');
 hold(s,x=>buyGoods(x,marketAssets,0,0,1),'invalid-trade-state');
}
const underloaded=session();
underloaded.fleet.ships[0].load=2;
hold(underloaded,s=>sellGoods(s,marketAssets,0,0,3),'source-load-invalid');
const wrongPrice=structuredClone(marketAssets);
wrongPrice.markets[0].salePrices[0]=NaN;
hold(session(),s=>sellGoods(s,wrongPrice,0,0,1),'sale-price-unverified');
const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.match(app,/sellGoods\(selected,marketAssets/);
assert.match(app,/buyGoods\(selected,marketAssets/);
console.log('UW2 native trade sale and purchase source u16 load/rate/cash atomicity: PASS');
