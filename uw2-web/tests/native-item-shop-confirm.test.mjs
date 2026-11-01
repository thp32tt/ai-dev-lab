import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {confirmNativeItemPurchase as buy,confirmNativeItemSale as sell}
 from '../web/native-item-shop-confirm.js';
import {itemShopStock,itemBuyStatus,itemSellStatus} from '../web/item-shop.js';

const make=(money=9000,hour=12)=>{
 const definitions=[];
 definitions[3]={id:3,name:'source sword',price:1200,
  priceUnit:40,rating:1,type:8,equipped:false};
 definitions[4]={id:4,name:'source tool',price:2000,
  priceUnit:30,rating:1,type:8,equipped:false};
 return {
  money,inventory:Array(20).fill(255),itemDefinitions:definitions,
  dateTime:{hour},
  portMeta:{regularItems:[3,4,255],secretItem:4},
  luck:70,charm:20
 };
};
const clone=s=>structuredClone(s);
const quotation=(s,id=3)=>{
 const st=itemBuyStatus(s,id);
 assert.equal(st.allowed,true);
 return {id,price:st.price,mode:itemShopStock(s).mode};
};
const saleQuote=(s,slot=2)=>{
 const st=itemSellStatus(s,slot);
 assert.equal(st.allowed,true);
 return {inventorySlot:slot,id:s.inventory[slot],offer:st.offer,mode:itemShopStock(s).mode};
};
const unchanged=(s,quote,fn,reason)=>{
 const before=clone(s),result=fn();
 assert.equal(result.quantity,0,reason);
 assert.equal(result.reason,reason);
 assert.deepEqual(s,before,'a rejected confirmed trade must be atomic');
};
const live=make(1200),liveQuote=quotation(live);
assert.deepEqual(live.inventory.filter(v=>v!==255),[]);
const purchased=buy(live,liveQuote);
assert.equal(purchased.quantity,1);
assert.equal(live.money,0,'exact-price confirmation is successful');
assert.equal(live.inventory[0],3);
unchanged(live,liveQuote,()=>buy(live,liveQuote),'no-gold');

const wrongStock=make(),wrongQuote=quotation(wrongStock);
wrongStock.portMeta.regularItems=[4,255,255];
unchanged(wrongStock,wrongQuote,()=>buy(wrongStock,wrongQuote),'native-shop-stock-changed');

const changedPrice=make(),priceQuote=quotation(changedPrice);
changedPrice.itemDefinitions[3].price=2400;
unchanged(changedPrice,priceQuote,()=>buy(changedPrice,priceQuote),'native-shop-stock-changed');

const closed=make(),closedQuote=quotation(closed);
closed.dateTime.hour=20;
unchanged(closed,closedQuote,()=>buy(closed,closedQuote),'native-shop-quote-invalid');

const secret=make(4000,2),secretQuote=quotation(secret,4);
assert.equal(buy(secret,secretQuote).quantity,1);
assert.equal(secret.money,2000);
unchanged(secret,{...secretQuote,id:3,price:1200},()=>buy(secret,{...secretQuote,id:3,price:1200}),'native-shop-stock-changed');

const full=make(),fullQuote=quotation(full);
full.inventory.fill(4);
unchanged(full,fullQuote,()=>buy(full,fullQuote),'inventory-full');

const owned=make();
owned.inventory[2]=3;owned.inventory[5]=4;
const quote=saleQuote(owned);
const sale=sell(owned,quote,quote.offer);
assert.equal(sale.quantity,1);
assert.equal(sale.revenue,2000);
assert.equal(owned.money,11000);
assert.equal(owned.inventory[2],255);
assert.equal(owned.inventory[5],4,'other source inventory slots are untouched');

const swapped=make(),staleQuote=(swapped.inventory[2]=3,saleQuote(swapped));
swapped.inventory[2]=4;
unchanged(swapped,staleQuote,()=>sell(swapped,staleQuote,staleQuote.offer),'native-shop-held-item-changed');

const repriced=make();repriced.inventory[2]=3;
const oldSale=saleQuote(repriced);
repriced.itemDefinitions[3].priceUnit=80;
unchanged(repriced,oldSale,()=>sell(repriced,oldSale,oldSale.offer),'native-shop-offer-changed');

const negotiated=make();negotiated.inventory[2]=3;
const nq=saleQuote(negotiated),counter=nq.offer+Math.floor(nq.offer*negotiated.charm/200);
assert.equal(counter,2200);
assert.equal(sell(negotiated,nq,counter).quantity,1);
assert.equal(negotiated.money,11200);

const bogus=make();bogus.inventory[2]=3;const bq=saleQuote(bogus);
unchanged(bogus,bq,()=>sell(bogus,bq,9999999),'native-shop-negotiation-invalid');

const cap=make(599999000);cap.inventory[2]=3;
const cq=saleQuote(cap);
unchanged(cap,cq,()=>sell(cap,cq,cq.offer),'cash-limit');

const night=make();night.inventory[2]=3;
const nightQuote=saleQuote(night);night.dateTime.hour=23;
unchanged(night,nightQuote,()=>sell(night,nightQuote),'native-shop-quote-invalid');

const app=readFileSync(new URL('../web/app.js',import.meta.url),'utf8');
assert.ok(app.includes('confirmNativeItemPurchase(selected,p)'));
assert.ok(app.includes('confirmNativeItemSale(selected,p,p.offer)'));
assert.ok(app.includes('confirmNativeItemSale(selected,p,p.counter?.offer??p.offer)'));
assert.ok(app.includes('price:st.price,mode:shop.mode'));
assert.ok(app.includes('offer:st.offer,\n              mode:shop.mode'));
assert.ok(!app.includes('const tx=p ? sellItem(selected,p.inventorySlot'));
console.log('UW2 native item shop live quote purchase/sale and original-stock confirmation: PASS');
