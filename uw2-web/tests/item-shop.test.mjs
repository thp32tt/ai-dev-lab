import test from "node:test";
import assert from "node:assert/strict";

import {
  ITEM_EMPTY,
  buyItem,
  sellItem,
  itemBuyStatus,
  itemCounterOffer,
  itemShopMode,
} from "../web/item-shop.js";

function item(id, {
  name=`item-${id}`,
  price=1000,
  priceUnit=10,
  rating=1,
  type=8,
  equipped=false,
}={}) {
  return {id,name,price,priceUnit,rating,type,equipped};
}

function slot({
  money=5000,
  inventory=Array(20).fill(ITEM_EMPTY),
  defs=[],
  hour=12,
  luck=50,
  charm=20,
}={}) {
  return {
    money,
    inventory:[...inventory],
    itemDefinitions:defs,
    dateTime:{hour},
    luck,
    charm,
  };
}

test("exact-price purchase remains a successful transaction even when gold becomes zero", () => {
  const defs=[];
  defs[3]=item(3,{price:1200});
  const s=slot({money:1200,defs});
  const tx=buyItem(s,3);
  assert.equal(tx.allowed,true);
  assert.equal(tx.quantity,1);
  assert.equal(tx.messageId,242);
  assert.equal(s.money,0);
  assert.equal(s.inventory[0],3);
});

test("purchase may fill the final inventory slot and still succeeds", () => {
  const defs=[];
  defs[4]=item(4,{price:1000});
  const inventory=Array(20).fill(1);
  inventory[19]=ITEM_EMPTY;
  defs[1]=item(1,{type:8});
  const s=slot({money:5000,inventory,defs});
  const tx=buyItem(s,4);
  assert.equal(tx.quantity,1);
  assert.equal(tx.inventorySlot,19);
  assert.equal(s.inventory.includes(ITEM_EMPTY),false);
  assert.equal(s.money,4000);
});

test("selling the last carried item remains successful and clears the slot", () => {
  const defs=[];
  defs[5]=item(5,{priceUnit:40,rating:1});
  const inventory=Array(20).fill(ITEM_EMPTY);
  inventory[7]=5;
  const s=slot({money:1000,inventory,defs});
  const tx=sellItem(s,7);
  assert.equal(tx.allowed,true);
  assert.equal(tx.quantity,1);
  assert.equal(tx.messageId,248);
  assert.equal(tx.revenue,2000);
  assert.equal(s.money,3000);
  assert.equal(s.inventory[7],ITEM_EMPTY);
});

test("restricted weapon/armor duplicates are rejected before purchase", () => {
  const defs=[];
  defs[2]=item(2,{type:3,price:100});
  const inventory=Array(20).fill(ITEM_EMPTY);
  inventory[0]=2;
  const s=slot({money:1000,inventory,defs});
  const st=itemBuyStatus(s,2);
  assert.equal(st.allowed,false);
  assert.equal(st.reason,"restricted-duplicate");
  assert.equal(st.messageId,332);
});

test("Luck counteroffer uses deterministic roll and Charm bonus", () => {
  const it=item(6,{priceUnit:100,rating:1});
  const s=slot({luck:60,charm:20});
  const ok=itemCounterOffer(s,it,()=>0.50);
  assert.equal(ok.success,true);
  assert.equal(ok.roll,50);
  assert.equal(ok.initial,5000);
  assert.equal(ok.offer,5500);

  const fail=itemCounterOffer({...s,luck:49},it,()=>0.50);
  assert.equal(fail.success,false);
  assert.equal(fail.offer,0);
});

test("item shop day/secret/closed time windows stay exact", () => {
  assert.equal(itemShopMode(slot({hour:2})),"secret");
  assert.equal(itemShopMode(slot({hour:8})),"day");
  assert.equal(itemShopMode(slot({hour:19})),"day");
  assert.equal(itemShopMode(slot({hour:20})),"closed");
  assert.equal(itemShopMode(slot({hour:1})),"closed");
});
