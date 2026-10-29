export const ITEM_TYPES = Object.freeze([
  "검", "검", "검", "검", "장비", "장비", "갑옷", "항해도구", "도구",
  "특수", "특수", "특수", "특수", "특수", "특수", "특수",
]);

export const ITEM_EMPTY = 0xff;
export const ITEM_INVENTORY_SIZE = 20;
export const GOLD_LIMIT = 600_000_000;

export function itemShopMode(slot) {
  const hour=Math.trunc(slot?.dateTime?.hour??0);
  if(hour>=2&&hour<3) return "secret";
  if(hour>=8&&hour<20) return "day";
  return "closed";
}

export function itemShopStock(slot) {
  const mode=itemShopMode(slot);
  const meta=slot?.portMeta;
  if(!meta) return {mode,items:[]};
  const ids=mode==="secret"
    ? [meta.secretItem]
    : mode==="day"
      ? meta.regularItems
      : [];
  const items=ids
    .filter(id=>Number.isInteger(id)&&id!==ITEM_EMPTY)
    .map(id=>slot.itemDefinitions?.[id])
    .filter(Boolean);
  return {mode,items};
}

export function carriedItems(slot) {
  const inv=slot?.inventory??[];
  return inv.map((id,slotIndex)=>({
    slot:slotIndex,
    id,
    item:id===ITEM_EMPTY?null:slot.itemDefinitions?.[id]??null,
  })).filter(x=>x.item);
}

export function firstEmptyItemSlot(slot) {
  return (slot?.inventory??[]).findIndex(x=>x===ITEM_EMPTY);
}

export function itemBuyStatus(slot,itemId) {
  const item=slot?.itemDefinitions?.[itemId];
  if(!item) return {allowed:false,reason:"missing-item",messageId:239};
  if((slot?.money??0)<=0) return {allowed:false,reason:"no-gold",messageId:236};
  if(firstEmptyItemSlot(slot)<0) return {allowed:false,reason:"inventory-full",messageId:237};
  if(item.type<7&&(slot.inventory??[]).includes(itemId)){
    return {allowed:false,reason:"restricted-duplicate",messageId:332};
  }
  if((slot?.money??0)<item.price) return {allowed:false,reason:"insufficient-gold",messageId:239};
  return {allowed:true,item,price:item.price};
}

export function buyItem(slot,itemId) {
  const status=itemBuyStatus(slot,itemId);
  if(!status.allowed) return {...status,quantity:0};
  const inventorySlot=firstEmptyItemSlot(slot);
  slot.money-=status.price;
  slot.inventory[inventorySlot]=itemId;
  return {
    allowed:true,quantity:1,item:status.item,price:status.price,
    inventorySlot,messageId:242,
  };
}

export function itemInitialSaleOffer(item) {
  if(!item||item.rating===0) return 0;
  return 100*Math.floor((item.priceUnit??0)/2);
}

export function itemCounterOffer(slot,item,rng=Math.random) {
  const initial=itemInitialSaleOffer(item);
  if(!initial) return {success:false,initial,offer:0};
  const roll=Math.floor(Math.max(0,Math.min(0.999999999,Number(rng())||0))*100);
  const success=(slot?.luck??0)>=roll;
  const offer=success
    ? initial+Math.floor(initial*(slot?.charm??0)/200)
    : 0;
  return {success,roll,initial,offer};
}

export function itemSellStatus(slot,inventorySlot) {
  const id=slot?.inventory?.[inventorySlot];
  if(id==null||id===ITEM_EMPTY) return {allowed:false,reason:"empty",messageId:243};
  const item=slot.itemDefinitions?.[id];
  if(!item) return {allowed:false,reason:"missing-item",messageId:929};
  if(item.equipped) return {allowed:false,reason:"equipped",messageId:333,item};
  const offer=itemInitialSaleOffer(item);
  if(offer<=0) return {allowed:false,reason:"not-accepted",messageId:929,item};
  return {allowed:true,item,offer};
}

export function sellItem(slot,inventorySlot,price=null) {
  const status=itemSellStatus(slot,inventorySlot);
  if(!status.allowed) return {...status,quantity:0};
  const revenue=Math.max(0,Math.floor(price??status.offer));
  const room=Math.max(0,GOLD_LIMIT-Math.trunc(slot?.money??0));
  const actual=Math.min(revenue,room);
  slot.money+=actual;
  slot.inventory[inventorySlot]=ITEM_EMPTY;
  return {
    allowed:true,quantity:1,item:status.item,revenue:actual,
    requestedRevenue:revenue,inventorySlot,messageId:248,
  };
}